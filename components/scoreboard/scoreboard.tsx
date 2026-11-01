"use client";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import type { GameView } from "@/lib/game-engine";
import { ChessClock } from "@/components/timer/chess-clock";
import { Avatar } from "@/components/layout/avatar";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/** One side's score, clock, rack size and turn indicator. Stacks compactly on phones. */
export function PlayerCard({ view, side, now, isMe, avatarColor, online }: {
  view: GameView; side: number; now: number; isMe: boolean; avatarColor?: string; online?: boolean;
}) {
  const { t } = useI18n();
  const s = view.sides[side];
  const active = view.turn === side && view.phase !== "FINISHED";
  const label = side === 0 ? "A" : "B";
  return (
    <div
      className={cn(
        "relative flex min-w-0 items-center gap-3 rounded-2xl border bg-surface p-2.5 transition-all sm:p-3",
        active ? "border-primary/50 shadow-[0_0_0_3px_rgb(52_76_219/0.08)]" : "border-line",
      )}
      data-testid={`player-card-${side}`}
    >
      {active && <motion.span layoutId="turn-indicator" className="absolute -top-px left-4 right-4 h-[3px] rounded-b-full bg-primary" />}
      <div className="relative hidden sm:block">
        {s.members.length > 1 ? (
          <span className="grid size-10 place-items-center rounded-full bg-[#eef0f4] text-muted"><Users className="size-5" /></span>
        ) : (
          <Avatar name={s.name} color={avatarColor} size={40} />
        )}
        {online !== undefined && (
          <span className={cn("absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white", online ? "bg-success" : "bg-[#c4c8d2]")} title={online ? t("score.online") : t("score.offline")} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="rounded bg-[#eef0f4] px-1 text-[10px] font-bold text-muted">{label}</span>
              <span className="truncate text-sm font-semibold">{s.name}</span>
              {isMe && <span className="hidden text-[11px] font-medium text-primary sm:inline">{t("score.you")}</span>}
            </div>
            {s.members.length > 1 && <div className="truncate text-[11px] text-muted">{s.members.map((m) => m.name).join(" & ")}</div>}
          </div>
          <motion.span key={s.score} initial={{ scale: 1.25, color: "#344CDB" }} animate={{ scale: 1, color: "#20232B" }} className="text-xl font-bold leading-none tabular sm:text-2xl" data-testid={`score-${side}`}>
            {s.score}
          </motion.span>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="truncate text-[11px] text-muted">
            {t("score.tiles", { n: s.rackCount })}{s.bingoCount > 0 && <span className="font-semibold text-success"> · {t("score.bingo", { n: s.bingoCount })}</span>}
          </span>
          <ChessClock clock={view.clock} side={side} now={now} warningSeconds={view.rules.time.warningSeconds} penaltyPerMinute={view.rules.time.penaltyPointsPerMinute} compact />
        </div>
      </div>
    </div>
  );
}
