"use client";
import { memo } from "react";
import { motion } from "framer-motion";
import type { Board as BoardData } from "@/lib/game-engine/board";
import type { BoardLayout, PremiumType } from "@/lib/game-rules/board-layout";
import type { Tile as TileT } from "@/lib/tile-manager";
import { Tile } from "@/components/tile/tile";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";

export interface TentativeTile { tile: TileT; value?: string }

const PREMIUM_STYLE: Record<PremiumType, { cls: string; top?: string; bottom?: "cell.eq" | "cell.pc" }> = {
  TE: { cls: "bg-te text-te-ink", top: "3×", bottom: "cell.eq" },
  DE: { cls: "bg-de text-de-ink", top: "2×", bottom: "cell.eq" },
  TP: { cls: "bg-tp text-tp-ink", top: "3×", bottom: "cell.pc" },
  DP: { cls: "bg-dp text-dp-ink", top: "2×", bottom: "cell.pc" },
  STAR: { cls: "bg-tp text-tp-ink" },
  NORMAL: { cls: "bg-cell" },
};

export interface BoardProps {
  board: BoardData;
  layout: BoardLayout;
  tentative?: Map<string, TentativeTile>;
  highlight?: Set<string>;
  equationCells?: Set<string>;
  errorCells?: Set<string>;
  pendingCells?: Set<string>;
  interactive?: boolean;
  onCellClick?: (row: number, col: number) => void;
  onTentativePointerDown?: (e: React.PointerEvent, tileId: string) => void;
  className?: string;
}

const COLS = "ABCDEFGHIJKLMNO";

export const GameBoard = memo(function GameBoard({
  board, layout, tentative, highlight, equationCells, errorCells, pendingCells, interactive, onCellClick, onTentativePointerDown, className,
}: BoardProps) {
  const { t, lang } = useI18n();
  // Thai/Chinese words are wider/denser than "EQ"/"PC": tune the size so they stay inside the square.
  const bottomSize = lang === "th" ? "text-[1.25cqw]" : lang === "zh" ? "text-[1.3cqw]" : "text-[1.15cqw] tracking-wide";
  return (
    <div className={cn("board-wrap w-full", className)}>
      <div
        className="grid aspect-square w-full gap-[0.35cqw] rounded-[2.2cqw] border border-line bg-surface p-[1.1cqw] shadow-[var(--shadow-soft)]"
        style={{ gridTemplateColumns: `repeat(${layout.size}, minmax(0, 1fr))` }}
        role="grid"
        aria-label={t("board.aria")}
      >
        {layout.cells.map((row, r) =>
          row.map((type, c) => {
            const key = `${r},${c}`;
            const placed = board[r][c];
            const tent = tentative?.get(key);
            const st = PREMIUM_STYLE[type];
            const onEq = equationCells?.has(key);
            return (
              <div
                key={key}
                data-cell={key}
                role="gridcell"
                aria-label={`${COLS[c]}${r + 1}${type !== "NORMAL" ? ` ${type}` : ""}`}
                onClick={() => onCellClick?.(r, c)}
                className={cn(
                  "relative grid aspect-square place-items-center rounded-[0.9cqw] transition-colors",
                  st.cls,
                  interactive && !placed && !tent && "cursor-pointer hover:brightness-[0.97]",
                  onEq && !placed && !tent && "ring-1 ring-primary/30",
                )}
              >
                {!placed && !tent && type === "STAR" && <span className="text-[3.6cqw] leading-none">★</span>}
                {!placed && !tent && st.top && (
                  <span className="flex flex-col items-center leading-[1.05] font-semibold">
                    <span className="text-[1.65cqw]">{st.top}</span>
                    <span className={cn("whitespace-nowrap opacity-80", bottomSize)}>{t(st.bottom!)}</span>
                  </span>
                )}
                {placed && (
                  <motion.div
                    className="absolute inset-[3%]"
                    initial={highlight?.has(key) ? { scale: 0.6, opacity: 0 } : false}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <Tile
                      variant="board" face={placed.face} kind={placed.kind} points={placed.points} value={placed.value}
                      highlight={highlight?.has(key)} pending={pendingCells?.has(key)} error={errorCells?.has(key)}
                      className={cn(onEq && "ring-2 ring-primary/50")}
                    />
                  </motion.div>
                )}
                {tent && (
                  <motion.div
                    className="no-select absolute inset-[3%] cursor-grab active:cursor-grabbing"
                    initial={{ scale: 0.7 }}
                    animate={{ scale: 1 }}
                    onPointerDown={(e) => onTentativePointerDown?.(e, tent.tile.id)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Tile variant="board" face={tent.tile.face} kind={tent.tile.kind} points={tent.tile.points} value={tent.value} tentative error={errorCells?.has(key)} />
                  </motion.div>
                )}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
});

export function BoardLegend({ className }: { className?: string }) {
  const { t } = useI18n();
  const items: [string, string][] = [
    ["bg-te", t("legend.TE")],
    ["bg-de", t("legend.DE")],
    ["bg-tp", t("legend.TP")],
    ["bg-dp", t("legend.DP")],
  ];
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted", className)}>
      {items.map(([c, label]) => (
        <span key={c} className="flex items-center gap-1.5">
          <span className={cn("size-3 rounded-[4px]", c)} /> {label}
        </span>
      ))}
      <span className="flex items-center gap-1.5"><span className="text-tp-ink">★</span> {t("legend.star")}</span>
    </div>
  );
}
