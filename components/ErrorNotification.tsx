'use client';

import React, { useState, useEffect, useCallback } from 'react';
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

  const handleDismiss = useCallback(() => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 200);
  }, [onDismiss]);

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
  }, [error, autoHide, autoHideDelay, handleDismiss]);

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
          bgColor: 'bg-orange-900/30',
          borderColor: 'border-orange-500/60',
          textColor: 'text-orange-100',
          titleColor: 'text-orange-200',
          icon: AlertTriangle,
          iconColor: 'text-orange-300'
        };
      case ErrorType.VALIDATION_ERROR:
        return {
          bgColor: 'bg-yellow-900/30',
          borderColor: 'border-yellow-500/60',
          textColor: 'text-yellow-100',
          titleColor: 'text-yellow-200',
          icon: AlertCircle,
          iconColor: 'text-yellow-300'
        };
      case ErrorType.API_ERROR:
      case ErrorType.LLM_ERROR:
        return {
          bgColor: 'bg-red-900/30',
          borderColor: 'border-red-500/60',
          textColor: 'text-red-100',
          titleColor: 'text-red-200',
          icon: AlertTriangle,
          iconColor: 'text-red-300'
        };
      default:
        return {
          bgColor: 'bg-red-900/30',
          borderColor: 'border-red-500/60',
          textColor: 'text-red-100',
          titleColor: 'text-red-200',
          icon: AlertTriangle,
          iconColor: 'text-red-300'
        };
    }
  };

  // Get user-friendly error messages with hints
  const getUserFriendlyMessage = (error: AppError): { title: string; message: string; hints?: string[] } => {
    switch (error.type) {
      case ErrorType.NETWORK_ERROR:
        return {
          title: 'Connection Problem',
          message: 'Unable to connect to our servers. Please check your internet connection and try again.',
          hints: [
            'Check your internet connection',
            'Try refreshing the page',
            'Disable VPN if you\'re using one',
            'Try again in a few moments'
          ]
        };
      case ErrorType.VALIDATION_ERROR:
        // Extract specific validation hints based on error code
        const validationHints = getValidationHints(error.code, error.details);
        return {
          title: 'Input Error',
          message: error.message || 'Please check your input and try again.',
          hints: validationHints
        };
      case ErrorType.API_ERROR:
        // Provide specific reasons for different API errors
        return getApiErrorDetails(error);
      case ErrorType.LLM_ERROR:
        return {
          title: 'Analysis Generation Failed',
          message: 'The AI service couldn\'t generate a comparison for these technologies.',
          hints: [
            'Try using more common technology names',
            'Check spelling of technology names',
            'Use full names instead of abbreviations',
            'Ensure both technologies are real and comparable',
            'Try again in a few moments'
          ]
        };
      case ErrorType.PARSING_ERROR:
        return {
          title: 'Response Processing Failed',
          message: 'The AI generated a response that couldn\'t be properly formatted.',
          hints: [
            'Try using different technology names',
            'Use more specific technology names',
            'Try simpler, well-known technologies',
            'Try again in a few moments'
          ]
        };
      default:
        return {
          title: 'Unexpected Error',
          message: error.message || 'Something went wrong. Please try again.',
          hints: [
            'Try refreshing the page',
            'Check your internet connection',
            'Try again in a few moments',
            'Contact support if the problem persists'
          ]
        };
    }
  };

  // Get detailed API error information with specific reasons and hints
  const getApiErrorDetails = (error: AppError): { title: string; message: string; hints: string[] } => {
    switch (error.code) {
      case 'RATE_LIMIT_EXCEEDED':
        return {
          title: 'Too Many Requests',
          message: 'You\'ve exceeded the request limit. Our system prevents spam and ensures fair usage.',
          hints: [
            'Wait 1-2 minutes before trying again',
            'Avoid rapid successive requests',
            'Consider bookmarking frequent comparisons',
            'Rate limit: 10 requests per minute'
          ]
        };
      
      case 'TIMEOUT_ERROR':
        return {
          title: 'Request Timed Out',
          message: 'The analysis took too long to complete, possibly due to complex technology names.',
          hints: [
            'Try using shorter technology names',
            'Use common, well-known technologies',
            'Check your internet connection speed',
            'Try again in a few moments'
          ]
        };
      
      case 'SERVICE_ERROR':
        return {
          title: 'AI Service Configuration Issue',
          message: 'There\'s a problem with our AI service configuration. Our team has been notified.',
          hints: [
            'This is a temporary server-side issue',
            'Try again in 5-10 minutes',
            'No action needed on your part',
            'Contact support if this persists for over an hour'
          ]
        };
      
      case 'insufficient_quota':
        return {
          title: 'Service Quota Exceeded',
          message: 'Our AI service has reached its usage limit for this period.',
          hints: [
            'This is a temporary limitation',
            'Try again in 15-30 minutes',
            'Peak usage times may have longer waits',
            'Service will automatically resume'
          ]
        };
      
      case 'rate_limit_exceeded':
        return {
          title: 'AI Service Overloaded',
          message: 'The AI service is experiencing high demand and is temporarily limiting requests.',
          hints: [
            'High traffic is causing temporary delays',
            'Try again in 2-5 minutes',
            'Consider trying during off-peak hours',
            'This helps maintain service quality for everyone'
          ]
        };
      
      case 'model_overloaded':
        return {
          title: 'AI Model Overloaded',
          message: 'The AI model is currently processing too many requests and needs a moment to catch up.',
          hints: [
            'The AI model is temporarily busy',
            'Try again in 1-3 minutes',
            'This ensures quality responses for all users',
            'Peak times may have longer waits'
          ]
        };
      
      case 'invalid_api_key':
        return {
          title: 'Authentication Problem',
          message: 'There\'s an issue with our service authentication. This is a server configuration problem.',
          hints: [
            'This is a server-side configuration issue',
            'Our team has been automatically notified',
            'Try again in 10-15 minutes',
            'Contact support if this persists'
          ]
        };
      
      case 'context_length_exceeded':
        return {
          title: 'Request Too Complex',
          message: 'The technology comparison request is too complex for our AI to process.',
          hints: [
            'Try using shorter technology names',
            'Use simpler, more common technology names',
            'Avoid very long or complex technology descriptions',
            'Break complex comparisons into simpler ones'
          ]
        };
      
      case 'NETWORK_ERROR':
        return {
          title: 'Network Connection Failed',
          message: 'Unable to reach our servers due to a network connectivity issue.',
          hints: [
            'Check your internet connection',
            'Try disabling VPN or proxy',
            'Check if your firewall is blocking the request',
            'Try switching to a different network'
          ]
        };
      
      case 'RESOURCE_ERROR':
        return {
          title: 'Server Resource Limit',
          message: 'The request requires more server resources than currently available.',
          hints: [
            'Try using simpler technology names',
            'Avoid very complex or niche technologies',
            'Try again during off-peak hours',
            'This helps maintain service stability'
          ]
        };
      
      case 'INVALID_JSON':
        return {
          title: 'Request Format Error',
          message: 'The request couldn\'t be processed due to a formatting issue.',
          hints: [
            'Try refreshing the page and entering again',
            'Clear your browser cache',
            'Ensure you\'re using a modern browser',
            'Contact support if this keeps happening'
          ]
        };
      
      case 'INVALID_CONTENT_TYPE':
        return {
          title: 'Request Type Error',
          message: 'The request was sent in an incorrect format that our server couldn\'t process.',
          hints: [
            'This is likely a browser or network issue',
            'Try refreshing the page',
            'Clear your browser cache and cookies',
            'Try using a different browser'
          ]
        };
      
      default:
        // For unknown API errors, try to extract meaningful information
        const errorMessage = error.message || 'An unknown service error occurred';
        let specificHints = [
          'Try again in a few minutes',
          'Check if the issue persists',
          'Contact support if this continues'
        ];
        
        // Analyze error message for specific guidance
        if (errorMessage.toLowerCase().includes('timeout')) {
          specificHints = [
            'The request timed out - try simpler inputs',
            'Check your internet connection',
            'Try again in a few moments'
          ];
        } else if (errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('limit')) {
          specificHints = [
            'Service usage limit reached temporarily',
            'Try again in 15-30 minutes',
            'This helps maintain service quality'
          ];
        } else if (errorMessage.toLowerCase().includes('connection')) {
          specificHints = [
            'Network connection issue detected',
            'Check your internet connection',
            'Try refreshing the page'
          ];
        }
        
        return {
          title: 'Service Issue',
          message: errorMessage,
          hints: specificHints
        };
    }
  };

  // Get specific validation hints based on error code and details
  const getValidationHints = (errorCode?: string, errorDetails?: any): string[] => {
    const baseHints = [
      'Use real technology names like "React", "Python", "Docker"',
      'Check spelling and use common names',
      'Avoid random characters or gibberish'
    ];

    switch (errorCode) {
      case 'MISSING_TECH1':
      case 'MISSING_TECH2':
        return [
          'Both technology fields are required',
          'Enter a technology name in each field',
          'Examples: "React", "Vue", "Angular"'
        ];
      
      case 'INVALID_TECH1_FORMAT':
      case 'INVALID_TECH2_FORMAT':
        if (typeof errorDetails === 'string' && errorDetails.includes('random characters')) {
          return [
            'Avoid random character sequences',
            'Use actual technology names only',
            'Examples: "JavaScript", "PostgreSQL", "Kubernetes"',
            'Check for typos in technology names'
          ];
        }
        if (typeof errorDetails === 'string' && errorDetails.includes('special characters')) {
          return [
            'Use only letters, numbers, spaces, dots, and hyphens',
            'Avoid symbols like @, %, &, etc.',
            'Examples: "Node.js", "C++", "C#" are valid'
          ];
        }
        if (typeof errorDetails === 'string' && errorDetails.includes('too short')) {
          return [
            'Technology names must be at least 2 characters',
            'Use full names instead of single letters',
            'Examples: "Go" instead of "G", "R" should be "R Language"'
          ];
        }
        return [
          'Use recognized technology names',
          'Check spelling and capitalization',
          'Examples: "React", "Python", "AWS", "Docker"',
          'Avoid abbreviations unless commonly used'
        ];
      
      case 'DUPLICATE_TECHNOLOGIES':
        return [
          'Choose two different technologies to compare',
          'Each field should have a unique technology',
          'Examples: "React vs Vue", "MySQL vs PostgreSQL"'
        ];
      
      case 'INVALID_JSON':
        return [
          'Check your input format',
          'Ensure proper JSON structure',
          'Try refreshing the page and entering again'
        ];
      
      case 'INVALID_CONTENT_TYPE':
        return [
          'This appears to be a technical issue',
          'Try refreshing the page',
          'Contact support if the problem persists'
        ];
      
      default:
        return baseHints;
    }
  };

  const styling = getErrorStyling(error.type);
  const { title, message, hints } = getUserFriendlyMessage(error);
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
          backdrop-blur-md shadow-2xl
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

            {/* Helpful Hints */}
            {hints && hints.length > 0 && (
              <div className="mt-3 p-3 bg-black/20 rounded-md backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Info className={`w-4 h-4 ${styling.iconColor}`} />
                  <span className={`text-xs font-medium ${styling.titleColor}`}>
                    Helpful Tips:
                  </span>
                </div>
                <ul className="space-y-1">
                  {hints.map((hint, index) => (
                    <li key={index} className={`text-xs ${styling.textColor} flex items-start gap-2`}>
                      <span className={`text-xs ${styling.iconColor} mt-0.5`}>•</span>
                      <span>{hint}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Development details */}
            {process.env.NODE_ENV === 'development' && error.details && (
              <details className="mt-2">
                <summary className={`text-xs ${styling.textColor} cursor-pointer hover:opacity-80`}>
                  Technical Details
                </summary>
                <pre className={`mt-1 text-xs ${styling.textColor} bg-black/30 rounded p-2 overflow-auto max-h-32 backdrop-blur-sm`}>
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
                  ${styling.iconColor} hover:bg-white/20 backdrop-blur-sm
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
                ${styling.iconColor} hover:bg-white/20 backdrop-blur-sm
              `}
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Retry suggestion for retryable errors */}
        {error.retryable && onRetry && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <button
              onClick={handleRetry}
              className={`
                w-full flex items-center justify-center gap-2 px-3 py-2 
                bg-white/15 hover:bg-white/25 rounded-md transition-colors
                text-sm font-medium ${styling.textColor} backdrop-blur-sm
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
      <div className="max-w-md w-full pointer-events-auto bg-green-900/30 border-2 border-green-500/60 rounded-lg p-4 backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <p className="text-green-200 text-sm flex-1">{message}</p>
          <button
            onClick={() => {
              setIsVisible(false);
              onDismiss?.();
            }}
            className="p-1 rounded-md text-green-400 hover:bg-white/20 transition-colors flex-shrink-0 backdrop-blur-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}