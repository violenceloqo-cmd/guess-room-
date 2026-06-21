import type { RoundStatus } from "@room-royale/shared";
import { NeonPanel } from "./NeonPanel";

interface CountdownProps {
  seconds: number;
  status: RoundStatus | undefined;
  /** Rooms still in play (shown during the elimination phase). */
  roomsLeft?: number;
}

const PHASE: Record<RoundStatus, string> = {
  open: "Pick a room!",
  locked: "Doors closed",
  eliminating: "Elimination!",
  settling: "Last room standing…",
  settled: "Winner revealed!",
};

export function Countdown({ seconds, status, roomsLeft }: CountdownProps) {
  const eliminating = status === "eliminating";
  const locked = status && status !== "open";
  const showTimer = status === "open" || eliminating;
  return (
    <NeonPanel className={`countdown ${locked ? "locked" : ""}`}>
      <div className="phase">{status ? PHASE[status] : "Waiting…"}</div>
      <div className="secs">{showTimer ? `${seconds}s` : "···"}</div>
      {eliminating && typeof roomsLeft === "number" ? (
        <div className="phase-sub">
          {roomsLeft} {roomsLeft === 1 ? "room" : "rooms"} left · next out in {seconds}s
        </div>
      ) : null}
    </NeonPanel>
  );
}
