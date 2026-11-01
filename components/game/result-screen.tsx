"use client";
import { motion } from "framer-motion";
import { Trophy, RotateCcw, Home, History, Film } from "lucide-react";
import type { GameView } from "@/lib/game-engine";
import { Button } from "@/components/ui/button";
import { formatDuration, cn } from "@/lib/utils";
import { displaySymbol } from "@/components/tile/tile";

const REASON: Record<string, string> = {
  OUT: "A player used all their tiles",
  PASSES: "Consecutive passes",
  TIMEOUT: "Time ran out",
  RESIGN: "Resignation",
};

export function ResultScreen({ view, mySide, onPlayAgain, onLobby, onHistory, onReplay, onClose, canPlayAgain }: {
  view: GameView; mySide: number | null; canPlayAgain?: boolean;
  onPlayAgain?: () => void; onLobby?: () => void; onHistory?: () => void; onReplay?: () => void; onClose?: () => void;
}) {
  const r = view.result!;
  const winner = r.winnerSide;
  const iWon = mySide !== null && winner === mySide;
  const order = winner === null ? [0, 1] : [winner, winner === 0 ? 1 : 0];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#20232b]/35 p-4 backdrop-blur-[2px]" data-testid="result-screen">
      <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-lift)]">
        <Confetti active={winner !== null} />
        <div className="relative px-6 pb-4 pt-8 text-center">
          <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.15, type: "spring", stiffness: 300 }}
            className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary"><Trophy className="size-7" /></motion.div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight">
            {winner === null ? "It's a draw" : mySide === null ? `${view.sides[winner].name} wins!` : iWon ? "You win!" : `${view.sides[winner].name} wins`}
          </h2>
          <p className="mt-1 text-sm text-muted">{REASON[r.reason]} · by {r.scoreDifference} point{r.scoreDifference === 1 ? "" : "s"}</p>
        </div>
        <div className="relative grid grid-cols-2 gap-3 px-6">
          {order.map((i, k) => {
            const s = r.sides[i];
            return (
              <div key={i} className={cn("rounded-2xl border p-4", k === 0 && winner !== null ? "border-primary/40 bg-primary-soft/50" : "border-line")}>
                <p className="text-xs font-semibold text-muted">{k === 0 && winner !== null ? "WINNER" : winner === null ? "DRAW" : "RUNNER-UP"}</p>
                <p className="truncate font-semibold">{view.sides[i].name}</p>
                <p className="mt-1 text-3xl font-bold tabular" data-testid={`final-${i}`}>{s.finalScore}</p>
                <dl className="mt-2 space-y-0.5 text-xs text-muted tabular">
                  <div className="flex justify-between"><dt>Board score</dt><dd>{s.boardScore}</dd></div>
                  <div className="flex justify-between"><dt>Rack adjustment</dt><dd>{s.endAdjustment >= 0 ? "+" : ""}{s.endAdjustment}</dd></div>
                  <div className="flex justify-between"><dt>Time penalty</dt><dd className={s.timePenalty ? "text-error" : ""}>{s.timePenalty ? `−${s.timePenalty}` : "0"}</dd></div>
                  <div className="flex justify-between"><dt>Time used</dt><dd>{formatDuration(s.timeUsedMs)}</dd></div>
                  {s.overtimeMs > 0 && <div className="flex justify-between"><dt>Overtime</dt><dd>{formatDuration(s.overtimeMs)}</dd></div>}
                  <div className="flex justify-between"><dt>Bingos</dt><dd>{s.bingoCount}</dd></div>
                </dl>
              </div>
            );
          })}
        </div>
        <div className="mx-6 mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-[#f6f7f9] p-3 text-center text-xs">
          <div><p className="text-lg font-bold tabular">{r.totalMoves}</p><p className="text-muted">Total moves</p></div>
          <div><p className="text-lg font-bold tabular">{formatDuration(r.totalPlayingMs)}</p><p className="text-muted">Playing time</p></div>
          <div><p className="text-lg font-bold tabular">{view.challenges.length}</p><p className="text-muted">Challenges</p></div>
        </div>
        {view.challenges.length > 0 && (
          <div className="mx-6 mt-3 rounded-2xl border border-line p-3 text-xs">
            <p className="mb-1.5 font-semibold">Challenge history</p>
            <ul className="space-y-1">
              {view.challenges.map((c) => (
                <li key={c.id} className="flex justify-between gap-2">
                  <span className="truncate">#{c.moveNumber} {view.sides[c.challengerSide].name} → <span className="font-mono">{c.equations.map((e) => e.split(" ").map(displaySymbol).join(" ")).join(", ")}</span></span>
                  <span className={c.finalRuling === "VALID" ? "text-success" : "text-error"}>{c.finalRuling === "VALID" ? "valid" : "invalid"}{c.second ? " (re-checked)" : ""}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-2 p-6">
          {onPlayAgain && <Button onClick={onPlayAgain} disabled={canPlayAgain === false} title={canPlayAgain === false ? "Only the host can start a rematch" : undefined}><RotateCcw />Play again</Button>}
          {onLobby && <Button variant="secondary" onClick={onLobby}><Home />Back to lobby</Button>}
          {onHistory && <Button variant="secondary" onClick={onHistory}><History />Match history</Button>}
          {onReplay && <Button variant="secondary" onClick={onReplay}><Film />Replay</Button>}
          {onClose && <Button variant="ghost" onClick={onClose}>View board</Button>}
        </div>
      </motion.div>
    </div>
  );
}

function Confetti({ active }: { active: boolean }) {
  if (!active) return null;
  const colors = ["#344CDB", "#2EAD78", "#E8A33D", "#E45B5B", "#8B5CF6"];
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-40 overflow-hidden" aria-hidden>
      {Array.from({ length: 28 }).map((_, i) => (
        <motion.span key={i} className="absolute top-0 block h-2 w-1.5 rounded-sm" style={{ left: `${(i * 37) % 100}%`, background: colors[i % colors.length] }}
          initial={{ y: -20, opacity: 0, rotate: 0 }} animate={{ y: 150, opacity: [0, 1, 1, 0], rotate: 360 * (i % 2 ? 1 : -1) }}
          transition={{ duration: 1.8 + (i % 5) * 0.2, delay: (i % 7) * 0.08, ease: "easeOut" }} />
      ))}
    </div>
  );
}
