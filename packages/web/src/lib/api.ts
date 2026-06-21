import type { GameStatePublic } from "@room-royale/shared";

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8787";

export async function fetchState(signal?: AbortSignal): Promise<GameStatePublic> {
  const res = await fetch(`${API_URL}/state`, { signal });
  if (!res.ok) throw new Error(`Failed to load game state (${res.status})`);
  return (await res.json()) as GameStatePublic;
}

export interface GuessOk {
  ok: true;
  roundId: string | null;
  room: number;
  verified: boolean;
}
export interface GuessErr {
  ok: false;
  error: string;
  code: string;
}

export async function postGuess(wallet: string, room: number): Promise<GuessOk | GuessErr> {
  const res = await fetch(`${API_URL}/guess`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ wallet, room }),
  });
  const body = (await res.json()) as GuessOk | GuessErr;
  return body;
}
