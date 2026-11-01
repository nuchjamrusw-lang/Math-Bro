"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Tile, displaySymbol } from "@/components/tile/tile";
import type { Tile as TileT } from "@/lib/tile-manager";
import { getTileDefinition } from "@/lib/game-rules/tiles";
import type { MovePreview } from "@/lib/game-engine";
import { cn } from "@/lib/utils";

/** Choose the value of a BLANK or a +/- , ×/÷ tile before it is played. */
export function SymbolPicker({ tile, onPick, onCancel }: { tile: TileT | null; onPick: (v: string) => void; onCancel: () => void }) {
  const options = tile ? getTileDefinition(tile.face).options : [];
  return (
    <Dialog open={!!tile} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogTitle>{tile?.kind === "blank" ? "Choose a value for BLANK" : `Choose ${tile?.face === "+/-" ? "+ or −" : "× or ÷"}`}</DialogTitle>
        <DialogDescription>{tile?.kind === "blank" ? "A blank can be any number or sign, but it still scores 0 points." : "This tile can act as either sign."}</DialogDescription>
        <div className={cn("mt-4 grid gap-2", options.length > 4 ? "grid-cols-6" : "grid-cols-2")}>
          {options.map((o) => (
            <button key={o} onClick={() => onPick(o)} className="aspect-square cursor-pointer rounded-xl transition hover:scale-105" aria-label={`Use ${o}`}>
              <Tile variant="mini" face={tile!.face} kind={tile!.kind} points={0} value={o} />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ExchangeDialog({ open, onOpenChange, rack, bagCount, minBag, onConfirm }: {
  open: boolean; onOpenChange: (o: boolean) => void; rack: TileT[]; bagCount: number; minBag: number; onConfirm: (ids: string[]) => void;
}) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  useEffect(() => { if (open) setSel(new Set()); }, [open]);
  const allowed = bagCount >= minBag;
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Exchange tiles</DialogTitle>
        <DialogDescription>Pick 1–8 tiles to swap with the bag. You will lose this turn.</DialogDescription>
        {!allowed && <p className="mt-3 rounded-lg bg-error-soft px-3 py-2 text-sm text-error">Only {bagCount} tiles left in the bag — exchanging needs at least {minBag}.</p>}
        <div className="mt-4 grid grid-cols-8 gap-1.5">
          {rack.map((t) => (
            <button key={t.id} disabled={!allowed} onClick={() => toggle(t.id)} className={cn("aspect-square cursor-pointer rounded-lg transition", sel.has(t.id) && "-translate-y-1")}>
              <Tile variant="mini" face={t.face} kind={t.kind} points={t.points} selected={sel.has(t.id)} />
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setSel(new Set(rack.map((t) => t.id)))} disabled={!allowed}>Select all</Button>
          <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
          <Button disabled={!allowed || sel.size === 0 || sel.size > bagCount} onClick={() => onConfirm([...sel])}>Exchange {sel.size || ""}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SubmitDialog({ open, onOpenChange, preview, autoScore, challengeMode, onConfirm }: {
  open: boolean; onOpenChange: (o: boolean) => void; preview: MovePreview | null; autoScore: boolean; challengeMode: boolean; onConfirm: (declared: number | null) => void;
}) {
  const [score, setScore] = useState("");
  useEffect(() => { if (open) setScore(""); }, [open]);
  const declared = Number(score);
  const manualOk = score !== "" && Number.isInteger(declared) && declared >= 0 && declared <= 2000;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Submit this move?</DialogTitle>
        <DialogDescription>{challengeMode ? "Your clock stops and your opponent can review or challenge it." : "Your move will be checked and scored, then your turn ends."}</DialogDescription>
        <div className="mt-4 space-y-1 rounded-xl bg-[#f6f7f9] p-3">
          {preview?.equations.map((e, i) => <p key={i} className="font-mono font-semibold">{e.text.split(" ").map(displaySymbol).join(" ")}</p>)}
        </div>
        {autoScore ? (
          <p className="mt-3 text-sm">Projected score: <span className="font-bold text-primary">+{preview?.score?.total ?? 0}</span>{preview?.score?.bingo && <span className="ml-2 font-semibold text-success">(incl. Bingo +40)</span>}</p>
        ) : (
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="declared">Score for this move (manual scoring)</Label>
            <Input id="declared" inputMode="numeric" value={score} onChange={(e) => setScore(e.target.value.replace(/[^0-9]/g, ""))} placeholder="e.g. 24" autoFocus />
            <p className="text-xs text-muted">Count the points yourself — including premiums and bingo. The score is recorded as entered.</p>
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild><Button variant="secondary">Keep editing</Button></DialogClose>
          <Button disabled={!autoScore && !manualOk} onClick={() => onConfirm(autoScore ? null : declared)} data-testid="confirm-submit">Confirm move</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, tone = "primary", onConfirm }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description: string; confirmLabel: string; tone?: "primary" | "danger"; onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <DialogFooter>
          <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
          <Button variant={tone} onClick={() => { onOpenChange(false); onConfirm(); }}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DrawDialog({ open, onOpenChange, max, bagCount, onConfirm }: { open: boolean; onOpenChange: (o: boolean) => void; max: number; bagCount: number; onConfirm: (n: number) => void }) {
  const limit = Math.min(max, bagCount);
  const [n, setN] = useState(limit);
  useEffect(() => { if (open) setN(limit); }, [open, limit]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogTitle>Draw tiles</DialogTitle>
        <DialogDescription>Manual tile management: draw tiles from the bag yourself. {bagCount} left in the bag.</DialogDescription>
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from({ length: limit }, (_, i) => i + 1).map((k) => (
            <Button key={k} variant={k === n ? "primary" : "secondary"} size="sm" onClick={() => setN(k)}>{k}</Button>
          ))}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
          <Button disabled={limit < 1} onClick={() => onConfirm(n)}>Draw {n}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
