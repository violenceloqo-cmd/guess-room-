import { useEffect, useRef, useState } from "react";
import type { GameStatePublic } from "@room-royale/shared";
import { fetchState } from "../lib/api";
import { supabase } from "../lib/supabase";

interface UseGameState {
  state: GameStatePublic | null;
  error: string | null;
  connected: boolean;
}

/**
 * Keeps the public game state fresh. The backend (engine, in memory) is the
 * single source of truth via GET /state. We poll it on a short interval, and —
 * when Supabase is configured — also subscribe to row changes as an instant
 * "something changed, refetch now" signal for lower latency.
 */
export function useGameState(pollMs = 1500): UseGameState {
  const [state, setState] = useState<GameStatePublic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const next = await fetchState();
        if (alive) {
          setState(next);
          setConnected(true);
          setError(null);
        }
      } catch (e) {
        if (alive) {
          setConnected(false);
          setError(e instanceof Error ? e.message : "Connection lost");
        }
      } finally {
        inFlight.current = false;
      }
    };

    void load();
    const interval = setInterval(load, pollMs);

    // Realtime "refetch" signal.
    const channel = supabase
      ?.channel("room-royale")
      .on("postgres_changes", { event: "*", schema: "public", table: "rounds" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "guesses" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "payouts" }, () => void load())
      .subscribe();

    return () => {
      alive = false;
      clearInterval(interval);
      if (channel) void supabase?.removeChannel(channel);
    };
  }, [pollMs]);

  return { state, error, connected };
}
