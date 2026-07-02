import { ROOM_COLORS } from "../lib/colors";
import { Mascot, type MascotFace, type MascotPose } from "./Mascot";

interface DoorConfig {
  color: string;
  pose: MascotPose;
  face: MascotFace;
  crown?: boolean;
}

const DOORS: DoorConfig[] = [
  { color: ROOM_COLORS[0], pose: "wave", face: "smile" },
  { color: ROOM_COLORS[1], pose: "idle", face: "surprised" },
  { color: ROOM_COLORS[2], pose: "think", face: "happy" },
  { color: ROOM_COLORS[3], pose: "cheer", face: "happy" },
  { color: ROOM_COLORS[4], pose: "idle", face: "surprised" },
  { color: ROOM_COLORS[5], pose: "wave", face: "smile" },
  { color: ROOM_COLORS[6], pose: "idle", face: "surprised" },
  { color: ROOM_COLORS[7], pose: "wave", face: "smile" },
  { color: ROOM_COLORS[8], pose: "think", face: "neutral" },
  { color: ROOM_COLORS[9], pose: "wave", face: "happy", crown: true },
];

interface BrandLogoProps {
  className?: string;
  /** Mascot size inside each doorway (px). */
  mascotSize?: number;
  /** Show the title text below the character row. */
  showTitle?: boolean;
}

/** Full brand lockup — rainbow door mascots + bubbly gold title. */
export function BrandLogo({ className, mascotSize = 72, showTitle = true }: BrandLogoProps) {
  return (
    <div className={`brand-logo-wrap ${className ?? ""}`}>
      <div className="brand-logo-doors" aria-hidden>
        {DOORS.map((door, i) => (
          <div
            key={i}
            className="brand-logo-door"
            style={{ ["--door-color" as string]: door.color }}
          >
            <svg className="brand-logo-arch" viewBox="0 0 60 90" fill="none" aria-hidden>
              <path
                d="M8 88 L8 36 C8 16 18 4 30 4 C42 4 52 16 52 36 L52 88 Z"
                fill="none"
                stroke={door.color}
                strokeWidth="5"
                strokeLinejoin="round"
              />
            </svg>
            <div className="brand-logo-mascot">
              <Mascot
                size={mascotSize}
                color={door.color}
                pose={door.pose}
                face={door.face}
                crown={door.crown}
              />
            </div>
          </div>
        ))}
      </div>
      {showTitle ? <div className="brand-logo-title">Guess Door Name</div> : null}
    </div>
  );
}
