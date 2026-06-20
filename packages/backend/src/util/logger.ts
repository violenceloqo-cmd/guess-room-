/* Minimal structured-ish logger. Keeps output readable on a stream console. */

type Level = "debug" | "info" | "warn" | "error";

function ts(): string {
  return new Date().toISOString();
}

function emit(level: Level, scope: string, msg: string, extra?: unknown) {
  const line = `${ts()} ${level.toUpperCase().padEnd(5)} [${scope}] ${msg}`;
  const fn =
    level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  if (extra !== undefined) fn(line, extra);
  else fn(line);
}

export function createLogger(scope: string) {
  return {
    debug: (msg: string, extra?: unknown) => emit("debug", scope, msg, extra),
    info: (msg: string, extra?: unknown) => emit("info", scope, msg, extra),
    warn: (msg: string, extra?: unknown) => emit("warn", scope, msg, extra),
    error: (msg: string, extra?: unknown) => emit("error", scope, msg, extra),
  };
}

export type Logger = ReturnType<typeof createLogger>;
