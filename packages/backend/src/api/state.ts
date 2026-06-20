import type { GameStatePublic } from "@guess-room/shared";
import type { Env } from "../config/env.js";
import type { EngineSnapshot } from "../engine/gameEngine.js";

/** Compose the full public game state from the engine snapshot + env metadata. */
export function buildGameState(snapshot: EngineSnapshot, env: Env): GameStatePublic {
  return {
    running: snapshot.running,
    cluster: env.SOLANA_CLUSTER,
    tokenMint: env.TOKEN_MINT ?? null,
    tokenMinHold: env.TOKEN_MIN_HOLD,
    currentRound: snapshot.currentRound,
    lastResult: snapshot.lastResult,
    serverTime: snapshot.serverTime,
  };
}
