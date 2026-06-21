import { Mascot } from "./Mascot";

interface BrandMarkProps {
  size?: number;
  className?: string;
}

/** Room Royale logo — the crowned mascot, our little champion of the rooms. */
export function BrandMark({ size = 72, className }: BrandMarkProps) {
  return <Mascot size={size} color="#ff4fa3" face="smile" pose="wave" crown className={className} />;
}
