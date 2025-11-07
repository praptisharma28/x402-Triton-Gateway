#!/bin/bash
cd backend/facilitator
export KORA_SIGNER_PRIVATE_KEY=$(cat ~/.config/solana/kora-signer.json | jq -r '.[0:32] | map(tostring) | join(",")')
kora --config kora.toml --signers signers.toml
