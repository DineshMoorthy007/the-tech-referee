'use client';

import React from 'react';
import { TaleOfTheTapeProps } from '@/lib/types';
import { Zap, DollarSign, Code, TrendingUp, Wrench } from 'lucide-react';

/**
 * TaleOfTheTape Component
 * 
 * Renders a structured comparison table showing Speed, Cost, Developer Experience, 
 * Scalability, and Maintainability with specific descriptors and high contrast styling.
 * Implements Requirements 2.1, 2.2 from the Tech Referee specification.
 */
export default function TaleOfTheTape({ 
  comparison, 
  technology1, 
  technology2 
}: TaleOfTheTapeProps) {
  
  // Comparison dimensions with their icons and labels
  const dimensions = [
    {
      key: 'speed' as keyof typeof comparison,
      label: 'Speed',
      icon: <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />,
      description: 'Development velocity and performance'
    },
    {
      key: 'cost' as keyof typeof comparison,
      label: 'Cost',
      icon: <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />,
      description: 'Financial investment and operational expenses'
    },
    {
      key: 'developerExperience' as keyof typeof comparison,
      label: 'Developer Experience',
      icon: <Code className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />,
      description: 'Learning curve and development ergonomics'
    },
    {
      key: 'scalability' as keyof typeof comparison,
      label: 'Scalability',
      icon: <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />,
      description: 'Growth handling and performance at scale'
    },
    {
      key: 'maintainability' as keyof typeof comparison,
      label: 'Maintainability',
      icon: <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />,
      description: 'Long-term code health and updates'
    }
  ];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-4 lg:mb-6 animate-fade-in">
        <h2 id="comparison-heading" className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-yellow-400 animate-pulse-slow" role="img" aria-label="Bar chart">📊</span>
          The Tale of the Tape
        </h2>
        <p className="text-gray-400 text-sm sm:text-base lg:text-lg">
          Head-to-head comparison across key dimensions
        </p>
      </div>

      {/* Comparison Table */}
      <div className="gradient-border hover-lift animate-fade-in animate-delay-200">
        <div className="bg-gray-800 rounded-lg overflow-hidden shadow-xl">
          {/* Table Header */}
          <div className="bg-gray-900 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-700">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="text-gray-400 font-medium text-xs sm:text-sm uppercase tracking-wide lg:block hidden">
                Dimension
              </div>
              <div className="text-center lg:text-center">
                <div className="text-white font-semibold text-base sm:text-lg lg:text-xl truncate gradient-text" title={technology1}>
                  {technology1}
                </div>
              </div>
              <div className="text-center lg:text-center">
                <div className="text-white font-semibold text-base sm:text-lg lg:text-xl truncate gradient-text" title={technology2}>
                  {technology2}
                </div>
              </div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-700">
            {dimensions.map((dimension, index) => {
              const tech1Value = comparison[dimension.key].tech1;
              const tech2Value = comparison[dimension.key].tech2;
              
              return (
                <div 
                  key={dimension.key}
                  className={`px-4 sm:px-6 py-4 sm:py-5 hover:bg-gray-750 transition-all duration-300 animate-fade-in ${
                    index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-825'
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Dimension Label */}
                    <div className="flex items-start gap-3 lg:mb-0 mb-3">
                      <div className="flex-shrink-0 mt-0.5 animate-pulse-slow" aria-hidden="true">
                        {dimension.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-white font-semibold text-sm sm:text-base lg:text-lg">
                          {dimension.label}
                        </div>
                        <div className="text-gray-400 text-xs sm:text-sm mt-1">
                          {dimension.description}
                        </div>
                      </div>
                    </div>

                    {/* Technology Values Container */}
                    <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                      {/* Technology 1 Value */}
                      <div className="animate-fade-in animate-delay-100">
                        <div className="lg:hidden text-gray-400 text-xs font-medium mb-1 uppercase tracking-wide">
                          {technology1}
                        </div>
                        <div className="bg-gray-900 rounded-lg px-3 sm:px-4 py-2 sm:py-3 border border-gray-600 hover:border-gray-500 transition-all duration-300 hover:shadow-lg hover:bg-gray-850">
                          <div className="text-white font-medium text-xs sm:text-sm lg:text-base leading-relaxed">
                            {tech1Value}
                          </div>
                        </div>
                      </div>

                      {/* Technology 2 Value */}
                      <div className="animate-fade-in animate-delay-200">
                        <div className="lg:hidden text-gray-400 text-xs font-medium mb-1 uppercase tracking-wide">
                          {technology2}
                        </div>
                        <div className="bg-gray-900 rounded-lg px-3 sm:px-4 py-2 sm:py-3 border border-gray-600 hover:border-gray-500 transition-all duration-300 hover:shadow-lg hover:bg-gray-850">
                          <div className="text-white font-medium text-xs sm:text-sm lg:text-base leading-relaxed">
                            {tech2Value}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-3 lg:mt-4 text-center animate-fade-in animate-delay-500">
        <p className="text-gray-500 text-xs sm:text-sm">
          Specific descriptors based on real-world usage patterns and constraints
        </p>
      </div>
    </div>
  );
}