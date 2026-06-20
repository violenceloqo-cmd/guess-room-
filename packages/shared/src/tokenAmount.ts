/**
 * SPL token amount math. Raw amounts are integers scaled by the mint's
 * decimals; UI amounts are the human-readable values. BigInt only.
 */

/** Convert a human (UI) token amount to a raw integer amount for `decimals`. */
export function uiAmountToRaw(uiAmount: number, decimals: number): bigint {
  if (!Number.isFinite(uiAmount) || uiAmount < 0) {
    throw new Error(`Invalid UI token amount: ${uiAmount}`);
  }
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new Error(`Invalid decimals: ${decimals}`);
  }
  // Use toFixed for correct rounding, then assemble with string math so we
  // never overflow Number for large balances.
  const fixed = uiAmount.toFixed(decimals);
  const [intPart = "0", fracPart = ""] = fixed.split(".");
  const frac = (fracPart + "0".repeat(decimals)).slice(0, decimals);
  const scale = 10n ** BigInt(decimals);
  return BigInt(intPart) * scale + BigInt(frac === "" ? "0" : frac);
}

/** Convert a raw integer token amount to a human (UI) number for display. */
export function rawToUiAmount(raw: bigint, decimals: number): number {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new Error(`Invalid decimals: ${decimals}`);
  }
  return Number(raw) / 10 ** decimals;
}
