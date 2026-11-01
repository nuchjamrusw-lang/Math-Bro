"use client";
import { ShieldAlert, ShieldCheck, Gavel, Check, Scale, Hourglass } from "lucide-react";
import type { GameView } from "@/lib/game-engine";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { ERROR_TITLES } from "@/lib/math-validator/errors";
import { displaySymbol } from "@/components/tile/tile";
import { useState } from "react";

const fmtEq = (t: string) => t.split(" ").map(displaySymbol).join(" ");

/**
 * Challenge workflow UI:
 *  CHALLENGE_WINDOW → opponent may Challenge or Accept
 *  CHALLENGE_RESULT → first ruling shown; the losing side may Re-challenge or accept
 *  REFEREE_REVIEW   → referee decides
 */
export function ChallengePanel({ view, mySide, isReferee, now, onAction, busy }: {
  view: GameView; mySide: number | null; isReferee: boolean; now: number; busy?: boolean;
  onAction: (a: { type: "challenge" } | { type: "accept" } | { type: "rechallenge" } | { type: "acceptRuling" } | { type: "referee"; valid: boolean }) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const p = view.pending;
  if (view.phase === "CHALLENGE_WINDOW" && p) {
    const mine = p.sideIndex === mySide;
    const reviewer = mySide !== null && !mine;
    return (
      <div className="rounded-2xl border border-warning/40 bg-warning-soft/60 p-4 text-sm" data-testid="challenge-window">
        <p className="flex items-center gap-2 font-semibold"><ShieldAlert className="size-4 text-warning" />
          {mine ? "Waiting for your opponent to review your move" : `${view.sides[p.sideIndex].name} played — review the move`}
        </p>
        <div className="mt-2 space-y-1">
          {p.equations.map((e, i) => <p key={i} className="font-mono font-semibold">{fmtEq(e.text)}</p>)}
        </div>
        <p className="mt-1 text-xs text-muted">{view.rules.scoreManagement === "AUTO_SCORE_AUTO_TILES" || view.rules.scoreManagement === "AUTO_SCORE_ONLY" ? `Score if it stands: +${p.points}` : `Declared score: +${p.points}`}</p>
        {reviewer && (
          <>
            <p className="mt-2 text-xs text-ink/70">Challenge before you touch your rack. Moving tiles counts as accepting.</p>
            <div className="mt-3 flex gap-2">
              <Button variant="warning" className="flex-1" onClick={() => setConfirm(true)} disabled={busy}><Gavel />Challenge</Button>
              <Button variant="secondary" className="flex-1" onClick={() => onAction({ type: "accept" })} disabled={busy}><Check />Accept move</Button>
            </div>
          </>
        )}
        <Dialog open={confirm} onOpenChange={setConfirm}>
          <DialogContent>
            <DialogTitle>Challenge this move?</DialogTitle>
            <DialogDescription>The clock stops and the equations are checked. If the move is correct, you lose your turn. If it is wrong, the tiles are taken back and your opponent scores nothing.</DialogDescription>
            <div className="mt-4 space-y-1 rounded-xl bg-[#f6f7f9] p-3">{p.equations.map((e, i) => <p key={i} className="font-mono font-semibold">{fmtEq(e.text)}</p>)}</div>
            <DialogFooter>
              <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
              <Button variant="warning" onClick={() => { setConfirm(false); onAction({ type: "challenge" }); }}>Yes, challenge</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const c = view.challenge;
  if ((view.phase === "CHALLENGE_RESULT" || view.phase === "REFEREE_REVIEW") && c) {
    const valid = c.first.valid;
    const loser = valid ? c.challengerSide : c.challengedSide;
    const iLost = mySide === loser;
    const secs = c.rechallengeDeadline ? Math.max(0, Math.ceil((c.rechallengeDeadline - now) / 1000)) : 0;
    return (
      <div className={`rounded-2xl border p-4 text-sm ${valid ? "border-success/30 bg-success-soft/60" : "border-error/30 bg-error-soft/60"}`} data-testid="challenge-result">
        <p className="flex items-center gap-2 font-semibold">
          {valid ? <ShieldCheck className="size-4 text-success" /> : <ShieldAlert className="size-4 text-error" />}
          {valid ? "Challenge failed — the equation is correct" : "Challenge upheld — the equation is wrong"}
        </p>
        <div className="mt-2 space-y-1">
          {c.first.equations.map((e, i) => (
            <p key={i} className="font-mono"><span className={e.valid ? "text-success" : "text-error"}>{e.valid ? "✓" : "✗"}</span> {fmtEq(e.text)}
              {e.sideValues.length > 1 && <span className="ml-2 text-xs text-muted">({e.sideValues.join(e.valid ? " = " : " ≠ ")})</span>}
            </p>
          ))}
        </div>
        {c.first.errors.map((e, i) => <p key={i} className="mt-1 text-xs text-error">{ERROR_TITLES[e.code].en}: {e.message}</p>)}
        <p className="mt-2 text-xs text-muted">{valid ? `${view.sides[c.challengerSide].name} will lose the turn.` : `${view.sides[c.challengedSide].name}'s tiles return to the rack.`}</p>
        {view.phase === "CHALLENGE_RESULT" && (
          iLost ? (
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => onAction({ type: "rechallenge" })} disabled={busy}><Scale />Re-challenge</Button>
              <Button className="flex-1" onClick={() => onAction({ type: "acceptRuling" })} disabled={busy}>Accept ({secs}s)</Button>
            </div>
          ) : <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><Hourglass className="size-3.5" />Re-challenge window: {secs}s</p>
        )}
        {view.phase === "REFEREE_REVIEW" && (
          isReferee ? (
            <div className="mt-3">
              <p className="mb-2 text-xs font-semibold">Referee ruling (second check)</p>
              <div className="flex gap-2">
                <Button variant="success" className="flex-1" onClick={() => onAction({ type: "referee", valid: true })} disabled={busy}>Equation valid</Button>
                <Button variant="danger" className="flex-1" onClick={() => onAction({ type: "referee", valid: false })} disabled={busy}>Equation invalid</Button>
              </div>
            </div>
          ) : <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold"><Gavel className="size-3.5" />Re-challenge requested — waiting for the referee…</p>
        )}
      </div>
    );
  }
  return null;
}
