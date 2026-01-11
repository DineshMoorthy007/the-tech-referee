// Unit tests for ScenarioCards component
// Feature: tech-referee, Requirements 3.1, 3.2, 3.5

import { render, screen } from '@testing-library/react';
import ScenarioCards from './ScenarioCards';
import { ScenarioVerdict } from '@/lib/types';

describe('ScenarioCards Component', () => {
  const mockScenarios: ScenarioVerdict[] = [
    {
      name: 'Move Fast Team',
      winner: 'React',
      reasoning: 'Faster development cycles with hot reload and extensive tooling ecosystem',
      context: 'Prioritizes speed to market and rapid iteration'
    },
    {
      name: 'Scale Team',
      winner: 'Angular',
      reasoning: 'Enterprise-grade architecture with built-in scalability patterns and TypeScript',
      context: 'Needs to handle large user bases and complex business logic'
    },
    {
      name: 'Budget Team',
      winner: 'React',
      reasoning: 'Lower hosting costs and abundant free resources for learning',
      context: 'Cost-conscious with limited budget for tools and infrastructure'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Requirements 3.1: Display three distinct scenarios
  describe('Scenario Structure', () => {
    test('should display all three required scenarios', () => {
      render(<ScenarioCards scenarios={mockScenarios} />);

      // Check that all three scenario names are displayed
      expect(screen.getByText('Move Fast Team')).toBeInTheDocument();
      expect(screen.getByText('Scale Team')).toBeInTheDocument();
      expect(screen.getByText('Budget Team')).toBeInTheDocument();
    });

    test('should display winner for each scenario', () => {
      render(<ScenarioCards scenarios={mockScenarios} />);

      // Check that winners are displayed - there should be multiple instances of React and Angular
      const reactWinners = screen.getAllByText('React');
      const angularWinners = screen.getAllByText('Angular');
      
      expect(reactWinners.length).toBeGreaterThan(0);
      expect(angularWinners.length).toBeGreaterThan(0);
    });

    test('should display context for each scenario', () => {
      render(<ScenarioCards scenarios={mockScenarios} />);

      // Check that context descriptions are displayed
      expect(screen.getByText('Prioritizes speed to market and rapid iteration')).toBeInTheDocument();
      expect(screen.getByText('Needs to handle large user bases and complex business logic')).toBeInTheDocument();
      expect(screen.getByText('Cost-conscious with limited budget for tools and infrastructure')).toBeInTheDocument();
    });

    test('should have proper header structure', () => {
      render(<ScenarioCards scenarios={mockScenarios} />);

      // Check for main heading
      expect(screen.getByText('The Verdicts')).toBeInTheDocument();
      expect(screen.getByText('How the choice changes based on your team\'s priorities and constraints')).toBeInTheDocument();
    });
  });

  // Requirements 3.2: Include specific reasoning for each scenario
  describe('Scenario Reasoning', () => {
    test('should display reasoning for each scenario', () => {
      render(<ScenarioCards scenarios={mockScenarios} />);

      // Check that reasoning text is displayed
      expect(screen.getByText('Faster development cycles with hot reload and extensive tooling ecosystem')).toBeInTheDocument();
      expect(screen.getByText('Enterprise-grade architecture with built-in scalability patterns and TypeScript')).toBeInTheDocument();
      expect(screen.getByText('Lower hosting costs and abundant free resources for learning')).toBeInTheDocument();
    });

    test('should have clear winner sections', () => {
      render(<ScenarioCards scenarios={mockScenarios} />);

      // Check for "Winner" labels
      const winnerLabels = screen.getAllByText('Winner');
      expect(winnerLabels).toHaveLength(3); // One for each scenario

      // Check for "Why" labels
      const whyLabels = screen.getAllByText('Why');
      expect(whyLabels).toHaveLength(3); // One for each scenario
    });

    test('should make winners prominent and clear', () => {
      render(<ScenarioCards scenarios={mockScenarios} />);

      // Winners should be displayed with proper styling classes
      const moveTeamCard = screen.getByText('Move Fast Team').closest('div')?.parentElement?.parentElement;
      const reactWinner = moveTeamCard?.querySelector('.text-yellow-300');
      expect(reactWinner).toBeInTheDocument();
    });
  });

  // Requirements 3.5: All scenarios visible simultaneously for comparison
  describe('Simultaneous Display', () => {
    test('should display all scenarios in a grid layout', () => {
      render(<ScenarioCards scenarios={mockScenarios} />);

      // Check that all scenarios are rendered simultaneously
      expect(screen.getByText('Move Fast Team')).toBeInTheDocument();
      expect(screen.getByText('Scale Team')).toBeInTheDocument();
      expect(screen.getByText('Budget Team')).toBeInTheDocument();

      // All should be visible at the same time (not hidden or in tabs)
      expect(screen.getByText('Move Fast Team')).toBeVisible();
      expect(screen.getByText('Scale Team')).toBeVisible();
      expect(screen.getByText('Budget Team')).toBeVisible();
    });

    test('should use grid layout for easy comparison', () => {
      render(<ScenarioCards scenarios={mockScenarios} />);

      // Check for grid layout classes - find the actual grid container
      const gridContainer = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3');
      expect(gridContainer).toBeInTheDocument();
      expect(gridContainer).toHaveClass('grid');
      expect(gridContainer).toHaveClass('grid-cols-1');
      expect(gridContainer).toHaveClass('md:grid-cols-2');
      expect(gridContainer).toHaveClass('lg:grid-cols-3');
    });

    test('should enable easy visual comparison between scenarios', () => {
      render(<ScenarioCards scenarios={mockScenarios} />);

      // All scenario cards should be present and structured similarly
      const moveTeamCard = screen.getByText('Move Fast Team').closest('div')?.parentElement?.parentElement;
      const scaleTeamCard = screen.getByText('Scale Team').closest('div')?.parentElement?.parentElement;
      const budgetTeamCard = screen.getByText('Budget Team').closest('div')?.parentElement?.parentElement;

      expect(moveTeamCard).toBeInTheDocument();
      expect(scaleTeamCard).toBeInTheDocument();
      expect(budgetTeamCard).toBeInTheDocument();

      // Each card should have similar structure for comparison
      expect(moveTeamCard?.querySelector('.text-yellow-400')).toBeInTheDocument(); // Icon color
      expect(scaleTeamCard?.querySelector('.text-purple-400')).toBeInTheDocument(); // Icon color
      expect(budgetTeamCard?.querySelector('.text-green-400')).toBeInTheDocument(); // Icon color
    });
  });

  // Visual Design and Accessibility Tests
  describe('Visual Design and Accessibility', () => {
    test('should have distinct visual styling for each scenario type', () => {
      render(<ScenarioCards scenarios={mockScenarios} />);

      // Each scenario should have different color schemes - find the actual card containers
      const moveTeamCard = document.querySelector('.bg-yellow-900\\/20');
      const scaleTeamCard = document.querySelector('.bg-purple-900\\/20');
      const budgetTeamCard = document.querySelector('.bg-green-900\\/20');

      // Check for different background colors
      expect(moveTeamCard).toHaveClass('bg-yellow-900/20');
      expect(scaleTeamCard).toHaveClass('bg-purple-900/20');
      expect(budgetTeamCard).toHaveClass('bg-green-900/20');
    });

    test('should display appropriate icons for each scenario', () => {
      render(<ScenarioCards scenarios={mockScenarios} />);

      // Icons should be present (we can check for SVG elements)
      const moveTeamCard = screen.getByText('Move Fast Team').closest('div')?.parentElement?.parentElement;
      const scaleTeamCard = screen.getByText('Scale Team').closest('div')?.parentElement?.parentElement;
      const budgetTeamCard = screen.getByText('Budget Team').closest('div')?.parentElement?.parentElement;

      expect(moveTeamCard?.querySelector('svg')).toBeInTheDocument();
      expect(scaleTeamCard?.querySelector('svg')).toBeInTheDocument();
      expect(budgetTeamCard?.querySelector('svg')).toBeInTheDocument();
    });

    test('should have hover effects for interactivity', () => {
      render(<ScenarioCards scenarios={mockScenarios} />);

      // Cards should have hover classes - find the actual card containers
      const moveTeamCard = document.querySelector('.bg-yellow-900\\/20');
      expect(moveTeamCard).toHaveClass('hover:border-opacity-50');
      expect(moveTeamCard).toHaveClass('hover:scale-[1.02]');
    });

    test('should have proper semantic structure', () => {
      render(<ScenarioCards scenarios={mockScenarios} />);

      // Should have proper heading structure
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('The Verdicts');
      expect(screen.getByRole('heading', { level: 3, name: 'Move Fast Team' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: 'Scale Team' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: 'Budget Team' })).toBeInTheDocument();
    });
  });

  // Edge Cases and Error Handling
  describe('Edge Cases', () => {
    test('should handle empty scenarios array gracefully', () => {
      render(<ScenarioCards scenarios={[]} />);

      // Should still render header even with no scenarios
      expect(screen.getByText('The Verdicts')).toBeInTheDocument();
      expect(screen.getByText('How the choice changes based on your team\'s priorities and constraints')).toBeInTheDocument();
    });

    test('should handle scenarios with long names and descriptions', () => {
      const longScenarios: ScenarioVerdict[] = [
        {
          name: 'Move Fast Team',
          winner: 'Very Long Technology Name That Might Cause Layout Issues',
          reasoning: 'This is an extremely long reasoning text that goes into great detail about why this particular technology choice is optimal for this specific scenario, covering multiple aspects including development speed, team productivity, learning curve, ecosystem support, and long-term maintainability considerations',
          context: 'A very detailed context description that explains the specific constraints and priorities of this team type in great detail'
        }
      ];

      render(<ScenarioCards scenarios={longScenarios} />);

      // Should display long content without breaking layout
      expect(screen.getByText('Very Long Technology Name That Might Cause Layout Issues')).toBeInTheDocument();
      expect(screen.getByText(/This is an extremely long reasoning text/)).toBeInTheDocument();
    });

    test('should handle scenarios with special characters', () => {
      const specialScenarios: ScenarioVerdict[] = [
        {
          name: 'Move Fast Team',
          winner: 'React.js & TypeScript',
          reasoning: 'Winner because of "fast development" & easy learning curve',
          context: 'Team needs speed > everything else'
        }
      ];

      render(<ScenarioCards scenarios={specialScenarios} />);

      // Should display special characters correctly
      expect(screen.getByText('React.js & TypeScript')).toBeInTheDocument();
      expect(screen.getByText(/fast development/)).toBeInTheDocument();
      expect(screen.getByText(/speed > everything else/)).toBeInTheDocument();
    });

    test('should handle incomplete scenario data gracefully', () => {
      const incompleteScenarios: ScenarioVerdict[] = [
        {
          name: 'Move Fast Team',
          winner: '',
          reasoning: '',
          context: ''
        }
      ];

      render(<ScenarioCards scenarios={incompleteScenarios} />);

      // Should still render structure even with empty values
      expect(screen.getByText('Move Fast Team')).toBeInTheDocument();
      expect(screen.getByText('Winner')).toBeInTheDocument();
      expect(screen.getByText('Why')).toBeInTheDocument();
    });
  });

  // Requirements Validation
  describe('Requirements Validation', () => {
    test('should satisfy Requirement 3.1: Three scenario completeness', () => {
      render(<ScenarioCards scenarios={mockScenarios} />);

      // Exactly three scenarios should be present with correct names
      expect(screen.getByText('Move Fast Team')).toBeInTheDocument();
      expect(screen.getByText('Scale Team')).toBeInTheDocument();
      expect(screen.getByText('Budget Team')).toBeInTheDocument();

      // Should not have more than three scenarios
      const scenarioCards = screen.getAllByRole('heading', { level: 3 });
      expect(scenarioCards).toHaveLength(3);
    });

    test('should satisfy Requirement 3.2: Scenario reasoning inclusion', () => {
      render(<ScenarioCards scenarios={mockScenarios} />);

      // Each scenario should have specific reasoning
      mockScenarios.forEach(scenario => {
        expect(screen.getByText(scenario.reasoning)).toBeInTheDocument();
        // Use getAllByText for winners since React appears multiple times
        const winners = screen.getAllByText(scenario.winner);
        expect(winners.length).toBeGreaterThan(0);
      });

      // Should have "Why" sections for reasoning
      const whyLabels = screen.getAllByText('Why');
      expect(whyLabels).toHaveLength(3);
    });

    test('should satisfy Requirement 3.5: Simultaneous scenario display', () => {
      render(<ScenarioCards scenarios={mockScenarios} />);

      // All scenarios should be visible simultaneously (not in tabs or accordion)
      const allScenarios = ['Move Fast Team', 'Scale Team', 'Budget Team'];
      
      allScenarios.forEach(scenarioName => {
        const element = screen.getByText(scenarioName);
        expect(element).toBeVisible();
      });

      // Should use grid layout for simultaneous display - find the actual grid container
      const gridContainer = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3');
      expect(gridContainer).toHaveClass('grid');
    });
  });
});