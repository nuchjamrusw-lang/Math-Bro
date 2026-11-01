"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { RotateCcw, Eye, EyeOff } from "lucide-react";
import { GameEngine, GameError } from "@/lib/game-engine";
import type { GameAction, Ack } from "@/lib/protocol";
import { buildRules, type GameRulesConfig } from "@/lib/game-rules/config";
import { GameView } from "./game-view";
import { ResultScreen } from "./result-screen";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

/** Pass-and-play: the full engine runs in the browser; the rack shown is the side to move. */
export function LocalGame() {
  const [setup, setSetup] = useState<{ names: [string, string]; rules: GameRulesConfig } | null>(null);
  if (!setup) return <LocalSetup onStart={setSetup} />;
  return <LocalMatch key={JSON.stringify(setup)} names={setup.names} rules={setup.rules} onNew={() => setSetup(null)} />;
}

function LocalSetup({ onStart }: { onStart: (s: { names: [string, string]; rules: GameRulesConfig }) => void }) {
  const [a, setA] = useState("Player 1");
  const [b, setB] = useState("Player 2");
  const [validation, setValidation] = useState<"STRICT" | "CHALLENGE">("STRICT");
  const [time, setTime] = useState<"BLITZ" | "RAPID" | "STANDARD">("STANDARD");
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Logo />
      <h1 className="mt-8 text-2xl font-bold tracking-tight">Practice mode</h1>
      <p className="mt-1 text-sm text-muted">Two players share this device. The rack shown always belongs to the player whose turn it is.</p>
      <Card className="mt-6 space-y-5 p-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label htmlFor="pa">Player A</Label><Input id="pa" value={a} onChange={(e) => setA(e.target.value.slice(0, 20))} /></div>
          <div className="space-y-1.5"><Label htmlFor="pb">Player B</Label><Input id="pb" value={b} onChange={(e) => setB(e.target.value.slice(0, 20))} /></div>
        </div>
        <div className="space-y-2"><Label>Validation</Label>
          <Segmented name="Validation" cols={2} value={validation} onChange={setValidation} options={[
            { value: "STRICT", label: "Strict", hint: "Learn: only correct moves" },
            { value: "CHALLENGE", label: "Challenge", hint: "Practice challenging" },
          ]} />
        </div>
        <div className="space-y-2"><Label>Time per side</Label>
          <Segmented name="Time" cols={3} value={time} onChange={setTime} options={[
            { value: "BLITZ", label: "5 min" }, { value: "RAPID", label: "12 min" }, { value: "STANDARD", label: "22 min" },
          ]} />
        </div>
        <Button size="lg" className="w-full" data-testid="start-practice"
          onClick={() => onStart({ names: [a || "Player 1", b || "Player 2"], rules: buildRules({ validation, time: { mode: time } }) })}>Start practice game</Button>
      </Card>
    </div>
  );
}

function LocalMatch({ names, rules, onNew }: { names: [string, string]; rules: GameRulesConfig; onNew: () => void }) {
  const engine = useRef<GameEngine>(null as unknown as GameEngine);
  if (!engine.current) {
    engine.current = GameEngine.create({
      id: "local", rules,
      sides: names.map((n, i) => ({ name: n, members: [{ id: `local-${i}`, name: n }] })),
    });
    engine.current.start(Date.now());
  }
  const [version, setVersion] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [showResult, setShowResult] = useState(true);
  const e = engine.current;

  // Hot-seat: show the rack of whoever must act now (the challenge loser during a re-challenge window).
  const actingSide = e.state.phase === "CHALLENGE_RESULT" && e.state.challenge ? e.challengeLoser(e.state.challenge) : e.state.turn;
  const view = useMemo(() => e.view(actingSide, Date.now()), [version, actingSide]); // eslint-disable-line react-hooks/exhaustive-deps
  const prevTurn = useRef(actingSide);
  useEffect(() => {
    if (prevTurn.current !== actingSide && e.state.phase !== "FINISHED") setHidden(true);
    prevTurn.current = actingSide;
  }, [actingSide, e.state.phase]);

  useEffect(() => {
    const t = setInterval(() => { if (e.tick(Date.now())) setVersion((v) => v + 1); }, 500);
    return () => clearInterval(t);
  }, [e]);

  const act = useCallback(async (a: GameAction): Promise<Ack> => {
    const now = Date.now();
    const side = actingSide;
    const pid = `local-${side}`;
    try {
      switch (a.type) {
        case "play": e.submitMove(side, pid, a.placements as never, now, a.declaredScore ?? null); break;
        case "pass": e.pass(side, pid, now); break;
        case "exchange": e.exchange(side, pid, a.tileIds, now); break;
        case "accept": e.accept(side, now); break;
        case "challenge": e.challenge(side, pid, now); break;
        case "rechallenge": e.rechallenge(side, pid, now); break;
        case "acceptRuling": e.acceptChallengeResult(side, now); break;
        case "draw": e.drawManual(side, pid, a.count, now); break;
        case "resign": e.resign(side, pid, now); break;
        default: return { ok: false, error: "Not available in practice mode" };
      }
      setVersion((v) => v + 1);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof GameError ? err.message : String(err) };
    }
  }, [e, actingSide]);

  const header = (
    <header className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-3"><Logo /><Badge tone="primary">Practice</Badge></div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => setHidden((h) => !h)}>{hidden ? <Eye /> : <EyeOff />}{hidden ? "Show rack" : "Hide rack"}</Button>
        <Button variant="secondary" size="sm" onClick={onNew}><RotateCcw />New game</Button>
        <Button variant="ghost" size="sm" asChild><Link href="/play">Play online</Link></Button>
      </div>
    </header>
  );

  return (
    <>
      <GameView controller={{ mode: "local", view, mySide: actingSide, isReferee: false, act }} header={header} />
      {hidden && view.phase !== "FINISHED" && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-bg/95 backdrop-blur" data-testid="handoff">
          <div className="text-center">
            <p className="text-sm text-muted">Pass the device to</p>
            <p className="mt-1 text-3xl font-bold">{view.sides[actingSide].name}</p>
            <Button size="lg" className="mt-6" onClick={() => setHidden(false)}>I&apos;m ready — show my rack</Button>
          </div>
        </div>
      )}
      {view.phase === "FINISHED" && showResult && (
        <ResultScreen view={view} mySide={null} onPlayAgain={onNew} onClose={() => setShowResult(false)} />
      )}
    </>
  );
}
