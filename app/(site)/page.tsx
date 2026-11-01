import Link from "next/link";
import { ArrowRight, Users, Zap, GraduationCap, Radio, Calculator, Gavel, Mic, History, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BoardPreview } from "@/components/landing/board-preview";
import { Avatar } from "@/components/layout/avatar";
import { leaderboard } from "@/lib/queries";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ t }, top] = await Promise.all([getT(), leaderboard(5)]);
  const modes = [
    { icon: Users, title: t("mode.friends"), desc: t("mode.friendsDesc"), href: "/play?tab=create", cta: t("mode.friendsCta") },
    { icon: Zap, title: t("mode.quick"), desc: t("mode.quickDesc"), href: "/play?tab=quick", cta: t("mode.quickCta") },
    { icon: GraduationCap, title: t("mode.practice"), desc: t("mode.practiceDesc"), href: "/practice", cta: t("mode.practiceCta") },
  ];
  const features = [
    { icon: Radio, title: t("feat.realtime"), desc: t("feat.realtimeDesc") },
    { icon: Calculator, title: t("feat.scoring"), desc: t("feat.scoringDesc") },
    { icon: Gavel, title: t("feat.challenge"), desc: t("feat.challengeDesc") },
    { icon: Mic, title: t("feat.voice"), desc: t("feat.voiceDesc") },
    { icon: History, title: t("feat.history"), desc: t("feat.historyDesc") },
  ];
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <section className="grid items-center gap-10 py-12 md:py-20 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-muted">
            <span className="size-1.5 rounded-full bg-success" /> {t("home.badge")}
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl lg:text-[56px]">
            {t("home.titleA")} <span className="text-primary">{t("home.titleB")}</span>
          </h1>
          <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-muted">{t("home.desc")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild><Link href="/play">{t("home.playNow")} <ArrowRight /></Link></Button>
            <Button size="lg" variant="secondary" asChild><Link href="/how-to-play">{t("home.learn")}</Link></Button>
          </div>
          <dl className="mt-10 flex gap-8 text-sm">
            <div><dt className="text-muted">{t("home.statTiles")}</dt><dd className="text-xl font-bold">100</dd></div>
            <div><dt className="text-muted">{t("home.statBoard")}</dt><dd className="text-xl font-bold">15 × 15</dd></div>
            <div><dt className="text-muted">{t("home.statModes")}</dt><dd className="text-xl font-bold">1v1 · 2v2</dd></div>
          </dl>
        </div>
        <div className="relative mx-auto w-full max-w-[520px]">
          <div className="absolute -inset-6 -z-10 rounded-[40px] bg-primary-soft/60 blur-2xl" />
          <BoardPreview />
        </div>
      </section>

      <section className="py-10">
        <h2 className="text-2xl font-bold tracking-tight">{t("home.modes")}</h2>
        <p className="mt-1 text-muted">{t("home.modesSub")}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {modes.map((m) => (
            <Card key={m.href} className="group flex flex-col p-6 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
              <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary"><m.icon className="size-5" /></span>
              <h3 className="mt-4 font-semibold">{m.title}</h3>
              <p className="mt-1 flex-1 text-sm text-muted">{m.desc}</p>
              <Link href={m.href} className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">{m.cta} <ArrowRight className="size-4 transition group-hover:translate-x-0.5" /></Link>
            </Card>
          ))}
        </div>
      </section>

      <section className="py-10">
        <h2 className="text-2xl font-bold tracking-tight">{t("home.features")}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {features.map((f) => (
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
            <h2 className="text-2xl font-bold tracking-tight">{t("home.leaderboard")}</h2>
            <p className="mt-1 text-muted">{t("home.leaderboardSub")}</p>
          </div>
          <Link href="/leaderboard" className="text-sm font-semibold text-primary">{t("home.viewAll")}</Link>
        </div>
        <Card className="mt-6 divide-y divide-line">
          {top.length === 0 && <p className="p-6 text-sm text-muted">{t("home.noRanked")}</p>}
          {top.map((p) => (
            <div key={p.username} className="flex items-center gap-4 px-5 py-3.5">
              <span className="w-6 text-center font-bold text-muted">{p.rank === 1 ? <Trophy className="mx-auto size-4 text-warning" /> : p.rank}</span>
              <Avatar name={p.username} color={p.avatarColor} size={32} />
              <span className="flex-1 font-medium">{p.username}</span>
              <span className="text-sm text-muted tabular">{t("home.winsShort", { n: p.wins })} · {p.winRate}%</span>
              <span className="w-20 text-right font-semibold tabular">{p.totalScore}</span>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}
