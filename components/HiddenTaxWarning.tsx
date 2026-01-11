'use client';

import React from 'react';
import { HiddenTaxWarningProps } from '@/lib/types';
import { AlertTriangle, Clock, Target } from 'lucide-react';

/**
 * HiddenTaxWarning Component
 * 
 * Displays prominent warnings about potential downsides and hidden costs of technology choices.
 * Uses warning colors and prominent positioning to ensure visibility.
 * Implements Requirements 4.1, 4.3, 4.4 from the Tech Referee specification.
 */
export default function HiddenTaxWarning({ warning }: HiddenTaxWarningProps) {
  
  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-4 lg:mb-6 animate-fade-in">
        <h2 id="warning-heading" className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-yellow-400 animate-pulse-slow" role="img" aria-label="Warning sign">⚠️</span>
          The "Hidden Tax"
        </h2>
        <p className="text-gray-400 text-sm sm:text-base lg:text-lg">
          The specific downside you should prepare for with your choice
        </p>
      </div>

      {/* Warning Card */}
      <div 
        className="relative gradient-border hover-lift animate-fade-in animate-delay-200"
        role="alert"
        aria-labelledby="warning-heading"
      >
        <div className="bg-gradient-to-r from-yellow-900/30 to-red-900/30 rounded-lg p-4 sm:p-6 lg:p-8 shadow-xl">
          {/* Warning Icon Background */}
          <div className="absolute top-3 sm:top-4 right-3 sm:right-4 opacity-10 animate-pulse-slow" aria-hidden="true">
            <AlertTriangle className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-400" />
          </div>

          {/* Technology Badge */}
          <div className="mb-4 lg:mb-6 animate-fade-in animate-delay-300">
            <div className="inline-flex items-center gap-2 bg-yellow-900/50 border border-yellow-500/30 rounded-full px-3 sm:px-4 py-1 sm:py-2 animate-glow">
              <Target className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 animate-pulse" aria-hidden="true" />
              <span className="text-yellow-300 font-semibold text-xs sm:text-sm uppercase tracking-wide">
                {warning.technology}
              </span>
            </div>
          </div>

          {/* Main Warning Content */}
          <div className="mb-4 lg:mb-6 animate-fade-in animate-delay-500">
            <div className="flex items-start gap-3 mb-3 lg:mb-4">
              <div className="flex-shrink-0 mt-1 animate-pulse-slow" aria-hidden="true">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-yellow-300 font-bold text-base sm:text-lg lg:text-xl mb-2">
                  Be Prepared For This Cost
                </h3>
                <p className="text-white text-sm sm:text-base lg:text-lg leading-relaxed">
                  {warning.warning}
                </p>
              </div>
            </div>
          </div>

          {/* Timeframe and Impact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 mb-4 lg:mb-6">
            {/* Timeframe */}
            <div className="bg-gray-900/50 border border-yellow-500/20 rounded-lg p-3 sm:p-4 hover-lift animate-fade-in animate-delay-300">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 animate-pulse" aria-hidden="true" />
                <span className="text-yellow-300 font-semibold text-xs sm:text-sm uppercase tracking-wide">
                  When
                </span>
              </div>
              <p className="text-white text-xs sm:text-sm lg:text-base font-medium">
                {warning.timeframe}
              </p>
            </div>

            {/* Impact */}
            <div className="bg-gray-900/50 border border-red-500/20 rounded-lg p-3 sm:p-4 hover-lift animate-fade-in animate-delay-500">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-3 h-3 sm:w-4 sm:h-4 text-red-400 animate-pulse" aria-hidden="true" />
                <span className="text-red-300 font-semibold text-xs sm:text-sm uppercase tracking-wide">
                  Impact
                </span>
              </div>
              <p className="text-white text-xs sm:text-sm lg:text-base font-medium">
                {warning.impact}
              </p>
            </div>
          </div>

          {/* Call to Action */}
          <div className="pt-3 lg:pt-4 border-t border-yellow-500/20 animate-fade-in animate-delay-500">
            <div className="flex items-start gap-2 text-yellow-300">
              <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 mt-0.5 animate-pulse-slow" aria-hidden="true" />
              <span className="text-xs sm:text-sm lg:text-base font-medium leading-relaxed">
                Plan ahead: Factor this cost into your decision timeline and budget
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-3 lg:mt-4 text-center animate-fade-in animate-delay-500">
        <p className="text-gray-500 text-xs sm:text-sm lg:text-base">
          Every technology choice has trade-offs. This is the specific cost of your recommended option.
        </p>
      </div>
    </div>
  );
}