"use client";
import { useMemo, useState } from "react";
import { ShoppingBag } from "lucide-react";
import type { GameView } from "@/lib/game-engine";
import { unseenTiles } from "@/lib/game-engine/unseen";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tile } from "@/components/tile/tile";
import { useI18n } from "@/lib/i18n/client";
import type { MsgKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const GROUPS: { title: MsgKey; match: (face: string) => boolean }[] = [
  { title: "unseen.numbers", match: (f) => /^\d$/.test(f) },
  { title: "unseen.bigNumbers", match: (f) => /^\d\d$/.test(f) },
  { title: "unseen.signs", match: (f) => !/^\d+$/.test(f) },
];

/** "63 in bag" button that opens the tile-tracking sheet (bag + opponent rack combined). */
export function UnseenTilesButton({ view, mySide }: { view: GameView; mySide: number | null }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const { entries, total } = useMemo(() => unseenTiles(view, mySide), [view, mySide]);
  const oppTiles = view.sides.filter((s) => s.index !== mySide).reduce((n, s) => n + s.rackCount, 0);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted transition hover:bg-[#eef0f4] hover:text-ink"
        data-testid="bag-count"
        aria-label={t("unseen.aria")}
      >
        <ShoppingBag className="size-3.5" />{t("unseen.inBag", { n: view.bagCount })} <span className="text-primary">· {t("unseen.view")}</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>{t("unseen.title")}</DialogTitle>
          <DialogDescription>
            {mySide !== null
              ? t("unseen.descPlayer", { total, bag: view.bagCount, opp: oppTiles })
              : t("unseen.descSpectator", { total, bag: view.bagCount, opp: oppTiles })}
          </DialogDescription>
          <div className="mt-4 space-y-4" data-testid="unseen-tiles">
            {GROUPS.map((g) => (
              <div key={g.title}>
                <p className="mb-2 text-xs font-semibold text-muted">{t(g.title)}</p>
                <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                  {entries.filter((e) => g.match(e.def.face)).map((e) => (
                    <div key={e.def.face} className={cn("flex flex-col items-center gap-1", e.unseen === 0 && "opacity-30")} data-face-count={`${e.def.face}:${e.unseen}`}>
                      <div className="aspect-square w-full max-w-11"><Tile variant="mini" face={e.def.face} kind={e.def.kind} points={e.def.points} /></div>
                      <span className={cn("text-xs font-semibold tabular", e.unseen === 0 ? "text-muted" : "text-ink")}>×{e.unseen}<span className="font-normal text-muted">/{e.def.count}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-muted">{t("unseen.note")}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
