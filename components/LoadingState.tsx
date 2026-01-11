'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Zap, Search, AlertTriangle, CheckCircle } from 'lucide-react';
import { LoadingStateProps } from '@/lib/types';

/**
 * LoadingState Component
 * 
 * Provides an engaging loading experience with progressive messages and smooth animations.
 * Implements Requirements 6.3 from the Tech Referee specification.
 */
export default function LoadingState({ 
  message, 
  progress = 0 
}: LoadingStateProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [displayedMessage, setDisplayedMessage] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  // Progressive loading messages that build anticipation
  const loadingMessages = [
    "Analyzing constraints...",
    "Evaluating trade-offs...", 
    "Calculating hidden taxes...",
    "Simulating scenarios...",
    "Generating verdicts...",
    "Preparing final analysis..."
  ];

  // Use provided message or cycle through default messages
  const messages = message ? [message] : loadingMessages;

  // Message cycling effect
  useEffect(() => {
    if (message) {
      setDisplayedMessage(message);
      return;
    }

    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2000); // Change message every 2 seconds

    return () => clearInterval(messageInterval);
  }, [message, messages.length]);

  // Typewriter effect for messages
  useEffect(() => {
    const currentMessage = messages[currentMessageIndex];
    let charIndex = 0;
    setDisplayedMessage('');
    setIsTyping(true);

    const typeInterval = setInterval(() => {
      if (charIndex < currentMessage.length) {
        setDisplayedMessage(currentMessage.slice(0, charIndex + 1));
        charIndex++;
      } else {
        setIsTyping(false);
        clearInterval(typeInterval);
      }
    }, 50); // Type each character every 50ms

    return () => clearInterval(typeInterval);
  }, [currentMessageIndex, messages]);

  // Get appropriate icon for current message
  const getMessageIcon = (messageText: string) => {
    if (messageText.includes('Analyzing') || messageText.includes('constraints')) {
      return <Search className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />;
    }
    if (messageText.includes('trade-offs') || messageText.includes('Evaluating')) {
      return <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />;
    }
    if (messageText.includes('hidden') || messageText.includes('taxes')) {
      return <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />;
    }
    if (messageText.includes('scenarios') || messageText.includes('Simulating')) {
      return <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />;
    }
    if (messageText.includes('verdicts') || messageText.includes('Generating')) {
      return <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />;
    }
    if (messageText.includes('final') || messageText.includes('Preparing')) {
      return <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />;
    }
    return <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />;
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6">
      {/* Main Loading Container */}
      <div 
        className="bg-gray-800 rounded-lg p-6 sm:p-8 lg:p-10 border border-gray-700 text-center shadow-xl hover-lift animate-scale-in"
        role="status"
        aria-live="polite"
        aria-label="Loading analysis"
      >
        {/* Header */}
        <header className="mb-6 lg:mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-2 lg:mb-4">
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 animate-pulse-slow" aria-hidden="true" />
            <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold gradient-text">
              Tech Referee
            </h2>
          </div>
          <p className="text-gray-400 text-xs sm:text-sm lg:text-base">
            Analyzing your technology matchup
          </p>
        </header>

        {/* Enhanced Main Spinner */}
        <div className="mb-6 lg:mb-8 animate-fade-in animate-delay-200">
          <div className="relative inline-flex items-center justify-center">
            {/* Outer rotating ring */}
            <div 
              className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 border-4 border-gray-600 border-t-yellow-400 rounded-full animate-spin"
              aria-hidden="true"
            ></div>
            
            {/* Middle pulsing ring */}
            <div 
              className="absolute w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 border-2 border-orange-400/50 rounded-full animate-pulse"
              aria-hidden="true"
            ></div>
            
            {/* Inner pulsing dot */}
            <div 
              className="absolute w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 bg-yellow-400 rounded-full animate-pulse"
              aria-hidden="true"
            ></div>
          </div>
        </div>

        {/* Progress Message */}
        <div className="mb-6 lg:mb-8 animate-fade-in animate-delay-300">
          <div className="flex items-center justify-center gap-3 mb-2 lg:mb-3">
            <span aria-hidden="true" className="animate-pulse-slow">
              {getMessageIcon(displayedMessage)}
            </span>
            <span className="text-white font-medium text-sm sm:text-base lg:text-lg">
              {displayedMessage}
              {isTyping && <span className="animate-pulse text-yellow-400" aria-hidden="true">|</span>}
            </span>
          </div>
          
          {/* Progress Bar (if progress is provided) */}
          {progress > 0 && (
            <div className="w-full bg-gray-700 rounded-full h-2 mt-3 lg:mt-4 animate-fade-in">
              <div 
                className="bg-gradient-to-r from-yellow-400 to-orange-400 h-2 rounded-full transition-all duration-500 ease-out animate-glow"
                style={{ width: `${Math.min(progress, 100)}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Loading progress: ${progress}%`}
              ></div>
            </div>
          )}
        </div>

        {/* Enhanced Animated Dots */}
        <div className="flex justify-center space-x-2 mb-4 lg:mb-6 animate-fade-in animate-delay-500" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-400 rounded-full animate-pulse"
              style={{
                animationDelay: `${index * 0.2}s`,
                animationDuration: '1s'
              }}
            ></div>
          ))}
        </div>

        {/* Subtle hint text */}
        <div className="text-xs sm:text-sm text-gray-500 animate-fade-in animate-delay-500">
          This usually takes 10-15 seconds...
        </div>
      </div>

      {/* Enhanced Background Animation */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-24 h-24 sm:w-32 sm:h-32 bg-yellow-400/5 rounded-full animate-pulse-slow"></div>
        <div className="absolute top-3/4 right-1/4 w-18 h-18 sm:w-24 sm:h-24 bg-blue-400/5 rounded-full animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-3/4 w-15 h-15 sm:w-20 sm:h-20 bg-purple-400/5 rounded-full animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/3 right-1/3 w-12 h-12 sm:w-16 sm:h-16 bg-orange-400/5 rounded-full animate-pulse-slow" style={{ animationDelay: '0.5s' }}></div>
      </div>
    </div>
  );
}