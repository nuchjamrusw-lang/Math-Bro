"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Undo2, Shuffle, SkipForward, Repeat2, Flag, PauseCircle, PlayCircle, Download, ShoppingBag } from "lucide-react";
import type { PlacementInput } from "@/lib/game-engine";
import { layoutFor } from "@/lib/game-engine/engine";
import { previewFromView } from "@/lib/game-engine/client-preview";
import { isAutoScore, isAutoTiles } from "@/lib/game-rules/config";
import type { Tile as TileT } from "@/lib/tile-manager";
import type { GameAction } from "@/lib/protocol";
import { GameBoard, BoardLegend, type TentativeTile } from "@/components/board/board";
import { Rack } from "@/components/rack/rack";
import { Tile } from "@/components/tile/tile";
import { PlayerCard } from "@/components/scoreboard/scoreboard";
import { ChallengePanel } from "@/components/challenge/challenge-panel";
import { useServerNow } from "@/components/timer/use-server-now";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { MovePreviewPanel } from "./move-preview";
import { HistoryPanel } from "./history-panel";
import { ConfirmDialog, DrawDialog, ExchangeDialog, SubmitDialog, SymbolPicker } from "./dialogs";
import { useTileDrag, type DragFrom, type DropTarget } from "./use-tile-drag";
import type { GameController } from "./types";
import { cn } from "@/lib/utils";

interface Placed { tileId: string; row: number; col: number; value?: string }

