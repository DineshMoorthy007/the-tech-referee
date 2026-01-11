// Property-based tests for MatchupInput component
// Feature: tech-referee, Property 1: Input validation consistency

import * as fc from 'fast-check';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import MatchupInput from './MatchupInput';

// ============================================================================
// Fast-check Arbitraries (Generators)
// ============================================================================

/**
 * Generator for valid technology names (non-empty, trimmed strings)
 */
const validTechnologyArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0)
  .map(s => s.trim());

/**
 * Generator for invalid technology names (empty or whitespace-only strings)
 */
const invalidTechnologyArb = fc.oneof(
  fc.constant(''),
  fc.string().filter(s => s.trim().length === 0 && s.length > 0), // whitespace-only
  fc.constant('   '), // spaces
  fc.constant('\t'), // tab
  fc.constant('\n'), // newline
  fc.constant('  \t  \n  ') // mixed whitespace
);

/**
 * Generator for technology pairs (both valid or mixed valid/invalid)
 */
const technologyPairArb = fc.oneof(
  // Both valid but different
  fc.tuple(validTechnologyArb, validTechnologyArb)
    .filter(([tech1, tech2]) => tech1.toLowerCase() !== tech2.toLowerCase()),
  
  // Both valid but same (should be invalid)
  validTechnologyArb.map(tech => [tech, tech] as [string, string]),
  
  // First invalid, second valid
  fc.tuple(invalidTechnologyArb, validTechnologyArb),
  
  // First valid, second invalid
  fc.tuple(validTechnologyArb, invalidTechnologyArb),
  
  // Both invalid
  fc.tuple(invalidTechnologyArb, invalidTechnologyArb)
);

// ============================================================================
// Property Tests
// ============================================================================

