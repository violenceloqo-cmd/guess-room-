interface BrandMarkProps {
  size?: number;
  className?: string;
}

/** Inline crown mark for Room Royale — no external logo asset required. */
export function BrandMark({ size = 72, className }: BrandMarkProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="rr-crown" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffe08a" />
          <stop offset="0.55" stopColor="#f4c542" />
          <stop offset="1" stopColor="#e94560" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="14" fill="rgba(20, 10, 36, 0.9)" stroke="url(#rr-crown)" strokeWidth="2" />
      <path
        d="M14 42V28l8 6 6-12 6 12 6-6 8 8v14H14Z"
        fill="url(#rr-crown)"
        opacity="0.95"
      />
      <circle cx="22" cy="26" r="2.5" fill="#fff8e7" />
      <circle cx="32" cy="20" r="2.5" fill="#fff8e7" />
      <circle cx="42" cy="26" r="2.5" fill="#fff8e7" />
    </svg>
  );
}
