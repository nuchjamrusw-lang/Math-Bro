import Link from "next/link";
import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/layout/avatar";
import { leaderboard } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leaderboard" };

export default async function Page() {
  const players = await leaderboard(50);
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
      <p className="mt-1 text-muted">Ranked by wins, then total score.</p>
      <Card className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <tr><th className="px-5 py-3">#</th><th className="py-3">Player</th><th className="py-3 text-right">Games</th><th className="py-3 text-right">W / L</th><th className="py-3 text-right">Win rate</th><th className="py-3 text-right">Best</th><th className="px-5 py-3 text-right">Total score</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {players.length === 0 && <tr><td colSpan={7} className="px-5 py-8 text-center text-muted">No finished games yet.</td></tr>}
            {players.map((p) => (
              <tr key={p.username} className="tabular">
                <td className="px-5 py-3 font-bold text-muted">{p.rank === 1 ? <Trophy className="size-4 text-warning" /> : p.rank}</td>
                <td className="py-3"><Link href={`/profile/${encodeURIComponent(p.username)}`} className="flex items-center gap-2.5 font-medium hover:text-primary"><Avatar name={p.username} color={p.avatarColor} size={28} />{p.username}{p.guest && <span className="text-[11px] text-muted">guest</span>}</Link></td>
                <td className="py-3 text-right">{p.totalGames}</td>
                <td className="py-3 text-right">{p.wins} / {p.losses}</td>
                <td className="py-3 text-right">{p.winRate}%</td>
                <td className="py-3 text-right">{p.bestScore}</td>
                <td className="px-5 py-3 text-right font-semibold">{p.totalScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
