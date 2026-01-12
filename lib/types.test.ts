// Property-based tests for type validation
// Feature: tech-referee, Property 4: Complete comparison structure

import * as fc from 'fast-check';
import {
  RefereeAnalysis,
  ComparisonMatrix,
  ScenarioVerdict,
  HiddenTax,
  isRefereeAnalysis,
  isComparisonMatrix,
  isScenarioVerdict,
  isHiddenTax,
} from './types';

// ============================================================================
// Fast-check Arbitraries (Generators)
// ============================================================================

/**
 * Generator for valid technology names
 */
const technologyArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);

/**
 * Generator for comparison descriptors (specific, non-generic terms)
 */
const descriptorArb = fc.oneof(
  fc.constant('$0 startup cost'),
  fc.constant('High memory usage'),
  fc.constant('2-week learning curve'),
  fc.constant('Built-in clustering'),
  fc.constant('Manual scaling required'),
  fc.constant('Active community support'),
  fc.constant('Enterprise licensing fees'),
  fc.constant('Sub-100ms response time'),
  fc.constant('Requires dedicated DevOps'),
  fc.constant('Minimal configuration needed')
);

/**
 * Generator for scenario names
 */
const scenarioNameArb = fc.constantFrom('Move Fast Team', 'Scale Team', 'Budget Team');

/**
 * Generator for timeframe strings
 */
const timeframeArb = fc.oneof(
  fc.constant('in 3 months'),
  fc.constant('within 6 months'),
  fc.constant('after 1 year'),
  fc.constant('at scale'),
  fc.constant('during peak traffic')
);

/**
 * Generator for ComparisonMatrix
 */
const comparisonMatrixArb: fc.Arbitrary<ComparisonMatrix> = fc.record({
  speed: fc.record({
    tech1: descriptorArb,
    tech2: descriptorArb,
  }),
  cost: fc.record({
    tech1: descriptorArb,
    tech2: descriptorArb,
  }),
  developerExperience: fc.record({
    tech1: descriptorArb,
    tech2: descriptorArb,
  }),
  scalability: fc.record({
    tech1: descriptorArb,
    tech2: descriptorArb,
  }),
  maintainability: fc.record({
    tech1: descriptorArb,
    tech2: descriptorArb,
  }),
});

/**
 * Generator for ScenarioVerdict
 */
const scenarioVerdictArb: fc.Arbitrary<ScenarioVerdict> = fc.record({
  name: scenarioNameArb,
  winner: technologyArb,
  reasoning: fc.string({ minLength: 10, maxLength: 200 }),
  context: fc.string({ minLength: 10, maxLength: 100 }),
}) as fc.Arbitrary<ScenarioVerdict>;

/**
 * Generator for HiddenTax
 */
const hiddenTaxArb: fc.Arbitrary<HiddenTax> = fc.record({
  technology: technologyArb,
  warning: fc.string({ minLength: 10, maxLength: 200 }),
  timeframe: timeframeArb,
  impact: fc.string({ minLength: 10, maxLength: 150 }),
});

/**
 * Generator for complete RefereeAnalysis
 */
const refereeAnalysisArb: fc.Arbitrary<RefereeAnalysis> = fc.record({
  matchup: fc.record({
    technology1: technologyArb,
    technology2: technologyArb,
  }),
  taleOfTheTape: comparisonMatrixArb,
  scenarios: fc.array(scenarioVerdictArb, { minLength: 3, maxLength: 3 }),
  hiddenTax: hiddenTaxArb,
  tieBreaker: fc.string({ minLength: 10, maxLength: 200 }),
});

// ============================================================================
// Property Tests
// ============================================================================

