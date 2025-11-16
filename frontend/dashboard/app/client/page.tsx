'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import dynamic from 'next/dynamic'
import { Transaction, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import axios from 'axios'
import { OldFaithfulBanner } from '../components/OldFaithfulBanner'

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
)

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:4021'
const MAINNET_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const RECIPIENT_WALLET = '62pyPYsdSLah2vDSeenEep2R2hP9jz98eDbnz4Zyb1Lf'

export default function ClientPage() {
  const { connection } = useConnection()
  const { publicKey, signTransaction, sendTransaction } = useWallet()

  // Pay-per-query state
  const [txSignature, setTxSignature] = useState('')
  const [loading, setLoading] = useState(false)
  const [invoice, setInvoice] = useState<any>(null)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  // Range batching state
  const [mode, setMode] = useState<'pay-per-query' | 'range-batching'>('pay-per-query')
  const [startSlot, setStartSlot] = useState('345600000')
  const [endSlot, setEndSlot] = useState('345610000')
  const [duration, setDuration] = useState('3600') // 1 hour in seconds
  const [rangeToken, setRangeToken] = useState<string | null>(null)
  const [activeRange, setActiveRange] = useState<any>(null)
  const [blockSlot, setBlockSlot] = useState('')
  const [rangeTxSig, setRangeTxSig] = useState('')

  const handleQuery = async () => {
    if (!txSignature) {
      setError('Please enter a transaction signature')
      return
    }

    setLoading(true)
    setError('')
    setInvoice(null)
    setResult(null)

    try {
      // Step 1: Request data (will get 402)
      const response = await axios.post(`${GATEWAY_URL}/rpc`, {
        jsonrpc: '2.0',
        id: 1,
        method: 'getTransaction',
        params: [txSignature]
      })

      // If we get here without error, we got data without payment
      setResult(response.data)
      setLoading(false)

    } catch (err: any) {
      if (err.response?.status === 402) {
        // Got 402 - payment required
        setInvoice(err.response.data.payment)
        setLoading(false)
      } else {
        setError(err.message || 'Request failed')
        setLoading(false)
      }
    }
  }

  const handlePayAndQuery = async () => {
    if (!publicKey || !signTransaction) {
      setError('Please connect your wallet first')
      return
    }

    if (!invoice) {
      setError('No invoice found. Query data first.')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Step 2: Create USDC payment transaction
      const recipientPubkey = new PublicKey(invoice.recipient)
      const usdcMint = new PublicKey(MAINNET_USDC)

      const payerTokenAccount = await getAssociatedTokenAddress(
        usdcMint,
        publicKey
      )
      const recipientTokenAccount = await getAssociatedTokenAddress(
        usdcMint,
        recipientPubkey
      )

      const transaction = new Transaction()

      // Check if recipient token account exists, create if needed
      const recipientAccountInfo = await connection.getAccountInfo(recipientTokenAccount)
      if (!recipientAccountInfo) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey, // payer (you)
            recipientTokenAccount, // ATA address
            recipientPubkey, // owner (payment recipient wallet)
            usdcMint // USDC mint
          )
        )
      }

      transaction.add(
        createTransferInstruction(
          payerTokenAccount,
          recipientTokenAccount,
          publicKey,
          BigInt(invoice.amount),
          [],
          TOKEN_PROGRAM_ID
        )
      )

      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      const signedTx = await signTransaction(transaction)
      const serialized = signedTx.serialize({ requireAllSignatures: false })
      const transactionBase64 = Buffer.from(serialized).toString('base64')

      // Step 3: Send request with payment
      const paymentPayload = {
        version: 1,
        transaction: transactionBase64,
        invoiceId: invoice.invoiceId,
        network: invoice.network
      }

      const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64')

      const response = await axios.post(
        `${GATEWAY_URL}/rpc`,
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'getTransaction',
          params: [txSignature]
        },
        {
          headers: {
            'X-PAYMENT': paymentHeader
          },
          timeout: 60000 // 60 second timeout
        }
      )

      setResult(response.data)
      setInvoice(null)
      setLoading(false)

    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Payment failed')
      setLoading(false)
    }
  }

  // Load range token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('rangeToken')
    const savedRange = localStorage.getItem('activeRange')
    if (savedToken && savedRange) {
      setRangeToken(savedToken)
      setActiveRange(JSON.parse(savedRange))
    }
  }, [])

  // Calculate range price
  const calculateRangePrice = () => {
    const start = parseInt(startSlot)
    const end = parseInt(endSlot)
    if (isNaN(start) || isNaN(end) || start >= end) return 0
    const blockCount = end - start + 1
    const pricePerBlock = 0.00001
    return blockCount * pricePerBlock
  }

  // Purchase range access
  const handlePurchaseRange = async () => {
    if (!publicKey || !signTransaction || !sendTransaction) {
      setError('Please connect your wallet first')
      return
    }

    const start = parseInt(startSlot)
    const end = parseInt(endSlot)
    const dur = parseInt(duration)

    if (isNaN(start) || isNaN(end) || isNaN(dur)) {
      setError('Invalid slot range or duration')
      return
    }

    if (start >= end) {
      setError('Start slot must be less than end slot')
      return
    }

    if (end - start > 10000) {
      setError('Range too large. Maximum 10,000 blocks per purchase')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Create USDC payment transaction for range
      const price = calculateRangePrice()
      const amountLamports = Math.floor(price * 1_000_000) // USDC has 6 decimals

      const recipientPubkey = new PublicKey(RECIPIENT_WALLET)
      const usdcMint = new PublicKey(MAINNET_USDC)

      const payerTokenAccount = await getAssociatedTokenAddress(usdcMint, publicKey)
      const recipientTokenAccount = await getAssociatedTokenAddress(usdcMint, recipientPubkey)

      const transaction = new Transaction()

      // Check if recipient token account exists
      const recipientAccountInfo = await connection.getAccountInfo(recipientTokenAccount)
      if (!recipientAccountInfo) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            recipientTokenAccount,
            recipientPubkey,
            usdcMint
          )
        )
      }

      transaction.add(
        createTransferInstruction(
          payerTokenAccount,
          recipientTokenAccount,
          publicKey,
          BigInt(amountLamports),
          [],
          TOKEN_PROGRAM_ID
        )
      )

      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      // Send transaction to blockchain
      const signature = await sendTransaction(transaction, connection)
      console.log('[RANGE] Payment transaction sent:', signature)

      // Wait a moment for transaction to propagate
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Call /purchase-range endpoint
      const response = await axios.post(`${GATEWAY_URL}/purchase-range`, {
        startSlot: start,
        endSlot: end,
        duration: dur,
        paymentTxSignature: signature,
        payer: publicKey.toBase58()
      })

      // Save token and range info
      const token = response.data.token
      const rangeInfo = response.data
      setRangeToken(token)
      setActiveRange(rangeInfo)
      localStorage.setItem('rangeToken', token)
      localStorage.setItem('activeRange', JSON.stringify(rangeInfo))

      setLoading(false)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Range purchase failed')
      setLoading(false)
    }
  }

  // Query using range token
  const handleRangeQuery = async () => {
    if (!rangeToken) {
      setError('No active range token. Purchase a range first.')
      return
    }

    const method = blockSlot ? 'getBlock' : 'getTransaction'
    const params = blockSlot ? [parseInt(blockSlot)] : [rangeTxSig]

    if (!blockSlot && !rangeTxSig) {
      setError('Please enter a block slot or transaction signature')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await axios.post(
        `${GATEWAY_URL}/rpc`,
        {
          jsonrpc: '2.0',
          id: 1,
          method,
          params
        },
        {
          headers: {
            'X-Range-Token': rangeToken
          },
          timeout: 60000
        }
      )

      setResult(response.data)
      setLoading(false)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Query failed')
      setLoading(false)
    }
  }

  // Real transactions from Old Faithful Epoch 800 (slots 345,600,000 - 345,855,967)
  const EXAMPLE_TRANSACTIONS = [
    '3G8fVhYvVrHDoUQdckWsMF8EDgEpXvkzrm98EE34VHW6LFUyX8fASdoGKhCQX9zz1xLm5zjwi3DoE7FEbm4RHRSU',
    '2Zwfm3NHJyeEbnCb3sfkaLmhtrM5LS4yJWUjLYrJ824SXfPcAfrjWJePyVZC21aFhRcPtcn6vDnMY5wXrq5vbVZ',
    '5eYfNeABJGRwVkvLdsTGLHqi2UGAuoESbGUt9SvQTdt92DSzDR2Jd5iryDEyzth4AZsWEJDHV64UAgaA16ZGFRFa'
  ]

  return (
    <div className="min-h-screen p-6 md:p-12 bg-neutral-50">
      <div className="max-w-6xl mx-auto">
        {/* Old Faithful Banner */}
        <OldFaithfulBanner />

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-serif mb-3 text-neutral-900">
            Query Historical Data
          </h1>
          <p className="text-neutral-600 font-sans">
            Pay micro-amounts in USDC to access Solana's complete transaction history
          </p>
        </div>

        {/* Mode Selector */}
        <div className="bg-white border border-neutral-200 rounded-lg p-2 mb-6 inline-flex gap-2">
          <button
            onClick={() => setMode('pay-per-query')}
            className={`px-6 py-2 rounded-md font-sans font-medium transition-all ${
              mode === 'pay-per-query'
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Pay-per-Query
          </button>
          <button
            onClick={() => setMode('range-batching')}
            className={`px-6 py-2 rounded-md font-sans font-medium transition-all ${
              mode === 'range-batching'
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Range Batching
          </button>
        </div>

        {/* Pricing & Wallet Row */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Pricing Card */}
          <div className="bg-white border border-neutral-200 rounded-lg p-6">
            <h2 className="text-lg font-sans text-neutral-900 mb-4">
              Pricing
            </h2>
            {mode === 'pay-per-query' ? (
              <div className="space-y-2 text-sm font-sans">
                <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                  <span className="text-neutral-600">getTransaction</span>
                  <span className="font-mono font-semibold text-neutral-900">$0.00002</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                  <span className="text-neutral-600">getBlock</span>
                  <span className="font-mono font-semibold text-neutral-900">$0.00005</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-neutral-600">getSignatures</span>
                  <span className="font-mono font-semibold text-neutral-900">$0.0001</span>
                </div>
                <p className="text-xs text-neutral-500 mt-3">
                  Pay once per query. Best for occasional access.
                </p>
              </div>
            ) : (
              <div className="space-y-2 text-sm font-sans">
                <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                  <span className="text-neutral-600">Per Block</span>
                  <span className="font-mono font-semibold text-neutral-900">$0.00001</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                  <span className="text-neutral-600">1,000 blocks</span>
                  <span className="font-mono font-semibold text-neutral-900">$0.01</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-neutral-600">10,000 blocks (max)</span>
                  <span className="font-mono font-semibold text-neutral-900">$0.10</span>
                </div>
                <p className="text-xs text-neutral-500 mt-3">
                  Pay once, query unlimited within range. Best for bulk access.
                </p>
              </div>
            )}
            <p className="text-xs text-neutral-500 mt-3 font-sans">
              All payments in USDC via x402 protocol
            </p>
          </div>

          {/* Wallet Connection */}
          <div className="bg-white border border-neutral-200 rounded-lg p-6">
            <h2 className="text-lg font-sans text-neutral-900 mb-4">
              Connect Wallet
            </h2>
            <div className="space-y-3">
              {publicKey ? (
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                  <p className="text-xs text-neutral-600 mb-1 font-sans">Connected:</p>
                  <p className="font-mono text-sm text-neutral-900 break-all">
                    {publicKey.toBase58()}
                  </p>
                </div>
              ) : (
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                  <p className="text-sm text-neutral-700 font-sans">
                    Connect your Phantom or Solflare wallet to start querying
                  </p>
                </div>
              )}
              <WalletMultiButton className="!w-full" />
            </div>
          </div>
        </div>

        {/* Example Transactions - only show in pay-per-query mode */}
        {mode === 'pay-per-query' && (
          <div className="bg-white border border-neutral-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-sans text-neutral-900 mb-3">
              Example Transactions (Epoch 800)
            </h2>
            <p className="text-sm text-neutral-600 font-sans mb-4">
              Click to test with real Solana transactions from mainnet
            </p>
            <div className="space-y-2">
              {EXAMPLE_TRANSACTIONS.map((sig, i) => (
                <button
                  key={i}
                  onClick={() => setTxSignature(sig)}
                  className="w-full text-left px-4 py-3 border border-neutral-200 rounded-lg hover:border-neutral-400 hover:bg-neutral-50 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-neutral-600 group-hover:text-neutral-900 break-all">
                      {sig}
                    </span>
                    <span className="text-xs text-neutral-400 ml-2 whitespace-nowrap">Use →</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pay-per-Query Form */}
        {mode === 'pay-per-query' && (
          <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h2 className="text-lg font-sans text-neutral-900 mb-4">
            Query Transaction
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-sans text-neutral-700 mb-2">
                Transaction Signature
              </label>
              <input
                type="text"
                value={txSignature}
                onChange={(e) => setTxSignature(e.target.value)}
                placeholder="Enter Solana transaction signature or use examples above..."
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono text-sm"
              />
              <p className="text-xs text-neutral-500 mt-1 font-sans">
                Must be from Epoch 800 (slots 345,600,000 - 345,855,967)
              </p>
            </div>

            <button
              onClick={handleQuery}
              disabled={loading || !txSignature}
              className="w-full px-6 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-sans font-medium"
            >
              {loading ? 'Querying...' : '1️⃣ Query Data (HTTP 402)'}
            </button>
          </div>
        </div>
        )}

        {/* Range Batching Form */}
        {mode === 'range-batching' && (
          <>
            {/* Active Range Display */}
            {activeRange && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 mb-6">
                <h2 className="text-lg font-sans text-neutral-900 mb-3">
                  Active Range Access
                </h2>
                <div className="space-y-2 text-sm font-sans">
                  <div className="flex justify-between items-center py-2 border-b border-emerald-100">
                    <span className="text-neutral-600">Slot Range:</span>
                    <span className="font-mono font-semibold text-neutral-900">
                      {activeRange.range.startSlot.toLocaleString()} - {activeRange.range.endSlot.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-emerald-100">
                    <span className="text-neutral-600">Block Count:</span>
                    <span className="font-mono font-semibold text-neutral-900">
                      {activeRange.range.blockCount.toLocaleString()} blocks
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-emerald-100">
                    <span className="text-neutral-600">Paid:</span>
                    <span className="font-mono font-semibold text-neutral-900">
                      {activeRange.pricing.priceUSD}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-neutral-600">Expires:</span>
                    <span className="font-mono text-sm text-neutral-700">
                      {new Date(activeRange.access.expiresAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setRangeToken(null)
                    setActiveRange(null)
                    localStorage.removeItem('rangeToken')
                    localStorage.removeItem('activeRange')
                  }}
                  className="mt-4 w-full px-4 py-2 border border-neutral-300 text-neutral-900 rounded-lg hover:bg-neutral-50 transition-colors font-sans text-sm"
                >
                  Clear Range
                </button>
              </div>
            )}

            {/* Purchase Range Form */}
            {!activeRange && (
              <div className="bg-white border border-neutral-200 rounded-lg p-6 mb-6">
                <h2 className="text-lg font-sans text-neutral-900 mb-4">
                  Purchase Range Access
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-sans text-neutral-700 mb-2">
                        Start Slot
                      </label>
                      <input
                        type="text"
                        value={startSlot}
                        onChange={(e) => setStartSlot(e.target.value)}
                        placeholder="345600000"
                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-sans text-neutral-700 mb-2">
                        End Slot
                      </label>
                      <input
                        type="text"
                        value={endSlot}
                        onChange={(e) => setEndSlot(e.target.value)}
                        placeholder="345610000"
                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-sans text-neutral-700 mb-2">
                      Duration (seconds)
                    </label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 font-sans text-sm"
                    >
                      <option value="3600">1 hour (3600s)</option>
                      <option value="7200">2 hours (7200s)</option>
                      <option value="21600">6 hours (21600s)</option>
                      <option value="86400">24 hours (86400s)</option>
                    </select>
                  </div>

                  <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-sans text-neutral-600">Total Price:</span>
                      <span className="font-mono font-bold text-lg text-neutral-900">
                        ${calculateRangePrice().toFixed(8)} USDC
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-2 font-sans">
                      {parseInt(endSlot) - parseInt(startSlot) + 1} blocks × $0.00001 per block
                    </p>
                  </div>

                  <button
                    onClick={handlePurchaseRange}
                    disabled={loading || !publicKey}
                    className="w-full px-6 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-sans font-medium"
                  >
                    {loading ? 'Processing...' : 'Purchase Range Access'}
                  </button>

                  {!publicKey && (
                    <p className="text-sm text-neutral-600 font-sans text-center">
                      Please connect your wallet above first
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Query with Range Token */}
            {activeRange && (
              <div className="bg-white border border-neutral-200 rounded-lg p-6">
                <h2 className="text-lg font-sans text-neutral-900 mb-4">
                  Query Within Range
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-sans text-neutral-700 mb-2">
                      Block Slot (for getBlock)
                    </label>
                    <input
                      type="text"
                      value={blockSlot}
                      onChange={(e) => setBlockSlot(e.target.value)}
                      placeholder={`Enter slot between ${activeRange.range.startSlot} and ${activeRange.range.endSlot}`}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono text-sm"
                    />
                  </div>

                  <div className="text-center text-neutral-400 font-sans text-sm">OR</div>

                  <div>
                    <label className="block text-sm font-sans text-neutral-700 mb-2">
                      Transaction Signature (for getTransaction)
                    </label>
                    <input
                      type="text"
                      value={rangeTxSig}
                      onChange={(e) => setRangeTxSig(e.target.value)}
                      placeholder="Enter transaction signature..."
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono text-sm"
                    />
                  </div>

                  <button
                    onClick={handleRangeQuery}
                    disabled={loading || (!blockSlot && !rangeTxSig)}
                    className="w-full px-6 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-sans font-medium"
                  >
                    {loading ? 'Querying...' : 'Query (Free within Range)'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Invoice (402 Response) */}
        {invoice && (
          <div className="bg-white border border-neutral-300 rounded-lg p-6 mt-6">
            <div className="mb-4">
              <h3 className="text-xl font-serif text-neutral-900 mb-2">
                HTTP 402: Payment Required
              </h3>
              <p className="text-sm font-sans text-neutral-600">
                Complete USDC payment to receive transaction data
              </p>
            </div>

            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 mb-4">
              <div className="space-y-2 text-sm font-sans">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Payment Amount:</span>
                  <span className="font-mono font-bold text-lg text-neutral-900">{parseInt(invoice.amount) / 1_000_000} USDC</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-neutral-100">
                  <span className="text-neutral-600">Invoice ID:</span>
                  <span className="font-mono text-xs text-neutral-700">{invoice.invoiceId.slice(0, 20)}...</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Network:</span>
                  <span className="font-mono text-sm text-neutral-900">{invoice.network}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Timeout:</span>
                  <span className="font-mono text-sm text-neutral-700">{invoice.timeout}s</span>
                </div>
              </div>
            </div>

            <button
              onClick={handlePayAndQuery}
              disabled={loading || !publicKey}
              className="w-full px-6 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-sans font-medium"
            >
              {loading ? 'Processing Payment...' : 'Pay with USDC & Receive Data'}
            </button>

            {!publicKey && (
              <div className="mt-3 p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                <p className="text-sm text-neutral-700 font-sans text-center">
                  Please connect your wallet above first
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-neutral-50 border border-neutral-300 rounded-lg p-4 mt-6">
            <p className="text-neutral-900 text-sm font-sans">
              Error: {error}
            </p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-white border border-emerald-600 rounded-lg p-6 mt-6">
            <div className="mb-4">
              <h3 className="text-xl font-serif text-neutral-900 mb-2">
                Payment Successful
              </h3>
              <p className="text-sm font-sans text-neutral-600 mb-3">
                Transaction data retrieved from Old Faithful
              </p>
              <a
                href={`https://solscan.io/tx/${txSignature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-neutral-900 hover:text-neutral-700 font-sans underline decoration-dotted underline-offset-4"
              >
                View on Solscan
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
              <pre className="overflow-auto text-xs font-mono text-neutral-700 max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>

            <button
              onClick={() => {
                setResult(null)
                setTxSignature('')
                setInvoice(null)
                setError('')
              }}
              className="mt-4 w-full px-4 py-2 border border-neutral-300 text-neutral-900 rounded-lg hover:bg-neutral-50 transition-colors font-sans font-medium"
            >
              Query Another Transaction
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
