// Property-based tests for prompt generation
// Feature: tech-referee, Property 13: Structured prompt generation

import * as fc from 'fast-check';
import {
  generateRefereePrompt,
  validatePromptStructure,
  normalizeTechnologyNames,
  validateTechnologyInput,
  createPromptPackage,
  getSystemPrompt
} from './prompts';

// ============================================================================
// Fast-check Arbitraries (Generators)
// ============================================================================

/**
 * Generator for valid technology names
 */
const validTechnologyArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0)
  .filter(s => !['technology', 'tool', 'framework', 'library', 'database', 'language'].includes(s.toLowerCase()));

/**
 * Generator for technology pairs (ensuring they're different)
 */
const technologyPairArb = fc.tuple(validTechnologyArb, validTechnologyArb)
  .filter(([tech1, tech2]) => tech1.toLowerCase() !== tech2.toLowerCase());

/**
 * Generator for invalid technology inputs
 */
const invalidTechnologyArb = fc.oneof(
  fc.constant(''), // empty string
  fc.constant('   '), // whitespace only
  fc.string({ minLength: 51 }), // too long
  fc.constantFrom('technology', 'tool', 'framework') // generic terms
);

// ============================================================================
// Property Tests
// ============================================================================

describe('Prompt Generation Properties', () => {
  // Feature: tech-referee, Property 13: Structured prompt generation
  // Validates: Requirements 5.1, 5.4
  describe('Property 13: Structured prompt generation', () => {
    test('For any valid technology matchup, the generated prompt should follow referee guidelines format', () => {
      fc.assert(
        fc.property(technologyPairArb, ([tech1, tech2]) => {
          const prompt = generateRefereePrompt(tech1, tech2);
          
          // Test that prompt follows the structured format
          expect(validatePromptStructure(prompt)).toBe(true);
          
          // Test that prompt contains both technology names
          expect(prompt).toContain(tech1);
          expect(prompt).toContain(tech2);
          
          // Test that prompt contains all required sections
          const requiredSections = [
            '🥊 The Matchup',
            '📊 The Tale of the Tape', 
            '⚖️ The Verdicts',
            '⚠️ The "Hidden Tax"',
            '🏁 The Tie-Breaker'
          ];
          
          requiredSections.forEach(section => {
            expect(prompt).toContain(section);
          });
          
          // Test that prompt contains all required scenarios
          const requiredScenarios = ['Move Fast Team', 'Scale Team', 'Budget Team'];
          requiredScenarios.forEach(scenario => {
            expect(prompt).toContain(scenario);
          });
          
          // Test that prompt contains all required comparison dimensions
          const requiredDimensions = ['Speed', 'Cost', 'Developer Experience', 'Scalability', 'Maintainability'];
          requiredDimensions.forEach(dimension => {
            expect(prompt).toContain(dimension);
          });
          
          // Test that prompt includes critical requirements
          expect(prompt).toContain('Never say "X is better than Y" without immediately adding "if..."');
          expect(prompt).toContain('Use specific descriptors, not generic terms');
          expect(prompt).toContain('exactly 3 scenarios');
          expect(prompt).toContain('ONE tie-breaker question');
        }),
        { numRuns: 100 }
      );
    });

    test('Technology name normalization should handle common aliases consistently', () => {
      // Test specific alias groups
      const reactAliases = ['react', 'React', 'react.js', 'reactjs'];
      const vueAliases = ['vue', 'Vue', 'vue.js', 'vuejs'];
      const postgresAliases = ['postgres', 'PostgreSQL', 'pg'];
      
      // Test React aliases
      const reactNormalized = reactAliases.map(alias => 
        normalizeTechnologyNames(alias, 'other').tech1
      );
      const uniqueReactNames = new Set(reactNormalized);
      expect(uniqueReactNames.size).toBe(1);
      expect(uniqueReactNames.has('React')).toBe(true);
      
      // Test Vue aliases
      const vueNormalized = vueAliases.map(alias => 
        normalizeTechnologyNames(alias, 'other').tech1
      );
      const uniqueVueNames = new Set(vueNormalized);
      expect(uniqueVueNames.size).toBe(1);
      expect(uniqueVueNames.has('Vue')).toBe(true);
      
      // Test PostgreSQL aliases
      const postgresNormalized = postgresAliases.map(alias => 
        normalizeTechnologyNames(alias, 'other').tech1
      );
      const uniquePostgresNames = new Set(postgresNormalized);
      expect(uniquePostgresNames.size).toBe(1);
      expect(uniquePostgresNames.has('PostgreSQL')).toBe(true);
    });
    test('Input validation should reject invalid technology inputs', () => {
      fc.assert(
        fc.property(invalidTechnologyArb, (invalidTech) => {
          const validation = validateTechnologyInput(invalidTech, 'ValidTech');
          expect(validation.isValid).toBe(false);
          expect(validation.errors.length).toBeGreaterThan(0);
        }),
        { numRuns: 50 }
      );
    });

    test('Input validation should accept valid technology pairs', () => {
      fc.assert(
        fc.property(technologyPairArb, ([tech1, tech2]) => {
          const validation = validateTechnologyInput(tech1, tech2);
          expect(validation.isValid).toBe(true);
          expect(validation.errors).toHaveLength(0);
        }),
        { numRuns: 100 }
      );
    });

    test('Complete prompt package should be valid for valid inputs', () => {
      fc.assert(
        fc.property(technologyPairArb, ([tech1, tech2]) => {
          const promptPackage = createPromptPackage(tech1, tech2);
          
          expect(promptPackage.isValid).toBe(true);
          expect(promptPackage.errors).toHaveLength(0);
          expect(promptPackage.systemPrompt.length).toBeGreaterThan(0);
          expect(promptPackage.userPrompt.length).toBeGreaterThan(0);
          
          // Test that system prompt contains referee personality
          expect(promptPackage.systemPrompt).toContain('Tech Referee');
          expect(promptPackage.systemPrompt).toContain('senior solutions architect');
          
          // Test that user prompt follows structure
          expect(validatePromptStructure(promptPackage.userPrompt)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    test('System prompt should contain required behavioral directives', () => {
      const systemPrompt = getSystemPrompt();
      
      expect(systemPrompt).toContain('Tech Referee');
      expect(systemPrompt).toContain('senior solutions architect');
      expect(systemPrompt).toContain('no best tool, only the best tool for the specific job');
      expect(systemPrompt).toContain('Reject Absolutes');
      expect(systemPrompt).toContain('Expose Hidden Costs');
      expect(systemPrompt).toContain('Scenario Mapping');
    });
  });
});