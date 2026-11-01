"use client";
import { useMemo, useState } from "react";
import { ShoppingBag } from "lucide-react";
import type { GameView } from "@/lib/game-engine";
import { unseenTiles } from "@/lib/game-engine/unseen";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tile } from "@/components/tile/tile";
import { cn } from "@/lib/utils";

const GROUPS: { title: string; match: (face: string) => boolean }[] = [
  { title: "Numbers 0–9", match: (f) => /^\d$/.test(f) },
  { title: "Numbers 10–20", match: (f) => /^\d\d$/.test(f) },
  { title: "Signs & blank", match: (f) => !/^\d+$/.test(f) },
];

/** "63 in bag" button that opens the tile-tracking sheet (bag + opponent rack combined). */
export function UnseenTilesButton({ view, mySide }: { view: GameView; mySide: number | null }) {
  const [open, setOpen] = useState(false);
  const { entries, total } = useMemo(() => unseenTiles(view, mySide), [view, mySide]);
  const opponents = view.sides.filter((s) => s.index !== mySide);
  const oppTiles = opponents.reduce((n, s) => n + s.rackCount, 0);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted transition hover:bg-[#eef0f4] hover:text-ink"
        data-testid="bag-count"
        aria-label="Show unseen tiles"
      >
        <ShoppingBag className="size-3.5" />{view.bagCount} in bag <span className="text-primary">· view</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Unseen tiles · เบี้ยที่ยังไม่เห็น</DialogTitle>
          <DialogDescription>
            {total} tiles you haven&apos;t seen: {view.bagCount} in the bag
            {mySide !== null ? ` + ${oppTiles} on your opponent's rack` : ` + ${oppTiles} on the players' racks`}.
            Tiles on the board and on your own rack are not counted.
          </DialogDescription>
          <div className="mt-4 space-y-4" data-testid="unseen-tiles">
            {GROUPS.map((g) => (
              <div key={g.title}>
                <p className="mb-2 text-xs font-semibold text-muted">{g.title}</p>
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
          <p className="mt-4 text-[11px] leading-relaxed text-muted">
            The exact bag is never shown, because it would reveal your opponent&apos;s rack. This list is what serious players track by hand.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
