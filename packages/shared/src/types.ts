/**
 * Wire types shared between backend and frontend. These describe what the
 * client is allowed to see; internal engine/DB types may carry more fields.
 *
 * Lamport amounts cross the wire as strings (JSON can't carry BigInt) and are
 * parsed back into BigInt on each side.
 */

/**
 * Round phases:
 *  - open:        players pick a room (1 minute).
 *  - eliminating: picking is locked; one room is knocked out every interval
 *                 until a single room is left standing.
 *  - settling:    winner chosen (last standing), payouts being computed/sent.
 *  - settled:     done; result published.
 */
export type RoundStatus = "open" | "locked" | "eliminating" | "settling" | "settled";

export interface RoundPublic {
  id: string;
  roundNumber: number;
  status: RoundStatus;
  /** ISO timestamps. */
  startsAt: string;
  endsAt: string;
  /** Total prize pool for this round, in lamports (string). */
  poolLamports: string;
  /** Winning room id, null until the round is settled. */
  winningRoom: number | null;
  /** Count of guesses per room id, e.g. { "1": 3, "7": 1 }. */
  roomCounts: Record<string, number>;
  /**
   * Anonymized occupant ids per room id, e.g. { "1": ["a1b2c3d", ...] }.
   * Used to render distinct characters and animate movement between rooms.
   */
  occupants: Record<string, string[]>;
  /** Rooms knocked out so far this round, in elimination order. */
  eliminatedRooms: number[];
  /** ISO time of the next scheduled elimination, or null when not eliminating. */
  nextEliminationAt: string | null;
  createdAt: string;
}

export type PayoutStatus = "pending" | "sent" | "confirmed" | "failed" | "skipped";

export interface PayoutPublic {
  wallet: string;
  lamports: string;
  status: PayoutStatus;
  /** Transaction signature, present once sent/confirmed. */
  signature: string | null;
}

export interface RoundResultPublic {
  roundId: string;
  roundNumber: number;
  winningRoom: number;
  poolLamports: string;
  rolledOver: boolean;
  payouts: PayoutPublic[];
}

/** Snapshot returned by GET /state and broadcast via realtime. */
export interface GameStatePublic {
  running: boolean;
  cluster: string;
  tokenMint: string | null;
  tokenMinHold: number;
  currentRound: RoundPublic | null;
  lastResult: RoundResultPublic | null;
  serverTime: string;
}

/** Body for POST /guess. */
export interface GuessRequest {
  wallet: string;
  room: number;
}

export interface GuessResponse {
  ok: true;
  roundId: string;
  room: number;
  /** Whether the wallet currently passes the holdings check (best-effort). */
  verified: boolean;
}

export interface ApiError {
  ok: false;
  error: string;
  code: string;
}
