"use client";
import type { MoveScore } from "@/lib/scoring-engine";
import { displaySymbol } from "@/components/tile/tile";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

const PREM_LABEL: Record<string, string> = { TE: "3×EQ", DE: "2×EQ", TP: "3×PC", DP: "2×PC", STAR: "★ 3×PC", NORMAL: "" };
const PREM_CLS: Record<string, string> = { TE: "bg-te text-te-ink", DE: "bg-de text-de-ink", TP: "bg-tp text-tp-ink", DP: "bg-dp text-dp-ink", STAR: "bg-tp text-tp-ink", NORMAL: "" };

/** Transparent, auditable score calculation for one move. */
export function ScoreBreakdown({ score }: { score: MoveScore }) {
  const { t } = useI18n();
  return (
    <div className="space-y-3 text-sm">
      {score.equations.map((eq, i) => (
        <div key={i} className="rounded-xl border border-line p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-mono font-semibold">{eq.text.split(" ").map(displaySymbol).join(" ")}</span>
            <span className="text-xs text-muted">{eq.direction === "H" ? t("bd.horizontal") : t("bd.vertical")}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {eq.tiles.map((tile, k) => (
              <div key={k} className={cn("flex min-w-11 flex-col items-center rounded-lg border px-1.5 py-1", tile.isNew ? "border-primary/30 bg-primary-soft/50" : "border-line bg-[#f8f9fb]")}>
                <span className="font-semibold leading-tight">{displaySymbol(tile.value)}</span>
                <span className="text-[10px] text-muted tabular">{tile.basePoints}{tile.pieceMultiplier > 1 ? `×${tile.pieceMultiplier}` : ""}={tile.score}</span>
                {PREM_LABEL[tile.premium] && <span className={cn("mt-0.5 rounded px-1 text-[9px] font-bold", PREM_CLS[tile.premium])}>{PREM_LABEL[tile.premium]}</span>}
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-xs tabular">
            <span className="text-muted">
              {t("bd.tiles", { n: eq.tileSum })}
              {eq.equationMultiplier > 1 && <> × {eq.equationMultipliers.join(" × ")} {t("bd.equation")}</>}
            </span>
            <span className="font-bold text-ink">{eq.total}</span>
          </div>
        </div>
      ))}
      {score.bingo && (
        <div className="flex items-center justify-between rounded-xl bg-success-soft px-3 py-2 text-success">
          <span className="font-semibold">{t("bd.bingo")}</span>
          <span className="font-bold">+{score.bingoBonus}</span>
        </div>
      )}
      <div className="flex items-center justify-between px-1 pt-1 text-base">
        <span className="font-medium text-muted">{t("bd.total")}</span>
        <span className="font-bold tabular">{score.total}</span>
      </div>
    </div>
  );
}
