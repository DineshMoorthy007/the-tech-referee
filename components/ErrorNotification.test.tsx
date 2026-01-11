import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorNotification, { SuccessNotification } from '@/components/ErrorNotification';
import { AppError, ErrorType } from '@/lib/types';

describe('ErrorNotification', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when no error is provided', () => {
    const { container } = render(
      <ErrorNotification error={null} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('displays error message for network errors', () => {
    const error = new AppError(
      ErrorType.NETWORK_ERROR,
      'Network failed',
      'NETWORK_ERROR',
      null,
      new Date(),
      true
    );

    render(<ErrorNotification error={error} />);

    expect(screen.getByText('Connection Problem')).toBeInTheDocument();
    expect(screen.getByText(/Unable to connect to our servers/)).toBeInTheDocument();
  });

  it('displays error message for validation errors', () => {
    const error = new AppError(
      ErrorType.VALIDATION_ERROR,
      'Invalid input provided',
      'VALIDATION_ERROR',
      null,
      new Date(),
      false
    );

    render(<ErrorNotification error={error} />);

    expect(screen.getByText('Input Error')).toBeInTheDocument();
    expect(screen.getByText('Invalid input provided')).toBeInTheDocument();
  });

  it('displays error message for API errors', () => {
    const error = new AppError(
      ErrorType.API_ERROR,
      'Service unavailable',
      'API_ERROR',
      null,
      new Date(),
      true
    );

    render(<ErrorNotification error={error} />);

    expect(screen.getByText('Service Error')).toBeInTheDocument();
    expect(screen.getByText('Service unavailable')).toBeInTheDocument();
  });

  it('shows retry button for retryable errors', () => {
    const error = new AppError(
      ErrorType.NETWORK_ERROR,
      'Network failed',
      'NETWORK_ERROR',
      null,
      new Date(),
      true
    );

    const onRetry = jest.fn();
    render(<ErrorNotification error={error} onRetry={onRetry} />);

    const retryButton = screen.getByTitle('Retry');
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalled();
  });

  it('does not show retry button for non-retryable errors', () => {
    const error = new AppError(
      ErrorType.VALIDATION_ERROR,
      'Invalid input',
      'VALIDATION_ERROR',
      null,
      new Date(),
      false
    );

    render(<ErrorNotification error={error} />);

    expect(screen.queryByTitle('Retry')).not.toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', async () => {
    const error = new AppError(
      ErrorType.NETWORK_ERROR,
      'Network failed',
      'NETWORK_ERROR',
      null,
      new Date(),
      true
    );

    const onDismiss = jest.fn();
    render(<ErrorNotification error={error} onDismiss={onDismiss} />);

    const dismissButton = screen.getByTitle('Dismiss');
    
    await act(async () => {
      fireEvent.click(dismissButton);
      // Wait for the animation timeout
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalled();
    });
  });

  it('auto-hides non-retryable errors when autoHide is enabled', async () => {
    const error = new AppError(
      ErrorType.VALIDATION_ERROR,
      'Invalid input',
      'VALIDATION_ERROR',
      null,
      new Date(),
      false
    );

    const onDismiss = jest.fn();
    render(
      <ErrorNotification 
        error={error} 
        onDismiss={onDismiss}
        autoHide={true}
        autoHideDelay={1000}
      />
    );

    expect(screen.getByText('Input Error')).toBeInTheDocument();

    // Fast-forward time
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalled();
    });
  });

  it('does not auto-hide retryable errors', () => {
    const error = new AppError(
      ErrorType.NETWORK_ERROR,
      'Network failed',
      'NETWORK_ERROR',
      null,
      new Date(),
      true
    );

    const onDismiss = jest.fn();
    render(
      <ErrorNotification 
        error={error} 
        onDismiss={onDismiss}
        autoHide={true}
        autoHideDelay={1000}
      />
    );

    jest.advanceTimersByTime(1000);

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('shows technical details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const error = new AppError(
      ErrorType.API_ERROR,
      'API failed',
      'API_ERROR',
      { debugInfo: 'test details' },
      new Date(),
      true
    );

    render(<ErrorNotification error={error} />);

    expect(screen.getByText('Technical Details')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('handles rate limit errors with specific messaging', () => {
    const error = new AppError(
      ErrorType.API_ERROR,
      'Rate limit exceeded',
      'RATE_LIMIT_ERROR',
      null,
      new Date(),
      true
    );

    render(<ErrorNotification error={error} />);

    expect(screen.getByText('Too Many Requests')).toBeInTheDocument();
    expect(screen.getByText(/too many requests/)).toBeInTheDocument();
  });

  it('handles timeout errors with specific messaging', () => {
    const error = new AppError(
      ErrorType.API_ERROR,
      'Request timed out',
      'TIMEOUT_ERROR',
      null,
      new Date(),
      true
    );

    render(<ErrorNotification error={error} />);

    expect(screen.getByText('Request Timed Out')).toBeInTheDocument();
    expect(screen.getByText(/took too long/)).toBeInTheDocument();
  });
});

describe('SuccessNotification', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('displays success message', () => {
    render(<SuccessNotification message="Operation completed successfully" />);

    expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
  });

  it('auto-hides after specified delay', async () => {
    const onDismiss = jest.fn();
    render(
      <SuccessNotification 
        message="Success!" 
        onDismiss={onDismiss}
        autoHideDelay={1000}
      />
    );

    expect(screen.getByText('Success!')).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalled();
    });
  });

  it('can be manually dismissed', () => {
    const onDismiss = jest.fn();
    render(
      <SuccessNotification 
        message="Success!" 
        onDismiss={onDismiss}
      />
    );

    const dismissButton = screen.getByRole('button');
    fireEvent.click(dismissButton);

    expect(onDismiss).toHaveBeenCalled();
  });
});