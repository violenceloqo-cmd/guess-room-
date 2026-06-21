export type MascotPose = "wave" | "idle" | "think" | "cheer";
export type MascotFace = "smile" | "happy" | "surprised" | "neutral";

interface MascotProps {
  size?: number;
  color?: string;
  pose?: MascotPose;
  face?: MascotFace;
  crown?: boolean;
  className?: string;
}

/**
 * Rounded capsule mascot — a friendly door-dweller for Room Royale. Matches the
 * brand characters: arched blob body, big dot eyes, a little mouth, stubby arms.
 * `pose` swaps arm positions, `face` swaps the expression, `crown` adds royalty.
 */
export function Mascot({
  size = 48,
  color = "#3a86ff",
  pose = "idle",
  face = "smile",
  crown = false,
  className,
}: MascotProps) {
  return (
    <svg
      className={className}
      width={size}
      height={(size * 130) / 100}
      viewBox="0 0 100 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: "visible", filter: `drop-shadow(0 6px 10px rgba(0,0,0,0.35))` }}
      aria-hidden
    >
      {/* feet */}
      <ellipse cx="40" cy="120" rx="9" ry="6" fill={color} />
      <ellipse cx="60" cy="120" rx="9" ry="6" fill={color} />

      {/* arms — drawn behind the body so they tuck in naturally */}
      <Arms pose={pose} color={color} />

      {/* body: arched capsule */}
      <path
        d="M50 8 C30 8 24 24 24 48 L24 94 C24 110 35 120 50 120 C65 120 76 110 76 94 L76 48 C76 24 70 8 50 8 Z"
        fill={color}
      />
      {/* soft top highlight */}
      <path
        d="M50 8 C30 8 24 24 24 48 L24 70 C24 50 34 30 50 30 C66 30 76 50 76 70 L76 48 C76 24 70 8 50 8 Z"
        fill="rgba(255,255,255,0.16)"
      />

      <Face face={face} />

      {crown ? (
        <path
          d="M36 8 L40 0 L46 6 L50 -3 L54 6 L60 0 L64 8 Z"
          fill="#ffd23f"
          stroke="#caa01f"
          strokeWidth="1.5"
          strokeLinejoin="round"
          transform="translate(0 2)"
        />
      ) : null}
    </svg>
  );
}

function Arms({ pose, color }: { pose: MascotPose; color: string }) {
  const stroke = { stroke: color, strokeWidth: 11, strokeLinecap: "round" as const, fill: "none" };
  switch (pose) {
    case "wave":
      return (
        <>
          <path d="M26 70 Q14 64 12 50" {...stroke} />
          <path d="M74 74 Q86 76 88 86" {...stroke} />
        </>
      );
    case "cheer":
      return (
        <>
          <path d="M26 70 Q12 60 14 44" {...stroke} />
          <path d="M74 70 Q88 60 86 44" {...stroke} />
        </>
      );
    case "think":
      return (
        <>
          <path d="M26 74 Q16 78 16 90" {...stroke} />
          <path d="M74 70 Q66 56 56 50" {...stroke} />
        </>
      );
    default: // idle
      return (
        <>
          <path d="M26 72 Q16 80 16 92" {...stroke} />
          <path d="M74 72 Q84 80 84 92" {...stroke} />
        </>
      );
  }
}

function Face({ face }: { face: MascotFace }) {
  const eye = "#0e0a18";
  switch (face) {
    case "surprised":
      return (
        <>
          <ellipse cx="40" cy="56" rx="6.5" ry="8" fill="#fff" />
          <ellipse cx="60" cy="56" rx="6.5" ry="8" fill="#fff" />
          <circle cx="40" cy="57" r="3.2" fill={eye} />
          <circle cx="60" cy="57" r="3.2" fill={eye} />
          <ellipse cx="50" cy="74" rx="4" ry="5" fill={eye} />
        </>
      );
    case "happy":
      return (
        <>
          <path d="M34 56 Q40 50 46 56" stroke={eye} strokeWidth="3.4" strokeLinecap="round" fill="none" />
          <path d="M54 56 Q60 50 66 56" stroke={eye} strokeWidth="3.4" strokeLinecap="round" fill="none" />
          <path d="M40 70 Q50 80 60 70" stroke={eye} strokeWidth="3.4" strokeLinecap="round" fill="none" />
        </>
      );
    case "neutral":
      return (
        <>
          <circle cx="40" cy="56" r="3.8" fill={eye} />
          <circle cx="60" cy="56" r="3.8" fill={eye} />
          <path d="M42 73 L58 73" stroke={eye} strokeWidth="3.2" strokeLinecap="round" />
        </>
      );
    default: // smile
      return (
        <>
          <circle cx="40" cy="56" r="4" fill={eye} />
          <circle cx="60" cy="56" r="4" fill={eye} />
          <circle cx="41.4" cy="54.6" r="1.2" fill="#fff" />
          <circle cx="61.4" cy="54.6" r="1.2" fill="#fff" />
          <path d="M41 70 Q50 78 59 70" stroke={eye} strokeWidth="3.2" strokeLinecap="round" fill="none" />
        </>
      );
  }
}
