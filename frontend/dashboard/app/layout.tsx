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
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-serif text-xl font-semibold text-neutral-900">x402 Triton Gateway</span>
          </Link>
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
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="font-medium">Old Faithful Live</span>
          </div>
          <div className="px-3 py-1.5 bg-green-50 text-green-700 rounded-full font-medium">
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
