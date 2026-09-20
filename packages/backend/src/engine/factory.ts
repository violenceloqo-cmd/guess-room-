import { randomUUID } from "node:crypto";
import { ethToWei, weiToEth } from "@knock-knock/shared";
import { getEnv } from "../config/env.js";
import {
  getPublicClient,
  getHotAccount,
  getWalletClient,
  toAddress,
} from "../evm/connection.js";
import { sendEth, getBalanceWei } from "../evm/payout.js";
import { MemoryStore } from "../db/memoryStore.js";
import { SupabaseStore } from "../db/supabaseStore.js";
import { getServiceClient, isSupabaseConfigured } from "../db/supabaseClient.js";
import type { Store } from "../db/store.js";
import { createLogger } from "../util/logger.js";
import { GameEngine } from "./gameEngine.js";
import { PureSettlement } from "./settlement.js";
import { EvmSettlement } from "./evmSettlement.js";
import { pickWinningRoom } from "./rng.js";
import type { EngineConfig, Settlement } from "./types.js";

const log = createLogger("factory");

export interface BuiltEngine {
  engine: GameEngine;
  store: Store;
  usingSupabase: boolean;
  usingRealPayouts: boolean;
}

/**
 * Assemble a fully-wired GameEngine from environment configuration:
 *  - Store:      SupabaseStore when configured, otherwise an in-memory mirror
 *  - Settlement: EVM-backed (pay ETH) when a hot wallet is present, otherwise
 *                the pure no-network strategy. Anyone with a valid address can play.
 */
export async function buildEngine(): Promise<BuiltEngine> {
  const env = getEnv();

  const config: EngineConfig = {
    roundDurationSeconds: env.ROUND_DURATION_SECONDS,
    lockBufferSeconds: env.ROUND_LOCK_BUFFER_SECONDS,
    eliminationIntervalSeconds: env.ELIMINATION_INTERVAL_SECONDS,
    poolLamports: ethToWei(env.ROUND_POOL_ETH),
    rolloverOnNoWinner: env.ROLLOVER_ON_NO_WINNER,
  };

  const usingSupabase = isSupabaseConfigured();
  const store: Store = usingSupabase
    ? new SupabaseStore(getServiceClient())
    : new MemoryStore();
  log.info(usingSupabase ? "using SupabaseStore" : "using in-memory store (no Supabase configured)");

  let settlement: Settlement;
  let usingRealPayouts = false;

  if (env.HOT_WALLET_SECRET) {
    const publicClient = getPublicClient();
    const walletClient = getWalletClient();
    const hotAccount = getHotAccount();
    const maxPayoutWei = ethToWei(env.MAX_PAYOUT_ETH);
    const maxRoundPayoutWei = ethToWei(env.MAX_ROUND_PAYOUT_ETH);

    settlement = new EvmSettlement({
      verifyHolding: async () => ({ holds: true, rawAmount: 0n }),
      pay: async (wallet, wei) => {
        const to = toAddress(wallet);
        if (!to) throw new Error(`Invalid payout address: ${wallet}`);
        return sendEth(publicClient, walletClient, hotAccount, to, wei, {
          maxWei: maxPayoutWei,
          dryRun: env.DRY_RUN,
        });
      },
      store,
      maxPayoutLamports: maxPayoutWei,
      maxRoundPayoutLamports: maxRoundPayoutWei,
      rolloverOnNoWinner: env.ROLLOVER_ON_NO_WINNER,
      ...(env.DRY_RUN
        ? {}
        : { getHotWalletBalance: () => getBalanceWei(publicClient, hotAccount.address) }),
    });
    usingRealPayouts = !env.DRY_RUN;

    const balance = await getBalanceWei(publicClient, hotAccount.address);
    log.info(`EVM settlement ready (open play, dryRun=${env.DRY_RUN})`);
    log.info(
      `hot wallet ${hotAccount.address} balance ${weiToEth(balance)} ETH`,
    );
    if (!env.DRY_RUN && balance < ethToWei(env.ROUND_POOL_ETH)) {
      log.warn(
        "hot wallet balance is below one round's pool — fund it or rounds will roll over",
      );
    }
  } else {
    settlement = new PureSettlement(env.ROLLOVER_ON_NO_WINNER);
    log.warn(
      "HOT_WALLET_SECRET not set — using pure settlement (no on-chain payouts)",
    );
  }

  const engine = new GameEngine(config, {
    now: () => Date.now(),
    pickRoom: pickWinningRoom,
    newId: () => randomUUID(),
    settlement,
    persistence: store,
  });

  return { engine, store, usingSupabase, usingRealPayouts };
}
