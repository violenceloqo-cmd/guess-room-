import type { RoundStatus } from "@knock-knock/shared";
import { NeonPanel } from "./NeonPanel";

interface CountdownProps {
  seconds: number;
  status: RoundStatus | undefined;
  /** Rooms still in play (shown during the elimination phase). */
  roomsLeft?: number;
  /** Full length of the phase being counted down, for the progress bar. */
  totalSeconds?: number;
}

const PHASE: Record<RoundStatus, string> = {
  open: "Knock on a door!",
  locked: "Doors closed",
  eliminating: "Knockout!",
  settling: "Last door standing…",
  settled: "Winner revealed!",
};

export function Countdown({ seconds, status, roomsLeft, totalSeconds }: CountdownProps) {
  const eliminating = status === "eliminating";
  const locked = status && status !== "open";
  const showTimer = status === "open" || eliminating;
  // Fraction of the phase still to run — drives the bar under the digits.
  const remaining =
    showTimer && totalSeconds ? Math.max(0, Math.min(1, seconds / totalSeconds)) : null;

  return (
    <NeonPanel className={`countdown ${locked ? "locked" : ""}`}>
      <div className="phase">{status ? PHASE[status] : "Waiting…"}</div>
      <div className="secs">
        {showTimer ? (
          <>
            {seconds}
            <span className="secs-unit">s</span>
          </>
        ) : (
          "···"
        )}
      </div>
      {eliminating && typeof roomsLeft === "number" ? (
        <div className="phase-sub">
          {roomsLeft} {roomsLeft === 1 ? "door" : "doors"} left · next out in {seconds}s
        </div>
      ) : null}
      {remaining !== null ? (
        <div className="countdown-bar" aria-hidden>
          <span style={{ transform: `scaleX(${remaining})` }} />
        </div>
      ) : null}
    </NeonPanel>
  );
}
