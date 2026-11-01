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
import { useI18n } from "@/lib/i18n/client";

/** Choose the value of a BLANK or a +/- , ×/÷ tile before it is played. */
export function SymbolPicker({ tile, onPick, onCancel }: { tile: TileT | null; onPick: (v: string) => void; onCancel: () => void }) {
  const { t } = useI18n();
  const options = tile ? getTileDefinition(tile.face).options : [];
  return (
    <Dialog open={!!tile} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogTitle>{tile?.kind === "blank" ? t("dlg.chooseBlank") : tile?.face === "+/-" ? t("dlg.choosePM") : t("dlg.chooseTD")}</DialogTitle>
        <DialogDescription>{tile?.kind === "blank" ? t("dlg.blankDesc") : t("dlg.choiceDesc")}</DialogDescription>
        <div className={cn("mt-4 grid gap-2", options.length > 4 ? "grid-cols-6" : "grid-cols-2")}>
          {options.map((o) => (
            <button key={o} onClick={() => onPick(o)} className="aspect-square cursor-pointer rounded-xl transition hover:scale-105" aria-label={`Use ${o}`} title={t("dlg.use", { v: o })}>
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
  const { t } = useI18n();
  const [sel, setSel] = useState<Set<string>>(new Set());
  useEffect(() => { if (open) setSel(new Set()); }, [open]);
  const allowed = bagCount >= minBag;
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{t("ex.title")}</DialogTitle>
        <DialogDescription>{t("ex.desc")}</DialogDescription>
        {!allowed && <p className="mt-3 rounded-lg bg-error-soft px-3 py-2 text-sm text-error">{t("ex.bagLow", { n: bagCount, min: minBag })}</p>}
        <div className="mt-4 grid grid-cols-8 gap-1.5">
          {rack.map((t) => (
            <button key={t.id} disabled={!allowed} onClick={() => toggle(t.id)} className={cn("aspect-square cursor-pointer rounded-lg transition", sel.has(t.id) && "-translate-y-1")}>
              <Tile variant="mini" face={t.face} kind={t.kind} points={t.points} selected={sel.has(t.id)} />
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setSel(new Set(rack.map((t) => t.id)))} disabled={!allowed} data-testid="exchange-select-all">{t("ex.selectAll")}</Button>
          <DialogClose asChild><Button variant="secondary">{t("dlg.cancel")}</Button></DialogClose>
          <Button disabled={!allowed || sel.size === 0 || sel.size > bagCount} onClick={() => onConfirm([...sel])} data-testid="exchange-confirm">{t("ex.btn", { n: sel.size || "" })}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SubmitDialog({ open, onOpenChange, preview, autoScore, challengeMode, onConfirm }: {
  open: boolean; onOpenChange: (o: boolean) => void; preview: MovePreview | null; autoScore: boolean; challengeMode: boolean; onConfirm: (declared: number | null) => void;
}) {
  const { t } = useI18n();
  const [score, setScore] = useState("");
  useEffect(() => { if (open) setScore(""); }, [open]);
  const declared = Number(score);
  const manualOk = score !== "" && Number.isInteger(declared) && declared >= 0 && declared <= 2000;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{t("sub.title")}</DialogTitle>
        <DialogDescription>{challengeMode ? t("sub.descChallenge") : t("sub.descStrict")}</DialogDescription>
        <div className="mt-4 space-y-1 rounded-xl bg-[#f6f7f9] p-3">
          {preview?.equations.map((e, i) => <p key={i} className="font-mono font-semibold">{e.text.split(" ").map(displaySymbol).join(" ")}</p>)}
        </div>
        {autoScore ? (
          <p className="mt-3 text-sm">{t("sub.projected")} <span className="font-bold text-primary">+{preview?.score?.total ?? 0}</span>{preview?.score?.bingo && <span className="ml-2 font-semibold text-success">{t("sub.inclBingo")}</span>}</p>
        ) : (
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="declared">{t("sub.manualLabel")}</Label>
            <Input id="declared" inputMode="numeric" value={score} onChange={(e) => setScore(e.target.value.replace(/[^0-9]/g, ""))} placeholder={t("sub.manualPlaceholder")} autoFocus />
            <p className="text-xs text-muted">{t("sub.manualHelp")}</p>
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild><Button variant="secondary">{t("sub.keepEditing")}</Button></DialogClose>
          <Button disabled={!autoScore && !manualOk} onClick={() => onConfirm(autoScore ? null : declared)} data-testid="confirm-submit">{t("sub.confirm")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, tone = "primary", onConfirm }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description: string; confirmLabel: string; tone?: "primary" | "danger"; onConfirm: () => void;
}) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <DialogFooter>
          <DialogClose asChild><Button variant="secondary">{t("dlg.cancel")}</Button></DialogClose>
          <Button variant={tone} onClick={() => { onOpenChange(false); onConfirm(); }} data-testid="confirm-dialog-ok">{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DrawDialog({ open, onOpenChange, max, bagCount, onConfirm }: { open: boolean; onOpenChange: (o: boolean) => void; max: number; bagCount: number; onConfirm: (n: number) => void }) {
  const { t } = useI18n();
  const limit = Math.min(max, bagCount);
  const [n, setN] = useState(limit);
  useEffect(() => { if (open) setN(limit); }, [open, limit]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogTitle>{t("draw.title")}</DialogTitle>
        <DialogDescription>{t("draw.desc", { n: bagCount })}</DialogDescription>
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from({ length: limit }, (_, i) => i + 1).map((k) => (
            <Button key={k} variant={k === n ? "primary" : "secondary"} size="sm" onClick={() => setN(k)}>{k}</Button>
          ))}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="secondary">{t("dlg.cancel")}</Button></DialogClose>
          <Button disabled={limit < 1} onClick={() => onConfirm(n)}>{t("draw.btn", { n })}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
