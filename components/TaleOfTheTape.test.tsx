// Unit tests for TaleOfTheTape component
// Feature: tech-referee, Requirements 2.1, 2.2

import { render, screen } from '@testing-library/react';
import TaleOfTheTape from './TaleOfTheTape';
import { ComparisonMatrix } from '@/lib/types';

describe('TaleOfTheTape Component', () => {
  const mockComparison: ComparisonMatrix = {
    speed: {
      tech1: 'Fast initial setup, hot reload in 200ms',
      tech2: 'Slower initial build, but optimized runtime performance'
    },
    cost: {
      tech1: '$0 start cost, hosting from $5/month',
      tech2: 'Free tier available, scales to $50/month for medium apps'
    },
    developerExperience: {
      tech1: 'Gentle learning curve, extensive documentation',
      tech2: 'Steeper learning curve, powerful but complex tooling'
    },
    scalability: {
      tech1: 'Handles 10K concurrent users with proper caching',
      tech2: 'Built for enterprise scale, 100K+ users out of the box'
    },
    maintainability: {
      tech1: 'Strong typing reduces bugs, active community support',
      tech2: 'Mature ecosystem, but requires dedicated DevOps knowledge'
    }
  };

  const technology1 = 'React';
  const technology2 = 'Angular';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Requirements 2.1: Display all required comparison dimensions
  describe('Comparison Structure', () => {
    test('should display all five required dimensions', () => {
      render(
        <TaleOfTheTape 
          comparison={mockComparison}
          technology1={technology1}
          technology2={technology2}
        />
      );

      // Check that all dimensions are displayed
      expect(screen.getByText('Speed')).toBeInTheDocument();
      expect(screen.getByText('Cost')).toBeInTheDocument();
      expect(screen.getByText('Developer Experience')).toBeInTheDocument();
      expect(screen.getByText('Scalability')).toBeInTheDocument();
      expect(screen.getByText('Maintainability')).toBeInTheDocument();
    });

    test('should display technology names in header', () => {
      render(
        <TaleOfTheTape 
          comparison={mockComparison}
          technology1={technology1}
          technology2={technology2}
        />
      );

      // Check that technology names appear in the header
      expect(screen.getByText(technology1)).toBeInTheDocument();
      expect(screen.getByText(technology2)).toBeInTheDocument();
    });

    test('should display comparison values for each dimension', () => {
      render(
        <TaleOfTheTape 
          comparison={mockComparison}
          technology1={technology1}
          technology2={technology2}
        />
      );

      // Check that specific comparison values are displayed
      expect(screen.getByText('Fast initial setup, hot reload in 200ms')).toBeInTheDocument();
      expect(screen.getByText('Slower initial build, but optimized runtime performance')).toBeInTheDocument();
      expect(screen.getByText('$0 start cost, hosting from $5/month')).toBeInTheDocument();
      expect(screen.getByText('Free tier available, scales to $50/month for medium apps')).toBeInTheDocument();
    });

    test('should have proper table structure', () => {
      render(
        <TaleOfTheTape 
          comparison={mockComparison}
          technology1={technology1}
          technology2={technology2}
        />
      );

      // Check for table-like structure
      expect(screen.getByText('The Tale of the Tape')).toBeInTheDocument();
      expect(screen.getByText('Head-to-head comparison across key dimensions')).toBeInTheDocument();
      expect(screen.getByText('Dimension')).toBeInTheDocument();
    });
  });

  // Requirements 2.2: Use specific descriptors, avoid generic terms
  describe('Specific Descriptors', () => {
    test('should display specific descriptors without generic terms', () => {
      render(
        <TaleOfTheTape 
          comparison={mockComparison}
          technology1={technology1}
          technology2={technology2}
        />
      );

      // Check that specific descriptors are used (from our mock data)
      expect(screen.getByText(/200ms/)).toBeInTheDocument(); // Specific timing
      expect(screen.getByText(/\$0 start cost/)).toBeInTheDocument(); // Specific cost
      expect(screen.getByText(/10K concurrent users/)).toBeInTheDocument(); // Specific scale
      expect(screen.getByText(/100K\+ users/)).toBeInTheDocument(); // Specific scale

      // Ensure no generic terms are present (these should not be in our specific descriptors)
      const textContent = document.body.textContent || '';
      
      // These generic terms should not appear in isolation
      expect(textContent).not.toMatch(/\bGood\b/);
      expect(textContent).not.toMatch(/\bBad\b/);
      expect(textContent).not.toMatch(/\bBetter\b/);
      expect(textContent).not.toMatch(/\bWorse\b/);
    });

    test('should include quantifiable metrics in descriptors', () => {
      render(
        <TaleOfTheTape 
          comparison={mockComparison}
          technology1={technology1}
          technology2={technology2}
        />
      );

      // Look for quantifiable metrics in the displayed text
      const textContent = document.body.textContent || '';

      // Should contain specific numbers, costs, timeframes
      expect(textContent).toMatch(/\d+ms/); // milliseconds
      expect(textContent).toMatch(/\$\d+/); // dollar amounts
      expect(textContent).toMatch(/\d+K/); // user counts
    });
  });

  // Visual and Accessibility Tests
  describe('Visual Design and Accessibility', () => {
    test('should have high contrast developer tool aesthetic', () => {
      render(
        <TaleOfTheTape 
          comparison={mockComparison}
          technology1={technology1}
          technology2={technology2}
        />
      );

      // Check for dark theme classes (high contrast)
      const heading = screen.getByText('The Tale of the Tape');
      expect(heading).toHaveClass('text-white');
      
      // Check for proper background colors - find the actual container with bg-gray-900
      const container = screen.getByText('The Tale of the Tape').closest('div')?.parentElement;
      const tableHeader = container?.querySelector('.bg-gray-900');
      expect(tableHeader).toBeInTheDocument();
    });

    test('should display dimension icons', () => {
      render(
        <TaleOfTheTape 
          comparison={mockComparison}
          technology1={technology1}
          technology2={technology2}
        />
      );

      // Icons should be present (we can't easily test SVG content, but we can check structure)
      const speedSection = screen.getByText('Speed').parentElement?.parentElement;
      const svgElement = speedSection?.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
    });

    test('should have responsive design elements', () => {
      render(
        <TaleOfTheTape 
          comparison={mockComparison}
          technology1={technology1}
          technology2={technology2}
        />
      );

      // Check for responsive grid classes in the header - find the parent container
      const dimensionText = screen.getByText('Dimension');
      const gridContainer = dimensionText.closest('div')?.parentElement;
      expect(gridContainer).toHaveClass('grid-cols-3');
      
      // Check for mobile-responsive classes in the dimension rows
      const container = screen.getByText('The Tale of the Tape').closest('div')?.parentElement;
      const responsiveGrid = container?.querySelector('.md\\:grid-cols-3');
      expect(responsiveGrid).toBeInTheDocument();
    });

    test('should have proper semantic structure', () => {
      render(
        <TaleOfTheTape 
          comparison={mockComparison}
          technology1={technology1}
          technology2={technology2}
        />
      );

      // Should have proper heading structure
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('The Tale of the Tape');
      
      // Should have descriptive text
      expect(screen.getByText('Head-to-head comparison across key dimensions')).toBeInTheDocument();
    });
  });

  // Edge Cases and Error Handling
  describe('Edge Cases', () => {
    test('should handle empty comparison values gracefully', () => {
      const emptyComparison: ComparisonMatrix = {
        speed: { tech1: '', tech2: '' },
        cost: { tech1: '', tech2: '' },
        developerExperience: { tech1: '', tech2: '' },
        scalability: { tech1: '', tech2: '' },
        maintainability: { tech1: '', tech2: '' }
      };

      render(
        <TaleOfTheTape 
          comparison={emptyComparison}
          technology1={technology1}
          technology2={technology2}
        />
      );

      // Should still render structure even with empty values
      expect(screen.getByText('The Tale of the Tape')).toBeInTheDocument();
      expect(screen.getByText('Speed')).toBeInTheDocument();
      expect(screen.getByText(technology1)).toBeInTheDocument();
      expect(screen.getByText(technology2)).toBeInTheDocument();
    });

    test('should handle long technology names', () => {
      const longTech1 = 'Very Long Technology Name That Might Cause Layout Issues';
      const longTech2 = 'Another Extremely Long Technology Name For Testing';

      render(
        <TaleOfTheTape 
          comparison={mockComparison}
          technology1={longTech1}
          technology2={longTech2}
        />
      );

      // Should display long names without breaking layout
      expect(screen.getByText(longTech1)).toBeInTheDocument();
      expect(screen.getByText(longTech2)).toBeInTheDocument();
    });

    test('should handle long comparison descriptions', () => {
      const longComparison: ComparisonMatrix = {
        speed: {
          tech1: 'This is a very long description that goes into great detail about the speed characteristics and performance implications of this technology choice in various scenarios and use cases',
          tech2: 'Another extremely detailed description that covers multiple aspects of performance including initial load time, runtime performance, build time, and various optimization strategies'
        },
        cost: mockComparison.cost,
        developerExperience: mockComparison.developerExperience,
        scalability: mockComparison.scalability,
        maintainability: mockComparison.maintainability
      };

      render(
        <TaleOfTheTape 
          comparison={longComparison}
          technology1={technology1}
          technology2={technology2}
        />
      );

      // Should display long descriptions without breaking layout
      expect(screen.getByText(/This is a very long description/)).toBeInTheDocument();
      expect(screen.getByText(/Another extremely detailed description/)).toBeInTheDocument();
    });

    test('should handle special characters in technology names', () => {
      const specialTech1 = 'React.js';
      const specialTech2 = 'Vue@3.0';

      render(
        <TaleOfTheTape 
          comparison={mockComparison}
          technology1={specialTech1}
          technology2={specialTech2}
        />
      );

      // Should display special characters correctly
      expect(screen.getByText(specialTech1)).toBeInTheDocument();
      expect(screen.getByText(specialTech2)).toBeInTheDocument();
    });
  });

  // Integration with Requirements
  describe('Requirements Validation', () => {
    test('should satisfy Requirement 2.1: Complete comparison structure', () => {
      render(
        <TaleOfTheTape 
          comparison={mockComparison}
          technology1={technology1}
          technology2={technology2}
        />
      );

      // All five required dimensions must be present
      const requiredDimensions = ['Speed', 'Cost', 'Developer Experience', 'Scalability', 'Maintainability'];
      
      requiredDimensions.forEach(dimension => {
        expect(screen.getByText(dimension)).toBeInTheDocument();
      });

      // Each dimension should have values for both technologies
      Object.values(mockComparison).forEach(dimension => {
        expect(screen.getByText(dimension.tech1)).toBeInTheDocument();
        expect(screen.getByText(dimension.tech2)).toBeInTheDocument();
      });
    });

    test('should satisfy Requirement 2.2: Specific descriptors usage', () => {
      render(
        <TaleOfTheTape 
          comparison={mockComparison}
          technology1={technology1}
          technology2={technology2}
        />
      );

      // Should use specific, quantifiable descriptors
      // Our mock data includes specific metrics like "200ms", "$5/month", "10K concurrent users"
      expect(screen.getByText(/200ms/)).toBeInTheDocument();
      expect(screen.getByText(/\$5\/month/)).toBeInTheDocument();
      expect(screen.getByText(/10K concurrent users/)).toBeInTheDocument();
      expect(screen.getByText(/100K\+ users/)).toBeInTheDocument();
    });
  });
});