export function GameView({ controller, header, voice, sidebarExtra, memberMeta }: {
  controller: GameController;
  header?: React.ReactNode;
  voice?: React.ReactNode;
  sidebarExtra?: React.ReactNode;
  memberMeta?: Record<number, { avatarColor?: string; online?: boolean }>;
}) {
  const { view, mySide, isReferee, act } = controller;
  const toast = useToast();
  const layout = layoutFor(view.rules);
  const now = useServerNow(view.serverNow, view.version);
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [picker, setPicker] = useState<{ tileId: string; row: number; col: number } | null>(null);
  const [dialog, setDialog] = useState<null | "submit" | "pass" | "exchange" | "resign" | "draw">(null);
  const [bingo, setBingo] = useState<string | null>(null);
  const acceptedFor = useRef<number | null>(null);
  const seenHistory = useRef(view.history.length);

  const rack: TileT[] = useMemo(() => (mySide !== null ? view.sides[mySide].rack ?? [] : []), [view, mySide]);
  const rackById = useMemo(() => new Map(rack.map((t) => [t.id, t])), [rack]);

  // Keep local rack order / placements consistent with the authoritative rack.
  useEffect(() => {
    const ids = rack.map((t) => t.id);
    setOrder((o) => [...o.filter((id) => ids.includes(id)), ...ids.filter((id) => !o.includes(id))]);
    setPlaced((p) => p.filter((x) => ids.includes(x.tileId) && !view.board[x.row][x.col]));
    setSelected((s) => (s && ids.includes(s) ? s : null));
  }, [rack, view.board]);

  // Bingo celebration when a new bingo appears in history.
  useEffect(() => {
    const fresh = view.history.slice(seenHistory.current);
    seenHistory.current = view.history.length;
    const b = fresh.find((h) => h.type === "PLAY" && h.status === "ACCEPTED" && h.bingo);
    if (b) {
      setBingo(view.sides[b.sideIndex!].name);
      const t = setTimeout(() => setBingo(null), 2600);
      return () => clearTimeout(t);
    }
  }, [view.history, view.sides]);

  const phase = view.phase;
  const pendingByOther = phase === "CHALLENGE_WINDOW" && view.pending && view.pending.sideIndex !== mySide;
  const myTurn = mySide !== null && view.turn === mySide && (phase === "PLAYING" || !!pendingByOther);
  const challengeMode = view.rules.validation === "CHALLENGE";
  const showValidity = view.rules.challenge.showValidityPreview || !challengeMode;
  const autoScore = isAutoScore(view.rules);
  const autoTiles = isAutoTiles(view.rules);

  const run = useCallback(async (a: GameAction, okMsg?: string) => {
    setBusy(true);
    const r = await act(a);
    setBusy(false);
    if (!r.ok) toast(r.error, "error");
    else if (okMsg) toast(okMsg, "success");
    return r.ok;
  }, [act, toast]);

  /** Touching the rack during the challenge window accepts the opponent's move. */
  const ensureAccepted = useCallback(() => {
    if (pendingByOther && view.pending && acceptedFor.current !== view.pending.moveNumber) {
      acceptedFor.current = view.pending.moveNumber;
      void run({ type: "accept" }, "Move accepted");
    }
  }, [pendingByOther, view.pending, run]);

  const occupied = (r: number, c: number) => !!view.board[r][c] || placed.some((p) => p.row === r && p.col === c);

  const placeTile = (tileId: string, row: number, col: number) => {
    if (!myTurn || occupied(row, col)) return;
    const tile = rackById.get(tileId);
    if (!tile) return;
    const existing = placed.find((p) => p.tileId === tileId);
    if (existing) {
      setPlaced((ps) => ps.map((p) => (p.tileId === tileId ? { ...p, row, col } : p)));
    } else if (tile.kind === "blank" || tile.kind === "choice") {
      setPicker({ tileId, row, col });
    } else {
      setPlaced((ps) => [...ps, { tileId, row, col }]);
    }
    setSelected(null);
  };

  const recall = (tileId?: string) => setPlaced((ps) => (tileId ? ps.filter((p) => p.tileId !== tileId) : []));

  const moveInRack = (tileId: string, toIndex: number) => {
    setOrder((o) => {
      const visible = o.filter((id) => !placed.some((p) => p.tileId === id) || id === tileId);
      const from = visible.indexOf(tileId);
      if (from < 0) return o;
      const next = visible.filter((id) => id !== tileId);
      next.splice(Math.min(toIndex, next.length), 0, tileId);
      const rest = o.filter((id) => !visible.includes(id));
      return [...next, ...rest];
    });
  };

  const { drag, draggingId, begin } = useTileDrag({
    onDragStart: () => ensureAccepted(),
    onClick: (tileId, from) => {
      ensureAccepted();
      if (from === "board") return recall(tileId);
      if (selected && selected !== tileId) {
        // swap two rack tiles
        setOrder((o) => {
          const a = o.indexOf(selected), b = o.indexOf(tileId);
          const n = [...o]; [n[a], n[b]] = [n[b], n[a]]; return n;
        });
        setSelected(null);
      } else setSelected(selected === tileId ? null : tileId);
    },
    onDrop: (tileId, from, target: DropTarget) => {
      if (!target) return;
      if (target.type === "cell") placeTile(tileId, target.row, target.col);
      else {
        if (from === "board") recall(tileId);
        moveInRack(tileId, target.index);
      }
    },
  });

  const onCellClick = (row: number, col: number) => {
    if (selected) placeTile(selected, row, col);
  };

  const shuffle = () => {
    ensureAccepted();
    setOrder((o) => [...o].sort(() => Math.random() - 0.5));
  };

  const placements: PlacementInput[] = placed.map((p) => ({ tileId: p.tileId, row: p.row, col: p.col, value: p.value as PlacementInput["value"] }));
  const preview = useMemo(
    () => (mySide !== null && placements.length && myTurn ? previewFromView(view, mySide, placements) : null),
    [view, mySide, JSON.stringify(placements), myTurn], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const tentative = useMemo(() => {
    const m = new Map<string, TentativeTile>();
    for (const p of placed) {
      const t = rackById.get(p.tileId);
      if (t && p.tileId !== draggingId) m.set(`${p.row},${p.col}`, { tile: t, value: p.value });
    }
    return m;
  }, [placed, rackById, draggingId]);

  const lastPlay = [...view.history].reverse().find((h) => h.type === "PLAY" && h.status === "ACCEPTED");
  const highlight = useMemo(() => new Set(lastPlay?.placements?.map((p) => `${p.row},${p.col}`) ?? []), [lastPlay]);
  const pendingCells = useMemo(() => new Set(view.pending?.placements.map((p) => `${p.row},${p.col}`) ?? []), [view.pending]);
  const equationCells = useMemo(() => new Set(preview?.equations.flatMap((e) => e.cells.map((c) => `${c.row},${c.col}`)) ?? []), [preview]);
  const errorCells = useMemo(() => {
    const s = new Set<string>();
    if (!preview) return s;
    if (preview.placementError?.cells) preview.placementError.cells.forEach((c) => s.add(`${c.row},${c.col}`));
    if (showValidity) preview.equations.filter((e) => !e.valid).forEach((e) => e.cells.forEach((c) => s.add(`${c.row},${c.col}`)));
    return s;
  }, [preview, showValidity]);

  const rackVisible = order.map((id) => rackById.get(id)!).filter((t) => t && !placed.some((p) => p.tileId === t.id) && t.id !== draggingId);
  const canSubmit = myTurn && placed.length > 0 && !!preview?.ok && (!showValidity || challengeMode || preview.allValid) && !busy;
  const submitBlockedByValidity = myTurn && !challengeMode && !!preview?.ok && !preview.allValid;

  const submit = async (declared: number | null) => {
    setDialog(null);
    const ok = await run({ type: "play", placements: placements as never, declaredScore: declared });
    if (ok) { setPlaced([]); setSelected(null); }
  };

  const statusText = (() => {
    if (phase === "FINISHED") return { t: "Game over", tone: "neutral" as const };
    if (phase === "PAUSED") return { t: "Paused", tone: "warning" as const };
    if (phase === "CHALLENGE_RESULT" || phase === "REFEREE_REVIEW") return { t: "Challenge in progress", tone: "warning" as const };
    if (phase === "CHALLENGE_WINDOW") return { t: pendingByOther ? "Review the move" : "Opponent reviewing", tone: "warning" as const };
    if (mySide === null) return { t: `${view.sides[view.turn].name} to play`, tone: "neutral" as const };
    return view.turn === mySide ? { t: "Your turn", tone: "primary" as const } : { t: `${view.sides[view.turn].name}'s turn`, tone: "neutral" as const };
  })();

  const pauseRequestFromOther = view.pauseRequestedBy !== null && view.pauseRequestedBy !== mySide && mySide !== null;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-3 pb-6 pt-3 sm:px-5">
      {header}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex min-w-0 flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            {[0, 1].map((i) => <PlayerCard key={i} view={view} side={i} now={now} isMe={controller.mode === "online" && mySide === i} avatarColor={memberMeta?.[i]?.avatarColor} online={memberMeta?.[i]?.online} />)}
          </div>
          <div className="flex items-center justify-between gap-2 px-1">
            <Badge tone={statusText.tone} data-testid="game-status">{statusText.t}</Badge>
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted" data-testid="bag-count"><ShoppingBag className="size-3.5" />{view.bagCount} in bag</span>
          </div>
          <div className="relative mx-auto w-full max-w-[min(100%,calc(100dvh-300px))] min-w-[300px]">
            <GameBoard
              board={view.board} layout={layout} tentative={tentative} highlight={highlight} pendingCells={pendingCells}
              equationCells={equationCells} errorCells={errorCells} interactive={myTurn && !!selected}
              onCellClick={onCellClick} onTentativePointerDown={(e, id) => begin(e, id, "board")}
            />
            <AnimatePresence>
              {bingo && (
                <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }}
                  className="pointer-events-none absolute inset-0 grid place-items-center" data-testid="bingo">
                  <div className="rounded-3xl bg-surface/95 px-8 py-5 text-center shadow-[var(--shadow-lift)]">
                    <p className="text-4xl font-extrabold tracking-tight text-primary">BINGO!</p>
                    <p className="mt-1 text-sm font-medium text-muted">{bingo} used all 8 tiles · +40</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {phase === "PAUSED" && (
              <div className="absolute inset-0 grid place-items-center rounded-[2.2cqw] bg-surface/80 backdrop-blur-sm">
                <div className="text-center">
                  <PauseCircle className="mx-auto size-10 text-muted" />
                  <p className="mt-2 font-semibold">Game paused</p>
                  {(mySide !== null || isReferee) && <Button className="mt-3" onClick={() => run({ type: "resume" })}><PlayCircle />Resume</Button>}
                </div>
              </div>
            )}
          </div>

          {mySide !== null && phase !== "FINISHED" && (
            <div className="flex flex-col items-center gap-3">
              <Rack tiles={rackVisible} slots={view.rules.rackSize} selectedId={selected} onTilePointerDown={(e, id) => begin(e, id, "rack")} />
              <div className="grid w-full max-w-[640px] grid-cols-5 gap-2 sm:grid-cols-[1.4fr_repeat(5,1fr)]">
                <Button className="col-span-5 sm:col-span-1" size="lg" disabled={!canSubmit} onClick={() => setDialog("submit")} data-testid="submit-move"><Send />Submit</Button>
                <Button variant="secondary" disabled={!placed.length} onClick={() => recall()} title="Recall all tiles (undo)"><Undo2 /><span className="hidden sm:inline">Undo</span></Button>
                <Button variant="secondary" onClick={shuffle} title="Shuffle rack"><Shuffle /><span className="hidden sm:inline">Shuffle</span></Button>
                <Button variant="secondary" disabled={!myTurn || busy} onClick={() => setDialog("pass")}><SkipForward /><span className="hidden sm:inline">Pass</span></Button>
                <Button variant="secondary" disabled={!myTurn || busy} onClick={() => { ensureAccepted(); setDialog("exchange"); }} title={view.bagCount < view.rules.exchangeMinBag ? `Needs ${view.rules.exchangeMinBag}+ tiles in the bag` : "Exchange tiles"}><Repeat2 /><span className="hidden sm:inline">Exchange</span></Button>
                {!autoTiles ? (
                  <Button variant="soft" disabled={rack.length >= view.rules.rackSize || view.bagCount === 0} onClick={() => setDialog("draw")}><Download /><span className="hidden sm:inline">Draw</span></Button>
                ) : (
                  <Button variant="ghost" onClick={() => setDialog("resign")} title="Resign"><Flag /><span className="hidden sm:inline">Resign</span></Button>
                )}
              </div>
              {submitBlockedByValidity && <p className="text-xs font-medium text-error">Strict mode: fix the equation before submitting.</p>}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {voice}
                {view.rules.time.allowPause && (phase === "PLAYING" || phase === "CHALLENGE_WINDOW") && (
                  <Button variant="ghost" size="sm" disabled={view.pauseRequestedBy === mySide} onClick={() => run({ type: "pauseRequest" }, "Pause requested")}><PauseCircle />{view.pauseRequestedBy === mySide ? "Pause requested" : "Request pause"}</Button>
                )}
                {!autoTiles && <Button variant="ghost" size="sm" onClick={() => setDialog("resign")}><Flag />Resign</Button>}
              </div>
            </div>
          )}
          {mySide === null && phase !== "FINISHED" && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-muted">{isReferee ? "You are the referee." : "You are spectating."} Racks are hidden.</p>
              {voice}
              {isReferee && view.rules.time.allowPause && phase === "PLAYING" && <Button variant="secondary" size="sm" onClick={() => run({ type: "pause" })}><PauseCircle />Pause game</Button>}
            </div>
          )}
        </section>

        <aside className="flex min-w-0 flex-col gap-3 lg:max-h-[calc(100dvh-90px)] lg:sticky lg:top-3">
          {pauseRequestFromOther && (
            <div className="rounded-2xl border border-line bg-surface p-4 text-sm">
              <p className="font-semibold">{view.sides[view.pauseRequestedBy!].name} asks to pause the game</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => run({ type: "pauseRespond", accept: true })}>Accept</Button>
                <Button size="sm" variant="secondary" onClick={() => run({ type: "pauseRespond", accept: false })}>Decline</Button>
              </div>
            </div>
          )}
          <ChallengePanel view={view} mySide={mySide} isReferee={isReferee} now={now} busy={busy} onAction={(a) => { if (a.type === "accept" && view.pending) acceptedFor.current = view.pending.moveNumber; void run(a); }} />
          {mySide !== null && myTurn && <MovePreviewPanel preview={preview} showValidity={showValidity} autoScore={autoScore} tilesPlaced={placed.length} />}
          {sidebarExtra}
          <div className="flex min-h-[220px] flex-1 flex-col rounded-2xl border border-line bg-surface p-4">
            <HistoryPanel view={view} className="flex-1" />
          </div>
          <BoardLegend className="px-1" />
        </aside>
      </div>

      {drag && rackById.get(drag.tileId) && (
        <div className="pointer-events-none fixed z-[70] size-12 -translate-x-1/2 -translate-y-1/2 sm:size-14" style={{ left: drag.x, top: drag.y }}>
          {(() => { const t = rackById.get(drag.tileId)!; const p = placed.find((x) => x.tileId === t.id);
            return <Tile face={t.face} kind={t.kind} points={t.points} value={p?.value} selected />; })()}
        </div>
      )}

      <SymbolPicker
        tile={picker ? rackById.get(picker.tileId) ?? null : null}
        onCancel={() => setPicker(null)}
        onPick={(v) => { const p = picker!; setPlaced((ps) => [...ps.filter((x) => x.tileId !== p.tileId), { ...p, value: v }]); setPicker(null); }}
      />
      <SubmitDialog open={dialog === "submit"} onOpenChange={(o) => setDialog(o ? "submit" : null)} preview={preview} autoScore={autoScore} challengeMode={challengeMode} onConfirm={submit} />
      <ConfirmDialog open={dialog === "pass"} onOpenChange={(o) => setDialog(o ? "pass" : null)} title="Pass this turn?" description={`You score nothing this turn. The game ends after ${view.rules.endGame.consecutivePassesToEnd} consecutive passes (currently ${view.consecutivePasses}).`} confirmLabel="Pass" onConfirm={() => { recall(); void run({ type: "pass" }); }} />
      <ConfirmDialog open={dialog === "resign"} onOpenChange={(o) => setDialog(o ? "resign" : null)} title="Resign the game?" description="Your opponent will be declared the winner." confirmLabel="Resign" tone="danger" onConfirm={() => void run({ type: "resign" })} />
      <ExchangeDialog open={dialog === "exchange"} onOpenChange={(o) => setDialog(o ? "exchange" : null)} rack={rack} bagCount={view.bagCount} minBag={view.rules.exchangeMinBag}
        onConfirm={(ids) => { setDialog(null); recall(); void run({ type: "exchange", tileIds: ids }, "Tiles exchanged"); }} />
      <DrawDialog open={dialog === "draw"} onOpenChange={(o) => setDialog(o ? "draw" : null)} max={view.rules.rackSize - rack.length} bagCount={view.bagCount}
        onConfirm={(n) => { setDialog(null); void run({ type: "draw", count: n }); }} />
    </div>
  );
}
