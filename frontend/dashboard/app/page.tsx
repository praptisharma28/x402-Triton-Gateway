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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">x402 Gateway Dashboard</h1>
          <p className="text-gray-600">Real-time analytics and payment receipts</p>
          <div className="mt-4 flex gap-4">
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh Now
            </button>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded ${
                autoRefresh
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              }`}
            >
              {autoRefresh ? '● Auto-Refresh ON' : '○ Auto-Refresh OFF'}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Requests</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.totalRequests}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Revenue</h3>
              <p className="text-3xl font-bold text-green-600">{formatUSD(stats.totalRevenue)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Avg Latency</h3>
              <p className="text-3xl font-bold text-purple-600">{Math.round(stats.averageLatency)}ms</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Success Rate</h3>
              <p className="text-3xl font-bold text-indigo-600">
                {((1 - stats.failureRate) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        )}

        {/* Method Breakdown */}
        {stats && Object.keys(stats.methodBreakdown).length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Revenue by Method</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(stats.methodBreakdown).map(([method, data]) => (
                <div key={method} className="border rounded p-4">
                  <h3 className="font-medium text-gray-700">{method}</h3>
                  <p className="text-sm text-gray-500">{data.count} calls</p>
                  <p className="text-lg font-bold text-green-600">{formatUSD(data.revenue)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Receipts Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">Recent Receipts</h2>
            <p className="text-sm text-gray-500">Showing {receipts.length} most recent payments</p>
          </div>
          <div className="overflow-x-auto">
            {receipts.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <p className="text-lg mb-2">No receipts yet</p>
                <p className="text-sm">Payments will appear here once transactions are processed</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Latency</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">TX Signature</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {receipts.map((receipt) => (
                    <tr key={receipt.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTimestamp(receipt.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {receipt.method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatUSD(receipt.amountUSD)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(receipt.status)}`}>
                          {receipt.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {receipt.latencyMs}ms
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {receipt.txSignature ? (
                          <a
                            href={`https://explorer.solana.com/tx/${receipt.txSignature}?cluster=${receipt.network}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-mono"
                          >
                            {receipt.txSignature.slice(0, 8)}...
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
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
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Connected to: {GATEWAY_URL}</p>
          <p>x402 Old Faithful Access Gateway - Built for Solana x402 Hackathon</p>
        </div>
      </div>
    </div>
  )
}
