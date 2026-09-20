import { erc20Abi, type Address, type PublicClient } from "viem";
import { uiAmountToRaw, rawToUiAmount } from "@knock-knock/shared";

export interface HoldingResult {
  /** Whether the wallet meets the minimum holding requirement. */
  holds: boolean;
  /** Raw ERC-20 balance. */
  rawAmount: bigint;
  /** Human-readable amount for display/logging. */
  uiAmount: number;
}

/**
 * Verifies ERC-20 holdings against a minimum. Construct once per token (it
 * caches decimals + the precomputed raw threshold), then call `verify(owner)`.
 */
export class TokenGate {
  private constructor(
    private readonly client: PublicClient,
    readonly token: Address,
    readonly decimals: number,
    readonly minUiAmount: number,
    readonly minRawAmount: bigint,
  ) {}

  static async create(
    client: PublicClient,
    tokenAddress: string,
    minUiAmount: number,
  ): Promise<TokenGate> {
    const token = tokenAddress as Address;
    const decimals = await client.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "decimals",
    });
    const minRawAmount = uiAmountToRaw(minUiAmount, Number(decimals));
    return new TokenGate(client, token, Number(decimals), minUiAmount, minRawAmount);
  }

  async verify(owner: Address): Promise<HoldingResult> {
    const rawAmount = await this.client.readContract({
      address: this.token,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [owner],
    });

    return {
      holds: rawAmount >= this.minRawAmount,
      rawAmount,
      uiAmount: rawToUiAmount(rawAmount, this.decimals),
    };
  }
}
