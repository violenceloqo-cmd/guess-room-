import { roomColor } from "../lib/colors";
import { Mascot, type MascotFace, type MascotPose } from "./Mascot";

interface DoorConfig {
  color: string;
  pose: MascotPose;
  face: MascotFace;
  crown?: boolean;
}

const DOORS: DoorConfig[] = [
  { color: roomColor(1), pose: "wave", face: "smile" },
  { color: roomColor(2), pose: "idle", face: "surprised" },
  { color: roomColor(3), pose: "think", face: "happy" },
  { color: roomColor(4), pose: "cheer", face: "happy" },
  { color: roomColor(5), pose: "idle", face: "surprised" },
  { color: roomColor(6), pose: "wave", face: "smile" },
  { color: roomColor(7), pose: "idle", face: "surprised" },
  { color: roomColor(8), pose: "wave", face: "smile" },
  { color: roomColor(9), pose: "think", face: "neutral" },
  { color: roomColor(10), pose: "wave", face: "happy", crown: true },
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
