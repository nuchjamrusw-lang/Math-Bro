import Link from "next/link";
import { ArrowRight, Users, Zap, GraduationCap, Radio, Calculator, Gavel, Mic, History, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BoardPreview } from "@/components/landing/board-preview";
import { Avatar } from "@/components/layout/avatar";
import { leaderboard } from "@/lib/queries";

export const dynamic = "force-dynamic";

const MODES = [
  { icon: Users, title: "Play with Friends", desc: "Create a private room and share the code. 1 vs 1 or 2 vs 2.", href: "/play?tab=create", cta: "Create room" },
  { icon: Zap, title: "Quick Match", desc: "Get paired with another player automatically in seconds.", href: "/play?tab=quick", cta: "Find a match" },
  { icon: GraduationCap, title: "Practice Mode", desc: "Pass-and-play on one device to learn the rules at your pace.", href: "/practice", cta: "Start practice" },
];

const FEATURES = [
  { icon: Radio, title: "Real-time Multiplayer", desc: "Server-authoritative games that sync instantly and survive reconnects." },
  { icon: Calculator, title: "Automatic Scoring", desc: "Every premium, bingo and equation multiplier calculated — with a full breakdown." },
  { icon: Gavel, title: "Challenge System", desc: "Challenge, re-challenge and referee rulings, or play in Strict mode." },
  { icon: Mic, title: "Voice Communication", desc: "Talk to your opponent over peer-to-peer WebRTC voice." },
  { icon: History, title: "Match History & Replay", desc: "Step through every move of past games, frame by frame." },
];

export default async function Home() {
  const top = (await leaderboard(5)).slice(0, 5);
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <section className="grid items-center gap-10 py-12 md:py-20 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-muted">
            <span className="size-1.5 rounded-full bg-success" /> Online A-Math · Real-time
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[56px]">
            Ready to Make<br />Your <span className="text-primary">Move?</span>
          </h1>
          <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-muted">
            Math&amp;Bro is a competitive A-Math arena — build crossword-style equations on a 15×15 board, chain premiums,
            and out-think your opponent. <span className="text-ink/80">ต่อสมการ คิดไว เล่นฉลาด ท้าทายทุกตา</span>
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild><Link href="/play">Play Now <ArrowRight /></Link></Button>
            <Button size="lg" variant="secondary" asChild><Link href="/how-to-play">Learn How to Play</Link></Button>
          </div>
          <dl className="mt-10 flex gap-8 text-sm">
            <div><dt className="text-muted">Tiles</dt><dd className="text-xl font-bold">100</dd></div>
            <div><dt className="text-muted">Board</dt><dd className="text-xl font-bold">15 × 15</dd></div>
            <div><dt className="text-muted">Modes</dt><dd className="text-xl font-bold">1v1 · 2v2</dd></div>
          </dl>
        </div>
        <div className="relative mx-auto w-full max-w-[520px]">
          <div className="absolute -inset-6 -z-10 rounded-[40px] bg-primary-soft/60 blur-2xl" />
          <BoardPreview />
        </div>
      </section>

      <section className="py-10">
        <h2 className="text-2xl font-bold tracking-tight">Game modes</h2>
        <p className="mt-1 text-muted">Pick how you want to play.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {MODES.map((m) => (
            <Card key={m.title} className="group flex flex-col p-6 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
              <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary"><m.icon className="size-5" /></span>
              <h3 className="mt-4 font-semibold">{m.title}</h3>
              <p className="mt-1 flex-1 text-sm text-muted">{m.desc}</p>
              <Link href={m.href} className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">{m.cta} <ArrowRight className="size-4 transition group-hover:translate-x-0.5" /></Link>
            </Card>
          ))}
        </div>
      </section>

      <section className="py-10">
        <h2 className="text-2xl font-bold tracking-tight">Built for serious play</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-line bg-surface p-5">
              <f.icon className="size-5 text-primary" />
              <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-10">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Leaderboard</h2>
            <p className="mt-1 text-muted">Top players this season.</p>
          </div>
          <Link href="/leaderboard" className="text-sm font-semibold text-primary">View all</Link>
        </div>
        <Card className="mt-6 divide-y divide-line">
          {top.length === 0 && <p className="p-6 text-sm text-muted">No ranked games yet — be the first on the board!</p>}
          {top.map((p) => (
            <div key={p.username} className="flex items-center gap-4 px-5 py-3.5">
              <span className="w-6 text-center font-bold text-muted">{p.rank === 1 ? <Trophy className="mx-auto size-4 text-warning" /> : p.rank}</span>
              <Avatar name={p.username} color={p.avatarColor} size={32} />
              <span className="flex-1 font-medium">{p.username}</span>
              <span className="text-sm text-muted tabular">{p.wins}W · {p.winRate}%</span>
              <span className="w-20 text-right font-semibold tabular">{p.totalScore}</span>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}
