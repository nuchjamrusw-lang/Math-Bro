/**
 * Server-authoritative chess clock. Pure functions over a serialisable ClockState.
 * Time is never taken from the client; `now` is always the server's Date.now().
 */
export interface ClockState {
  initialMs: number;
  usedMs: number[];
  runningSide: number | null;
  runningSince: number | null;
  paused: boolean;
}

export function createClock(minutesPerSide: number, sides = 2): ClockState {
  return { initialMs: minutesPerSide * 60_000, usedMs: Array(sides).fill(0), runningSide: null, runningSince: null, paused: false };
}

export function usedMs(c: ClockState, side: number, now: number): number {
  const live = c.runningSide === side && c.runningSince !== null ? now - c.runningSince : 0;
  return c.usedMs[side] + Math.max(0, live);
}

export function remainingMs(c: ClockState, side: number, now: number): number {
  return c.initialMs - usedMs(c, side, now);
}

export function overtimeMs(c: ClockState, side: number, now: number): number {
  return Math.max(0, usedMs(c, side, now) - c.initialMs);
}

/** 10 points per started minute of overtime: 1s → 10, 60s → 10, 61s → 20. */
export function timePenalty(overMs: number, pointsPerMinute = 10): number {
  if (overMs <= 0) return 0;
  const overSeconds = Math.ceil(overMs / 1000);
  return Math.ceil(overSeconds / 60) * pointsPerMinute;
}

export function stopClock(c: ClockState, now: number): void {
  if (c.runningSide !== null && c.runningSince !== null) {
    c.usedMs[c.runningSide] += Math.max(0, now - c.runningSince);
  }
  c.runningSide = null;
  c.runningSince = null;
}

export function startClock(c: ClockState, side: number, now: number): void {
  stopClock(c, now);
  c.runningSide = side;
  c.runningSince = now;
  c.paused = false;
}

export function pauseClock(c: ClockState, now: number): number | null {
  const side = c.runningSide;
  stopClock(c, now);
  c.paused = true;
  return side;
}

export type ClockStatus = "NORMAL" | "WARNING" | "OVERTIME" | "PAUSED" | "IDLE";

export function clockStatus(c: ClockState, side: number, now: number, warningSeconds = 60): ClockStatus {
  const rem = remainingMs(c, side, now);
  if (rem < 0) return "OVERTIME";
  if (c.paused) return "PAUSED";
  if (c.runningSide !== side) return "IDLE";
  if (rem <= warningSeconds * 1000) return "WARNING";
  return "NORMAL";
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
