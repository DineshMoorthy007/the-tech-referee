// Integration test for TaleOfTheTape component
// Verifies component can be imported and used with real data

import { render, screen } from '@testing-library/react';
import TaleOfTheTape from './TaleOfTheTape';
import { ComparisonMatrix } from '@/lib/types';

describe('TaleOfTheTape Integration', () => {
  test('should render with realistic comparison data', () => {
    const realisticComparison: ComparisonMatrix = {
      speed: {
        tech1: 'Initial setup in 5 minutes, hot reload 150ms',
        tech2: 'Complex setup 30+ minutes, but 50ms runtime performance'
      },
      cost: {
        tech1: 'Free development, $10/month hosting minimum',
        tech2: 'Enterprise license $500/month, dedicated infrastructure required'
      },
      developerExperience: {
        tech1: 'Gentle learning curve, 2-week onboarding for junior devs',
        tech2: 'Steep learning curve, 3-month ramp-up for experienced developers'
      },
      scalability: {
        tech1: 'Handles 50K daily active users with standard configuration',
        tech2: 'Built for millions of users, auto-scaling from day one'
      },
      maintainability: {
        tech1: 'Strong community support, breaking changes every 6 months',
        tech2: 'Enterprise support included, LTS versions with 5-year lifecycle'
      }
    };

    render(
      <TaleOfTheTape 
        comparison={realisticComparison}
        technology1="Next.js"
        technology2="Enterprise Java"
      />
    );

    // Verify the component renders without errors
    expect(screen.getByText('The Tale of the Tape')).toBeInTheDocument();
    expect(screen.getByText('Next.js')).toBeInTheDocument();
    expect(screen.getByText('Enterprise Java')).toBeInTheDocument();

    // Verify specific realistic data is displayed
    expect(screen.getByText(/5 minutes/)).toBeInTheDocument();
    expect(screen.getByText(/\$500\/month/)).toBeInTheDocument();
    expect(screen.getByText(/50K daily active users/)).toBeInTheDocument();
    expect(screen.getByText(/5-year lifecycle/)).toBeInTheDocument();
  });

  test('should work with minimal data', () => {
    const minimalComparison: ComparisonMatrix = {
      speed: { tech1: 'Fast', tech2: 'Slow' },
      cost: { tech1: 'Cheap', tech2: 'Expensive' },
      developerExperience: { tech1: 'Easy', tech2: 'Hard' },
      scalability: { tech1: 'Limited', tech2: 'Unlimited' },
      maintainability: { tech1: 'Simple', tech2: 'Complex' }
    };

    render(
      <TaleOfTheTape 
        comparison={minimalComparison}
        technology1="A"
        technology2="B"
      />
    );

    // Should still render properly even with minimal data
    expect(screen.getByText('The Tale of the Tape')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('Fast')).toBeInTheDocument();
    expect(screen.getByText('Expensive')).toBeInTheDocument();
  });
});