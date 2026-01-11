'use client';

import React, { useState, useCallback } from 'react';
import MatchupInput from '@/components/MatchupInput';
import LoadingState from '@/components/LoadingState';
import VerdictDisplay from '@/components/VerdictDisplay';
import ErrorNotification from '@/components/ErrorNotification';
import { RefereeAnalysis, RefereeResponse, AppError, ErrorType } from '@/lib/types';
import { retryFetch } from '@/lib/retry';

/**
 * Main page component that orchestrates the complete user flow
 * Implements Requirements 1.3, 1.5, 2.4 from the Tech Referee specification
 */
export default function Home() {
  const [analysis, setAnalysis] = useState<RefereeAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [lastRequest, setLastRequest] = useState<{ tech1: string; tech2: string } | null>(null);

  /**
   * Technology name normalization and alias support
   * Requirements 1.5: Handle common technology aliases and variations
   */
  const normalizeTechnologyName = (tech: string): string => {
    const aliases: Record<string, string> = {
      // JavaScript frameworks
      'reactjs': 'React',
      'react.js': 'React',
      'vuejs': 'Vue',
      'vue.js': 'Vue',
      'angularjs': 'Angular',
      'angular.js': 'Angular',
      'nextjs': 'Next.js',
      'next.js': 'Next.js',
      'nuxtjs': 'Nuxt.js',
      'nuxt.js': 'Nuxt.js',
      
      // Databases
      'postgresql': 'PostgreSQL',
      'postgres': 'PostgreSQL',
      'mysql': 'MySQL',
      'mongodb': 'MongoDB',
      'mongo': 'MongoDB',
      'redis': 'Redis',
      
      // Cloud providers
      'aws': 'Amazon Web Services',
      'amazon web services': 'Amazon Web Services',
      'gcp': 'Google Cloud Platform',
      'google cloud': 'Google Cloud Platform',
      'azure': 'Microsoft Azure',
      'microsoft azure': 'Microsoft Azure',
      
      // Programming languages
      'js': 'JavaScript',
      'javascript': 'JavaScript',
      'ts': 'TypeScript',
      'typescript': 'TypeScript',
      'py': 'Python',
      'python': 'Python',
      'java': 'Java',
      'c#': 'C#',
      'csharp': 'C#',
      'go': 'Go',
      'golang': 'Go',
      'rust': 'Rust',
      'php': 'PHP',
      'ruby': 'Ruby',
      
      // Tools and platforms
      'docker': 'Docker',
      'kubernetes': 'Kubernetes',
      'k8s': 'Kubernetes',
      'jenkins': 'Jenkins',
      'github actions': 'GitHub Actions',
      'gitlab ci': 'GitLab CI',
      'terraform': 'Terraform',
      'ansible': 'Ansible'
    };

    const normalized = tech.toLowerCase().trim();
    return aliases[normalized] || tech.trim();
  };

  /**
   * Enhanced API call with retry logic and better error handling
   * Requirements 5.2, 5.5: Retry logic and user-friendly error messages
   */
  const makeApiCall = useCallback(async (tech1: string, tech2: string): Promise<RefereeAnalysis> => {
    try {
      // Normalize technology names
      const normalizedTech1 = normalizeTechnologyName(tech1);
      const normalizedTech2 = normalizeTechnologyName(tech2);

      // Make API request with retry logic
      const response = await retryFetch('/api/referee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tech1: normalizedTech1,
          tech2: normalizedTech2
        }),
      }, {
        maxAttempts: 3,
        baseDelay: 1000,
        onRetry: (attempt, error) => {
          console.log(`Retry attempt ${attempt} for API call:`, error.message);
        }
      });

      const data: RefereeResponse = await response.json();

      if (!data.success || !data.data) {
        throw new AppError(
          ErrorType.API_ERROR,
          data.error?.message || 'Failed to get analysis',
          data.error?.code || 'API_ERROR',
          data.error,
          new Date(),
          true // API errors are generally retryable
        );
      }

      return data.data;

    } catch (err) {
      console.error('API call failed:', err);
      
      if (err instanceof AppError) {
        throw err;
      }
      
      // Handle different error types
      if (err instanceof TypeError && err.message.includes('fetch')) {
        throw new AppError(
          ErrorType.NETWORK_ERROR,
          'Unable to connect to the server. Please check your internet connection.',
          'NETWORK_ERROR',
          err,
          new Date(),
          true
        );
      }
      
      throw new AppError(
        ErrorType.UNKNOWN_ERROR,
        'An unexpected error occurred. Please try again.',
        'UNKNOWN_ERROR',
        err,
        new Date(),
        true
      );
    }
  }, []);

  /**
   * Handle form submission with enhanced error handling
   * Requirements 1.3: Handle loading states and error conditions
   */
  const handleSubmit = async (tech1: string, tech2: string) => {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    
    // Store request for retry functionality
    setLastRequest({ tech1, tech2 });

    try {
      const result = await makeApiCall(tech1, tech2);
      setAnalysis(result);
      setError(null); // Clear any previous errors
    } catch (err) {
      if (err instanceof AppError) {
        setError(err);
      } else {
        setError(new AppError(
          ErrorType.UNKNOWN_ERROR,
          'An unexpected error occurred. Please try again.',
          'UNKNOWN_ERROR',
          err,
          new Date(),
          true
        ));
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle retry for retryable errors
   */
  const handleRetry = useCallback(async () => {
    if (lastRequest) {
      await handleSubmit(lastRequest.tech1, lastRequest.tech2);
    }
  }, [lastRequest, makeApiCall]);

  /**
   * Handle error dismissal
   */
  const handleErrorDismiss = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reset to initial state
   */
  const handleReset = useCallback(() => {
    setAnalysis(null);
    setError(null);
    setLoading(false);
    setLastRequest(null);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Error Notification */}
      <ErrorNotification
        error={error}
        onDismiss={handleErrorDismiss}
        onRetry={error?.retryable ? handleRetry : undefined}
        position="top"
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        
        {/* Show input form when no analysis is displayed */}
        {!analysis && !loading && (
          <div className="max-w-5xl mx-auto animate-fade-in">
            <MatchupInput 
              onSubmit={handleSubmit}
              loading={loading}
              disabled={loading}
            />
          </div>
        )}

        {/* Show loading state */}
        {loading && (
          <div className="max-w-5xl mx-auto animate-scale-in">
            <LoadingState />
          </div>
        )}

        {/* Show analysis results with staggered animations */}
        {analysis && !loading && (
          <div className="max-w-8xl mx-auto">
            <div className="animate-fade-in">
              <VerdictDisplay analysis={analysis} />
            </div>
            
            {/* Enhanced back to input button */}
            <div className="text-center mt-8 lg:mt-12 animate-fade-in animate-delay-500">
              <button
                onClick={handleReset}
                className="group inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white rounded-lg transition-all duration-300 font-medium text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-500 hover-lift animate-glow"
                aria-label="Start a new technology comparison"
              >
                <span className="transition-transform duration-300 group-hover:scale-110">🔄</span>
                Compare Different Technologies
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

