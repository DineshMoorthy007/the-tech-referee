'use client';

import React from 'react';
import { VerdictDisplayProps } from '@/lib/types';
import TaleOfTheTape from './TaleOfTheTape';
import ScenarioCards from './ScenarioCards';
import HiddenTaxWarning from './HiddenTaxWarning';
import { Gavel, HelpCircle } from 'lucide-react';

/**
 * VerdictDisplay Component
 * 
 * Orchestrates the display of complete analysis results by integrating
 * TaleOfTheTape, ScenarioCards, and HiddenTaxWarning components.
 * Implements scannable hierarchy with clear information flow.
 * Implements Requirements 2.3, 7.1 from the Tech Referee specification.
 */
export default function VerdictDisplay({ analysis, loading = false }: VerdictDisplayProps) {
  
  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="animate-pulse space-y-6 lg:space-y-8">
          <div className="h-6 sm:h-8 bg-gray-700 rounded w-1/3 mx-auto"></div>
          <div className="h-48 sm:h-64 lg:h-80 bg-gray-700 rounded"></div>
          <div className="h-32 sm:h-48 lg:h-64 bg-gray-700 rounded"></div>
          <div className="h-24 sm:h-32 lg:h-40 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      
      {/* Enhanced Header Section */}
      <header className="text-center border-b border-gray-700 pb-6 lg:pb-8 mb-8 lg:mb-12 animate-slide-up">
        <div className="flex items-center justify-center gap-3 mb-4 lg:mb-6">
          <Gavel className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 animate-pulse-slow" aria-hidden="true" />
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold gradient-text">
            The Tech Referee
          </h1>
        </div>
        <div className="text-lg sm:text-xl lg:text-2xl text-gray-300 mb-2 lg:mb-4">
          <span className="text-yellow-400 font-semibold animate-fade-in animate-delay-200">
            {analysis.matchup.technology1}
          </span>
          <span className="mx-2 sm:mx-4 text-gray-500 animate-pulse">⚔️</span>
          <span className="text-yellow-400 font-semibold animate-fade-in animate-delay-300">
            {analysis.matchup.technology2}
          </span>
        </div>
        <p className="text-gray-400 max-w-3xl mx-auto text-sm sm:text-base lg:text-lg leading-relaxed animate-fade-in animate-delay-500">
          An objective analysis of trade-offs, constraints, and hidden costs to help you make an informed decision.
        </p>
      </header>

      {/* Tale of the Tape Section */}
      <section className="mb-8 lg:mb-12 animate-fade-in animate-delay-200" aria-labelledby="comparison-heading">
        <div className="hover-lift">
          <TaleOfTheTape 
            comparison={analysis.taleOfTheTape}
            technology1={analysis.matchup.technology1}
            technology2={analysis.matchup.technology2}
          />
        </div>
      </section>

      {/* Scenario Verdicts Section */}
      <section className="mb-8 lg:mb-12 animate-fade-in animate-delay-300" aria-labelledby="scenarios-heading">
        <div className="hover-lift">
          <ScenarioCards scenarios={analysis.scenarios} />
        </div>
      </section>

      {/* Hidden Tax Warning Section */}
      <section className="mb-8 lg:mb-12 animate-fade-in animate-delay-500" aria-labelledby="warning-heading">
        <div className="hover-lift">
          <HiddenTaxWarning warning={analysis.hiddenTax} />
        </div>
      </section>

      {/* Enhanced Tie-Breaker Section */}
      <section className="mb-8 lg:mb-12 animate-scale-in animate-delay-500" aria-labelledby="tiebreaker-heading">
        <div className="gradient-border hover-lift">
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-6 lg:p-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4 lg:mb-6">
                <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 animate-pulse-slow" aria-hidden="true" />
                <h2 id="tiebreaker-heading" className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
                  <span role="img" aria-label="Checkered flag">🏁</span> The Tie-Breaker
                </h2>
              </div>
              <p className="text-gray-400 mb-4 lg:mb-6 max-w-3xl mx-auto text-sm sm:text-base lg:text-lg leading-relaxed">
                One final question to help you make the decision that's right for your specific situation.
              </p>
              <div className="gradient-border">
                <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
                  <p className="text-blue-300 text-base sm:text-lg lg:text-xl font-medium leading-relaxed animate-fade-in animate-delay-300">
                    {analysis.tieBreaker}
                  </p>
                </div>
              </div>
              <div className="mt-4 lg:mt-6 animate-fade-in animate-delay-500">
                <p className="text-gray-500 text-xs sm:text-sm lg:text-base">
                  Your answer to this question should guide your final choice between the two technologies.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="text-center pt-6 lg:pt-8 border-t border-gray-700 animate-fade-in animate-delay-500">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-yellow-400 animate-pulse-slow">⚖️</span>
          <p className="text-gray-500 text-xs sm:text-sm lg:text-base font-medium">
            Remember: There is no "best" tool, only the best tool for your specific job.
          </p>
          <span className="text-yellow-400 animate-pulse-slow">⚖️</span>
        </div>
      </footer>
    </div>
  );
}