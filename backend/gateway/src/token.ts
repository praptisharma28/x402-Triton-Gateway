import { PublicKey } from "@solana/web3.js";

/**
 * Get associated token account address for a wallet and mint
 */
export async function getTokenAccountAddress(
  walletAddress: string,
  mintAddress: string
): Promise<string> {
  try {
    const TOKEN_PROGRAM_ID = new PublicKey(
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
    );
    const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
      "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
    );

    const wallet = new PublicKey(walletAddress);
    const mint = new PublicKey(mintAddress);

    const [associatedTokenAddress] = await PublicKey.findProgramAddress(
      [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    return associatedTokenAddress.toBase58();
  } catch (error) {
    console.error("[TOKEN] Error getting token account address:", error);
    // Return wallet address as fallback
    return walletAddress;
  }
}
