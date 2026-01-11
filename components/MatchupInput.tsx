'use client';

import React, { useState, FormEvent } from 'react';
import { Zap, ArrowRight } from 'lucide-react';
import { MatchupInputProps, ValidationResult, ValidationError } from '@/lib/types';

/**
 * MatchupInput Component
 * 
 * Captures user input for technology comparison with validation and loading states.
 * Implements Requirements 1.1, 1.2, 1.4 from the Tech Referee specification.
 */
export default function MatchupInput({ 
  onSubmit, 
  loading = false, 
  disabled = false, 
  initialValues 
}: MatchupInputProps) {
  const [tech1, setTech1] = useState(initialValues?.tech1 || '');
  const [tech2, setTech2] = useState(initialValues?.tech2 || '');
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState({ tech1: false, tech2: false });

  /**
   * Validates technology inputs according to requirements
   * Requirements 1.2, 1.4: Validate non-empty inputs and provide feedback
   */
  const validateInputs = (technology1: string, technology2: string): ValidationResult => {
    const validationErrors: ValidationError[] = [];

    // Check if tech1 is empty or only whitespace
    if (!technology1.trim()) {
      validationErrors.push({
        field: 'tech1',
        message: 'First technology is required',
        code: 'REQUIRED_FIELD'
      });
    }

    // Check if tech2 is empty or only whitespace
    if (!technology2.trim()) {
      validationErrors.push({
        field: 'tech2',
        message: 'Second technology is required',
        code: 'REQUIRED_FIELD'
      });
    }

    // Check if both technologies are the same (case-insensitive)
    if (technology1.trim().toLowerCase() === technology2.trim().toLowerCase() && technology1.trim()) {
      validationErrors.push({
        field: 'both',
        message: 'Please enter two different technologies',
        code: 'DUPLICATE_TECHNOLOGIES'
      });
    }

    return {
      isValid: validationErrors.length === 0,
      errors: validationErrors
    };
  };

  /**
   * Handles form submission with validation
   * Requirements 1.1, 1.3: Submit handling and loading state triggers
   */
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Mark all fields as touched for validation display
    setTouched({ tech1: true, tech2: true });
    
    const validation = validateInputs(tech1, tech2);
    setErrors(validation.errors);

    if (validation.isValid && !loading && !disabled) {
      // Normalize technology names (trim whitespace)
      const normalizedTech1 = tech1.trim();
      const normalizedTech2 = tech2.trim();
      
      onSubmit(normalizedTech1, normalizedTech2);
    }
  };

  /**
   * Handles input blur events for validation feedback
   */
  const handleBlur = (field: 'tech1' | 'tech2') => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Validate on blur if field has been touched
    const validation = validateInputs(tech1, tech2);
    setErrors(validation.errors);
  };

  /**
   * Gets error message for a specific field
   */
  const getFieldError = (field: 'tech1' | 'tech2'): string | undefined => {
    const fieldError = errors.find(error => error.field === field);
    
    if (fieldError && touched[field]) {
      return fieldError.message;
    }
    
    return undefined;
  };

  const isFormValid = validateInputs(tech1, tech2).isValid;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="text-center mb-8 lg:mb-12 animate-slide-up">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 animate-pulse-slow" aria-hidden="true" />
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold gradient-text">
            Tech Referee
          </h1>
        </div>
        <p className="text-gray-300 text-base sm:text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed">
          Get objective technology comparisons with trade-offs, scenarios, and hidden costs
        </p>
      </header>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6 lg:space-y-8" noValidate>
        <div className="gradient-border hover-lift animate-fade-in animate-delay-200">
          <div className="bg-gray-800 rounded-lg p-4 sm:p-6 lg:p-8 border border-gray-700 shadow-xl">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-white mb-4 lg:mb-6 flex items-center gap-2">
              <span className="text-yellow-400 animate-pulse" role="img" aria-label="Boxing gloves">🥊</span>
              The Matchup
            </h2>
            
            <div className="space-y-4 lg:space-y-6">
              {/* Technology Inputs Container */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                {/* Technology 1 Input */}
                <div className="space-y-2 animate-fade-in animate-delay-300">
                  <label 
                    htmlFor="tech1" 
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    First Technology
                  </label>
                  <input
                    id="tech1"
                    type="text"
                    value={tech1}
                    onChange={(e) => setTech1(e.target.value)}
                    onBlur={() => handleBlur('tech1')}
                    disabled={loading || disabled}
                    placeholder="e.g., React, PostgreSQL, AWS"
                    aria-describedby={getFieldError('tech1') ? 'tech1-error' : undefined}
                    aria-invalid={!!getFieldError('tech1')}
                    className={`w-full px-4 py-3 lg:py-4 bg-gray-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-300 text-base hover:border-gray-500 ${
                      getFieldError('tech1') 
                        ? 'border-red-500 focus:ring-red-400 animate-pulse' 
                        : 'border-gray-600'
                    } ${loading || disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  {getFieldError('tech1') && (
                    <p id="tech1-error" className="mt-1 text-sm text-red-400 animate-fade-in" role="alert">
                      {getFieldError('tech1')}
                    </p>
                  )}
                </div>

                {/* Technology 2 Input */}
                <div className="space-y-2 animate-fade-in animate-delay-500">
                  <label 
                    htmlFor="tech2" 
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Second Technology
                  </label>
                  <input
                    id="tech2"
                    type="text"
                    value={tech2}
                    onChange={(e) => setTech2(e.target.value)}
                    onBlur={() => handleBlur('tech2')}
                    disabled={loading || disabled}
                    placeholder="e.g., Vue, MongoDB, Azure"
                    aria-describedby={getFieldError('tech2') ? 'tech2-error' : undefined}
                    aria-invalid={!!getFieldError('tech2')}
                    className={`w-full px-4 py-3 lg:py-4 bg-gray-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-300 text-base hover:border-gray-500 ${
                      getFieldError('tech2') 
                        ? 'border-red-500 focus:ring-red-400 animate-pulse' 
                        : 'border-gray-600'
                    } ${loading || disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  {getFieldError('tech2') && (
                    <p id="tech2-error" className="mt-1 text-sm text-red-400 animate-fade-in" role="alert">
                      {getFieldError('tech2')}
                    </p>
                  )}
                </div>
              </div>

              {/* Enhanced VS Divider */}
              <div className="flex items-center justify-center py-2 lg:py-4 animate-scale-in animate-delay-300">
                <div className="flex items-center gap-4">
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent w-8 sm:w-16"></div>
                  <span className="text-yellow-400 font-bold text-lg lg:text-xl animate-pulse-slow" aria-label="versus">
                    ⚔️ VS ⚔️
                  </span>
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent w-8 sm:w-16"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Submit Button */}
        <div className="text-center animate-fade-in animate-delay-500">
          <button
            type="submit"
            disabled={!isFormValid || loading || disabled}
            aria-describedby="submit-help"
            className={`group inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 transform ${
              isFormValid && !loading && !disabled
                ? 'bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-300 hover:to-orange-300 text-gray-900 hover:scale-105 shadow-lg hover:shadow-yellow-400/25 focus:ring-yellow-400 animate-glow hover-lift'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed focus:ring-gray-500'
            }`}
          >
            {loading ? (
              <>
                <div 
                  className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" 
                  aria-hidden="true"
                />
                <span>Analyzing...</span>
                <span className="sr-only">Please wait while we analyze your technology comparison</span>
              </>
            ) : (
              <>
                <span className="transition-transform duration-300 group-hover:scale-110">⚡</span>
                Get The Verdict
                <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
              </>
            )}
          </button>
          <p id="submit-help" className="mt-2 text-sm text-gray-500">
            Compare any two technologies to get objective analysis
          </p>
        </div>

        {/* Form-level error display */}
        {errors.some(error => error.field === 'both') && touched.tech1 && touched.tech2 && (
          <div className="text-center animate-fade-in" role="alert">
            <p className="text-red-400 text-sm">
              {errors.find(error => error.field === 'both')?.message}
            </p>
          </div>
        )}
      </form>
    </div>
  );
}