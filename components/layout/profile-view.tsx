import Link from "next/link";
import { Film } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/layout/avatar";
import type { profile } from "@/lib/queries";
import { formatDuration } from "@/lib/utils";
import { getT } from "@/lib/i18n/server";

type P = NonNullable<Awaited<ReturnType<typeof profile>>>;

export async function ProfileView({ data, isMe }: { data: P; isMe?: boolean }) {
  const { t, td, locale } = await getT();
  const u = data.user;
  const stats = [
    [t("stat.totalGames"), u.totalGames], [t("stat.wins"), u.wins], [t("stat.losses"), u.losses],
    [t("stat.winRate"), `${u.winRate}%`], [t("stat.totalScore"), u.totalScore], [t("stat.bestScore"), u.bestScore],
  ] as const;
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="flex items-center gap-4">
        <Avatar name={u.username} color={u.avatarColor} size={64} />
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">{u.username}{u.guest && <Badge>{t("nav.guest")}</Badge>}</h1>
          <p className="text-sm text-muted">{t("profile.joined", { date: new Date(u.createdAt).toLocaleDateString(locale) })}</p>
          {isMe && u.guest && <p className="mt-1 text-sm"><Link className="font-semibold text-primary" href="/signup?next=/profile">{t("profile.upgrade")}</Link> {t("profile.upgradeTail")}</p>}
        </div>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(([k, v]) => (
          <Card key={k} className="p-4"><p className="text-xs text-muted">{k}</p><p className="mt-1 text-2xl font-bold tabular">{v}</p></Card>
        ))}
      </div>
      <h2 className="mt-12 text-lg font-semibold">{t("profile.history")}</h2>
      <Card className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <tr><th className="px-5 py-3">{t("col.date")}</th><th className="py-3">{t("col.opponent")}</th><th className="py-3">{t("col.result")}</th><th className="py-3 text-right">{t("col.score")}</th><th className="py-3 text-right">{t("col.duration")}</th><th className="py-3 text-right">{t("col.moves")}</th><th className="py-3 text-right">{t("col.bingo")}</th><th className="py-3 text-right">{t("col.challenges")}</th><th className="px-5 py-3"></th></tr>
          </thead>
          <tbody className="divide-y divide-line tabular">
            {data.matches.length === 0 && <tr><td colSpan={9} className="px-5 py-8 text-center text-muted">{t("profile.noMatches")}</td></tr>}
            {data.matches.map((m) => (
              <tr key={m.id}>
                <td className="px-5 py-3 text-muted">{new Date(m.date).toLocaleString(locale)}</td>
                <td className="py-3 font-medium">{m.opponents.join(" & ")} <span className="text-xs text-muted">{m.gameType}</span></td>
                <td className="py-3"><Badge tone={m.outcome === "WIN" ? "success" : m.outcome === "LOSS" ? "error" : "neutral"}>{m.outcome ? td(`outcome.${m.outcome}`) : "—"}</Badge></td>
                <td className="py-3 text-right font-semibold">{m.myScore} – {m.oppScore}</td>
                <td className="py-3 text-right">{formatDuration(m.durationMs)}</td>
                <td className="py-3 text-right">{m.totalMoves}</td>
                <td className="py-3 text-right">{m.bingoCount}</td>
                <td className="py-3 text-right">{m.challenges}</td>
                <td className="px-5 py-3 text-right">{m.replayEnabled ? <Link href={`/replay/${m.id}`} className="inline-flex items-center gap-1 font-semibold text-primary"><Film className="size-4" />{t("profile.replay")}</Link> : <span className="text-xs text-muted">{t("profile.noReplay")}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
