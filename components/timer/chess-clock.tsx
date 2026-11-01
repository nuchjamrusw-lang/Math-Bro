"use client";
import { AlarmClock, Pause } from "lucide-react";
import { clockStatus, formatClock, overtimeMs, remainingMs, timePenalty, type ClockState } from "@/lib/timer-engine";
import { cn } from "@/lib/utils";

export function ChessClock({ clock, side, now, warningSeconds, penaltyPerMinute, compact }: {
  clock: ClockState; side: number; now: number; warningSeconds: number; penaltyPerMinute: number; compact?: boolean;
}) {
  const status = clockStatus(clock, side, now, warningSeconds);
  const rem = remainingMs(clock, side, now);
  const over = overtimeMs(clock, side, now);
  const pen = timePenalty(over, penaltyPerMinute);
  const running = clock.runningSide === side;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border px-2.5 py-1.5 tabular transition-colors",
        status === "NORMAL" && "border-primary/30 bg-primary-soft text-primary",
        status === "IDLE" && "border-line bg-[#f6f7f9] text-muted",
        status === "WARNING" && "border-warning/40 bg-warning-soft text-[#b5761a] animate-pulse",
        status === "OVERTIME" && "border-error/40 bg-error-soft text-error",
        status === "PAUSED" && "border-line bg-[#f6f7f9] text-muted",
      )}
      aria-label={`Clock ${status.toLowerCase()}`}
      data-status={status}
    >
      {status === "PAUSED" ? <Pause className="size-3.5" /> : <AlarmClock className={cn("size-3.5", running && "animate-[pulse_2s_ease-in-out_infinite]")} />}
      {status === "OVERTIME" ? (
        <span className="flex items-baseline gap-1.5">
          <span className={cn("font-mono font-bold", compact ? "text-sm" : "text-base")}>+{formatClock(over)}</span>
          <span className="text-[11px] font-semibold">−{pen}</span>
        </span>
      ) : (
        <span className={cn("font-mono font-bold", compact ? "text-sm" : "text-base")}>{formatClock(rem)}</span>
      )}
    </div>
  );
}
