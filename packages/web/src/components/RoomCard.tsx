import { useEffect, useState } from "react";
import type { Room } from "@room-royale/shared";
import { AnimatePresence, motion } from "framer-motion";
import { Character } from "./Character";
import { avatarColor, roomColor } from "../lib/colors";

interface RoomCardProps {
  room: Room;
  count: number;
  occupants: string[];
  selfId: string | null;
  selected: boolean;
  winner: boolean;
  eliminated: boolean;
  surviving: boolean;
  disabled: boolean;
  onSelect: (roomId: number) => void;
}

// Show a big crowd before falling back to a "+N" chip.
const MAX_VISIBLE = 50;

/** Scale characters down as a room fills up so a big crowd stays visible. */
function castSize(n: number): number {
  if (n <= 10) return 24;
  if (n <= 20) return 18;
  if (n <= 30) return 15;
  if (n <= 40) return 12;
  return 10;
}

/** A single occupant that "walks in" on mount, then settles to idle/wave. */
function Occupant({ id, isSelf, size }: { id: string; isSelf: boolean; size: number }) {
  const [walkedIn, setWalkedIn] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setWalkedIn(true), 650);
    return () => clearTimeout(timer);
  }, []);
  const mood = !walkedIn ? "walk" : isSelf ? "wave" : "idle";
  return (
    <motion.div
      layoutId={`occ-${id}`}
      layout
      className={`occupant ${isSelf ? "is-self" : ""}`}
      style={{ width: size, height: size * 1.5 }}
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ type: "spring", stiffness: 500, damping: 34 }}
      title={isSelf ? "You" : `Player ${id}`}
    >
      {isSelf && size >= 14 && <span className="you-tag">YOU</span>}
      <Character mood={mood} size={size} color={isSelf ? "var(--gold)" : avatarColor(id)} />
    </motion.div>
  );
}

export function RoomCard({
  room,
  count,
  occupants,
  selfId,
  selected,
  winner,
  eliminated,
  surviving,
  disabled,
  onSelect,
}: RoomCardProps) {
  const rc = roomColor(room.id);

  // Keep self first so it never gets hidden behind the "+N" overflow.
  const ordered =
    selfId && occupants.includes(selfId)
      ? [selfId, ...occupants.filter((id) => id !== selfId)]
      : occupants;
  const visible = ordered.slice(0, MAX_VISIBLE);
  const overflow = ordered.length - visible.length;
  const size = castSize(ordered.length);

  return (
    <div
      className={`room ${selected ? "selected" : ""} ${winner ? "winner" : ""} ${surviving ? "surviving" : ""} ${eliminated ? "eliminated" : ""} ${disabled ? "disabled" : ""}`}
      style={{ ["--rc" as string]: rc }}
      onClick={() => !disabled && onSelect(room.id)}
      role="button"
      aria-pressed={selected}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) onSelect(room.id);
      }}
    >
      <div className="room-stage">
        <div className="room-head">
          <div className="room-no">{room.id}</div>
          <div className="room-name">{room.name}</div>
        </div>
        <div className="room-door" />
        <div className="room-floor" />
        <div className="room-cast">
          <AnimatePresence mode="popLayout">
            {visible.map((id) => (
              <Occupant key={id} id={id} isSelf={id === selfId} size={size} />
            ))}
          </AnimatePresence>
          {overflow > 0 && <span className="occupant-more">+{overflow}</span>}
          {ordered.length === 0 && <span className="room-empty">empty</span>}
        </div>
        <div className="room-count">
          {count} {count === 1 ? "player" : "players"}
        </div>
        {eliminated && <div className="room-out">OUT</div>}
      </div>
    </div>
  );
}
