/**
 * Database persistence for matches. All writes for a match are serialised through a promise chain;
 * failures are logged and never break the live game (the in-memory engine is authoritative).
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { GameState } from "@/lib/game-engine";
import type { RoomSettings } from "@/lib/room-settings";

const chains = new Map<string, Promise<unknown>>();
const persistedSeq = new Map<string, number>();
const persistedChallenges = new Map<string, Set<string>>();

const json = (v: unknown) => JSON.parse(JSON.stringify(v ?? null)) as Prisma.InputJsonValue;

function enqueue(matchId: string, fn: () => Promise<unknown>) {
  const prev = chains.get(matchId) ?? Promise.resolve();
  const next = prev.then(fn).catch((e) => console.error(`[persist ${matchId}]`, e?.message ?? e));
  chains.set(matchId, next);
  return next;
}

export async function flush(matchId: string) {
  await chains.get(matchId);
}

export async function createMatch(args: {
  roomCode: string;
  settings: RoomSettings;
  state: GameState;
  players: { userId: string; username: string; side: number }[];
}): Promise<string | null> {
  try {
    const m = await prisma.match.create({
      data: {
        roomCode: args.roomCode,
        gameType: args.settings.gameType,
        settings: json(args.settings),
        rules: json(args.state.rules),
        state: json({ ...args.state, savedAt: Date.now() }),
        replayEnabled: args.settings.replayEnabled,
        players: { create: args.players.map((p) => ({ userId: p.userId, username: p.username, side: p.side })) },
      },
    });
    persistedSeq.set(m.id, 0);
    persistedChallenges.set(m.id, new Set());
    return m.id;
  } catch (e) {
    console.error("[persist] createMatch failed:", (e as Error).message);
    return null;
  }
}

export function persistState(matchId: string | null, state: GameState) {
  if (!matchId) return;
  const snapshot = structuredClone(state);
  enqueue(matchId, async () => {
    const last = persistedSeq.get(matchId) ?? 0;
    const newRecords = snapshot.history.filter((h) => h.seq > last);
    const done = persistedChallenges.get(matchId) ?? new Set<string>();
    const ops: Prisma.PrismaPromise<unknown>[] = [
      prisma.match.update({
        where: { id: matchId },
        data: { state: json({ ...snapshot, savedAt: Date.now() }), totalMoves: snapshot.moveNumber },
      }),
    ];
    if (newRecords.length) {
      ops.push(prisma.moveRecord.createMany({
        skipDuplicates: true,
        data: newRecords.map((h) => ({
          matchId, seq: h.seq, moveNumber: h.moveNumber, type: h.type, side: h.sideIndex, playerId: h.playerId,
          placements: h.placements ? json(h.placements) : undefined,
          equations: h.equations ? json(h.equations) : undefined,
          points: h.points, bingo: !!h.bingo, status: h.status ?? null, timeUsedMs: Math.round(h.timeUsedMs),
          data: json(h), occurredAt: new Date(h.timestamp),
        })),
      }));
    }
    for (const c of snapshot.challenges.filter((c) => !done.has(c.id))) {
      ops.push(prisma.challengeRecord.upsert({
        where: { matchId_challengeKey: { matchId, challengeKey: c.id } },
        create: {
          matchId, challengeKey: c.id, moveNumber: c.moveNumber, challengerId: c.challengerId, challengedId: c.challengedId,
          equations: json(c.equations), firstResult: json(c.first), secondResult: c.second ? json(c.second) : undefined,
          rechallengeRequestedBy: c.rechallenge?.requestedBy, rechallengeRequestedAt: c.rechallenge ? new Date(c.rechallenge.requestedAt) : undefined,
          requestedAt: new Date(c.requestedAt), finalRuling: c.finalRuling, resolvedAt: c.resolvedAt ? new Date(c.resolvedAt) : undefined,
        },
        update: {},
      }));
    }
    await prisma.$transaction(ops);
    if (newRecords.length) persistedSeq.set(matchId, Math.max(last, ...newRecords.map((r) => r.seq)));
    snapshot.challenges.forEach((c) => done.add(c.id));
    persistedChallenges.set(matchId, done);
  });
}

export function finalizeMatch(matchId: string | null, state: GameState) {
  if (!matchId || !state.result) return;
  const r = state.result;
  persistState(matchId, state);
  enqueue(matchId, async () => {
    const players = await prisma.matchPlayer.findMany({ where: { matchId } });
    const ops: Prisma.PrismaPromise<unknown>[] = [
      prisma.match.update({
        where: { id: matchId },
        data: {
          status: "FINISHED", result: json(r), winnerSide: r.winnerSide, endReason: r.reason,
          endedAt: new Date(r.endedAt), durationMs: r.totalPlayingMs, totalMoves: r.totalMoves,
        },
      }),
    ];
    for (const p of players) {
      const sr = r.sides[p.side];
      const outcome = r.winnerSide === null ? "DRAW" : r.winnerSide === p.side ? "WIN" : "LOSS";
      ops.push(prisma.matchPlayer.update({
        where: { id: p.id },
        data: { finalScore: sr.finalScore, outcome, bingoCount: sr.bingoCount, timePenalty: sr.timePenalty },
      }));
      ops.push(prisma.user.update({
        where: { id: p.userId },
        data: {
          totalGames: { increment: 1 },
          wins: { increment: outcome === "WIN" ? 1 : 0 },
          losses: { increment: outcome === "LOSS" ? 1 : 0 },
          draws: { increment: outcome === "DRAW" ? 1 : 0 },
          totalScore: { increment: Math.max(0, sr.finalScore) },
        },
      }));
    }
    await prisma.$transaction(ops);
    for (const p of players) {
      const sr = r.sides[p.side];
      await prisma.user.updateMany({ where: { id: p.userId, bestScore: { lt: sr.finalScore } }, data: { bestScore: sr.finalScore } });
    }
  });
}

export function markAbandoned(matchId: string | null) {
  if (!matchId) return;
  enqueue(matchId, () => prisma.match.update({ where: { id: matchId }, data: { status: "ABANDONED", endedAt: new Date() } }));
}

export async function loadActiveMatches() {
  try {
    return await prisma.match.findMany({ where: { status: "ACTIVE" }, include: { players: { include: { user: true } } } });
  } catch (e) {
    console.error("[persist] could not load active matches:", (e as Error).message);
    return [];
  }
}

export function primeSeq(matchId: string, state: GameState) {
  persistedSeq.set(matchId, state.seq);
  persistedChallenges.set(matchId, new Set(state.challenges.map((c) => c.id)));
}
