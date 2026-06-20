/**
 * Anonymized, stable identity for a player inside a room. Derived purely from
 * the wallet so the same player keeps the same avatar across rounds, but the
 * raw address isn't exposed in the room visuals. The client runs the same
 * function on its own wallet to recognize "self".
 */

/** Stable short id (base36 djb2 hash) for a wallet. */
export function occupantId(wallet: string): string {
  let hash = 5381;
  for (let i = 0; i < wallet.length; i++) {
    // hash * 33 + charCode, kept in 32-bit range
    hash = (((hash << 5) + hash) + wallet.charCodeAt(i)) | 0;
  }
  // unsigned, base36, padded for a consistent look
  return (hash >>> 0).toString(36).padStart(7, "0");
}

/**
 * Deterministic palette index for an occupant id, so each stickman gets a
 * stable color. `paletteSize` is the number of avatar colors available.
 */
export function occupantColorIndex(id: string, paletteSize: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (((hash << 5) - hash) + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % paletteSize;
}
