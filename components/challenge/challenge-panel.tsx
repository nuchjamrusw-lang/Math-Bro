"use client";
import { ShieldAlert, ShieldCheck, Gavel, Check, Scale, Hourglass } from "lucide-react";
import { useState } from "react";
import type { GameView } from "@/lib/game-engine";
import { isAutoScore } from "@/lib/game-rules/config";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { displaySymbol } from "@/components/tile/tile";
import { useI18n } from "@/lib/i18n/client";
import { validationDetail, validationTitle } from "@/lib/i18n/format";

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
  const { t, td } = useI18n();
  const [confirm, setConfirm] = useState(false);
  const p = view.pending;
  if (view.phase === "CHALLENGE_WINDOW" && p) {
    const mine = p.sideIndex === mySide;
    const reviewer = mySide !== null && !mine;
    return (
      <div className="rounded-2xl border border-warning/40 bg-warning-soft/60 p-4 text-sm" data-testid="challenge-window">
        <p className="flex items-center gap-2 font-semibold"><ShieldAlert className="size-4 shrink-0 text-warning" />
          {mine ? t("ch.waitingReview") : t("ch.reviewMove", { name: view.sides[p.sideIndex].name })}
        </p>
        <div className="mt-2 space-y-1">
          {p.equations.map((e, i) => <p key={i} className="font-mono font-semibold">{fmtEq(e.text)}</p>)}
        </div>
        <p className="mt-1 text-xs text-muted">{isAutoScore(view.rules) ? t("ch.scoreIfStands", { n: p.points }) : t("ch.declared", { n: p.points })}</p>
        {reviewer && (
          <>
            <p className="mt-2 text-xs text-ink/70">{t("ch.hint")}</p>
            <div className="mt-3 flex gap-2">
              <Button variant="warning" className="flex-1" onClick={() => setConfirm(true)} disabled={busy} data-testid="challenge-btn"><Gavel />{t("ch.challenge")}</Button>
              <Button variant="secondary" className="flex-1" onClick={() => onAction({ type: "accept" })} disabled={busy} data-testid="accept-move-btn"><Check />{t("ch.acceptMove")}</Button>
            </div>
          </>
        )}
        <Dialog open={confirm} onOpenChange={setConfirm}>
          <DialogContent>
            <DialogTitle>{t("ch.confirmTitle")}</DialogTitle>
            <DialogDescription>{t("ch.confirmDesc")}</DialogDescription>
            <div className="mt-4 space-y-1 rounded-xl bg-[#f6f7f9] p-3">{p.equations.map((e, i) => <p key={i} className="font-mono font-semibold">{fmtEq(e.text)}</p>)}</div>
            <DialogFooter>
              <DialogClose asChild><Button variant="secondary">{t("ch.cancel")}</Button></DialogClose>
              <Button variant="warning" onClick={() => { setConfirm(false); onAction({ type: "challenge" }); }} data-testid="confirm-challenge">{t("ch.yes")}</Button>
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
          {valid ? <ShieldCheck className="size-4 shrink-0 text-success" /> : <ShieldAlert className="size-4 shrink-0 text-error" />}
          {valid ? t("ch.failed") : t("ch.upheld")}
        </p>
        <div className="mt-2 space-y-1">
          {c.first.equations.map((e, i) => (
            <p key={i} className="font-mono"><span className={e.valid ? "text-success" : "text-error"}>{e.valid ? "✓" : "✗"}</span> {fmtEq(e.text)}
              {e.sideValues.length > 1 && <span className="ml-2 text-xs text-muted">({e.sideValues.join(e.valid ? " = " : " ≠ ")})</span>}
            </p>
          ))}
        </div>
        {c.first.errors.map((e, i) => <p key={i} className="mt-1 text-xs text-error">{validationTitle(td, e)}: {validationDetail(td, e)}</p>)}
        <p className="mt-2 text-xs text-muted">{valid ? t("ch.loseTurn", { name: view.sides[c.challengerSide].name }) : t("ch.tilesReturn", { name: view.sides[c.challengedSide].name })}</p>
        {view.phase === "CHALLENGE_RESULT" && (
          iLost ? (
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => onAction({ type: "rechallenge" })} disabled={busy}><Scale />{t("ch.rechallenge")}</Button>
              <Button className="flex-1" onClick={() => onAction({ type: "acceptRuling" })} disabled={busy} data-testid="accept-ruling">{t("ch.acceptSecs", { n: secs })}</Button>
            </div>
          ) : <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><Hourglass className="size-3.5" />{t("ch.window", { n: secs })}</p>
        )}
        {view.phase === "REFEREE_REVIEW" && (
          isReferee ? (
            <div className="mt-3">
              <p className="mb-2 text-xs font-semibold">{t("ch.refereeRuling")}</p>
              <div className="flex gap-2">
                <Button variant="success" className="flex-1" onClick={() => onAction({ type: "referee", valid: true })} disabled={busy}>{t("ch.valid")}</Button>
                <Button variant="danger" className="flex-1" onClick={() => onAction({ type: "referee", valid: false })} disabled={busy}>{t("ch.invalid")}</Button>
              </div>
            </div>
          ) : <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold"><Gavel className="size-3.5" />{t("ch.waitReferee")}</p>
        )}
      </div>
    );
  }
  return null;
}
