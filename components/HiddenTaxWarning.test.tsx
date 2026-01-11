// Property-based tests for HiddenTaxWarning component
// Feature: tech-referee, Property 11: Hidden tax presence
// Feature: tech-referee, Property 12: Time-bound hidden tax warnings

import React from 'react';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import HiddenTaxWarning from './HiddenTaxWarning';
import { HiddenTax } from '@/lib/types';

// ============================================================================
// Fast-check Arbitraries (Generators)
// ============================================================================

/**
 * Generator for valid technology names
 */
const technologyArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);

/**
 * Generator for warning messages
 */
const warningArb = fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length >= 10);

/**
 * Generator for timeframe strings with time-bound indicators
 */
const timeframeArb = fc.oneof(
  fc.constant('in 3 months'),
  fc.constant('within 6 months'),
  fc.constant('after 1 year'),
  fc.constant('at scale'),
  fc.constant('during peak traffic'),
  fc.constant('when team grows beyond 5 developers'),
  fc.constant('after 100k users'),
  fc.constant('in the first quarter'),
  fc.constant('by year 2'),
  fc.constant('once you hit enterprise scale')
);

/**
 * Generator for impact descriptions
 */
const impactArb = fc.string({ minLength: 10, maxLength: 150 }).filter(s => s.trim().length >= 10);

/**
 * Generator for complete HiddenTax objects
 */
const hiddenTaxArb: fc.Arbitrary<HiddenTax> = fc.record({
  technology: technologyArb,
  warning: warningArb,
  timeframe: timeframeArb,
  impact: impactArb,
});

// ============================================================================
// Property Tests
// ============================================================================

