import { isValidRoomId, occupantId, ROOM_COUNT, type RoundPublic } from "@room-royale/shared";
import type {
  EngineConfig,
  GuessResult,
  RoundData,
} from "./types.js";

/** Build a fresh OPEN round starting now. */
export function createRound(args: {
  id: string;
  roundNumber: number;
  nowMs: number;
  poolLamports: bigint;
  config: EngineConfig;
}): RoundData {
  const { id, roundNumber, nowMs, poolLamports, config } = args;
  const endsAtMs = nowMs + config.roundDurationSeconds * 1000;
  // After picking closes, one room is eliminated every interval until one
  // remains. With ROOM_COUNT rooms that's ROOM_COUNT-1 eliminations.
  const revealAtMs =
    endsAtMs + config.eliminationIntervalSeconds * (ROOM_COUNT - 1) * 1000;
  return {
    id,
    roundNumber,
    status: "open",
    startsAtMs: nowMs,
    endsAtMs,
    revealAtMs,
    poolLamports,
    winningRoom: null,
    guesses: new Map(),
    pendingWinner: null,
    eliminationOrder: [],
    eliminatedRooms: [],
    nextEliminationAtMs: null,
  };
}

/**
 * Record (or update) a wallet's pick. One active pick per wallet per round:
 * a wallet may change rooms freely until the round locks.
 */
export function addGuessToRound(
  round: RoundData,
  wallet: string,
  room: number,
  nowMs: number,
): GuessResult {
  if (round.status !== "open") {
    return { accepted: false, reason: "round_locked" };
  }
  if (nowMs >= round.endsAtMs) {
    return { accepted: false, reason: "round_locked" };
  }
  if (!isValidRoomId(room)) {
    return { accepted: false, reason: "invalid_room" };
  }
  round.guesses.set(wallet, { wallet, room, at: nowMs });
  return { accepted: true };
}

/** Wallets that picked a given room, in deterministic (sorted) order. */
export function walletsForRoom(round: RoundData, room: number): string[] {
  const wallets: string[] = [];
  for (const guess of round.guesses.values()) {
    if (guess.room === room) wallets.push(guess.wallet);
  }
  return wallets.sort();
}

/** Count of guesses per room id, e.g. { "1": 3, "7": 1 }. */
export function roomCounts(round: RoundData): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const guess of round.guesses.values()) {
    const key = String(guess.room);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/**
 * Anonymized occupant ids per room id (sorted for stable rendering order).
 * The raw wallet is never exposed here — only its stable hash.
 */
export function roomOccupants(round: RoundData): Record<string, string[]> {
  const byRoom: Record<string, string[]> = {};
  for (const guess of round.guesses.values()) {
    const key = String(guess.room);
    (byRoom[key] ??= []).push(occupantId(guess.wallet));
  }
  for (const key of Object.keys(byRoom)) {
    byRoom[key]!.sort();
  }
  return byRoom;
}

/** Project the internal round into the client-facing wire shape. */
export function toRoundPublic(round: RoundData): RoundPublic {
  return {
    id: round.id,
    roundNumber: round.roundNumber,
    status: round.status,
    startsAt: new Date(round.startsAtMs).toISOString(),
    endsAt: new Date(round.endsAtMs).toISOString(),
    poolLamports: round.poolLamports.toString(),
    winningRoom: round.winningRoom,
    roomCounts: roomCounts(round),
    occupants: roomOccupants(round),
    eliminatedRooms: [...round.eliminatedRooms],
    nextEliminationAt:
      round.status === "eliminating" && round.nextEliminationAtMs !== null
        ? new Date(round.nextEliminationAtMs).toISOString()
        : null,
    createdAt: new Date(round.startsAtMs).toISOString(),
  };
}
