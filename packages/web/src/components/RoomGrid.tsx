import { ROOMS } from "@room-royale/shared";
import { LayoutGroup } from "framer-motion";
import { RoomCard } from "./RoomCard";

interface RoomGridProps {
  roomCounts: Record<string, number>;
  occupants: Record<string, string[]>;
  selfId: string | null;
  selectedRoom: number | null;
  winningRoom: number | null;
  eliminatedRooms: number[];
  /** True while rooms are being knocked out (drives the "still in" highlight). */
  eliminating: boolean;
  disabled: boolean;
  onSelect: (roomId: number) => void;
}

export function RoomGrid({
  roomCounts,
  occupants,
  selfId,
  selectedRoom,
  winningRoom,
  eliminatedRooms,
  eliminating,
  disabled,
  onSelect,
}: RoomGridProps) {
  const eliminatedSet = new Set(eliminatedRooms);
  return (
    <LayoutGroup>
      <div className="room-grid">
        {ROOMS.map((room) => {
          const eliminated = eliminatedSet.has(room.id);
          return (
            <RoomCard
              key={room.id}
              room={room}
              count={roomCounts[String(room.id)] ?? 0}
              occupants={occupants[String(room.id)] ?? []}
              selfId={selfId}
              selected={selectedRoom === room.id}
              winner={winningRoom === room.id}
              eliminated={eliminated}
              surviving={eliminating && !eliminated}
              disabled={disabled}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </LayoutGroup>
  );
}
