import { Connection, PublicKey } from "@solana/web3.js";
import { uiAmountToRaw, rawToUiAmount } from "@room-royale/shared";

export interface HoldingResult {
  /** Whether the wallet meets the minimum holding requirement. */
  holds: boolean;
  /** Total raw token amount held across all of the owner's token accounts. */
  rawAmount: bigint;
  /** Human-readable amount for display/logging. */
  uiAmount: number;
}

/**
 * Reads a mint's decimals via a parsed account fetch. Works for both the
 * classic Token program and Token-2022 (pump.fun uses the classic program).
 */
export async function getMintDecimals(
  connection: Connection,
  mint: PublicKey,
): Promise<number> {
  const info = await connection.getParsedAccountInfo(mint);
  const data = info.value?.data;
  if (data && "parsed" in data && data.parsed?.type === "mint") {
    const decimals = data.parsed.info?.decimals;
    if (typeof decimals === "number") return decimals;
  }
  throw new Error(`Could not read decimals for mint ${mint.toBase58()}`);
}

/**
 * Verifies token holdings against a minimum. Construct once per mint (it caches
 * decimals + the precomputed raw threshold), then call `verify(owner)` per wallet.
 */
export class TokenGate {
  private constructor(
    private readonly connection: Connection,
    readonly mint: PublicKey,
    readonly decimals: number,
    readonly minUiAmount: number,
    readonly minRawAmount: bigint,
  ) {}

  static async create(
    connection: Connection,
    mintAddress: string,
    minUiAmount: number,
  ): Promise<TokenGate> {
    const mint = new PublicKey(mintAddress);
    const decimals = await getMintDecimals(connection, mint);
    const minRawAmount = uiAmountToRaw(minUiAmount, decimals);
    return new TokenGate(connection, mint, decimals, minUiAmount, minRawAmount);
  }

  /** Sum all of the owner's token accounts for this mint and compare to the gate. */
  async verify(owner: PublicKey): Promise<HoldingResult> {
    const { value } = await this.connection.getParsedTokenAccountsByOwner(owner, {
      mint: this.mint,
    });

    let rawAmount = 0n;
    for (const { account } of value) {
      const amount = account.data.parsed?.info?.tokenAmount?.amount;
      if (typeof amount === "string") {
        rawAmount += BigInt(amount);
      }
    }

    return {
      holds: rawAmount >= this.minRawAmount,
      rawAmount,
      uiAmount: rawToUiAmount(rawAmount, this.decimals),
    };
  }
}
