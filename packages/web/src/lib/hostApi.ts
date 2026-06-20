const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8787";

export interface HostConfig {
  roundDurationSeconds: number;
  lockBufferSeconds: number;
  poolLamports: string;
  rolloverOnNoWinner: boolean;
}

export interface HostInfo {
  config: HostConfig;
  caps: { maxPayoutSol: number; maxRoundPayoutSol: number };
  dryRun: boolean;
  usingSupabase: boolean;
  usingRealPayouts: boolean;
}

function authHeaders(secret: string): HeadersInit {
  return { "content-type": "application/json", "x-host-secret": secret };
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401) throw new Error("Wrong host secret");
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}

export async function getHostInfo(secret: string): Promise<HostInfo> {
  return handle(await fetch(`${API_URL}/host/config`, { headers: authHeaders(secret) }));
}

export async function startGame(secret: string): Promise<unknown> {
  return handle(await fetch(`${API_URL}/host/start`, { method: "POST", headers: authHeaders(secret) }));
}

export async function stopGame(secret: string): Promise<unknown> {
  return handle(await fetch(`${API_URL}/host/stop`, { method: "POST", headers: authHeaders(secret) }));
}

export interface ConfigUpdate {
  poolSol?: number;
  durationSeconds?: number;
  lockBufferSeconds?: number;
  rolloverOnNoWinner?: boolean;
}

export async function updateConfig(
  secret: string,
  update: ConfigUpdate,
): Promise<{ ok: boolean; config: HostConfig }> {
  return handle(
    await fetch(`${API_URL}/host/config`, {
      method: "POST",
      headers: authHeaders(secret),
      body: JSON.stringify(update),
    }),
  );
}
