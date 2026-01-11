'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { ErrorBoundaryState, AppError, ErrorType } from '@/lib/types';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: AppError, retry: () => void) => ReactNode;
  onError?: (error: AppError, errorInfo: any) => void;
}

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree and displays
 * a fallback UI with recovery options.
 * 
 * Implements Requirements 5.2, 5.5: Error handling and user feedback
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Convert generic errors to AppError for consistent handling
    const appError = error instanceof AppError 
      ? error 
      : new AppError(
          ErrorType.UNKNOWN_ERROR,
          error.message || 'An unexpected error occurred',
          'COMPONENT_ERROR',
          { originalError: error },
          new Date(),
          true
        );

    return {
      hasError: true,
      error: appError
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // Call optional error handler
    if (this.props.onError) {
      const appError = error instanceof AppError 
        ? error 
        : new AppError(
            ErrorType.UNKNOWN_ERROR,
            error.message || 'An unexpected error occurred',
            'COMPONENT_ERROR',
            { originalError: error },
            new Date(),
            true
          );
      
      this.props.onError(appError, errorInfo);
    }

    // Update state with error info
    this.setState(prevState => ({
      ...prevState,
      errorInfo
    }));
  }

  /**
   * Reset error boundary state to retry rendering
   */
  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  /**
   * Reload the entire page as a last resort
   */
  handleReload = () => {
    window.location.reload();
  };

  /**
   * Navigate to home page
   */
  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-red-900/20 border-2 border-red-500/50 rounded-lg p-6 text-center">
              <div className="mb-6">
                <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-red-300 mb-2">
                  Something Went Wrong
                </h1>
                <p className="text-red-200 mb-4">
                  {this.state.error.message}
                </p>
                
                {/* Error details for debugging */}
                {process.env.NODE_ENV === 'development' && (
                  <details className="text-left text-sm text-red-300 mb-4">
                    <summary className="cursor-pointer hover:text-red-200 mb-2">
                      Technical Details
                    </summary>
                    <div className="bg-red-950/50 rounded p-3 overflow-auto">
                      <p><strong>Type:</strong> {this.state.error.type}</p>
                      <p><strong>Code:</strong> {this.state.error.code}</p>
                      <p><strong>Time:</strong> {this.state.error.timestamp.toLocaleString()}</p>
                      {this.state.error.details && (
                        <div className="mt-2">
                          <strong>Details:</strong>
                          <pre className="mt-1 text-xs overflow-auto">
                            {typeof this.state.error.details === 'string' 
                              ? this.state.error.details 
                              : JSON.stringify(this.state.error.details, null, 2)
                            }
                          </pre>
                        </div>
                      )}
                      {this.state.errorInfo && (
                        <div className="mt-2">
                          <strong>Component Stack:</strong>
                          <pre className="mt-1 text-xs overflow-auto">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>

              {/* Recovery actions */}
              <div className="space-y-3">
                {this.state.error.retryable && (
                  <button
                    onClick={this.handleRetry}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </button>
                )}
                
                <button
                  onClick={this.handleGoHome}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Go to Home
                </button>
                
                <button
                  onClick={this.handleReload}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </button>
              </div>

              {/* Help text */}
              <div className="mt-6 text-sm text-gray-400">
                <p>If this problem persists, please try refreshing the page or contact support.</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary for functional components
 */
export function useErrorHandler() {
  return (error: Error, errorInfo?: any) => {
    // Convert to AppError and throw to be caught by ErrorBoundary
    const appError = error instanceof AppError 
      ? error 
      : new AppError(
          ErrorType.UNKNOWN_ERROR,
          error.message || 'An unexpected error occurred',
          'HOOK_ERROR',
          { originalError: error, errorInfo },
          new Date(),
          true
        );
    
    throw appError;
  };
}

export default ErrorBoundary;