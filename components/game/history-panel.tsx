"use client";
import { useState } from "react";
import type { GameView, MoveRecord } from "@/lib/game-engine";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScoreBreakdown } from "@/components/scoreboard/score-breakdown";
import { displaySymbol } from "@/components/tile/tile";
import { useI18n } from "@/lib/i18n/client";
import type { TFn } from "@/lib/i18n";
import { cn, formatDuration } from "@/lib/utils";

export function describeRecord(h: MoveRecord, names: string[], t: TFn): { title: string; detail?: string; tone?: "success" | "error" | "warning" | "muted" } {
  const name = h.sideIndex !== null && h.sideIndex !== undefined ? names[h.sideIndex] : "";
  const eq = h.equations?.map((e) => e.split(" ").map(displaySymbol).join(" ")).join(" · ");
  switch (h.type) {
    case "START": return { title: t("hist.started"), detail: name ? t("hist.movesFirst", { name }) : undefined, tone: "muted" };
    case "PLAY": return h.status === "WITHDRAWN"
      ? { title: t("hist.withdrawn", { name }), detail: eq, tone: "error" }
      : { title: h.bingo ? t("hist.bingo", { name }) : name, detail: eq, tone: h.bingo ? "success" : undefined };
    case "PASS": return { title: t("hist.passed", { name }), tone: "muted" };
    case "EXCHANGE": return { title: t("hist.exchanged", { name, n: h.exchangedCount ?? 0 }), tone: "muted" };
    case "CHALLENGE": {
      const first = h.firstValid ?? (h.note ? !h.note.includes("INVALID") : undefined);
      return { title: t("hist.challenged", { name }), detail: first === undefined ? undefined : first ? t("hist.firstValid") : t("hist.firstInvalid"), tone: "warning" };
    }
    case "RECHALLENGE": return { title: t("hist.rechallenge", { name }), tone: "warning" };
    case "DRAW": return { title: t("hist.drew", { name, n: h.drawnCount ?? 0 }), tone: "muted" };
    case "RESIGN": return { title: t("hist.resigned", { name }), tone: "error" };
    case "TIMEOUT": return { title: t("hist.timeout"), detail: name ? t("hist.ranOut", { name }) : undefined, tone: "error" };
    case "PAUSE": return { title: t("hist.paused"), tone: "muted" };
    case "RESUME": return { title: t("hist.resumed"), tone: "muted" };
    case "END": return { title: t("hist.over"), tone: "muted" };
  }
}

export function HistoryPanel({ view, className }: { view: GameView; className?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<MoveRecord | null>(null);
  const names = view.sides.map((s) => s.name);
  const items = [...view.history].reverse();
  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("hist.title")}</h3>
        <span className="text-xs text-muted">{t("hist.turns", { n: view.moveNumber })}</span>
      </div>
      <ol className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {items.map((h) => {
          const d = describeRecord(h, names, t);
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
          <DialogTitle>{t("hist.moveTitle", { n: open?.moveNumber ?? 0, name: open?.sideIndex !== undefined && open?.sideIndex !== null ? names[open.sideIndex] : "" })}</DialogTitle>
          <p className="mb-4 text-xs text-muted">{t("hist.timeUsed", { t: formatDuration(open?.timeUsedMs) })}</p>
          {open?.scoreBreakdown && <ScoreBreakdown score={open.scoreBreakdown} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
