"use client";
import { memo } from "react";
import { cn } from "@/lib/utils";
import type { TileFace, TileKind } from "@/lib/game-rules/tiles";

export function displaySymbol(s: string): string {
  if (s === "-") return "−";
  if (s === "+/-") return "±";
  if (s === "×/÷") return "×÷";
  return s;
}

export interface TileProps {
  face: TileFace;
  kind: TileKind;
  points: number;
  /** Chosen symbol (blank / choice tiles) or the fixed face. */
  value?: string;
  variant?: "board" | "rack" | "mini";
  selected?: boolean;
  tentative?: boolean;
  pending?: boolean;
  highlight?: boolean;
  error?: boolean;
  dim?: boolean;
  className?: string;
}

/** A single A-Math tile. Size is driven by the parent (board uses container query units). */
export const Tile = memo(function Tile({ face, kind, points, value, variant = "rack", selected, tentative, pending, highlight, error, dim, className }: TileProps) {
  const isBlank = kind === "blank";
  const shown = value ?? (isBlank ? "" : face);
  const text = displaySymbol(shown);
  const long = text.length >= 2;
  return (
    <div
      className={cn(
        "relative grid h-full w-full select-none place-items-center rounded-[16%] border font-semibold tabular text-ink transition-[transform,box-shadow] duration-150",
        "bg-tile border-tile-edge shadow-[var(--shadow-tile)]",
        isBlank && "border-dashed border-[#c9cfdc] bg-[#fbfbfd]",
        tentative && "border-primary/60 bg-[#f4f6ff] ring-2 ring-primary/40",
        pending && "ring-2 ring-warning/70",
        highlight && "bg-[#fff7df] border-[#ecd28e]",
        error && "ring-2 ring-error bg-error-soft",
        selected && "-translate-y-1 ring-2 ring-primary shadow-[var(--shadow-lift)]",
        dim && "opacity-40",
        className,
      )}
      data-face={face}
    >
      <span
        className={cn(
          "leading-none",
          variant === "board" && (long ? "text-[2.75cqw] tracking-[-0.04em]" : "text-[3.4cqw]"),
          variant === "rack" && (long ? "text-[clamp(14px,3.6vw,21px)] tracking-[-0.03em]" : "text-[clamp(17px,4.6vw,25px)]"),
          variant === "mini" && (long ? "text-[11px]" : "text-[13px]"),
          isBlank && value && "text-primary",
          (kind === "choice" && !value) && "text-[#5d6272]",
        )}
      >
        {text || (isBlank ? <span className="text-[0.6em] font-medium tracking-wide text-muted">BLANK</span> : null)}
      </span>
      {variant !== "mini" && (
        <span
          className={cn(
            "absolute bottom-[6%] right-[9%] font-medium leading-none text-[#9a8f72]",
            variant === "board" ? "text-[1.35cqw]" : "text-[clamp(8px,1.9vw,11px)]",
          )}
        >
          {points}
        </span>
      )}
      {isBlank && value && variant !== "mini" && (
        <span className={cn("absolute left-[9%] top-[6%] leading-none text-primary/70", variant === "board" ? "text-[1.2cqw]" : "text-[9px]")}>◇</span>
      )}
    </div>
  );
});
