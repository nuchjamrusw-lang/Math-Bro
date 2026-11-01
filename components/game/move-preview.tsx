"use client";
import { useState } from "react";
import { CheckCircle2, XCircle, ChevronDown, Info } from "lucide-react";
import type { MovePreview as Preview } from "@/lib/game-engine";
import { ERROR_TITLES } from "@/lib/math-validator/errors";
import { ScoreBreakdown } from "@/components/scoreboard/score-breakdown";
import { displaySymbol } from "@/components/tile/tile";
import { cn } from "@/lib/utils";

export function MovePreviewPanel({ preview, showValidity, autoScore, tilesPlaced }: { preview: Preview | null; showValidity: boolean; autoScore: boolean; tilesPlaced: number }) {
  const [open, setOpen] = useState(false);
  if (!preview || tilesPlaced === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">
        <p className="font-medium text-ink">Your move</p>
        <p className="mt-1">Drag tiles from your rack onto the board, or tap a tile then tap a square.</p>
      </div>
    );
  }
  if (preview.placementError) {
    const t = ERROR_TITLES[preview.placementError.code];
    return (
      <div className="rounded-2xl border border-error/25 bg-error-soft/60 p-4 text-sm" role="alert">
        <p className="flex items-center gap-2 font-semibold text-error"><XCircle className="size-4" />{t.en}</p>
        <p className="mt-1 text-ink/80">{preview.placementError.message}</p>
        <p className="mt-0.5 text-xs text-muted">{t.th}</p>
      </div>
    );
  }
  const valid = preview.allValid;
  return (
    <div className={cn("rounded-2xl border p-4 text-sm", !showValidity ? "border-line bg-surface" : valid ? "border-success/30 bg-success-soft/50" : "border-error/25 bg-error-soft/60")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          {preview.equations.map((eq, i) => (
            <div key={i} className="flex items-center gap-2">
              {showValidity ? (eq.valid ? <CheckCircle2 className="size-4 shrink-0 text-success" /> : <XCircle className="size-4 shrink-0 text-error" />) : <span className="size-4 shrink-0 text-center text-muted">≡</span>}
              <span className="truncate font-mono font-semibold">{eq.text.split(" ").map(displaySymbol).join(" ")}</span>
            </div>
          ))}
        </div>
        {autoScore && preview.score && (
          <div className="text-right">
            <div className="text-2xl font-bold leading-none tabular text-primary">+{preview.score.total}</div>
            <div className="text-[11px] text-muted">projected</div>
          </div>
        )}
      </div>
      {showValidity && !valid && preview.errors.map((e, i) => (
        <div key={i} className="mt-2 rounded-lg bg-surface/70 px-3 py-2">
          <p className="font-semibold text-error">{ERROR_TITLES[e.code].en} <span className="font-normal text-muted">· {ERROR_TITLES[e.code].th}</span></p>
          <p className="text-xs text-ink/75">{e.message}</p>
        </div>
      ))}
      {!showValidity && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><Info className="size-3.5" />Challenge mode: equations are checked only if your opponent challenges.</p>
      )}
      {autoScore && preview.score && (
        <>
          <button className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary cursor-pointer" onClick={() => setOpen(!open)}>
            Score breakdown <ChevronDown className={cn("size-3.5 transition", open && "rotate-180")} />
          </button>
          {open && <div className="mt-2"><ScoreBreakdown score={preview.score} /></div>}
        </>
      )}
    </div>
  );
}
