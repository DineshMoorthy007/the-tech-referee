import { AppError, ErrorType } from './types';

/**
 * Retry configuration options
 */
export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableErrors: [
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
    'RATE_LIMIT_ERROR',
    'INTERNAL_ERROR',
    'SERVICE_UNAVAILABLE',
    'UNKNOWN_ERROR'
  ]
};

/**
 * Determines if an error is retryable based on configuration
 */
export function isRetryableError(error: Error, retryableErrors: string[]): boolean {
  if (error instanceof AppError) {
    return error.retryable && retryableErrors.includes(error.code);
  }
  
  // Network errors are generally retryable
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }
  
  // Check for common retryable error patterns
  const retryablePatterns = [
    /network/i,
    /timeout/i,
    /connection/i,
    /unavailable/i,
    /rate limit/i
  ];
  
  return retryablePatterns.some(pattern => pattern.test(error.message));
}

/**
 * Calculate delay for exponential backoff with jitter
 */
export function calculateDelay(attempt: number, options: RetryOptions): number {
  const exponentialDelay = options.baseDelay * Math.pow(options.backoffMultiplier, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, options.maxDelay);
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.1 * cappedDelay;
  
  return Math.floor(cappedDelay + jitter);
}

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper for async operations with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error = new Error('No attempts made');
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry if this is the last attempt
      if (attempt === config.maxAttempts) {
        break;
      }
      
      // Don't retry if error is not retryable
      if (!isRetryableError(lastError, config.retryableErrors)) {
        break;
      }
      
      // Calculate delay and wait
      const delay = calculateDelay(attempt, config);
      
      // Call retry callback if provided
      if (config.onRetry) {
        config.onRetry(attempt, lastError);
      }
      
      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message);
      await sleep(delay);
    }
  }
  
  // All attempts failed, throw the last error
  throw lastError;
}

/**
 * Retry wrapper specifically for API calls
 */
export async function retryApiCall<T>(
  apiCall: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const apiRetryOptions: RetryOptions = {
    ...DEFAULT_RETRY_OPTIONS,
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    retryableErrors: [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'RATE_LIMIT_ERROR',
      'INTERNAL_ERROR',
      'SERVICE_UNAVAILABLE',
      'UNKNOWN_ERROR',
      'API_ERROR'
    ],
    ...options
  };
  
  return withRetry(apiCall, apiRetryOptions);
}

/**
 * Retry wrapper for fetch requests with enhanced error handling
 */
export async function retryFetch(
  url: string,
  init?: RequestInit,
  options: Partial<RetryOptions> = {}
): Promise<Response> {
  return retryApiCall(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(url, {
        ...init,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Handle HTTP error status codes
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        
        throw new AppError(
          ErrorType.API_ERROR,
          `HTTP ${response.status}: ${response.statusText}`,
          response.status >= 500 ? 'SERVER_ERROR' : 'CLIENT_ERROR',
          { status: response.status, statusText: response.statusText, body: errorText },
          new Date(),
          response.status >= 500 || response.status === 429 // Server errors and rate limits are retryable
        );
      }
      
      return response;
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new AppError(
          ErrorType.NETWORK_ERROR,
          'Network connection failed',
          'NETWORK_ERROR',
          { originalError: error },
          new Date(),
          true
        );
      }
      
      // Handle timeout errors
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AppError(
          ErrorType.API_ERROR,
          'Request timed out',
          'TIMEOUT_ERROR',
          { originalError: error },
          new Date(),
          true
        );
      }
      
      // Handle unknown errors
      throw new AppError(
        ErrorType.UNKNOWN_ERROR,
        error instanceof Error ? error.message : 'Unknown error occurred',
        'UNKNOWN_ERROR',
        { originalError: error },
        new Date(),
        true
      );
    }
  }, options);
}

/**
 * Create a retry-enabled version of a function
 */
export function createRetryableFunction<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: Partial<RetryOptions> = {}
): (...args: T) => Promise<R> {
  return (...args: T) => withRetry(() => fn(...args), options);
}