#!/bin/bash

# written by gpt, so I don't know if they are that correct lol
# Start all services in tmux windows
# Usage: ./scripts/run-all.sh

set -e

echo "Starting x402 Old Faithful Gateway in tmux..."

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo "❌ tmux not found. Please install tmux first:"
    echo "   macOS: brew install tmux"
    echo "   Linux: apt-get install tmux"
    exit 1
fi

# Create new tmux session
SESSION="x402-gateway"

# Kill existing session if it exists
tmux kill-session -t $SESSION 2>/dev/null || true

# Create new session with first window for Kora
tmux new-session -d -s $SESSION -n "kora"

# Window 0: Kora
tmux send-keys -t $SESSION:0 "cd backend/facilitator" C-m
tmux send-keys -t $SESSION:0 "export KORA_SIGNER_PRIVATE_KEY=\$(cat ~/.config/solana/kora-signer.json | jq -r '.[0:32] | map(tostring) | join(\",\")')" C-m
tmux send-keys -t $SESSION:0 "echo '🔧 Starting Kora...'" C-m
tmux send-keys -t $SESSION:0 "kora --config kora.toml --signers signers.toml" C-m

# Window 1: Facilitator
tmux new-window -t $SESSION:1 -n "facilitator"
tmux send-keys -t $SESSION:1 "cd backend/facilitator" C-m
tmux send-keys -t $SESSION:1 "sleep 3" C-m
tmux send-keys -t $SESSION:1 "echo '🚀 Starting Facilitator...'" C-m
tmux send-keys -t $SESSION:1 "pnpm dev" C-m

# Window 2: Gateway
tmux new-window -t $SESSION:2 -n "gateway"
tmux send-keys -t $SESSION:2 "cd backend/gateway" C-m
tmux send-keys -t $SESSION:2 "sleep 5" C-m
tmux send-keys -t $SESSION:2 "echo '🌐 Starting Gateway...'" C-m
tmux send-keys -t $SESSION:2 "pnpm dev" C-m

# Window 3: Client Demo (don't auto-start)
tmux new-window -t $SESSION:3 -n "client"
tmux send-keys -t $SESSION:3 "cd frontend/client-demo" C-m
tmux send-keys -t $SESSION:3 "echo '💻 Client demo ready. Run: pnpm start'" C-m

# Window 4: Shell
tmux new-window -t $SESSION:4 -n "shell"
tmux send-keys -t $SESSION:4 "echo '🐚 Shell ready for testing'" C-m
tmux send-keys -t $SESSION:4 "echo ''" C-m
tmux send-keys -t $SESSION:4 "echo 'Quick commands:'" C-m
tmux send-keys -t $SESSION:4 "echo '  curl http://localhost:4021/health'" C-m
tmux send-keys -t $SESSION:4 "echo '  curl http://localhost:3000/supported'" C-m
tmux send-keys -t $SESSION:4 "echo '  curl http://localhost:4021/stats'" C-m
tmux send-keys -t $SESSION:4 "echo ''" C-m

# Attach to session
tmux select-window -t $SESSION:0
tmux attach-session -t $SESSION

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║   All services started in tmux session: $SESSION    ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "Windows:"
echo "  0: Kora"
echo "  1: Facilitator"
echo "  2: Gateway"
echo "  3: Client (manual start)"
echo "  4: Shell"
echo ""
echo "Navigation:"
echo "  Switch windows: Ctrl+B then 0-4"
echo "  Detach: Ctrl+B then D"
echo "  Reattach: tmux attach -t $SESSION"
echo "  Kill session: tmux kill-session -t $SESSION"
echo ""
