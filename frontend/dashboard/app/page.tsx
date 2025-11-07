'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:4021'

interface Receipt {
  id: string
  invoiceId: string
  txSignature: string
  method: string
  amountUSD: number
  status: string
  latencyMs: number
  timestamp: number
  payer: string
  network: string
}

interface Stats {
  totalRequests: number
  totalRevenue: number
  methodBreakdown: Record<string, { count: number; revenue: number }>
  averageLatency: number
  failureRate: number
}

// Icon components (inline SVGs for no dependencies)
const DollarIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const ChartIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const ClockIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const ActivityIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
)

const ExternalLinkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
)

export default function Dashboard() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchData = async () => {
    try {
      const [receiptsRes, statsRes] = await Promise.all([
        axios.get(`${GATEWAY_URL}/receipts?limit=50`),
        axios.get(`${GATEWAY_URL}/stats`)
      ])
      setReceipts(receiptsRes.data)
      setStats(statsRes.data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    if (autoRefresh) {
      const interval = setInterval(fetchData, 3000) // Refresh every 3s
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatUSD = (amount: number) => {
    return `$${amount.toFixed(6)}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'settled': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-neutral-600 font-sans">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div>
              <h1 className="text-5xl md:text-6xl font-serif mb-3 text-neutral-900">
                x402 Gateway
              </h1>
              <p className="text-neutral-600 font-sans text-base font-light">
                Real-time analytics for Old Faithful data access
              </p>
              <div className="flex items-center gap-3 mt-3">
                <span className="flex items-center gap-1.5 text-xs font-sans font-medium uppercase tracking-wider">
                  <span className="relative flex h-1.5 w-1.5">
                    {autoRefresh ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </>
                    ) : (
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-neutral-400"></span>
                    )}
                  </span>
                  <span className={autoRefresh ? "text-emerald-600" : "text-neutral-500"}>
                    {autoRefresh ? "Live" : "Offline"}
                  </span>
                </span>
                <span className="text-neutral-300">·</span>
                <span className="text-xs text-neutral-500 font-sans">Triton Old Faithful</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={fetchData}
                className="px-4 py-2 border border-neutral-300 hover:border-neutral-400 bg-white text-neutral-700 rounded-lg transition-colors font-sans text-sm font-medium"
              >
                Refresh
              </button>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg transition-colors font-sans text-sm font-medium ${
                  autoRefresh
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600'
                    : 'border border-neutral-300 hover:border-neutral-400 bg-white text-neutral-700'
                }`}
              >
                {autoRefresh ? 'Auto On' : 'Auto Off'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {/* Total Requests */}
            <div className="minimal-card minimal-shadow hover:minimal-shadow-lg rounded-lg p-6 transition-all">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-sans font-medium text-neutral-500 uppercase tracking-wider">Requests</span>
              </div>
              <p className="text-4xl font-serif text-neutral-900 mb-1">{stats.totalRequests}</p>
              <p className="text-sm font-sans text-neutral-500 font-light">All-time queries</p>
            </div>

            {/* Total Revenue */}
            <div className="minimal-card minimal-shadow hover:minimal-shadow-lg rounded-lg p-6 transition-all">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-sans font-medium text-neutral-500 uppercase tracking-wider">Revenue</span>
              </div>
              <p className="text-4xl font-serif text-neutral-900 mb-1">{formatUSD(stats.totalRevenue)}</p>
              <p className="text-sm font-sans text-neutral-500 font-light">USDC payments</p>
            </div>

            {/* Avg Latency */}
            <div className="minimal-card minimal-shadow hover:minimal-shadow-lg rounded-lg p-6 transition-all">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-sans font-medium text-neutral-500 uppercase tracking-wider">Latency</span>
              </div>
              <p className="text-4xl font-serif text-neutral-900 mb-1">{Math.round(stats.averageLatency)}<span className="text-2xl text-neutral-500">ms</span></p>
              <p className="text-sm font-sans text-neutral-500 font-light">Avg response</p>
            </div>

            {/* Success Rate */}
            <div className="minimal-card minimal-shadow hover:minimal-shadow-lg rounded-lg p-6 transition-all">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-sans font-medium text-neutral-500 uppercase tracking-wider">Success</span>
              </div>
              <p className="text-4xl font-serif text-neutral-900 mb-1">
                {((1 - stats.failureRate) * 100).toFixed(1)}<span className="text-2xl text-neutral-500">%</span>
              </p>
              <p className="text-sm font-sans text-neutral-500 font-light">Success rate</p>
            </div>
          </div>
        )}

        {/* Method Breakdown */}
        {stats && Object.keys(stats.methodBreakdown).length > 0 && (
          <div className="minimal-card minimal-shadow rounded-lg p-8 mb-8">
            <h2 className="text-2xl font-serif text-neutral-900 mb-8">
              Revenue by Method
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(stats.methodBreakdown).map(([method, data]) => (
                <div key={method} className="border border-neutral-200 rounded-lg p-5 hover:border-neutral-300 transition-colors">
                  <h3 className="font-sans font-medium text-neutral-900 mb-2 text-sm">
                    {method}
                  </h3>
                  <p className="text-xs font-sans text-neutral-500 mb-3">{data.count} calls</p>
                  <p className="text-2xl font-serif text-neutral-900">
                    {formatUSD(data.revenue)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Receipts Table */}
        <div className="minimal-card minimal-shadow rounded-lg overflow-hidden">
          <div className="p-8 border-b border-neutral-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-serif text-neutral-900 mb-2">
                  Recent Receipts
                </h2>
                <p className="text-sm font-sans text-neutral-500 font-light">
                  {receipts.length} payment{receipts.length !== 1 ? 's' : ''} processed
                </p>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            {receipts.length === 0 ? (
              <div className="p-24 text-center">
                <div className="w-12 h-12 mx-auto mb-4 text-neutral-300">
                  <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <p className="text-base font-serif text-neutral-900 mb-1">No receipts yet</p>
                <p className="text-sm font-sans text-neutral-500 font-light">Payments will appear here once processed</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="px-8 py-4 text-left text-xs font-sans font-medium text-neutral-500 uppercase tracking-wider">Time</th>
                    <th className="px-8 py-4 text-left text-xs font-sans font-medium text-neutral-500 uppercase tracking-wider">Method</th>
                    <th className="px-8 py-4 text-left text-xs font-sans font-medium text-neutral-500 uppercase tracking-wider">Amount</th>
                    <th className="px-8 py-4 text-left text-xs font-sans font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                    <th className="px-8 py-4 text-left text-xs font-sans font-medium text-neutral-500 uppercase tracking-wider">Latency</th>
                    <th className="px-8 py-4 text-left text-xs font-sans font-medium text-neutral-500 uppercase tracking-wider">Transaction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {receipts.map((receipt) => (
                    <tr key={receipt.id} className="hover:bg-neutral-50 transition-colors group">
                      <td className="px-8 py-4 whitespace-nowrap text-sm font-sans text-neutral-600">
                        {formatTimestamp(receipt.timestamp)}
                      </td>
                      <td className="px-8 py-4 whitespace-nowrap">
                        <span className="text-sm font-sans font-medium text-neutral-900">{receipt.method}</span>
                      </td>
                      <td className="px-8 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-neutral-900">{formatUSD(receipt.amountUSD)}</span>
                      </td>
                      <td className="px-8 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-sans font-medium ${
                          receipt.status === 'settled' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : receipt.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          <span className="capitalize">{receipt.status}</span>
                        </span>
                      </td>
                      <td className="px-8 py-4 whitespace-nowrap text-sm font-mono text-neutral-600">
                        {receipt.latencyMs}ms
                      </td>
                      <td className="px-8 py-4 whitespace-nowrap text-sm">
                        {receipt.txSignature ? (
                          <a
                            href={`https://explorer.solana.com/tx/${receipt.txSignature}?cluster=${receipt.network}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-neutral-600 hover:text-neutral-900 font-mono text-xs transition-colors underline decoration-dotted underline-offset-4"
                          >
                            {receipt.txSignature.slice(0, 12)}...
                            <ExternalLinkIcon />
                          </a>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-neutral-200 text-center space-y-3 pb-12">
          <p className="text-xs font-sans text-neutral-500">
            Connected to <span className="font-mono text-neutral-700">{GATEWAY_URL}</span>
          </p>
          <p className="text-sm font-sans text-neutral-600">
            x402 Old Faithful Access Gateway
          </p>
          <p className="text-xs font-sans text-neutral-400">
            Powered by Triton One · Kora · ParaFi
          </p>
        </div>
      </div>
    </div>
  )
}
