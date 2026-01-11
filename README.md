# Tech Referee

An intelligent decision-support tool designed to help developers and architects choose between competing technologies. The system focuses on trade-offs, constraints, and "hidden taxes" rather than providing simple answers.

## Features

- **Objective Technology Comparisons**: Compare technologies across Speed, Cost, Developer Experience, Scalability, and Maintainability
- **Scenario-Based Verdicts**: Get recommendations for different team contexts (Move Fast, Scale, Budget)
- **Hidden Tax Warnings**: Understand potential downsides and future costs
- **Dark Developer-Focused UI**: Clean, scannable interface designed for developers

## Tech Stack

- **Framework**: Next.js 14 with App Router and TypeScript
- **Styling**: Tailwind CSS with dark theme
- **Icons**: Lucide React
- **LLM Integration**: OpenAI API
- **Testing**: Jest with React Testing Library and Fast-check for property-based testing

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
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
├── lib/                   # Utility functions and configurations
├── public/               # Static assets
└── .kiro/                # Kiro spec files
    └── specs/
        └── tech-referee/
            ├── requirements.md
            ├── design.md
            └── tasks.md
```

## Development

This project follows the Kiro spec-driven development methodology. See the spec files in `.kiro/specs/tech-referee/` for detailed requirements, design, and implementation tasks.

## License

MIT