import { randomUUID } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { solToLamports, lamportsToSol } from "@guess-room/shared";
import { getEnv } from "../config/env.js";
import { getConnection, getHotWallet } from "../solana/connection.js";
import { TokenGate } from "../solana/verifier.js";
import { sendSol, getBalanceLamports } from "../solana/payout.js";
import { MemoryStore } from "../db/memoryStore.js";
import { SupabaseStore } from "../db/supabaseStore.js";
import { getServiceClient, isSupabaseConfigured } from "../db/supabaseClient.js";
import type { Store } from "../db/store.js";
import { createLogger } from "../util/logger.js";
import { GameEngine } from "./gameEngine.js";
import { PureSettlement } from "./settlement.js";
import { SolanaSettlement } from "./solanaSettlement.js";
import { pickWinningRoom } from "./rng.js";
import type { EngineConfig, Settlement } from "./types.js";

const log = createLogger("factory");

export interface BuiltEngine {
  engine: GameEngine;
  store: Store;
  usingSupabase: boolean;
  usingRealPayouts: boolean;
  /** Best-effort holdings check for guess-time UX; absent when no token gate. */
  verifyHolding?: (wallet: string) => Promise<{ holds: boolean; rawAmount: bigint }>;
}

/**
 * Assemble a fully-wired GameEngine from environment configuration:
 *  - Store:     SupabaseStore when configured, otherwise an in-memory mirror
 *  - Settlement: Solana-backed (verify + pay) when a token mint + hot wallet are
 *               present, otherwise the pure no-network strategy
 */
export async function buildEngine(): Promise<BuiltEngine> {
  const env = getEnv();

  const config: EngineConfig = {
    roundDurationSeconds: env.ROUND_DURATION_SECONDS,
    lockBufferSeconds: env.ROUND_LOCK_BUFFER_SECONDS,
    eliminationIntervalSeconds: env.ELIMINATION_INTERVAL_SECONDS,
    poolLamports: solToLamports(env.ROUND_POOL_SOL),
    rolloverOnNoWinner: env.ROLLOVER_ON_NO_WINNER,
  };

  const usingSupabase = isSupabaseConfigured();
  const store: Store = usingSupabase
    ? new SupabaseStore(getServiceClient())
    : new MemoryStore();
  log.info(usingSupabase ? "using SupabaseStore" : "using in-memory store (no Supabase configured)");

  let settlement: Settlement;
  let usingRealPayouts = false;
  let verifyHolding:
    | ((wallet: string) => Promise<{ holds: boolean; rawAmount: bigint }>)
    | undefined;

  if (env.TOKEN_MINT && env.HOT_WALLET_SECRET) {
    const connection = getConnection();
    const hotWallet = getHotWallet();
    const gate = await TokenGate.create(connection, env.TOKEN_MINT, env.TOKEN_MIN_HOLD);
    const maxPayoutLamports = solToLamports(env.MAX_PAYOUT_SOL);
    const maxRoundPayoutLamports = solToLamports(env.MAX_ROUND_PAYOUT_SOL);

    verifyHolding = async (wallet) => {
      const r = await gate.verify(new PublicKey(wallet));
      return { holds: r.holds, rawAmount: r.rawAmount };
    };

    settlement = new SolanaSettlement({
      verifyHolding,
      pay: async (wallet, lamports) =>
        sendSol(connection, hotWallet, new PublicKey(wallet), lamports, {
          maxLamports: maxPayoutLamports,
          dryRun: env.DRY_RUN,
        }),
      store,
      maxPayoutLamports,
      maxRoundPayoutLamports,
      rolloverOnNoWinner: env.ROLLOVER_ON_NO_WINNER,
      // Only guard on balance for real payouts; in dry-run the wallet may be empty.
      ...(env.DRY_RUN
        ? {}
        : { getHotWalletBalance: () => getBalanceLamports(connection, hotWallet.publicKey) }),
    });
    usingRealPayouts = !env.DRY_RUN;

    const balance = await getBalanceLamports(connection, hotWallet.publicKey);
    log.info(
      `Solana settlement ready (mint ${env.TOKEN_MINT}, dryRun=${env.DRY_RUN})`,
    );
    log.info(
      `hot wallet ${hotWallet.publicKey.toBase58()} balance ${lamportsToSol(balance)} SOL`,
    );
    if (!env.DRY_RUN && balance < solToLamports(env.ROUND_POOL_SOL)) {
      log.warn(
        "hot wallet balance is below one round's pool — fund it or rounds will roll over",
      );
    }
  } else {
    settlement = new PureSettlement(env.ROLLOVER_ON_NO_WINNER);
    log.warn(
      "TOKEN_MINT or HOT_WALLET_SECRET not set — using pure settlement (no verification, no payouts)",
    );
  }

  const engine = new GameEngine(config, {
    now: () => Date.now(),
    pickRoom: pickWinningRoom,
    newId: () => randomUUID(),
    settlement,
    persistence: store,
  });

  return { engine, store, usingSupabase, usingRealPayouts, verifyHolding };
}
