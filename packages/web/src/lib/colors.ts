import { occupantColorIndex } from "@guess-room/shared";

/** Bright crayon color per room (indexed by roomId - 1). */
export const ROOM_COLORS: readonly string[] = [
  "#ff5a5f", // 1 red
  "#ff9f1c", // 2 orange
  "#ffd23f", // 3 yellow
  "#8ac926", // 4 lime
  "#06d6a0", // 5 green
  "#1ec8c8", // 6 teal
  "#3a86ff", // 7 blue
  "#7c4dff", // 8 indigo
  "#b14aed", // 9 purple
  "#ff4fa3", // 10 pink
];

/** Saturated palette for occupant stickmen. */
export const AVATAR_COLORS: readonly string[] = [
  "#e63946",
  "#f4a300",
  "#2a9d8f",
  "#1d6ef0",
  "#8338ec",
  "#ff477e",
  "#06a77d",
  "#d62246",
  "#3a0ca3",
  "#ff8c42",
];

export function roomColor(roomId: number): string {
  return ROOM_COLORS[(roomId - 1) % ROOM_COLORS.length] ?? "#3a86ff";
}

/** Translucent version of a hex color for hand-drawn fills. */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function avatarColor(occupantId: string): string {
  return AVATAR_COLORS[occupantColorIndex(occupantId, AVATAR_COLORS.length)] ?? "#1d6ef0";
}
