import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ErrorBoundary from '@/components/ErrorBoundary'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Tech Referee - Objective Technology Comparisons',
  description: 'Get objective technology comparisons with trade-offs, scenarios, and hidden costs. Make informed decisions with our intelligent decision-support tool.',
  keywords: 'technology comparison, tech stack, developer tools, architecture decisions, technology trade-offs',
  authors: [{ name: 'Tech Referee' }],
  robots: 'index, follow',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1f2937',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground antialiased`}>
        <ErrorBoundary>
          <div className="min-h-screen bg-gray-900">
            {/* Skip to main content link for screen readers */}
            <a 
              href="#main-content" 
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-yellow-400 text-gray-900 px-4 py-2 rounded-lg font-medium z-50 focus:outline-none focus:ring-2 focus:ring-yellow-300"
            >
              Skip to main content
            </a>
            <main id="main-content" role="main">
              {children}
            </main>
          </div>
        </ErrorBoundary>
      </body>
    </html>
  )
}