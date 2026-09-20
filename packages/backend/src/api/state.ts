import type { GameStatePublic } from "@knock-knock/shared";
import type { Env } from "../config/env.js";
import type { EngineSnapshot } from "../engine/gameEngine.js";

/** Compose the full public game state from the engine snapshot + env metadata. */
export function buildGameState(snapshot: EngineSnapshot, env: Env): GameStatePublic {
  return {
    running: snapshot.running,
    cluster: env.CHAIN_NETWORK,
    chainId: env.chainId,
    tokenMint: null,
    tokenMinHold: 0,
    currentRound: snapshot.currentRound,
    lastResult: snapshot.lastResult,
    serverTime: snapshot.serverTime,
  };
}
