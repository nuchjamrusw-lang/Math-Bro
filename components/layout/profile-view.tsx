import Link from "next/link";
import { Film } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/layout/avatar";
import type { profile } from "@/lib/queries";
import { formatDuration } from "@/lib/utils";

type P = NonNullable<Awaited<ReturnType<typeof profile>>>;

export function ProfileView({ data, isMe }: { data: P; isMe?: boolean }) {
  const u = data.user;
  const stats = [
    ["Total games", u.totalGames], ["Wins", u.wins], ["Losses", u.losses], ["Win rate", `${u.winRate}%`], ["Total score", u.totalScore], ["Best score", u.bestScore],
  ] as const;
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="flex items-center gap-4">
        <Avatar name={u.username} color={u.avatarColor} size={64} />
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">{u.username}{u.guest && <Badge>Guest</Badge>}</h1>
          <p className="text-sm text-muted">Joined {new Date(u.createdAt).toLocaleDateString()}</p>
          {isMe && u.guest && <p className="mt-1 text-sm"><Link className="font-semibold text-primary" href="/signup?next=/profile">Create an account</Link> to keep these stats forever.</p>}
        </div>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(([k, v]) => (
          <Card key={k} className="p-4"><p className="text-xs text-muted">{k}</p><p className="mt-1 text-2xl font-bold tabular">{v}</p></Card>
        ))}
      </div>
      <h2 className="mt-12 text-lg font-semibold">Match history</h2>
      <Card className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <tr><th className="px-5 py-3">Date</th><th className="py-3">Opponent</th><th className="py-3">Result</th><th className="py-3 text-right">Score</th><th className="py-3 text-right">Duration</th><th className="py-3 text-right">Moves</th><th className="py-3 text-right">Bingo</th><th className="py-3 text-right">Challenges</th><th className="px-5 py-3"></th></tr>
          </thead>
          <tbody className="divide-y divide-line tabular">
            {data.matches.length === 0 && <tr><td colSpan={9} className="px-5 py-8 text-center text-muted">No finished matches yet.</td></tr>}
            {data.matches.map((m) => (
              <tr key={m.id}>
                <td className="px-5 py-3 text-muted">{new Date(m.date).toLocaleString()}</td>
                <td className="py-3 font-medium">{m.opponents.join(" & ")} <span className="text-xs text-muted">{m.gameType}</span></td>
                <td className="py-3"><Badge tone={m.outcome === "WIN" ? "success" : m.outcome === "LOSS" ? "error" : "neutral"}>{m.outcome}</Badge></td>
                <td className="py-3 text-right font-semibold">{m.myScore} – {m.oppScore}</td>
                <td className="py-3 text-right">{formatDuration(m.durationMs)}</td>
                <td className="py-3 text-right">{m.totalMoves}</td>
                <td className="py-3 text-right">{m.bingoCount}</td>
                <td className="py-3 text-right">{m.challenges}</td>
                <td className="px-5 py-3 text-right">{m.replayEnabled ? <Link href={`/replay/${m.id}`} className="inline-flex items-center gap-1 font-semibold text-primary"><Film className="size-4" />Replay</Link> : <span className="text-xs text-muted">no replay</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
