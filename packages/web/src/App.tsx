import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { occupantId, ROOM_COUNT, type RoundResultPublic } from "@guess-room/shared";
import { useGameState } from "./hooks/useGameState";
import { useCountdown } from "./hooks/useCountdown";
import { postGuess } from "./lib/api";
import { StageBackground } from "./components/PaperBackground";
import { Header } from "./components/Header";
import { Countdown } from "./components/Countdown";
import { RoomGrid } from "./components/RoomGrid";
import { WalletPanel, type PanelMessage } from "./components/WalletPanel";
import { WinnerReveal } from "./components/WinnerReveal";
import { HowItWorks } from "./components/HowItWorks";
import { ActivityFeed } from "./components/ActivityFeed";

const WALLET_KEY = "gr_wallet";

export default function App() {
  const { state, connected } = useGameState();
  const [wallet, setWalletState] = useState(() => localStorage.getItem(WALLET_KEY) ?? "");
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [joinedRoom, setJoinedRoom] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<PanelMessage | null>(null);
  const [reveal, setReveal] = useState<RoundResultPublic | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const round = state?.currentRound ?? null;
  const status = round?.status;
  const eliminating = status === "eliminating";
  const eliminatedRooms = round?.eliminatedRooms ?? [];
  const roomsLeft = ROOM_COUNT - eliminatedRooms.length;

  // During picking we count down to lock; during elimination, to the next knockout.
  const countdownDeadline = eliminating
    ? round?.nextEliminationAt
    : status === "open"
      ? round?.endsAt
      : null;
  const seconds = useCountdown(countdownDeadline, state?.serverTime);

  const selfId = useMemo(
    () => (wallet.trim() ? occupantId(wallet.trim()) : null),
    [wallet],
  );

  // Occupants from the server, with the local player optimistically placed in
  // the room they just joined so their stickman walks in instantly.
  const occupants = useMemo(() => {
    const byRoom: Record<string, string[]> = {};
    for (const [room, ids] of Object.entries(round?.occupants ?? {})) {
      byRoom[room] = selfId ? ids.filter((id) => id !== selfId) : [...ids];
    }
    if (selfId && joinedRoom !== null) {
      const key = String(joinedRoom);
      (byRoom[key] ??= []).push(selfId);
    }
    return byRoom;
  }, [round?.occupants, selfId, joinedRoom]);

  const setWallet = useCallback((w: string) => {
    setWalletState(w);
    localStorage.setItem(WALLET_KEY, w.trim());
  }, []);

  // Reset per-round local state when a new round opens.
  const roundId = round?.id ?? null;
  const prevRoundId = useRef<string | null>(null);
  useEffect(() => {
    if (roundId !== prevRoundId.current) {
      prevRoundId.current = roundId;
      setJoinedRoom(null);
      setMessage(null);
    }
  }, [roundId]);

  // Trigger the winner reveal whenever a fresh result arrives.
  const prevResultId = useRef<string | null>(null);
  useEffect(() => {
    const result = state?.lastResult ?? null;
    if (result && result.roundId !== prevResultId.current) {
      prevResultId.current = result.roundId;
      setReveal(result);
      const t = setTimeout(() => setReveal(null), 9000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [state?.lastResult]);

  const onSubmit = useCallback(async () => {
    if (selectedRoom === null || !round) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await postGuess(wallet.trim(), selectedRoom);
      if (res.ok) {
        setJoinedRoom(selectedRoom);
        setMessage(
          res.verified
            ? { text: "Locked in! Good luck. 🍀", kind: "info" }
            : { text: "Locked in (we couldn't verify your balance yet).", kind: "info" },
        );
      } else {
        setMessage({ text: res.error, kind: "error" });
      }
    } catch (e) {
      setMessage({
        text: e instanceof Error ? e.message : "Something went wrong",
        kind: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }, [selectedRoom, round, wallet]);

  return (
    <>
      <StageBackground />
      <div className="app">
        <Header state={state} connected={connected} onHelp={() => setShowHelp(true)} />
        <Countdown seconds={seconds} status={status} roomsLeft={roomsLeft} />
        <RoomGrid
          roomCounts={round?.roomCounts ?? {}}
          occupants={occupants}
          selfId={selfId}
          selectedRoom={selectedRoom}
          winningRoom={reveal?.winningRoom ?? null}
          eliminatedRooms={eliminatedRooms}
          eliminating={eliminating}
          disabled={status !== "open"}
          onSelect={setSelectedRoom}
        />
        <WalletPanel
          wallet={wallet}
          setWallet={setWallet}
          selectedRoom={selectedRoom}
          joinedRoom={joinedRoom}
          submitting={submitting}
          canGuess={status === "open"}
          message={message}
          onSubmit={onSubmit}
        />
        <ActivityFeed cluster={state?.cluster} />
      </div>
      <WinnerReveal result={reveal} wallet={wallet} onClose={() => setReveal(null)} />
      <HowItWorks open={showHelp} onClose={() => setShowHelp(false)} />
    </>
  );
}