describe('MatchupInput Property Tests', () => {
  // Feature: tech-referee, Property 1: Input validation consistency
  // Validates: Requirements 1.2, 1.4
  describe('Property 1: Input validation consistency', () => {
    test('For any pair of technology inputs, if either input is empty or invalid, the system should prevent submission and display validation feedback', () => {
      fc.assert(
        fc.property(technologyPairArb, ([tech1, tech2]) => {
          // Clean up any previous renders
          cleanup();
          
          const mockOnSubmit = jest.fn();
          
          const { container } = render(
            <MatchupInput 
              onSubmit={mockOnSubmit}
              loading={false}
              disabled={false}
            />
          );

          const tech1Input = screen.getByLabelText('Technology 1');
          const tech2Input = screen.getByLabelText('Technology 2');
          const submitButton = screen.getByRole('button', { name: /get the verdict/i });

          // Fill in the inputs
          fireEvent.change(tech1Input, { target: { value: tech1 } });
          fireEvent.change(tech2Input, { target: { value: tech2 } });

          // Trigger blur events to show validation
          fireEvent.blur(tech1Input);
          fireEvent.blur(tech2Input);

          // Determine if inputs should be valid
          const tech1Valid = tech1.trim().length > 0;
          const tech2Valid = tech2.trim().length > 0;
          const differentTechs = tech1.trim().toLowerCase() !== tech2.trim().toLowerCase();
          const shouldBeValid = tech1Valid && tech2Valid && differentTechs;

          if (shouldBeValid) {
            // Valid inputs: button should be enabled, no error messages
            expect(submitButton).not.toBeDisabled();
            
            // Submit should work
            fireEvent.click(submitButton);
            expect(mockOnSubmit).toHaveBeenCalledWith(tech1.trim(), tech2.trim());
          } else {
            // Invalid inputs: button should be disabled or show errors
            if (!tech1Valid || !tech2Valid || !differentTechs) {
              expect(submitButton).toBeDisabled();
              
              // Should show validation feedback
              if (!tech1Valid) {
                expect(screen.getByText('First technology is required')).toBeInTheDocument();
              }
              if (!tech2Valid) {
                expect(screen.getByText('Second technology is required')).toBeInTheDocument();
              }
              if (tech1Valid && tech2Valid && !differentTechs) {
                expect(screen.getByText('Please enter two different technologies')).toBeInTheDocument();
              }
              
              // Submit should not be called
              fireEvent.click(submitButton);
              expect(mockOnSubmit).not.toHaveBeenCalled();
            }
          }
          
          // Clean up after this iteration
          cleanup();
        }),
        { numRuns: 100 }
      );
    });

    test('For any valid technology inputs, form submission should normalize whitespace', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.string({ minLength: 1, maxLength: 20 }).map(s => `  ${s}  `), // Add whitespace
            fc.string({ minLength: 1, maxLength: 20 }).map(s => `\t${s}\n`) // Add different whitespace
          ).filter(([tech1, tech2]) => 
            tech1.trim().length > 0 && 
            tech2.trim().length > 0 && 
            tech1.trim().toLowerCase() !== tech2.trim().toLowerCase()
          ),
          ([tech1, tech2]) => {
            // Clean up any previous renders
            cleanup();
            
            const mockOnSubmit = jest.fn();
            
            render(
              <MatchupInput 
                onSubmit={mockOnSubmit}
                loading={false}
                disabled={false}
              />
            );

            const tech1Input = screen.getByLabelText('Technology 1');
            const tech2Input = screen.getByLabelText('Technology 2');
            const submitButton = screen.getByRole('button', { name: /get the verdict/i });

            // Fill in the inputs with whitespace
            fireEvent.change(tech1Input, { target: { value: tech1 } });
            fireEvent.change(tech2Input, { target: { value: tech2 } });

            // Trigger blur events
            fireEvent.blur(tech1Input);
            fireEvent.blur(tech2Input);

            // Submit the form
            fireEvent.click(submitButton);

            // Should be called with trimmed values
            expect(mockOnSubmit).toHaveBeenCalledWith(tech1.trim(), tech2.trim());
            
            // Clean up after this iteration
            cleanup();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('For any loading or disabled state, form submission should be prevented', () => {
      fc.assert(
        fc.property(
          fc.tuple(validTechnologyArb, validTechnologyArb)
            .filter(([tech1, tech2]) => tech1.toLowerCase() !== tech2.toLowerCase()),
          fc.boolean(), // loading state
          fc.boolean(), // disabled state
          ([tech1, tech2], loading, disabled) => {
            // Clean up any previous renders
            cleanup();
            
            const mockOnSubmit = jest.fn();
            
            render(
              <MatchupInput 
                onSubmit={mockOnSubmit}
                loading={loading}
                disabled={disabled}
              />
            );

            const tech1Input = screen.getByLabelText('Technology 1');
            const tech2Input = screen.getByLabelText('Technology 2');
            const submitButton = screen.getByRole('button', { name: loading ? /analyzing/i : /get the verdict/i });

            // Fill in valid inputs
            fireEvent.change(tech1Input, { target: { value: tech1 } });
            fireEvent.change(tech2Input, { target: { value: tech2 } });

            if (loading || disabled) {
              // Inputs should be disabled
              expect(tech1Input).toBeDisabled();
              expect(tech2Input).toBeDisabled();
              expect(submitButton).toBeDisabled();
              
              // Submit should not work
              fireEvent.click(submitButton);
              expect(mockOnSubmit).not.toHaveBeenCalled();
            } else {
              // Should work normally
              expect(tech1Input).not.toBeDisabled();
              expect(tech2Input).not.toBeDisabled();
              expect(submitButton).not.toBeDisabled();
            }
            
            // Clean up after this iteration
            cleanup();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('For any case variations of the same technology, should detect duplicates', () => {
      fc.assert(
        fc.property(
          validTechnologyArb,
          fc.constantFrom('lower', 'upper', 'mixed', 'original'),
          fc.constantFrom('lower', 'upper', 'mixed', 'original'),
          (baseTech, case1, case2) => {
            // Clean up any previous renders
            cleanup();
            
            const mockOnSubmit = jest.fn();
            
            // Transform the base technology according to case variations
            const transformCase = (tech: string, caseType: string): string => {
              switch (caseType) {
                case 'lower': return tech.toLowerCase();
                case 'upper': return tech.toUpperCase();
                case 'mixed': return tech.split('').map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join('');
                case 'original': return tech;
                default: return tech;
              }
            };

            const tech1 = transformCase(baseTech, case1);
            const tech2 = transformCase(baseTech, case2);
            
            render(
              <MatchupInput 
                onSubmit={mockOnSubmit}
                loading={false}
                disabled={false}
              />
            );

            const tech1Input = screen.getByLabelText('Technology 1');
            const tech2Input = screen.getByLabelText('Technology 2');
            const submitButton = screen.getByRole('button', { name: /get the verdict/i });

            // Fill in the same technology with different cases
            fireEvent.change(tech1Input, { target: { value: tech1 } });
            fireEvent.change(tech2Input, { target: { value: tech2 } });

            // Trigger blur events
            fireEvent.blur(tech1Input);
            fireEvent.blur(tech2Input);

            // Should detect as duplicates and prevent submission
            expect(submitButton).toBeDisabled();
            expect(screen.getByText('Please enter two different technologies')).toBeInTheDocument();
            
            // Submit should not work
            fireEvent.click(submitButton);
            expect(mockOnSubmit).not.toHaveBeenCalled();
            
            // Clean up after this iteration
            cleanup();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // ============================================================================
  // Unit Tests
  // ============================================================================

  describe('MatchupInput Unit Tests', () => {
    let mockOnSubmit: jest.Mock;

    beforeEach(() => {
      mockOnSubmit = jest.fn();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    // Requirements 1.1, 1.2, 1.4: Form submission with valid inputs
    describe('Form submission with valid inputs', () => {
      test('should submit form with valid different technologies', () => {
        render(
          <MatchupInput 
            onSubmit={mockOnSubmit}
            loading={false}
            disabled={false}
          />
        );

        const tech1Input = screen.getByLabelText('Technology 1');
        const tech2Input = screen.getByLabelText('Technology 2');
        const submitButton = screen.getByRole('button', { name: /get the verdict/i });

        // Fill in valid inputs
        fireEvent.change(tech1Input, { target: { value: 'React' } });
        fireEvent.change(tech2Input, { target: { value: 'Vue' } });

        // Submit the form
        fireEvent.click(submitButton);

        expect(mockOnSubmit).toHaveBeenCalledWith('React', 'Vue');
      });

      test('should normalize whitespace in submitted values', () => {
        render(
          <MatchupInput 
            onSubmit={mockOnSubmit}
            loading={false}
            disabled={false}
          />
        );

        const tech1Input = screen.getByLabelText('Technology 1');
        const tech2Input = screen.getByLabelText('Technology 2');
        const submitButton = screen.getByRole('button', { name: /get the verdict/i });

        // Fill in inputs with extra whitespace
        fireEvent.change(tech1Input, { target: { value: '  React  ' } });
        fireEvent.change(tech2Input, { target: { value: '\tVue\n' } });

        // Submit the form
        fireEvent.click(submitButton);

        expect(mockOnSubmit).toHaveBeenCalledWith('React', 'Vue');
      });

      test('should work with initial values', () => {
        render(
          <MatchupInput 
            onSubmit={mockOnSubmit}
            loading={false}
            disabled={false}
            initialValues={{ tech1: 'Angular', tech2: 'Svelte' }}
          />
        );

        const tech1Input = screen.getByLabelText('Technology 1') as HTMLInputElement;
        const tech2Input = screen.getByLabelText('Technology 2') as HTMLInputElement;
        const submitButton = screen.getByRole('button', { name: /get the verdict/i });

        // Should have initial values
        expect(tech1Input.value).toBe('Angular');
        expect(tech2Input.value).toBe('Svelte');

        // Should be able to submit immediately
        expect(submitButton).not.toBeDisabled();
        fireEvent.click(submitButton);

        expect(mockOnSubmit).toHaveBeenCalledWith('Angular', 'Svelte');
      });
    });

    // Requirements 1.2, 1.4: Validation error display
    describe('Validation error display', () => {
      test('should show error for empty first technology', async () => {
        render(
          <MatchupInput 
            onSubmit={mockOnSubmit}
            loading={false}
            disabled={false}
          />
        );

        const tech1Input = screen.getByLabelText('Technology 1');
        const tech2Input = screen.getByLabelText('Technology 2');

        // Fill in only second technology
        fireEvent.change(tech2Input, { target: { value: 'Vue' } });
        fireEvent.blur(tech1Input);

        await waitFor(() => {
          expect(screen.getByText('First technology is required')).toBeInTheDocument();
        });

        const submitButton = screen.getByRole('button', { name: /get the verdict/i });
        expect(submitButton).toBeDisabled();
      });

      test('should show error for empty second technology', async () => {
        render(
          <MatchupInput 
            onSubmit={mockOnSubmit}
            loading={false}
            disabled={false}
          />
        );

        const tech1Input = screen.getByLabelText('Technology 1');
        const tech2Input = screen.getByLabelText('Technology 2');

        // Fill in only first technology
        fireEvent.change(tech1Input, { target: { value: 'React' } });
        fireEvent.blur(tech2Input);

        await waitFor(() => {
          expect(screen.getByText('Second technology is required')).toBeInTheDocument();
        });

        const submitButton = screen.getByRole('button', { name: /get the verdict/i });
        expect(submitButton).toBeDisabled();
      });

      test('should show error for duplicate technologies', async () => {
        render(
          <MatchupInput 
            onSubmit={mockOnSubmit}
            loading={false}
            disabled={false}
          />
        );

        const tech1Input = screen.getByLabelText('Technology 1');
        const tech2Input = screen.getByLabelText('Technology 2');

        // Fill in same technology (case insensitive)
        fireEvent.change(tech1Input, { target: { value: 'React' } });
        fireEvent.change(tech2Input, { target: { value: 'react' } });
        fireEvent.blur(tech1Input);
        fireEvent.blur(tech2Input);

        await waitFor(() => {
          expect(screen.getByText('Please enter two different technologies')).toBeInTheDocument();
        });

        const submitButton = screen.getByRole('button', { name: /get the verdict/i });
        expect(submitButton).toBeDisabled();
      });

      test('should show error for whitespace-only inputs', async () => {
        render(
          <MatchupInput 
            onSubmit={mockOnSubmit}
            loading={false}
            disabled={false}
          />
        );

        const tech1Input = screen.getByLabelText('Technology 1');
        const tech2Input = screen.getByLabelText('Technology 2');

        // Fill in whitespace-only values
        fireEvent.change(tech1Input, { target: { value: '   ' } });
        fireEvent.change(tech2Input, { target: { value: '\t\n' } });
        fireEvent.blur(tech1Input);
        fireEvent.blur(tech2Input);

        await waitFor(() => {
          expect(screen.getByText('First technology is required')).toBeInTheDocument();
          expect(screen.getByText('Second technology is required')).toBeInTheDocument();
        });

        const submitButton = screen.getByRole('button', { name: /get the verdict/i });
        expect(submitButton).toBeDisabled();
      });

      test('should clear errors when valid input is provided', async () => {
        render(
          <MatchupInput 
            onSubmit={mockOnSubmit}
            loading={false}
            disabled={false}
          />
        );

        const tech1Input = screen.getByLabelText('Technology 1');
        const tech2Input = screen.getByLabelText('Technology 2');

        // First, create an error
        fireEvent.blur(tech1Input);
        await waitFor(() => {
          expect(screen.getByText('First technology is required')).toBeInTheDocument();
        });

        // Then fix it
        fireEvent.change(tech1Input, { target: { value: 'React' } });
        fireEvent.change(tech2Input, { target: { value: 'Vue' } });
        fireEvent.blur(tech1Input);
        fireEvent.blur(tech2Input);

        await waitFor(() => {
          expect(screen.queryByText('First technology is required')).not.toBeInTheDocument();
        });

        const submitButton = screen.getByRole('button', { name: /get the verdict/i });
        expect(submitButton).not.toBeDisabled();
      });
    });

    // Requirements 1.3, 6.3: Loading state activation
    describe('Loading state activation', () => {
      test('should show loading state when loading prop is true', () => {
        render(
          <MatchupInput 
            onSubmit={mockOnSubmit}
            loading={true}
            disabled={false}
          />
        );

        const tech1Input = screen.getByLabelText('Technology 1');
        const tech2Input = screen.getByLabelText('Technology 2');
        const submitButton = screen.getByRole('button', { name: /analyzing/i });

        // Inputs should be disabled
        expect(tech1Input).toBeDisabled();
        expect(tech2Input).toBeDisabled();
        expect(submitButton).toBeDisabled();

        // Should show loading text and spinner
        expect(screen.getByText('Analyzing...')).toBeInTheDocument();
        expect(submitButton.querySelector('.animate-spin')).toBeInTheDocument();
      });

      test('should disable form when disabled prop is true', () => {
        render(
          <MatchupInput 
            onSubmit={mockOnSubmit}
            loading={false}
            disabled={true}
          />
        );

        const tech1Input = screen.getByLabelText('Technology 1');
        const tech2Input = screen.getByLabelText('Technology 2');
        const submitButton = screen.getByRole('button', { name: /get the verdict/i });

        // All inputs should be disabled
        expect(tech1Input).toBeDisabled();
        expect(tech2Input).toBeDisabled();
        expect(submitButton).toBeDisabled();
      });

      test('should prevent submission during loading', () => {
        render(
          <MatchupInput 
            onSubmit={mockOnSubmit}
            loading={true}
            disabled={false}
            initialValues={{ tech1: 'React', tech2: 'Vue' }}
          />
        );

        const submitButton = screen.getByRole('button', { name: /analyzing/i });

        // Try to submit
        fireEvent.click(submitButton);

        // Should not call onSubmit
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });

      test('should show normal state when not loading', () => {
        render(
          <MatchupInput 
            onSubmit={mockOnSubmit}
            loading={false}
            disabled={false}
          />
        );

        const tech1Input = screen.getByLabelText('Technology 1');
        const tech2Input = screen.getByLabelText('Technology 2');
        const submitButton = screen.getByRole('button', { name: /get the verdict/i });

        // Inputs should be enabled
        expect(tech1Input).not.toBeDisabled();
        expect(tech2Input).not.toBeDisabled();

        // Should show normal button text
        expect(screen.getByText('Get The Verdict')).toBeInTheDocument();
        expect(screen.queryByText('Analyzing...')).not.toBeInTheDocument();
      });
    });

    describe('Accessibility and UX', () => {
      test('should have proper labels and form structure', () => {
        render(
          <MatchupInput 
            onSubmit={mockOnSubmit}
            loading={false}
            disabled={false}
          />
        );

        // Should have proper labels
        expect(screen.getByLabelText('Technology 1')).toBeInTheDocument();
        expect(screen.getByLabelText('Technology 2')).toBeInTheDocument();

        // Should have submit button
        const submitButton = screen.getByRole('button', { type: 'submit' });
        expect(submitButton).toBeInTheDocument();
      });

      test('should have proper placeholder text', () => {
        render(
          <MatchupInput 
            onSubmit={mockOnSubmit}
            loading={false}
            disabled={false}
          />
        );

        const tech1Input = screen.getByPlaceholderText('e.g., React');
        const tech2Input = screen.getByPlaceholderText('e.g., Vue');

        expect(tech1Input).toBeInTheDocument();
        expect(tech2Input).toBeInTheDocument();
      });

      test('should show visual feedback for validation states', () => {
        render(
          <MatchupInput 
            onSubmit={mockOnSubmit}
            loading={false}
            disabled={false}
          />
        );

        const tech1Input = screen.getByLabelText('Technology 1');

        // Should have normal styling initially
        expect(tech1Input).toHaveClass('border-gray-600');

        // Create an error state
        fireEvent.blur(tech1Input);

        // Should have error styling
        expect(tech1Input).toHaveClass('border-red-500');
      });
    });
  });
});