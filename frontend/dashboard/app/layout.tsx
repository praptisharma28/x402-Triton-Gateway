import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'x402 Triton Gateway - Old Faithful Access',
  description: 'Pay-per-query access to Solana historical data via x402 protocol and Old Faithful',
}

function Navigation() {
  return (
    <nav className="border-b border-neutral-200 bg-white">
      <div className="max-w-6xl mx-auto py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-sans text-neutral-600 hover:text-neutral-900 transition-colors">
              Dashboard
            </Link>
            <Link href="/client" className="text-sm font-sans text-neutral-600 hover:text-neutral-900 transition-colors">
              Try Demo
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs font-sans">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-neutral-300 text-neutral-700 rounded-md">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span className="font-medium">Live</span>
          </div>
          <div className="px-3 py-1.5 border border-neutral-300 text-neutral-700 rounded-md font-medium">
            Mainnet
          </div>
        </div>
      </div>
    </nav>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased bg-neutral-50">
        <Providers>
          <Navigation />
          {children}
        </Providers>
      </body>
    </html>
  )
}
