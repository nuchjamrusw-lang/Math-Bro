"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Play, Pause, SkipBack, SkipForward, ChevronsLeft, ChevronsRight } from "lucide-react";
import { buildReplayFrames, type MoveRecord, type GameResult } from "@/lib/game-engine";
import { parseLayout } from "@/lib/game-rules/board-layout";
import type { GameRulesConfig } from "@/lib/game-rules/config";
import { GameBoard } from "@/components/board/board";
import { Tile } from "@/components/tile/tile";
import { ScoreBreakdown } from "@/components/scoreboard/score-breakdown";
import { describeRecord } from "@/components/game/history-panel";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatDuration } from "@/lib/utils";

export interface ReplayData {
  id: string;
  rules: GameRulesConfig;
  result: GameResult | null;
  startedAt: string;
  players: { username: string; side: number; finalScore: number | null; outcome: string | null }[];
  history: MoveRecord[];
  replayEnabled: boolean;
}

export function ReplayViewer({ data }: { data: ReplayData }) {
  const layout = useMemo(() => parseLayout(data.rules.layoutRows), [data.rules]);
  const frames = useMemo(() => buildReplayFrames(data.history, layout.size), [data.history, layout.size]);
  const [i, setI] = useState(frames.length - 1);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setI((x) => { if (x >= frames.length - 1) { setPlaying(false); return x; } return x + 1; }), 1200);
    return () => clearInterval(t);
  }, [playing, frames.length]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "ArrowRight") setI((x) => Math.min(frames.length - 1, x + 1)); if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1)); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [frames.length]);

  const f = frames[i];
  const names = [0, 1].map((s) => data.players.filter((p) => p.side === s).map((p) => p.username).join(" & ") || `Side ${s + 1}`);
  const highlight = new Set(f.highlight.map((c) => `${c.row},${c.col}`));
  const rec = f.record;
  // Show withdrawn (successfully challenged) tiles as red ghosts on the board.
  const withdrawn = new Map(
    rec?.type === "PLAY" && rec.status === "WITHDRAWN" && rec.placements
      ? rec.placements.map((p) => [`${p.row},${p.col}`, { tile: { id: p.tileId, face: p.face, kind: p.kind, points: p.points }, value: p.value }] as const)
      : [],
  );

  if (!data.replayEnabled) {
    return <div className="mx-auto max-w-md px-4 py-24 text-center"><p className="font-semibold">Replay was disabled for this match.</p><Button className="mt-4" asChild><Link href="/profile">Back</Link></Button></div>;
  }

  return (
    <div className="mx-auto max-w-[1300px] px-3 py-4 sm:px-5">
      <header className="flex items-center justify-between"><Logo /><Button variant="ghost" size="sm" asChild><Link href="/profile">Match history</Link></Button></header>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            {[0, 1].map((s) => (
              <Card key={s} className={cn("flex items-center justify-between p-3", rec?.sideIndex === s && "border-primary/50")}>
                <span className="truncate font-semibold">{names[s]}</span>
                <span className="text-2xl font-bold tabular" data-testid={`replay-score-${s}`}>{f.scores[s] ?? 0}</span>
              </Card>
            ))}
          </div>
          <div className="mx-auto w-full max-w-[min(100%,calc(100dvh-260px))]"><GameBoard board={f.board} layout={layout} highlight={highlight} tentative={withdrawn} errorCells={new Set(withdrawn.keys())} /></div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Button variant="secondary" size="icon" onClick={() => setI(0)} aria-label="First"><ChevronsLeft /></Button>
              <Button variant="secondary" size="icon" onClick={() => setI((x) => Math.max(0, x - 1))} aria-label="Previous move"><SkipBack /></Button>
              <Button size="icon" onClick={() => { if (i >= frames.length - 1) setI(0); setPlaying((p) => !p); }} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause /> : <Play />}</Button>
              <Button variant="secondary" size="icon" onClick={() => setI((x) => Math.min(frames.length - 1, x + 1))} aria-label="Next move"><SkipForward /></Button>
              <Button variant="secondary" size="icon" onClick={() => setI(frames.length - 1)} aria-label="Last"><ChevronsRight /></Button>
            </div>
            <input type="range" min={0} max={frames.length - 1} value={i} onChange={(e) => setI(Number(e.target.value))} className="w-full max-w-md accent-[#344CDB]" aria-label="Replay position" />
            <p className="text-xs text-muted tabular">Event {i} / {frames.length - 1} · {f.bagCount} tiles in bag</p>
          </div>
          {f.racks && (
            <div className="grid gap-2 sm:grid-cols-2">
              {f.racks.map((r, s) => (
                <Card key={s} className="p-3">
                  <p className="mb-2 text-xs font-semibold text-muted">{names[s]}&apos;s rack</p>
                  <div className="grid grid-cols-8 gap-1">{r.map((t) => <div key={t.id} className="aspect-square"><Tile variant="mini" face={t.face} kind={t.kind} points={t.points} /></div>)}</div>
                </Card>
              ))}
            </div>
          )}
        </section>
        <aside className="flex flex-col gap-3">
          {rec && (
            <Card className="p-4">
              <p className="text-sm font-semibold">{describeRecord(rec, names).title}</p>
              {rec.equations && <div className="mt-1 space-y-0.5">{rec.equations.map((e, k) => <p key={k} className="font-mono text-sm">{e}</p>)}</div>}
              <p className="mt-1 text-xs text-muted">{new Date(rec.timestamp).toLocaleTimeString()} · time used {formatDuration(rec.timeUsedMs)}</p>
              {rec.scoreBreakdown && rec.status === "ACCEPTED" && <div className="mt-3"><ScoreBreakdown score={rec.scoreBreakdown} /></div>}
            </Card>
          )}
          <Card className="flex max-h-[60vh] flex-col p-4">
            <h3 className="mb-2 text-sm font-semibold">All events</h3>
            <ol className="space-y-0.5 overflow-y-auto">
              {frames.slice(1).map((fr) => {
                const d = describeRecord(fr.record!, names);
                return (
                  <li key={fr.index}>
                    <button onClick={() => { setPlaying(false); setI(fr.index); }} className={cn("flex w-full cursor-pointer justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs", fr.index === i ? "bg-primary-soft text-primary" : "hover:bg-[#f2f3f7]")}>
                      <span className="truncate">{d.title}{d.detail && <span className="ml-1 font-mono text-muted">{d.detail}</span>}</span>
                      {fr.record!.type === "PLAY" && <span className="font-semibold tabular">+{fr.record!.points}</span>}
                    </button>
                  </li>
                );
              })}
            </ol>
          </Card>
          {data.result && (
            <Card className="p-4 text-sm">
              <p className="font-semibold">Final result</p>
              {data.result.sides.map((s) => (
                <p key={s.sideIndex} className="mt-1 flex justify-between tabular"><span>{names[s.sideIndex]}{data.result!.winnerSide === s.sideIndex && " 🏆"}</span><span className="font-semibold">{s.finalScore}</span></p>
              ))}
              <p className="mt-2 text-xs text-muted">Ended by {data.result.reason.toLowerCase()} · {formatDuration(data.result.totalPlayingMs)}</p>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
