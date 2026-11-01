"use client";
import { useState } from "react";
import { CheckCircle2, XCircle, ChevronDown, Info } from "lucide-react";
import type { MovePreview as Preview } from "@/lib/game-engine";
import { ScoreBreakdown } from "@/components/scoreboard/score-breakdown";
import { displaySymbol } from "@/components/tile/tile";
import { useI18n } from "@/lib/i18n/client";
import { validationDetail, validationTitle } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

export function MovePreviewPanel({ preview, showValidity, autoScore, tilesPlaced }: { preview: Preview | null; showValidity: boolean; autoScore: boolean; tilesPlaced: number }) {
  const { t, td } = useI18n();
  const [open, setOpen] = useState(false);
  if (!preview || tilesPlaced === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">
        <p className="font-medium text-ink">{t("preview.yourMove")}</p>
        <p className="mt-1">{t("preview.help")}</p>
      </div>
    );
  }
  if (preview.placementError) {
    const e = preview.placementError;
    return (
      <div className="rounded-2xl border border-error/25 bg-error-soft/60 p-4 text-sm" role="alert">
        <p className="flex items-center gap-2 font-semibold text-error"><XCircle className="size-4" />{validationTitle(td, e)}</p>
        <p className="mt-1 text-ink/80">{validationDetail(td, e)}</p>
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
            <div className="text-[11px] text-muted">{t("preview.projected")}</div>
          </div>
        )}
      </div>
      {showValidity && !valid && preview.errors.map((e, i) => (
        <div key={i} className="mt-2 rounded-lg bg-surface/70 px-3 py-2">
          <p className="font-semibold text-error">{validationTitle(td, e)}</p>
          <p className="text-xs text-ink/75">{validationDetail(td, e)}</p>
        </div>
      ))}
      {!showValidity && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><Info className="size-3.5 shrink-0" />{t("preview.challengeNote")}</p>
      )}
      {autoScore && preview.score && (
        <>
          <button className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary cursor-pointer" onClick={() => setOpen(!open)}>
            {t("preview.breakdown")} <ChevronDown className={cn("size-3.5 transition", open && "rotate-180")} />
          </button>
          {open && <div className="mt-2"><ScoreBreakdown score={preview.score} /></div>}
        </>
      )}
    </div>
  );
}