describe('HiddenTaxWarning Properties', () => {
  // Feature: tech-referee, Property 11: Hidden tax presence
  // Validates: Requirements 4.1
  describe('Property 11: Hidden tax presence', () => {
    test('For any completed analysis, a specific Hidden Tax warning should be included that identifies potential downsides', () => {
      fc.assert(
        fc.property(hiddenTaxArb, (hiddenTax) => {
          render(<HiddenTaxWarning warning={hiddenTax} />);
          
          // Test that the component renders the warning section
          expect(screen.getByText('The "Hidden Tax"')).toBeInTheDocument();
          
          // Test that the technology name is displayed
          expect(screen.getByText(hiddenTax.technology)).toBeInTheDocument();
          
          // Test that the warning message is displayed
          expect(screen.getByText(hiddenTax.warning)).toBeInTheDocument();
          
          // Test that the component has warning styling (yellow/red colors)
          const warningCard = screen.getByText(hiddenTax.warning).closest('div');
          expect(warningCard).toHaveClass('border-yellow-500/50');
          
          // Test that the warning is visually prominent
          expect(screen.getByText('Be Prepared For This Cost')).toBeInTheDocument();
          
          // Test that actionable guidance is provided
          expect(screen.getByText(/Plan ahead/)).toBeInTheDocument();
        }),
        { numRuns: 100 }
      );
    });

    test('Hidden tax warning should be visually distinct and prominent', () => {
      fc.assert(
        fc.property(hiddenTaxArb, (hiddenTax) => {
          render(<HiddenTaxWarning warning={hiddenTax} />);
          
          // Test that warning uses appropriate warning colors
          const mainContainer = screen.getByText('The "Hidden Tax"').closest('div');
          expect(mainContainer).toBeInTheDocument();
          
          // Test that the warning card has gradient background and border
          const warningCard = screen.getByText(hiddenTax.warning).closest('div');
          expect(warningCard).toHaveClass('bg-gradient-to-r');
          expect(warningCard).toHaveClass('border-2');
          expect(warningCard).toHaveClass('border-yellow-500/50');
          
          // Test that warning icons are present
          expect(screen.getByText('⚠️')).toBeInTheDocument();
          
          // Test that the technology is prominently displayed
          const techBadge = screen.getByText(hiddenTax.technology);
          expect(techBadge).toBeInTheDocument();
        }),
        { numRuns: 100 }
      );
    });
  });

  // Feature: tech-referee, Property 12: Time-bound hidden tax warnings
  // Validates: Requirements 4.3, 4.4
  describe('Property 12: Time-bound hidden tax warnings', () => {
    test('For any Hidden Tax warning, the text should contain specific timeframes and actionable impact descriptions', () => {
      fc.assert(
        fc.property(hiddenTaxArb, (hiddenTax) => {
          render(<HiddenTaxWarning warning={hiddenTax} />);
          
          // Test that timeframe is displayed in the "When" section
          expect(screen.getByText('When')).toBeInTheDocument();
          expect(screen.getByText(hiddenTax.timeframe)).toBeInTheDocument();
          
          // Test that impact is displayed in the "Impact" section
          expect(screen.getByText('Impact')).toBeInTheDocument();
          expect(screen.getByText(hiddenTax.impact)).toBeInTheDocument();
          
          // Test that timeframe contains time-bound indicators
          const timeframeLower = hiddenTax.timeframe.toLowerCase();
          const hasTimeBound = (
            timeframeLower.includes('month') ||
            timeframeLower.includes('year') ||
            timeframeLower.includes('quarter') ||
            timeframeLower.includes('scale') ||
            timeframeLower.includes('when') ||
            timeframeLower.includes('after') ||
            timeframeLower.includes('during') ||
            timeframeLower.includes('by') ||
            timeframeLower.includes('once') ||
            timeframeLower.includes('in ') ||
            timeframeLower.includes('within')
          );
          expect(hasTimeBound).toBe(true);
          
          // Test that both timeframe and impact are non-empty and meaningful
          expect(hiddenTax.timeframe.trim().length).toBeGreaterThan(0);
          expect(hiddenTax.impact.trim().length).toBeGreaterThan(0);
          
          // Test that actionable guidance is provided
          expect(screen.getByText(/Factor this cost into your decision timeline/)).toBeInTheDocument();
        }),
        { numRuns: 100 }
      );
    });

    test('Timeframe and impact should be displayed in separate, clearly labeled sections', () => {
      fc.assert(
        fc.property(hiddenTaxArb, (hiddenTax) => {
          render(<HiddenTaxWarning warning={hiddenTax} />);
          
          // Test that "When" and "Impact" labels are present and distinct
          const whenLabel = screen.getByText('When');
          const impactLabel = screen.getByText('Impact');
          
          expect(whenLabel).toBeInTheDocument();
          expect(impactLabel).toBeInTheDocument();
          
          // Test that timeframe and impact are in different containers
          const timeframeContainer = screen.getByText(hiddenTax.timeframe).closest('div');
          const impactContainer = screen.getByText(hiddenTax.impact).closest('div');
          
          expect(timeframeContainer).not.toBe(impactContainer);
          
          // Test that containers have appropriate styling
          expect(timeframeContainer).toHaveClass('border-yellow-500/20');
          expect(impactContainer).toHaveClass('border-red-500/20');
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Component Integration', () => {
    test('Component should handle all required HiddenTax properties', () => {
      fc.assert(
        fc.property(hiddenTaxArb, (hiddenTax) => {
          render(<HiddenTaxWarning warning={hiddenTax} />);
          
          // Test that all four required properties are displayed
          expect(screen.getByText(hiddenTax.technology)).toBeInTheDocument();
          expect(screen.getByText(hiddenTax.warning)).toBeInTheDocument();
          expect(screen.getByText(hiddenTax.timeframe)).toBeInTheDocument();
          expect(screen.getByText(hiddenTax.impact)).toBeInTheDocument();
          
          // Test that the component structure is complete
          expect(screen.getByText('The "Hidden Tax"')).toBeInTheDocument();
          expect(screen.getByText('Be Prepared For This Cost')).toBeInTheDocument();
          expect(screen.getByText('When')).toBeInTheDocument();
          expect(screen.getByText('Impact')).toBeInTheDocument();
        }),
        { numRuns: 100 }
      );
    });
  });
});