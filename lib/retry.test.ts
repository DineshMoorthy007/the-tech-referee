import { 
  withRetry, 
  retryApiCall, 
  retryFetch, 
  isRetryableError, 
  calculateDelay,
  DEFAULT_RETRY_OPTIONS 
} from '@/lib/retry';
import { AppError, ErrorType } from '@/lib/types';

// Mock fetch for testing
global.fetch = jest.fn();

describe('retry utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('isRetryableError', () => {
    it('identifies retryable AppErrors correctly', () => {
      const retryableError = new AppError(
        ErrorType.NETWORK_ERROR,
        'Network failed',
        'NETWORK_ERROR',
        null,
        new Date(),
        true
      );

      const nonRetryableError = new AppError(
        ErrorType.VALIDATION_ERROR,
        'Invalid input',
        'VALIDATION_ERROR',
        null,
        new Date(),
        false
      );

      expect(isRetryableError(retryableError, ['NETWORK_ERROR'])).toBe(true);
      expect(isRetryableError(nonRetryableError, ['NETWORK_ERROR'])).toBe(false);
    });

    it('identifies network errors as retryable', () => {
      const networkError = new TypeError('fetch failed');
      expect(isRetryableError(networkError, [])).toBe(true);
    });

    it('identifies retryable patterns in error messages', () => {
      const timeoutError = new Error('Request timeout');
      const connectionError = new Error('Connection refused');
      
      expect(isRetryableError(timeoutError, [])).toBe(true);
      expect(isRetryableError(connectionError, [])).toBe(true);
    });
  });

  describe('calculateDelay', () => {
    it('calculates exponential backoff correctly', () => {
      const options = DEFAULT_RETRY_OPTIONS;
      
      const delay1 = calculateDelay(1, options);
      const delay2 = calculateDelay(2, options);
      const delay3 = calculateDelay(3, options);

      // Should be approximately baseDelay * backoffMultiplier^(attempt-1)
      expect(delay1).toBeGreaterThanOrEqual(options.baseDelay * 0.9);
      expect(delay1).toBeLessThanOrEqual(options.baseDelay * 1.1);
      
      expect(delay2).toBeGreaterThanOrEqual(options.baseDelay * 2 * 0.9);
      expect(delay2).toBeLessThanOrEqual(options.baseDelay * 2 * 1.1);
    });

    it('caps delay at maxDelay', () => {
      const options = { ...DEFAULT_RETRY_OPTIONS, maxDelay: 1000 };
      const delay = calculateDelay(10, options);
      
      expect(delay).toBeLessThanOrEqual(options.maxDelay * 1.1); // Account for jitter
    });
  });

  describe('withRetry', () => {
    it('succeeds on first attempt when operation succeeds', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await withRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('retries on retryable errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue('success');
      
      const promise = withRetry(operation, { maxAttempts: 2, baseDelay: 10 });
      
      // Fast-forward through the delay
      jest.advanceTimersByTime(50);
      
      const result = await promise;
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    }, 10000);

    it('stops retrying on non-retryable errors', async () => {
      const nonRetryableError = new AppError(
        ErrorType.VALIDATION_ERROR,
        'Invalid input',
        'VALIDATION_ERROR',
        null,
        new Date(),
        false
      );
      
      const operation = jest.fn().mockRejectedValue(nonRetryableError);
      
      await expect(withRetry(operation)).rejects.toThrow('Invalid input');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('calls onRetry callback', async () => {
      const onRetry = jest.fn();
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue('success');
      
      const promise = withRetry(operation, { 
        maxAttempts: 2, 
        baseDelay: 10,
        onRetry 
      });
      
      jest.advanceTimersByTime(50);
      await promise;
      
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    }, 10000);

    it('throws last error after max attempts', async () => {
      const error = new Error('persistent error');
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(withRetry(operation, { maxAttempts: 2, baseDelay: 10 })).rejects.toThrow('persistent error');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('retryFetch', () => {
    it('handles successful responses', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK'
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await retryFetch('/test');
      
      expect(result).toBe(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('/test', { signal: expect.any(AbortSignal) });
    });

    it('throws AppError for HTTP error status', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server error details')
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      await expect(retryFetch('/test', {}, { maxAttempts: 1 })).rejects.toThrow(AppError);
    });

    it('handles network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new TypeError('fetch failed'));
      
      await expect(retryFetch('/test', {}, { maxAttempts: 1 })).rejects.toThrow(AppError);
    });

    it('handles timeout errors', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      
      (global.fetch as jest.Mock).mockRejectedValue(abortError);
      
      await expect(retryFetch('/test', {}, { maxAttempts: 1 })).rejects.toThrow(AppError);
    });
  });

  describe('retryApiCall', () => {
    it('uses API-specific retry configuration', async () => {
      const apiCall = jest.fn()
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValue('success');
      
      const promise = retryApiCall(apiCall, { baseDelay: 10 });
      
      jest.advanceTimersByTime(50);
      
      const result = await promise;
      
      expect(result).toBe('success');
      expect(apiCall).toHaveBeenCalledTimes(2);
    }, 10000);
  });
});