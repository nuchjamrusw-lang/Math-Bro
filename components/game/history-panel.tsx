"use client";
import { useState } from "react";
import type { GameView, MoveRecord } from "@/lib/game-engine";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScoreBreakdown } from "@/components/scoreboard/score-breakdown";
import { displaySymbol } from "@/components/tile/tile";
import { cn, formatDuration } from "@/lib/utils";

export function describeRecord(h: MoveRecord, names: string[]): { title: string; detail?: string; tone?: "success" | "error" | "warning" | "muted" } {
  const who = h.sideIndex !== null ? names[h.sideIndex] : "";
  const eq = h.equations?.map((e) => e.split(" ").map(displaySymbol).join(" ")).join(" · ");
  switch (h.type) {
    case "START": return { title: "Game started", detail: h.note, tone: "muted" };
    case "PLAY": return h.status === "WITHDRAWN"
      ? { title: `${who} — move withdrawn`, detail: eq, tone: "error" }
      : { title: `${who}${h.bingo ? " — BINGO!" : ""}`, detail: eq, tone: h.bingo ? "success" : undefined };
    case "PASS": return { title: `${who} passed`, tone: "muted" };
    case "EXCHANGE": return { title: `${who} exchanged ${h.exchangedCount} tile${h.exchangedCount === 1 ? "" : "s"}`, tone: "muted" };
    case "CHALLENGE": return { title: `${who} challenged`, detail: h.note, tone: "warning" };
    case "RECHALLENGE": return { title: `${who} requested a re-challenge`, tone: "warning" };
    case "DRAW": return { title: `${who} drew ${h.drawnCount} tile(s)`, tone: "muted" };
    case "RESIGN": return { title: `${who} resigned`, tone: "error" };
    case "TIMEOUT": return { title: "Time out", detail: h.note, tone: "error" };
    case "PAUSE": return { title: "Paused", tone: "muted" };
    case "RESUME": return { title: "Resumed", tone: "muted" };
    case "END": return { title: "Game over", tone: "muted" };
  }
}

export function HistoryPanel({ view, className }: { view: GameView; className?: string }) {
  const [open, setOpen] = useState<MoveRecord | null>(null);
  const names = view.sides.map((s) => s.name);
  const items = [...view.history].reverse();
  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Move history</h3>
        <span className="text-xs text-muted">{view.moveNumber} turns</span>
      </div>
      <ol className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {items.map((h) => {
          const d = describeRecord(h, names);
          const clickable = h.type === "PLAY" && !!h.scoreBreakdown;
          return (
            <li key={h.seq}>
              <button
                disabled={!clickable}
                onClick={() => setOpen(h)}
                className={cn("flex w-full items-start justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition", clickable && "hover:bg-[#f2f3f7] cursor-pointer")}
              >
                <span className="min-w-0">
                  <span className={cn("block font-medium", d.tone === "error" && "text-error", d.tone === "success" && "text-success", d.tone === "warning" && "text-[#b5761a]", d.tone === "muted" && "text-muted")}>
                    {h.moveNumber > 0 && h.type !== "START" && <span className="mr-1 text-muted tabular">#{h.moveNumber}</span>}{d.title}
                  </span>
                  {d.detail && <span className="block truncate font-mono text-[11px] text-ink/70">{d.detail}</span>}
                </span>
                {h.type === "PLAY" && <span className={cn("shrink-0 font-bold tabular", h.status === "WITHDRAWN" && "line-through text-muted")}>+{h.points}</span>}
              </button>
            </li>
          );
        })}
      </ol>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Move #{open?.moveNumber} · {open?.sideIndex !== undefined && open?.sideIndex !== null ? names[open.sideIndex] : ""}</DialogTitle>
          <p className="mb-4 text-xs text-muted">Time used: {formatDuration(open?.timeUsedMs)}</p>
          {open?.scoreBreakdown && <ScoreBreakdown score={open.scoreBreakdown} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
