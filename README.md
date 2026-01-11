# Tech Referee ⚖️

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-API-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](http://makeapullrequest.com)
[![Accessibility](https://img.shields.io/badge/WCAG-2.1_AA-green?style=for-the-badge&logo=accessibility&logoColor=white)](https://www.w3.org/WAI/WCAG21/quickref/)

An intelligent decision-support tool designed to help developers and architects choose between competing technologies. Unlike standard search or chat tools, The Tech Referee focuses on **trade-offs, constraints, and "hidden taxes"** to help you move from "Analysis Paralysis" to "Informed Decision."

## Core Philosophy

> "There is no best tool, only the best tool for the specific job."

We don't provide "answers" — we provide **verdicts based on context** by simulating how technology choices play out across different scenarios.

## Key Features

### 🥊 The Matchup Input
Clean interface for entering two competing technologies with intelligent alias support (e.g., "React vs Vue", "PostgreSQL vs MongoDB").

### 📊 The Tale of the Tape
Dynamic comparison matrix highlighting:
- **Speed**: Development velocity and performance
- **Cost**: Financial investment and operational expenses  
- **Developer Experience**: Learning curve and development ergonomics
- **Scalability**: Growth handling and performance at scale
- **Maintainability**: Long-term code health and updates

### ⚖️ Scenario-Based Verdicts
Get specific recommendations for different team contexts:
- **Move Fast Team**: Prioritizes development speed
- **Scale Team**: Focuses on growth and performance
- **Budget Team**: Optimizes for cost efficiency

### ⚠️ Hidden Tax Warnings
Prominent alerts about potential downsides and future costs of your technology choice, including specific timeframes and impact assessments.

### 🏁 The Tie-Breaker
A final, cutting question designed to help you make the decision that's right for your specific situation.

## Design Principles

- **Objective**: UI feels like a scoreboard or legal document — clean, high-contrast, and neutral
- **Scannable**: Users can see the "Winner" and "Tax" in under 5 seconds
- **Mobile-First**: Optimized for all screen sizes with enhanced touch targets
- **Accessible**: Full keyboard navigation, screen reader support, and high contrast mode

## Tech Stack

- **Framework**: Next.js 14 with App Router and TypeScript
- **Styling**: Tailwind CSS with enhanced dark theme and custom animations
- **Icons**: Lucide React for consistent iconography
- **LLM Integration**: OpenAI API with retry logic and error handling
- **Testing**: Jest with React Testing Library and Fast-check for property-based testing
- **Accessibility**: WCAG 2.1 AA compliant with enhanced focus management

## Recent Improvements

### Enhanced Layout & UX (Latest)
- **Improved Visual Hierarchy**: Larger typography scale, better spacing system
- **Mobile-First Design**: Optimized touch targets (44px minimum), better mobile spacing
- **Enhanced Animations**: Card elevation effects, skeleton loading, smooth transitions
- **Better Accessibility**: Improved focus rings, ARIA labels, keyboard navigation
- **Modern Styling**: Upgraded to rounded-xl/2xl borders, enhanced gradients

### Core Features
- **Technology Alias Support**: Handles common variations (React.js → React, PostgreSQL → Postgres)
- **Retry Logic**: Automatic retry for failed API calls with exponential backoff
- **Error Handling**: User-friendly error messages with retry options
- **Loading States**: Enhanced loading indicators and skeleton screens

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
# Add your OpenAI API key to .env.local
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes (OpenAI integration)
│   ├── layout.tsx         # Root layout with error boundary
│   ├── page.tsx           # Main application page
│   └── globals.css        # Enhanced global styles & animations
├── components/            # React components
│   ├── MatchupInput.tsx   # Technology input form
│   ├── VerdictDisplay.tsx # Results orchestration
│   ├── TaleOfTheTape.tsx  # Comparison matrix
│   ├── ScenarioCards.tsx  # Scenario-based verdicts
│   ├── HiddenTaxWarning.tsx # Cost warnings
│   ├── LoadingState.tsx   # Enhanced loading UI
│   └── ErrorBoundary.tsx  # Error handling
├── lib/                   # Utilities & configurations
│   ├── openai.ts         # OpenAI client setup
│   ├── prompts.ts        # LLM prompt engineering
│   ├── retry.ts          # Retry logic utilities
│   └── types.ts          # TypeScript definitions
├── public/               # Static assets
└── .kiro/                # Kiro development specs
    ├── steering/         # Development guidelines
    └── specs/tech-referee/ # Project specifications
```

## Development Philosophy

This project follows **spec-driven development** with Kiro methodology:

1. **Requirements-First**: All features defined in `.kiro/specs/tech-referee/requirements.md`
2. **Design-Driven**: UI/UX specifications in `.kiro/specs/tech-referee/design.md`  
3. **Task-Oriented**: Implementation tracked in `.kiro/specs/tech-referee/tasks.md`
4. **Steering Guidelines**: Development principles in `.kiro/steering/`

## Usage Examples

### Basic Comparison
```
Input: "React" vs "Vue"
Output: Detailed analysis across 5 dimensions + 3 scenarios + hidden costs
```

### Advanced Scenarios
```
Input: "PostgreSQL" vs "MongoDB" 
Context: Automatically detects aliases, provides startup vs enterprise perspectives
```

## Contributing

1. Review the spec files in `.kiro/specs/tech-referee/` for context
2. Follow the established component patterns and styling conventions
3. Ensure accessibility compliance (WCAG 2.1 AA)
4. Add tests for new functionality
5. Update relevant spec files when adding features

## License

MIT