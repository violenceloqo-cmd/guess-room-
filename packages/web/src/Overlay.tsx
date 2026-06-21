import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatSol, getRoom, shortAddress } from "@room-royale/shared";
import { useGameState } from "./hooks/useGameState";
import { useCountdown } from "./hooks/useCountdown";
import { RoomGrid } from "./components/RoomGrid";
import { Countdown } from "./components/Countdown";
import { NeonPanel } from "./components/NeonPanel";
import { Character } from "./components/Character";
import { roomColor } from "./lib/colors";

interface TickerEntry {
  id: string;
  text: string;
}

/**
 * Transparent overlay for OBS (add as a Browser Source at /overlay). Shows the
 * live rooms, countdown, pool, the winner reveal, and a recent-winners ticker.
 */
export default function Overlay() {
  const { state } = useGameState(1000);
  const round = state?.currentRound ?? null;
  const eliminating = round?.status === "eliminating";
  const countdownDeadline = eliminating
    ? round?.nextEliminationAt
    : round?.status === "open"
      ? round?.endsAt
      : null;
  const seconds = useCountdown(countdownDeadline, state?.serverTime);
  const eliminatedRooms = round?.eliminatedRooms ?? [];

  const [winners, setWinners] = useState<TickerEntry[]>([]);
  const [flash, setFlash] = useState<{ room: number; text: string } | null>(null);
  const prevResultId = useRef<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("overlay-route");
    return () => document.documentElement.classList.remove("overlay-route");
  }, []);

  useEffect(() => {
    const result = state?.lastResult;
    if (!result || result.roundId === prevResultId.current) return;
    prevResultId.current = result.roundId;

    const roomName = getRoom(result.winningRoom)?.name ?? `Room ${result.winningRoom}`;
    if (result.rolledOver) {
      setFlash({ room: result.winningRoom, text: `No winner — pool rolls over!` });
      setWinners((w) =>
        [{ id: result.roundId, text: `Round #${result.roundNumber}: ${roomName} — rolled over` }, ...w].slice(0, 8),
      );
    } else {
      setFlash({
        room: result.winningRoom,
        text: `${roomName} wins ${formatSol(BigInt(result.poolLamports))}!`,
      });
      const entries = result.payouts.map((p) => ({
        id: `${result.roundId}-${p.wallet}`,
        text: `${shortAddress(p.wallet)} won ${formatSol(BigInt(p.lamports))}`,
      }));
      setWinners((w) => [...entries, ...w].slice(0, 8));
    }
    const t = setTimeout(() => setFlash(null), 7000);
    return () => clearTimeout(t);
  }, [state?.lastResult]);

  return (
    <div className="overlay">
      <NeonPanel className="overlay-top" glow="var(--accent)">
        <div className="overlay-top-inner">
          <div className="overlay-brand">
            <div className="overlay-mark" aria-hidden>♛</div>
            <div>
              <div className="overlay-title">Room Royale</div>
              <div className="overlay-sub">
                Round #{round?.roundNumber ?? "—"} ·{" "}
                {round ? formatSol(BigInt(round.poolLamports)) : "—"} pool
              </div>
            </div>
          </div>
          <div className="overlay-count">
            <Countdown
              seconds={seconds}
              status={round?.status}
              roomsLeft={10 - eliminatedRooms.length}
            />
          </div>
        </div>
      </NeonPanel>

      <div className="overlay-grid">
        <RoomGrid
          roomCounts={round?.roomCounts ?? {}}
          occupants={round?.occupants ?? {}}
          selfId={null}
          selectedRoom={null}
          winningRoom={flash?.room ?? null}
          eliminatedRooms={eliminatedRooms}
          eliminating={eliminating}
          disabled
          onSelect={() => {}}
        />
      </div>

      <AnimatePresence>
        {flash ? (
          <motion.div
            className="overlay-flash"
            initial={{ y: 40, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <NeonPanel glow={roomColor(flash.room)} style={{ ["--rc" as string]: roomColor(flash.room) }}>
              <div className="overlay-flash-inner">
                <Character mood="cheer" size={70} color={roomColor(flash.room)} />
                <span>{flash.text}</span>
              </div>
            </NeonPanel>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {winners.length > 0 ? (
        <div className="overlay-ticker">
          <span className="ticker-label">recent winners</span>
          <div className="ticker-track">
            {winners.map((w) => (
              <span key={w.id} className="ticker-item">
                {w.text}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
