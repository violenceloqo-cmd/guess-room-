import { randomInt } from "node:crypto";
import { ROOM_COUNT } from "@room-royale/shared";

/**
 * Picks a uniformly random winning room id in [1, ROOM_COUNT] using a CSPRNG.
 * (The game is a giveaway, but using crypto randomness avoids any bias and is
 * cheap.) Injectable in the engine so tests can force a specific room.
 */
export function pickWinningRoom(): number {
  return randomInt(1, ROOM_COUNT + 1);
}

/** In-place Fisher–Yates shuffle using a CSPRNG. */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/**
 * Build the order in which losing rooms are knocked out, given the room that is
 * destined to be last-standing. Returns every room except `winningRoom`, in a
 * random order (length ROOM_COUNT - 1). The engine reveals these one at a time.
 */
export function buildEliminationOrder(winningRoom: number): number[] {
  const losers: number[] = [];
  for (let id = 1; id <= ROOM_COUNT; id++) {
    if (id !== winningRoom) losers.push(id);
  }
  return shuffle(losers);
}
