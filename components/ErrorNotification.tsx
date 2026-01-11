'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, RefreshCw, Info, AlertCircle, CheckCircle } from 'lucide-react';
import { AppError, ErrorType } from '@/lib/types';

export interface ErrorNotificationProps {
  error: AppError | null;
  onDismiss?: () => void;
  onRetry?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
  position?: 'top' | 'bottom';
}

/**
 * Error Notification Component
 * 
 * Displays user-friendly error messages with appropriate actions and styling.
 * Supports different error types with contextual icons and colors.
 * 
 * Implements Requirements 5.2, 5.5: User-friendly error messages and recovery
 */
export default function ErrorNotification({
  error,
  onDismiss,
  onRetry,
  autoHide = false,
  autoHideDelay = 5000,
  position = 'top'
}: ErrorNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (error) {
      setIsVisible(true);
      setIsAnimating(true);
      
      if (autoHide && !error.retryable) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, autoHideDelay);
        
        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
      setIsAnimating(false);
    }
  }, [error, autoHide, autoHideDelay]);

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 200);
  };

  const handleRetry = () => {
    handleDismiss();
    onRetry?.();
  };

  if (!error || !isVisible) {
    return null;
  }

  // Get error styling based on type
  const getErrorStyling = (errorType: ErrorType) => {
    switch (errorType) {
      case ErrorType.NETWORK_ERROR:
        return {
          bgColor: 'bg-orange-900/20',
          borderColor: 'border-orange-500/50',
          textColor: 'text-orange-200',
          titleColor: 'text-orange-300',
          icon: AlertTriangle,
          iconColor: 'text-orange-400'
        };
      case ErrorType.VALIDATION_ERROR:
        return {
          bgColor: 'bg-yellow-900/20',
          borderColor: 'border-yellow-500/50',
          textColor: 'text-yellow-200',
          titleColor: 'text-yellow-300',
          icon: AlertCircle,
          iconColor: 'text-yellow-400'
        };
      case ErrorType.API_ERROR:
      case ErrorType.LLM_ERROR:
        return {
          bgColor: 'bg-red-900/20',
          borderColor: 'border-red-500/50',
          textColor: 'text-red-200',
          titleColor: 'text-red-300',
          icon: AlertTriangle,
          iconColor: 'text-red-400'
        };
      default:
        return {
          bgColor: 'bg-red-900/20',
          borderColor: 'border-red-500/50',
          textColor: 'text-red-200',
          titleColor: 'text-red-300',
          icon: AlertTriangle,
          iconColor: 'text-red-400'
        };
    }
  };

  // Get user-friendly error messages
  const getUserFriendlyMessage = (error: AppError): { title: string; message: string } => {
    switch (error.type) {
      case ErrorType.NETWORK_ERROR:
        return {
          title: 'Connection Problem',
          message: 'Unable to connect to our servers. Please check your internet connection and try again.'
        };
      case ErrorType.VALIDATION_ERROR:
        return {
          title: 'Input Error',
          message: error.message || 'Please check your input and try again.'
        };
      case ErrorType.API_ERROR:
        if (error.code === 'RATE_LIMIT_ERROR') {
          return {
            title: 'Too Many Requests',
            message: 'You\'ve made too many requests. Please wait a moment and try again.'
          };
        }
        if (error.code === 'TIMEOUT_ERROR') {
          return {
            title: 'Request Timed Out',
            message: 'The request took too long to complete. Please try again.'
          };
        }
        return {
          title: 'Service Error',
          message: error.message || 'Our service is experiencing issues. Please try again in a moment.'
        };
      case ErrorType.LLM_ERROR:
        return {
          title: 'Analysis Error',
          message: 'Unable to generate the technology comparison. Please try again with different technologies.'
        };
      case ErrorType.PARSING_ERROR:
        return {
          title: 'Processing Error',
          message: 'We received an unexpected response. Please try again.'
        };
      default:
        return {
          title: 'Unexpected Error',
          message: error.message || 'Something went wrong. Please try again.'
        };
    }
  };

  const styling = getErrorStyling(error.type);
  const { title, message } = getUserFriendlyMessage(error);
  const Icon = styling.icon;

  const positionClasses = position === 'top' 
    ? 'top-4' 
    : 'bottom-4';

  const animationClasses = isAnimating
    ? 'translate-y-0 opacity-100'
    : position === 'top'
      ? '-translate-y-full opacity-0'
      : 'translate-y-full opacity-0';

  return (
    <div className={`fixed ${positionClasses} left-4 right-4 z-50 flex justify-center pointer-events-none`}>
      <div 
        className={`
          max-w-md w-full pointer-events-auto
          ${styling.bgColor} ${styling.borderColor} border-2 rounded-lg p-4
          transform transition-all duration-200 ease-out
          ${animationClasses}
        `}
      >
        <div className="flex items-start gap-3">
          {/* Error Icon */}
          <div className="flex-shrink-0 mt-0.5">
            <Icon className={`w-5 h-5 ${styling.iconColor}`} />
          </div>

          {/* Error Content */}
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold ${styling.titleColor} mb-1`}>
              {title}
            </h3>
            <p className={`text-sm ${styling.textColor} leading-relaxed`}>
              {message}
            </p>

            {/* Development details */}
            {process.env.NODE_ENV === 'development' && error.details && (
              <details className="mt-2">
                <summary className={`text-xs ${styling.textColor} cursor-pointer hover:opacity-80`}>
                  Technical Details
                </summary>
                <pre className={`mt-1 text-xs ${styling.textColor} bg-black/20 rounded p-2 overflow-auto max-h-32`}>
                  {typeof error.details === 'string' 
                    ? error.details 
                    : JSON.stringify(error.details, null, 2)
                  }
                </pre>
              </details>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex-shrink-0 flex items-center gap-2">
            {error.retryable && onRetry && (
              <button
                onClick={handleRetry}
                className={`
                  p-1.5 rounded-md transition-colors
                  ${styling.iconColor} hover:bg-white/10
                `}
                title="Retry"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            
            <button
              onClick={handleDismiss}
              className={`
                p-1.5 rounded-md transition-colors
                ${styling.iconColor} hover:bg-white/10
              `}
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Retry suggestion for retryable errors */}
        {error.retryable && onRetry && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <button
              onClick={handleRetry}
              className={`
                w-full flex items-center justify-center gap-2 px-3 py-2 
                bg-white/10 hover:bg-white/20 rounded-md transition-colors
                text-sm font-medium ${styling.textColor}
              `}
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Success notification component for positive feedback
 */
export function SuccessNotification({
  message,
  onDismiss,
  autoHide = true,
  autoHideDelay = 3000
}: {
  message: string;
  onDismiss?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, autoHideDelay);
      
      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, onDismiss]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 flex justify-center pointer-events-none">
      <div className="max-w-md w-full pointer-events-auto bg-green-900/20 border-2 border-green-500/50 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <p className="text-green-200 text-sm flex-1">{message}</p>
          <button
            onClick={() => {
              setIsVisible(false);
              onDismiss?.();
            }}
            className="p-1 rounded-md text-green-400 hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}