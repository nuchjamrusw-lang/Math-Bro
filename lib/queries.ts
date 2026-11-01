/** Read-side queries for leaderboard, profile and match history (used by pages and API routes). */
import { prisma } from "./db";

export async function leaderboard(limit = 20) {
  try {
    const users = await prisma.user.findMany({
      where: { totalGames: { gt: 0 } },
      orderBy: [{ wins: "desc" }, { totalScore: "desc" }],
      take: limit,
    });
    return users.map((u, i) => ({
      rank: i + 1, username: u.username, avatarColor: u.avatarColor, guest: u.isGuest,
      totalGames: u.totalGames, wins: u.wins, losses: u.losses, totalScore: u.totalScore, bestScore: u.bestScore,
      winRate: u.totalGames ? Math.round((u.wins / u.totalGames) * 100) : 0,
    }));
  } catch {
    return [];
  }
}

export async function profile(username: string) {
  const u = await prisma.user.findUnique({ where: { username } });
  if (!u) return null;
  const rows = await prisma.matchPlayer.findMany({
    where: { userId: u.id, match: { status: "FINISHED" } },
    include: { match: { include: { players: true, challenges: true } } },
    orderBy: { match: { startedAt: "desc" } },
    take: 50,
  });
  return {
    user: {
      id: u.id, username: u.username, avatarColor: u.avatarColor, guest: u.isGuest, createdAt: u.createdAt,
      totalGames: u.totalGames, wins: u.wins, losses: u.losses, draws: u.draws, totalScore: u.totalScore, bestScore: u.bestScore,
      winRate: u.totalGames ? Math.round((u.wins / u.totalGames) * 100) : 0,
    },
    matches: rows.map((r) => {
      const opp = r.match.players.filter((p) => p.side !== r.side);
      const mine = r.match.players.find((p) => p.userId === u.id);
      return {
        id: r.match.id, date: r.match.startedAt, gameType: r.match.gameType,
        opponents: opp.map((o) => o.username), myScore: mine?.finalScore ?? 0, oppScore: opp[0]?.finalScore ?? 0,
        outcome: r.outcome, durationMs: r.match.durationMs, totalMoves: r.match.totalMoves,
        bingoCount: r.bingoCount, challenges: r.match.challenges.length, replayEnabled: r.match.replayEnabled, endReason: r.match.endReason,
      };
    }),
  };
}

export async function matchForReplay(id: string) {
  const m = await prisma.match.findUnique({ where: { id }, include: { players: true, challenges: true, moves: { orderBy: { seq: "asc" } } } });
  if (!m || m.status !== "FINISHED") return null;
  return {
    id: m.id, roomCode: m.roomCode, gameType: m.gameType, settings: m.settings, rules: m.rules, result: m.result,
    replayEnabled: m.replayEnabled, startedAt: m.startedAt, endedAt: m.endedAt,
    players: m.players.map((p) => ({ userId: p.userId, username: p.username, side: p.side, finalScore: p.finalScore, outcome: p.outcome })),
    challenges: m.challenges,
    history: m.replayEnabled ? m.moves.map((mv) => mv.data) : [],
  };
}
