/**
 * The 10 doors players can knock on. IDs are stable (1..10) and used as the
 * source of truth across the engine, DB, and UI. Names/themes are purely
 * cosmetic and follow the door colors of the neon arcade aesthetic.
 */

export interface Room {
  /** Stable 1-based identifier. */
  id: number;
  /** Display name shown in the UI / overlay. */
  name: string;
  /** Short glyph engraved on the door plaque. */
  doodle: string;
}

export const ROOM_COUNT = 10;

export const ROOMS: readonly Room[] = [
  { id: 1, name: "Ember Gate", doodle: "▲" },
  { id: 2, name: "Amber Arch", doodle: "◐" },
  { id: 3, name: "Gilded Hatch", doodle: "✦" },
  { id: 4, name: "Lime Portal", doodle: "◇" },
  { id: 5, name: "Jade Threshold", doodle: "❖" },
  { id: 6, name: "Cyan Vault", doodle: "◍" },
  { id: 7, name: "Azure Passage", doodle: "≋" },
  { id: 8, name: "Violet Alcove", doodle: "✧" },
  { id: 9, name: "Orchid Landing", doodle: "❉" },
  { id: 10, name: "Rose Chamber", doodle: "☾" },
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
