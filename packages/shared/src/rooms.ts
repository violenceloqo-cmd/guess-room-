/**
 * The 10 rooms players can guess. IDs are stable (1..10) and used as the
 * source of truth across the engine, DB, and UI. Names/themes are purely
 * cosmetic and match the hand-drawn stickman aesthetic.
 */

export interface Room {
  /** Stable 1-based identifier. */
  id: number;
  /** Display name shown in the UI / overlay. */
  name: string;
  /** Short doodle label used on the pencil-drawn door. */
  doodle: string;
}

export const ROOM_COUNT = 10;

export const ROOMS: readonly Room[] = [
  { id: 1, name: "Squiggle Cellar", doodle: "~" },
  { id: 2, name: "Wobble Loft", doodle: "≈" },
  { id: 3, name: "Smudge Vault", doodle: "▓" },
  { id: 4, name: "Doodle Den", doodle: "✎" },
  { id: 5, name: "Scribble Hall", doodle: "✶" },
  { id: 6, name: "Eraser Annex", doodle: "□" },
  { id: 7, name: "Inkblot Attic", doodle: "●" },
  { id: 8, name: "Sketch Pantry", doodle: "◇" },
  { id: 9, name: "Crosshatch Cave", doodle: "#" },
  { id: 10, name: "Stickman Studio", doodle: "☆" },
] as const;

export const ROOM_IDS: readonly number[] = ROOMS.map((r) => r.id);

export function isValidRoomId(roomId: unknown): roomId is number {
  return (
    typeof roomId === "number" &&
    Number.isInteger(roomId) &&
    roomId >= 1 &&
    roomId <= ROOM_COUNT
  );
}

export function getRoom(roomId: number): Room | undefined {
  return ROOMS.find((r) => r.id === roomId);
}