describe('Type Validation Properties', () => {
  // Feature: tech-referee, Property 4: Complete comparison structure
  // Validates: Requirements 2.1
  describe('Property 4: Complete comparison structure', () => {
    test('For any valid comparison request, the generated analysis should contain all required fields', () => {
      fc.assert(
        fc.property(refereeAnalysisArb, (analysis) => {
          // Test that the analysis has the complete structure
          expect(isRefereeAnalysis(analysis)).toBe(true);
          
          // Test that matchup contains both technologies
          expect(analysis.matchup).toBeDefined();
          expect(typeof analysis.matchup.technology1).toBe('string');
          expect(typeof analysis.matchup.technology2).toBe('string');
          expect(analysis.matchup.technology1.trim().length).toBeGreaterThan(0);
          expect(analysis.matchup.technology2.trim().length).toBeGreaterThan(0);
          
          // Test that taleOfTheTape contains all required dimensions
          expect(isComparisonMatrix(analysis.taleOfTheTape)).toBe(true);
          const comparison = analysis.taleOfTheTape;
          
          // Verify all five required dimensions are present
          expect(comparison.speed).toBeDefined();
          expect(comparison.cost).toBeDefined();
          expect(comparison.developerExperience).toBeDefined();
          expect(comparison.scalability).toBeDefined();
          expect(comparison.maintainability).toBeDefined();
          
          // Verify each dimension has both tech1 and tech2 descriptors
          ['speed', 'cost', 'developerExperience', 'scalability', 'maintainability'].forEach(dimension => {
            const dim = comparison[dimension as keyof ComparisonMatrix];
            expect(typeof dim.tech1).toBe('string');
            expect(typeof dim.tech2).toBe('string');
            expect(dim.tech1.trim().length).toBeGreaterThan(0);
            expect(dim.tech2.trim().length).toBeGreaterThan(0);
          });
          
          // Test that scenarios array contains exactly 3 scenarios
          expect(Array.isArray(analysis.scenarios)).toBe(true);
          expect(analysis.scenarios).toHaveLength(3);
          
          // Test that all scenarios are valid
          analysis.scenarios.forEach(scenario => {
            expect(isScenarioVerdict(scenario)).toBe(true);
          });
          
          // Test that hiddenTax is present and valid
          expect(isHiddenTax(analysis.hiddenTax)).toBe(true);
          
          // Test that tieBreaker is present
          expect(typeof analysis.tieBreaker).toBe('string');
          expect(analysis.tieBreaker.trim().length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    test('ComparisonMatrix should contain all five required dimensions', () => {
      fc.assert(
        fc.property(comparisonMatrixArb, (matrix) => {
          expect(isComparisonMatrix(matrix)).toBe(true);
          
          // Verify all required dimensions exist
          const requiredDimensions = ['speed', 'cost', 'developerExperience', 'scalability', 'maintainability'];
          requiredDimensions.forEach(dimension => {
            expect(matrix).toHaveProperty(dimension);
            expect(matrix[dimension as keyof ComparisonMatrix]).toBeDefined();
            expect(matrix[dimension as keyof ComparisonMatrix].tech1).toBeDefined();
            expect(matrix[dimension as keyof ComparisonMatrix].tech2).toBeDefined();
          });
        }),
        { numRuns: 100 }
      );
    });

    test('ScenarioVerdict should have valid scenario names', () => {
      fc.assert(
        fc.property(scenarioVerdictArb, (scenario) => {
          expect(isScenarioVerdict(scenario)).toBe(true);
          
          // Verify scenario name is one of the three required types
          const validNames = ['Move Fast Team', 'Scale Team', 'Budget Team'];
          expect(validNames).toContain(scenario.name);
          
          // Verify all required fields are present and non-empty
          expect(typeof scenario.winner).toBe('string');
          expect(scenario.winner.trim().length).toBeGreaterThan(0);
          expect(typeof scenario.reasoning).toBe('string');
          expect(scenario.reasoning.trim().length).toBeGreaterThan(0);
          expect(typeof scenario.context).toBe('string');
          expect(scenario.context.trim().length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    test('HiddenTax should contain all required warning components', () => {
      fc.assert(
        fc.property(hiddenTaxArb, (tax) => {
          expect(isHiddenTax(tax)).toBe(true);
          
          // Verify all required fields are present and non-empty
          expect(typeof tax.technology).toBe('string');
          expect(tax.technology.trim().length).toBeGreaterThan(0);
          expect(typeof tax.warning).toBe('string');
          expect(tax.warning.trim().length).toBeGreaterThan(0);
          expect(typeof tax.timeframe).toBe('string');
          expect(tax.timeframe.trim().length).toBeGreaterThan(0);
          expect(typeof tax.impact).toBe('string');
          expect(tax.impact.trim().length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Type Guard Validation', () => {
    test('Type guards should reject invalid objects', () => {
      // Test invalid RefereeAnalysis
      expect(isRefereeAnalysis(null)).toBe(false);
      expect(isRefereeAnalysis({})).toBe(false);
      expect(isRefereeAnalysis({ matchup: {} })).toBe(false);
      
      // Test invalid ComparisonMatrix
      expect(isComparisonMatrix(null)).toBe(false);
      expect(isComparisonMatrix({})).toBe(false);
      expect(isComparisonMatrix({ speed: {} })).toBe(false);
      
      // Test invalid ScenarioVerdict
      expect(isScenarioVerdict(null)).toBe(false);
      expect(isScenarioVerdict({})).toBe(false);
      expect(isScenarioVerdict({ name: 'Invalid Team' })).toBe(false);
      
      // Test invalid HiddenTax
      expect(isHiddenTax(null)).toBe(false);
      expect(isHiddenTax({})).toBe(false);
      expect(isHiddenTax({ technology: 'React' })).toBe(false);
    });
  });
});