import { useEffect, useRef, useState } from "react";

/**
 * Counts down to an ISO deadline, correcting for client/server clock skew. The
 * skew offset is captured once each time a fresh server time arrives, then we
 * tick down against the local clock so the number actually decreases smoothly.
 */
export function useCountdown(
  deadlineIso: string | null | undefined,
  serverTimeIso: string | null | undefined,
): number {
  const offsetRef = useRef(0); // serverNow - clientNow at the moment of capture
  const [, force] = useState(0);

  // Recapture skew whenever the server reports a new time.
  useEffect(() => {
    if (serverTimeIso) {
      offsetRef.current = new Date(serverTimeIso).getTime() - Date.now();
    }
  }, [serverTimeIso]);

  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);

  if (!deadlineIso) return 0;
  const estimatedServerNow = Date.now() + offsetRef.current;
  const remainingMs = new Date(deadlineIso).getTime() - estimatedServerNow;
  return Math.max(0, Math.ceil(remainingMs / 1000));
}
