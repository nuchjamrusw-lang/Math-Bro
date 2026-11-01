import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tile } from "@/components/tile/tile";
import { BoardLegend } from "@/components/board/board";
import { STANDARD_TILE_SET } from "@/lib/game-rules/tiles";
import { getLang } from "@/lib/i18n/server";
import { HOW_TO_PLAY } from "@/lib/i18n/how-to-play";

export const metadata = { title: "How to Play" };

export default async function Page() {
  const c = HOW_TO_PLAY[await getLang()];
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">{c.title}</h1>
      <p className="mt-2 text-muted">{c.subtitle}</p>
      <div className="mt-8 space-y-4">
        {c.sections.map((s) => (
          <Card key={s.title} className="p-6">
            <h2 className="font-semibold">{s.title}</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink/85">
              {s.items.map((i) => <li key={i}>{i}</li>)}
            </ul>
          </Card>
        ))}
        <Card className="p-6">
          <h2 className="font-semibold">{c.squares}</h2>
          <BoardLegend className="mt-3" />
        </Card>
        <Card className="p-6">
          <h2 className="font-semibold">{c.tiles}</h2>
          <p className="mt-1 text-sm text-muted">{c.tilesSub}</p>
          <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-8">
            {STANDARD_TILE_SET.map((d) => (
              <div key={d.face} className="flex flex-col items-center gap-1">
                <div className="size-12"><Tile face={d.face} kind={d.kind} points={d.points} /></div>
                <span className="text-[11px] text-muted">×{d.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="mt-8 flex gap-3">
        <Button asChild size="lg"><Link href="/practice">{c.tryPractice}</Link></Button>
        <Button asChild size="lg" variant="secondary"><Link href="/play">{c.playOnline}</Link></Button>
      </div>
    </div>
  );
}
