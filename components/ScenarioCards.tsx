'use client';

import React from 'react';
import { ScenarioCardsProps, ScenarioVerdict } from '@/lib/types';
import { Zap, TrendingUp, DollarSign, Trophy, Target } from 'lucide-react';

/**
 * ScenarioCards Component
 * 
 * Displays three scenario-based verdicts (Move Fast, Scale, Budget teams) with winners
 * and reasoning. All scenarios are visible simultaneously for easy comparison.
 * Implements Requirements 3.1, 3.2, 3.5 from the Tech Referee specification.
 */
export default function ScenarioCards({ scenarios }: ScenarioCardsProps) {
  
  /**
   * Gets the appropriate icon and styling for each scenario type
   */
  const getScenarioConfig = (scenarioName: ScenarioVerdict['name']) => {
    switch (scenarioName) {
      case 'Move Fast Team':
        return {
          icon: <Zap className="w-5 h-5 sm:w-6 sm:h-6" />,
          color: 'yellow',
          bgColor: 'bg-yellow-900/20',
          borderColor: 'border-yellow-500/30',
          iconColor: 'text-yellow-400',
          accentColor: 'text-yellow-300'
        };
      case 'Scale Team':
        return {
          icon: <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />,
          color: 'purple',
          bgColor: 'bg-purple-900/20',
          borderColor: 'border-purple-500/30',
          iconColor: 'text-purple-400',
          accentColor: 'text-purple-300'
        };
      case 'Budget Team':
        return {
          icon: <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />,
          color: 'green',
          bgColor: 'bg-green-900/20',
          borderColor: 'border-green-500/30',
          iconColor: 'text-green-400',
          accentColor: 'text-green-300'
        };
      default:
        return {
          icon: <Target className="w-5 h-5 sm:w-6 sm:h-6" />,
          color: 'gray',
          bgColor: 'bg-gray-900/20',
          borderColor: 'border-gray-500/30',
          iconColor: 'text-gray-400',
          accentColor: 'text-gray-300'
        };
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-4 lg:mb-6">
        <h2 id="scenarios-heading" className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-yellow-400" role="img" aria-label="Balance scale">⚖️</span>
          The Verdicts
        </h2>
        <p className="text-gray-400 text-sm sm:text-base lg:text-lg">
          How the choice changes based on your team's priorities and constraints
        </p>
      </div>

      {/* Scenario Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        {scenarios.map((scenario, index) => {
          const config = getScenarioConfig(scenario.name);
          
          return (
            <article
              key={scenario.name}
              className={`relative ${config.bgColor} ${config.borderColor} border rounded-lg p-4 sm:p-6 hover:border-opacity-50 transition-all duration-300 hover:scale-[1.02] focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 focus-within:ring-${config.color}-400 hover-lift animate-fade-in`}
              style={{ animationDelay: `${index * 200}ms` }}
              tabIndex={0}
              role="article"
              aria-labelledby={`scenario-${index}-title`}
            >
              {/* Scenario Header */}
              <header className="flex items-start gap-3 mb-4">
                <div className={`${config.iconColor} flex-shrink-0 mt-1 animate-pulse-slow`} aria-hidden="true">
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 id={`scenario-${index}-title`} className="text-base sm:text-lg lg:text-xl font-semibold text-white mb-1">
                    {scenario.name}
                  </h3>
                  <p className="text-gray-400 text-xs sm:text-sm lg:text-base leading-relaxed">
                    {scenario.context}
                  </p>
                </div>
              </header>

              {/* Winner Section - Centered */}
              <div className="mb-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Trophy className={`w-4 h-4 sm:w-5 sm:h-5 ${config.iconColor} animate-pulse`} aria-hidden="true" />
                  <span className="text-gray-300 text-xs sm:text-sm font-medium uppercase tracking-wide">
                    Winner
                  </span>
                </div>
                <div className={`${config.accentColor} font-bold text-xl sm:text-2xl lg:text-3xl mb-3 break-words animate-glow`}>
                  {scenario.winner.replace(/\*/g, '').trim()}
                </div>
              </div>

              {/* Reasoning Section */}
              <div>
                <div className="text-gray-300 text-xs sm:text-sm font-medium mb-2 uppercase tracking-wide">
                  Why
                </div>
                <p className="text-gray-300 text-xs sm:text-sm lg:text-base leading-relaxed">
                  {scenario.reasoning.replace(/\*/g, '').trim()}
                </p>
              </div>

              {/* Enhanced Scenario Number Badge */}
              <div className="absolute top-3 sm:top-4 right-3 sm:right-4 opacity-30 animate-pulse-slow" aria-hidden="true">
                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full ${config.bgColor} ${config.borderColor} border-2 flex items-center justify-center`}>
                  <span className={`text-xs sm:text-sm font-bold ${config.iconColor}`}>
                    {index + 1}
                  </span>
                </div>
              </div>

              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/10 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </article>
          );
        })}
      </div>

      {/* Footer Note */}
      <div className="mt-4 lg:mt-6 text-center">
        <p className="text-gray-500 text-xs sm:text-sm lg:text-base">
          Each scenario considers different priorities: speed vs. scale vs. cost optimization
        </p>
      </div>
    </div>
  );
}