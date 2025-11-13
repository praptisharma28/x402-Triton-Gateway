export function OldFaithfulBanner() {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-8 mb-12">
      <h2 className="text-2xl font-serif text-neutral-900 mb-3">
        Powered by Old Faithful
      </h2>
      <p className="text-sm font-sans text-neutral-600 leading-relaxed mb-4 max-w-3xl">
        This gateway provides paid access to Solana's complete historical data via Triton's Old Faithful archive.
        Users pay micro-amounts in USDC per query using the x402 protocol.
      </p>
      <div className="flex flex-wrap items-center gap-3 text-xs font-sans">
        <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md font-medium">
          Epoch 800 Live
        </span>
        <span className="px-3 py-1.5 border border-neutral-300 text-neutral-700 rounded-md">
          Mainnet-Beta
        </span>
        <span className="px-3 py-1.5 border border-neutral-300 text-neutral-700 rounded-md">
          x402 Protocol
        </span>
      </div>
    </div>
  )
}

