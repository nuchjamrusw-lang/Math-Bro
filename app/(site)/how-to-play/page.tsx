import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tile } from "@/components/tile/tile";
import { BoardLegend } from "@/components/board/board";
import { STANDARD_TILE_SET } from "@/lib/game-rules/tiles";
import { DEFAULT_RULES } from "@/lib/game-rules/config";

export const metadata = { title: "How to Play" };

const SECTIONS: { title: string; th: string; items: string[] }[] = [
  { title: "Goal", th: "เป้าหมาย", items: [
    "Build correct equations on the 15×15 board, crossword-style, and score more points than your opponent.",
    "Every line of two or more touching tiles must be a correct equation.",
  ] },
  { title: "Starting the game", th: "การเริ่มเกม", items: [
    "Each side draws one tile. The tile closest to 20 starts (BLANK beats everything; signs rank below 0). Ties redraw.",
    "The drawn tiles go back in the bag, then each side gets 8 tiles — the starter draws first.",
    "The first equation must be horizontal or vertical and cover the ★ center square.",
  ] },
  { title: "Making a move", th: "การลงเบี้ย", items: [
    "Place one or more tiles in a single row or column with no gaps (gaps may be filled by tiles already on the board).",
    "At least one new tile must touch a tile already on the board (up, down, left or right).",
    "All equations created or extended by the move must be correct — if one is wrong, the whole move is wrong.",
  ] },
  { title: "Math rules", th: "หลักคณิตศาสตร์", items: [
    "× and ÷ before + and −; same precedence evaluates left to right. 4 + 4 × 3 = 16.",
    "Join 2–3 single-digit tiles into one number (1 8 5 → 185). No leading zeros (07 is illegal). Tiles 10–20 cannot be joined with other numbers.",
    "A minus sign may make the first number of a side negative (−6 = 4 − 10). No +7, no −0, no two signs side by side.",
    "Never divide by 0 (0 ÷ 5 = 0 is fine). Fractions are exact: 2 ÷ 4 = 4 ÷ 8.",
    "Equations may chain several = signs (2 + 2 = 4 = 1 + 3).",
    "BLANK can be any number or sign (choose before playing) and is always worth 0. ± and ×/÷ tiles choose one of their two signs.",
  ] },
  { title: "Scoring", th: "การคิดคะแนน", items: [
    "Each tile has its own points. New tiles on 2×/3× Piece squares multiply that tile.",
    "Sum all tiles in the equation, then multiply by any 2×/3× Equation squares covered by new tiles.",
    "Premiums only count the first time a tile is placed on them.",
    `Use all 8 tiles in one move for a BINGO: +${DEFAULT_RULES.scoring.bingoBonus} points.`,
  ] },
  { title: "Exchange, pass & challenge", th: "เปลี่ยนเบี้ย ผ่าน ชาเล้นจ์", items: [
    `Exchange 1–8 tiles instead of playing (needs at least ${DEFAULT_RULES.exchangeMinBag} tiles in the bag). It costs your turn.`,
    `The game ends after ${DEFAULT_RULES.endGame.consecutivePassesToEnd} consecutive passes; each side loses its remaining rack points.`,
    "Challenge ON: after a move, the opponent may challenge before touching their rack. Correct move → challenger loses the turn. Wrong move → tiles return and score 0. The losing side may request a re-challenge (referee or system second check).",
    "Strict mode: the system rejects incorrect equations before they are played.",
  ] },
  { title: "Time & end of game", th: "เวลาและการจบเกม", items: [
    "Chess clock per side (5, 12, 22 minutes or custom). Overtime costs 10 points per started minute (1 s → −10, 61 s → −20).",
    "When a player uses all their tiles and the bag is empty, they gain twice the opponent's remaining rack points (BLANK = 0).",
  ] },
];

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">How to play A-Math</h1>
      <p className="mt-2 text-muted">Everything you need to play your first game on Math&amp;Bro.</p>
      <div className="mt-8 space-y-4">
        {SECTIONS.map((s) => (
          <Card key={s.title} className="p-6">
            <h2 className="font-semibold">{s.title} <span className="ml-1 text-sm font-normal text-muted">{s.th}</span></h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink/85">
              {s.items.map((i) => <li key={i}>{i}</li>)}
            </ul>
          </Card>
        ))}
        <Card className="p-6">
          <h2 className="font-semibold">Board squares</h2>
          <BoardLegend className="mt-3" />
        </Card>
        <Card className="p-6">
          <h2 className="font-semibold">The 100 tiles</h2>
          <p className="mt-1 text-sm text-muted">Small number = points · ×N = how many in the bag.</p>
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
        <Button asChild size="lg"><Link href="/practice">Try practice mode</Link></Button>
        <Button asChild size="lg" variant="secondary"><Link href="/play">Play online</Link></Button>
      </div>
    </div>
  );
}
