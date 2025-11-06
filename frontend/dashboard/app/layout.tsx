import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'x402 Gateway Dashboard',
  description: 'Analytics and receipts for x402 Old Faithful Access Gateway',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">{children}</body>
    </html>
  )
}
