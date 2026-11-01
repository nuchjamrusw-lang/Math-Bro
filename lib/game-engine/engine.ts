/**
 * Math&Bro A-Math game engine — framework-free, deterministic, serialisable.
 * Used by the authoritative server (online games) and directly in the browser (practice mode).
 */
import { createBoard, type Board, type BoardTile } from "./board";
import { analyzePlacement, sequenceSymbols, type NewTile, type Sequence } from "./placement";
import type {
  ChallengeCheck, ChallengeRecord, EndReason, EquationResult, GameResult, GameState, MoveRecord,
  MoveType, PendingMove, PlacementInput, ResolvedPlacement, SideMember, SideResult,
} from "./types";
import { buildRules, isAutoScore, isAutoTiles, type GameRulesConfig, type RulesOverride } from "../game-rules/config";
import { parseLayout, type BoardLayout } from "../game-rules/board-layout";
import { ALL_SYMBOLS, getTileDefinition, type Symbol, type TileFace } from "../game-rules/tiles";
import { validateEquation, type ValidationError } from "../math-validator";
import { scoreMove, type MoveScore } from "../scoring-engine";
import { createTileSet, drawOrderRank, drawTiles, rackPoints, shuffle, type Tile } from "../tile-manager";
import {
  createClock, overtimeMs, pauseClock, remainingMs, startClock, stopClock, timePenalty, usedMs,
} from "../timer-engine";

export class GameError extends Error {
  /** `key`: i18n key under "err." (defaults to `code`). */
  constructor(
    public code: string, message: string, public errors: ValidationError[] = [],
    public key: string = code, public params?: Record<string, string | number>,
  ) {
    super(message);
    this.name = "GameError";
  }
}

export interface CreateGameOptions {
  id: string;
  rules?: GameRulesConfig | RulesOverride;
  sides: { name: string; members: SideMember[] }[];
  seed?: number;
  hasReferee?: boolean;
  /** Testing: faces in the order they will be drawn. Remaining tiles follow (shuffled). */
  bagOrder?: TileFace[];
  /** Testing: skip the draw-for-first-move step and let this side start. */
  firstSide?: number;
}

export interface MovePreview {
  ok: boolean;
  placementError?: ValidationError;
  equations: EquationResult[];
  allValid: boolean;
  score: MoveScore | null;
  errors: ValidationError[];
}

const layoutCache = new Map<string, BoardLayout>();
export function layoutFor(rules: GameRulesConfig): BoardLayout {
  const key = rules.layoutRows.join("|");
  let l = layoutCache.get(key);
  if (!l) { l = parseLayout(rules.layoutRows); layoutCache.set(key, l); }
  return l;
}

function isFullRules(r: unknown): r is GameRulesConfig {
  return !!r && typeof r === "object" && "layoutRows" in r && "time" in r && "math" in r && "endGame" in r;
}

export function createGame(opts: CreateGameOptions): GameState {
  if (opts.sides.length !== 2) throw new GameError("BAD_CONFIG", "A game has exactly two sides");
  const rules = isFullRules(opts.rules) ? structuredClone(opts.rules) : buildRules(opts.rules as RulesOverride);
  const rngHolder = { rng: (opts.seed ?? Math.floor(Math.random() * 2 ** 32)) >>> 0 };
  let bag = shuffle(createTileSet(), rngHolder);
  // Re-label ids after shuffling so an id never reveals the face.
  bag = bag.map((t, i) => ({ ...t, id: `t${i}` }));
  if (opts.bagOrder) {
    const rest = [...bag];
    const ordered: Tile[] = [];
    for (const face of opts.bagOrder) {
      const idx = rest.findIndex((t) => t.face === face);
      if (idx < 0) throw new GameError("BAD_CONFIG", `bagOrder: no more '${face}' tiles`);
      ordered.push(rest.splice(idx, 1)[0]);
    }
    // drawTiles takes from the end, so put the ordered tiles at the end in reverse.
    bag = [...rest, ...ordered.reverse()];
  }
  const layout = parseLayout(rules.layoutRows);
  const state: GameState = {
    id: opts.id,
    version: 0,
    rules,
    hasReferee: !!opts.hasReferee,
    phase: "WAITING",
    phaseBeforePause: null,
    pauseRequestedBy: null,
    sides: opts.sides.map((s, i) => ({ index: i, name: s.name, members: s.members, rack: [], score: 0, bingoCount: 0 })),
    board: createBoard(layout.size),
    bag,
    rng: rngHolder.rng,
    turn: opts.firstSide ?? 0,
    moveNumber: 0,
    consecutivePasses: 0,
    turnStartedAt: null,
    startedAt: null,
    clock: createClock(rules.time.minutesPerSide, 2),
    drawOrder: [],
    pending: null,
    challenge: null,
    challenges: [],
    history: [],
    result: null,
    seq: 0,
  };
  (state as GameState & { _fixedFirst?: number })._fixedFirst = opts.firstSide;
  return state;
}

export interface PublicSide {
  index: number;
  name: string;
  members: SideMember[];
  score: number;
  bingoCount: number;
  rackCount: number;
  rack?: Tile[];
}

export interface GameView extends Omit<GameState, "sides" | "bag" | "rng" | "pending" | "history"> {
  sides: PublicSide[];
  bagCount: number;
  serverNow: number;
  viewerSide: number | null;
  pending: (Omit<PendingMove, "equations"> & { equations: EquationResult[] }) | null;
  history: MoveRecord[];
}

export class GameEngine {
  constructor(public state: GameState) {}

  static create(opts: CreateGameOptions): GameEngine {
    return new GameEngine(createGame(opts));
  }

  get rules() { return this.state.rules; }
  get layout() { return layoutFor(this.state.rules); }
  private rngHolder() {
    const s = this.state;
    return { get rng() { return s.rng; }, set rng(v: number) { s.rng = v; } };
  }
  private other(side: number) { return side === 0 ? 1 : 0; }
  private bump() { this.state.version++; }

  private record(type: MoveType, now: number, data: Partial<MoveRecord> = {}): MoveRecord {
    const s = this.state;
    const rec: MoveRecord = {
      seq: ++s.seq,
      moveNumber: s.moveNumber,
      type,
      sideIndex: null,
      playerId: null,
      points: 0,
      timeUsedMs: 0,
      timestamp: now,
      scoresAfter: s.sides.map((x) => x.score),
      racksAfter: s.sides.map((x) => x.rack.map((t) => ({ ...t }))),
      bagCountAfter: s.bag.length,
      ...data,
    };
    s.history.push(rec);
    return rec;
  }

  private refreshRecordSnapshot(rec: MoveRecord) {
    const s = this.state;
    rec.scoresAfter = s.sides.map((x) => x.score);
    rec.racksAfter = s.sides.map((x) => x.rack.map((t) => ({ ...t })));
    rec.bagCountAfter = s.bag.length;
  }

  // ───────────────────────────── start ─────────────────────────────

  start(now: number): void {
    const s = this.state;
    if (s.phase !== "WAITING") throw new GameError("BAD_PHASE", "Game already started", [], "ALREADY_STARTED");
    const fixed = (s as GameState & { _fixedFirst?: number })._fixedFirst;
    let starter: number;
    if (fixed !== undefined) {
      starter = fixed;
    } else {
      starter = -1;
      for (let round = 0; round < 100 && starter < 0; round++) {
        const draws = s.sides.map((side) => ({ sideIndex: side.index, tile: drawTiles(s.bag, 1)[0] }));
        s.drawOrder.push({ draws: draws.map((d) => ({ sideIndex: d.sideIndex, face: d.tile.face })) });
        const ranks = draws.map((d) => drawOrderRank(d.tile));
        const max = Math.max(...ranks);
        if (ranks.filter((r) => r === max).length === 1) starter = draws[ranks.indexOf(max)].sideIndex;
        s.bag.push(...draws.map((d) => d.tile));
        shuffle(s.bag, this.rngHolder());
      }
      if (starter < 0) starter = 0;
    }
    delete (s as GameState & { _fixedFirst?: number })._fixedFirst;
    // Starter draws first.
    for (const idx of [starter, this.other(starter)]) s.sides[idx].rack = drawTiles(s.bag, s.rules.rackSize);
    s.turn = starter;
    s.phase = "PLAYING";
    s.startedAt = now;
    s.turnStartedAt = now;
    startClock(s.clock, starter, now);
    this.record("START", now, { sideIndex: starter, note: `${s.sides[starter].name} moves first` });
    this.bump();
  }

  // ───────────────────────────── helpers ─────────────────────────────

  private assertActive() {
    const p = this.state.phase;
    if (p === "WAITING") throw new GameError("BAD_PHASE", "The game has not started", [], "NOT_STARTED");
    if (p === "FINISHED") throw new GameError("BAD_PHASE", "The game is over", [], "GAME_OVER");
    if (p === "PAUSED") throw new GameError("BAD_PHASE", "The game is paused", [], "PAUSED");
  }

  private assertTurn(side: number) {
    if (this.state.turn !== side) throw new GameError("NOT_YOUR_TURN", "It is not your turn");
  }

  /** In challenge mode, any action by the side to move implicitly accepts the pending move. */
  private implicitAccept(side: number, now: number) {
    const s = this.state;
    if (s.phase === "CHALLENGE_WINDOW") {
      if (!s.pending || s.pending.sideIndex === side) throw new GameError("BAD_PHASE", "Waiting for the opponent to review your move", [], "AWAIT_REVIEW");
      this.commitPending(now, false);
    }
    if (s.phase === "CHALLENGE_RESULT" || s.phase === "REFEREE_REVIEW") {
      throw new GameError("BAD_PHASE", "A challenge is being resolved", [], "CHALLENGE_IN_PROGRESS");
    }
  }

  resolvePlacements(side: number, placements: PlacementInput[]): ResolvedPlacement[] {
    const rack = this.state.sides[side].rack;
    const used = new Set<string>();
    if (!Array.isArray(placements) || placements.length === 0) throw new GameError("EMPTY_MOVE", "Place at least one tile");
    if (placements.length > this.rules.rackSize) throw new GameError("BAD_MOVE", "Too many tiles", [], "BAD_MOVE");
    return placements.map((p) => {
      if (!Number.isInteger(p.row) || !Number.isInteger(p.col)) throw new GameError("BAD_MOVE", "Invalid coordinates");
      if (used.has(p.tileId)) throw new GameError("BAD_MOVE", "The same tile was used twice");
      used.add(p.tileId);
      const tile = rack.find((t) => t.id === p.tileId);
      if (!tile) throw new GameError("TILE_NOT_IN_RACK", "That tile is not on your rack");
      const def = getTileDefinition(tile.face);
      let value: Symbol;
      if (def.options.length === 1) value = def.options[0];
      else {
        if (!p.value || !def.options.includes(p.value) || !ALL_SYMBOLS.includes(p.value)) {
          throw new GameError("UNASSIGNED_TILE", `Choose a value for the ${tile.face} tile before playing`, [
            { code: "UNASSIGNED_TILE", message: `Choose a value for the ${tile.face} tile`, cells: [{ row: p.row, col: p.col }], reason: "unassigned", params: { face: tile.face } },
          ], "UNASSIGNED_TILE", { face: tile.face });
        }
        value = p.value;
      }
      return { tileId: tile.id, row: p.row, col: p.col, value, face: tile.face, points: tile.points, kind: tile.kind };
    });
  }

  private evaluate(board: Board, placed: ResolvedPlacement[], side: number) {
    const newTiles: NewTile[] = placed.map((p) => ({
      tileId: p.tileId, face: p.face, kind: p.kind, points: p.points, value: p.value,
      moveNumber: this.state.moveNumber + 1, sideIndex: side, row: p.row, col: p.col,
    }));
    const analysis = analyzePlacement(board, this.layout, newTiles);
    if (!analysis.ok) return { analysis, equations: [] as EquationResult[], score: null as MoveScore | null };
    const equations = analysis.sequences.map((seq: Sequence): EquationResult => {
      const check = validateEquation(sequenceSymbols(seq), this.rules.math);
      return {
        text: check.text, direction: seq.direction, valid: check.valid, sideValues: check.sideValues,
        error: check.error ? { ...check.error, cells: seq.cells.map((c) => ({ row: c.row, col: c.col })) } : undefined,
        cells: seq.cells.map((c) => ({ row: c.row, col: c.col })),
      };
    });
    const score = scoreMove(analysis.sequences, placed.length, this.layout, this.rules.scoring);
    return { analysis, equations, score };
  }

  /** Dry-run a move: geometry, equations, projected score. Never mutates state. */
  preview(side: number, placements: PlacementInput[]): MovePreview {
    let resolved: ResolvedPlacement[];
    try {
      resolved = this.resolvePlacements(side, placements);
    } catch (e) {
      const ge = e as GameError;
      const error: ValidationError = ge.errors?.[0] ?? { code: "INVALID_BOARD_PLACEMENT", message: ge.message };
      return { ok: false, placementError: error, equations: [], allValid: false, score: null, errors: [error] };
    }
    const { analysis, equations, score } = this.evaluate(this.state.board, resolved, side);
    if (!analysis.ok) return { ok: false, placementError: analysis.error, equations: [], allValid: false, score: null, errors: [analysis.error] };
    const errors = equations.filter((e) => !e.valid).map((e) => e.error!);
    return { ok: true, equations, allValid: errors.length === 0, score, errors };
  }

  // ───────────────────────────── play ─────────────────────────────

  submitMove(side: number, playerId: string, placements: PlacementInput[], now: number, declaredScore?: number | null): PendingMove {
    const s = this.state;
    this.assertActive();
    this.assertTurn(side);
    this.implicitAccept(side, now);
    if (s.phase !== "PLAYING") throw new GameError("BAD_PHASE", "You cannot play right now", [], "CANNOT_PLAY_NOW");

    const resolved = this.resolvePlacements(side, placements);
    const { analysis, equations, score } = this.evaluate(s.board, resolved, side);
    if (!analysis.ok) throw new GameError(analysis.error.code, analysis.error.message, [analysis.error]);
    const invalid = equations.filter((e) => !e.valid);
    if (s.rules.validation === "STRICT" && invalid.length) {
      throw new GameError(invalid[0].error!.code, invalid[0].error!.message, invalid.map((e) => e.error!));
    }
    let points: number;
    if (isAutoScore(s.rules)) points = score!.total;
    else {
      if (declaredScore === undefined || declaredScore === null || !Number.isInteger(declaredScore) || declaredScore < 0 || declaredScore > 2000) {
        throw new GameError("SCORE_REQUIRED", "Enter the score for this move (manual scoring)");
      }
      points = declaredScore;
    }

    s.moveNumber++;
    const timeUsedMs = s.turnStartedAt ? now - s.turnStartedAt : 0;
    const pending: PendingMove = {
      moveNumber: s.moveNumber, sideIndex: side, playerId, placements: resolved, equations,
      score: isAutoScore(s.rules) ? score : null, declaredScore: isAutoScore(s.rules) ? null : points,
      points, timeUsedMs, submittedAt: now,
    };
    // Put the tiles on the board and take them off the rack.
    const rack = s.sides[side].rack;
    for (const p of resolved) {
      const bt: BoardTile = { tileId: p.tileId, face: p.face, kind: p.kind, points: p.points, value: p.value, moveNumber: s.moveNumber, sideIndex: side };
      s.board[p.row][p.col] = bt;
      rack.splice(rack.findIndex((t) => t.id === p.tileId), 1);
    }
    s.pending = pending;

    if (s.rules.validation === "CHALLENGE") {
      // Hand the clock to the opponent; they may challenge before acting.
      s.phase = "CHALLENGE_WINDOW";
      this.switchTurn(now);
    } else {
      this.commitPending(now, true);
    }
    this.bump();
    return pending;
  }

  /** Make the pending move permanent: credit points, draw tiles, check for going out. */
  private commitPending(now: number, switchTurn: boolean) {
    const s = this.state;
    const p = s.pending;
    if (!p) return;
    const side = s.sides[p.sideIndex];
    side.score += p.points;
    const bingo = p.placements.length >= s.rules.scoring.bingoTileCount;
    if (bingo) side.bingoCount++;
    s.consecutivePasses = 0;
    let drawn = 0;
    if (isAutoTiles(s.rules)) {
      const need = s.rules.rackSize - side.rack.length;
      const t = drawTiles(s.bag, need);
      drawn = t.length;
      side.rack.push(...t);
    }
    s.pending = null;
    if (s.phase === "CHALLENGE_WINDOW") s.phase = "PLAYING";
    this.record("PLAY", now, {
      moveNumber: p.moveNumber, sideIndex: p.sideIndex, playerId: p.playerId, placements: p.placements,
      equations: p.equations.map((e) => e.text), scoreBreakdown: p.score, points: p.points, bingo,
      status: "ACCEPTED", drawnCount: drawn, timeUsedMs: p.timeUsedMs, timestamp: p.submittedAt,
    });
    if (side.rack.length === 0 && s.bag.length === 0) {
      this.finish("OUT", now, p.sideIndex);
      return;
    }
    if (switchTurn) this.switchTurn(now);
  }

  private withdrawPending(now: number) {
    const s = this.state;
    const p = s.pending;
    if (!p) return;
    const side = s.sides[p.sideIndex];
    for (const pl of p.placements) {
      s.board[pl.row][pl.col] = null;
      side.rack.push({ id: pl.tileId, face: pl.face, points: pl.points, kind: pl.kind });
    }
    s.pending = null;
    this.record("PLAY", now, {
      moveNumber: p.moveNumber, sideIndex: p.sideIndex, playerId: p.playerId, placements: p.placements,
      equations: p.equations.map((e) => e.text), scoreBreakdown: p.score, points: 0, status: "WITHDRAWN",
      timeUsedMs: p.timeUsedMs, timestamp: p.submittedAt, note: "Withdrawn after a successful challenge",
    });
  }

  private switchTurn(now: number) {
    const s = this.state;
    s.turn = this.other(s.turn);
    s.turnStartedAt = now;
    startClock(s.clock, s.turn, now);
  }

  accept(side: number, now: number): void {
    const s = this.state;
    if (s.phase !== "CHALLENGE_WINDOW" || !s.pending) throw new GameError("BAD_PHASE", "There is no move to accept", [], "NO_PENDING");
    if (s.pending.sideIndex === side) throw new GameError("BAD_PHASE", "You cannot accept your own move", [], "OWN_MOVE");
    this.commitPending(now, false);
    this.bump();
  }

  // ───────────────────────────── challenge ─────────────────────────────

  private checkPending(by: "SYSTEM" | "REFEREE", now: number, refereeId?: string, forced?: boolean): ChallengeCheck {
    const p = this.state.pending!;
    // Re-validate from scratch against the board without the pending tiles.
    const board = this.state.board.map((row) => row.slice());
    for (const pl of p.placements) board[pl.row][pl.col] = null;
    const { analysis, equations } = this.evaluate(board, p.placements, p.sideIndex);
    const errors: ValidationError[] = !analysis.ok ? [analysis.error] : equations.filter((e) => !e.valid).map((e) => e.error!);
    const valid = forced ?? errors.length === 0;
    return { valid, by, refereeId, errors, equations, checkedAt: now };
  }

  challenge(side: number, playerId: string, now: number): ChallengeRecord {
    const s = this.state;
    if (s.phase !== "CHALLENGE_WINDOW" || !s.pending) throw new GameError("BAD_PHASE", "There is no move to challenge", [], "NO_PENDING");
    if (s.pending.sideIndex === side) throw new GameError("BAD_PHASE", "You cannot challenge your own move", [], "OWN_MOVE");
    stopClock(s.clock, now);
    const first = this.checkPending("SYSTEM", now);
    const rec: ChallengeRecord = {
      id: `c${s.challenges.length + 1}`,
      moveNumber: s.pending.moveNumber,
      challengerSide: side,
      challengerId: playerId,
      challengedSide: s.pending.sideIndex,
      challengedId: s.pending.playerId,
      equations: s.pending.equations.map((e) => e.text),
      requestedAt: now,
      first,
    };
    s.challenge = rec;
    this.record("CHALLENGE", now, {
      sideIndex: side, playerId, challengeId: rec.id, equations: rec.equations, firstValid: first.valid,
      note: first.valid ? "First check: equation is VALID" : "First check: equation is INVALID",
    });
    if (s.rules.challenge.rechallengeEnabled) {
      s.phase = "CHALLENGE_RESULT";
      rec.rechallengeDeadline = now + s.rules.challenge.rechallengeWindowSeconds * 1000;
    } else {
      this.finalizeChallenge(first.valid, now);
    }
    this.bump();
    return rec;
  }

  /** The side that lost the first ruling. */
  challengeLoser(rec: ChallengeRecord): number {
    return rec.first.valid ? rec.challengerSide : rec.challengedSide;
  }

  rechallenge(side: number, playerId: string, now: number): void {
    const s = this.state;
    const rec = s.challenge;
    if (s.phase !== "CHALLENGE_RESULT" || !rec) throw new GameError("BAD_PHASE", "No challenge result to dispute", [], "NO_RULING");
    if (this.challengeLoser(rec) !== side) throw new GameError("BAD_PHASE", "Only the side that lost the challenge may re-challenge", [], "NOT_LOSER");
    rec.rechallenge = { requestedBy: playerId, requestedSide: side, requestedAt: now };
    this.record("RECHALLENGE", now, { sideIndex: side, playerId, challengeId: rec.id, equations: rec.equations });
    if (s.hasReferee) {
      s.phase = "REFEREE_REVIEW";
    } else {
      rec.second = this.checkPending("SYSTEM", now);
      this.finalizeChallenge(rec.second.valid, now);
    }
    this.bump();
  }

  acceptChallengeResult(side: number, now: number): void {
    const s = this.state;
    const rec = s.challenge;
    if (s.phase !== "CHALLENGE_RESULT" || !rec) throw new GameError("BAD_PHASE", "No challenge result pending", [], "NO_RULING");
    if (this.challengeLoser(rec) !== side) throw new GameError("BAD_PHASE", "Waiting for the other side", [], "NOT_LOSER");
    this.finalizeChallenge(rec.first.valid, now);
    this.bump();
  }

  refereeRule(refereeId: string, valid: boolean, now: number): void {
    const s = this.state;
    const rec = s.challenge;
    if (s.phase !== "REFEREE_REVIEW" || !rec) throw new GameError("BAD_PHASE", "Nothing awaiting a referee ruling", [], "NO_REFEREE_REVIEW");
    rec.second = this.checkPending("REFEREE", now, refereeId, valid);
    this.finalizeChallenge(valid, now);
    this.bump();
  }

  private finalizeChallenge(valid: boolean, now: number) {
    const s = this.state;
    const rec = s.challenge!;
    rec.finalRuling = valid ? "VALID" : "INVALID";
    rec.resolvedAt = now;
    delete rec.rechallengeDeadline;
    s.challenges.push(rec);
    s.challenge = null;
    const challenger = rec.challengerSide;
    if (valid) {
      s.phase = "CHALLENGE_WINDOW"; // commitPending expects this phase
      this.commitPending(now, false);
      if ((s.phase as string) === "FINISHED") return;
      s.phase = "PLAYING";
      if (s.rules.challenge.failedChallengeLosesTurn) {
        if (s.rules.challenge.countLostTurnAsPass) s.consecutivePasses++;
        s.turn = rec.challengedSide;
      } else s.turn = challenger;
    } else {
      this.withdrawPending(now);
      s.phase = "PLAYING";
      if (s.rules.challenge.countWithdrawnMoveAsPass) s.consecutivePasses++;
      s.turn = challenger;
    }
    s.turnStartedAt = now;
    startClock(s.clock, s.turn, now);
    this.checkPassEnd(now);
  }

  // ───────────────────────────── pass / exchange / draw ─────────────────────────────

  pass(side: number, playerId: string, now: number): void {
    const s = this.state;
    this.assertActive();
    this.assertTurn(side);
    this.implicitAccept(side, now);
    if (s.phase !== "PLAYING") return;
    s.moveNumber++;
    s.consecutivePasses++;
    this.record("PASS", now, { sideIndex: side, playerId, timeUsedMs: s.turnStartedAt ? now - s.turnStartedAt : 0 });
    if (!this.checkPassEnd(now)) this.switchTurn(now);
    this.bump();
  }

  private checkPassEnd(now: number): boolean {
    const s = this.state;
    if (s.phase === "FINISHED") return true;
    if (s.consecutivePasses >= s.rules.endGame.consecutivePassesToEnd) {
      this.finish("PASSES", now);
      return true;
    }
    return false;
  }

  canExchange(side: number): { ok: boolean; reason?: string; key?: string } {
    const s = this.state;
    if (s.bag.length < s.rules.exchangeMinBag) return { ok: false, reason: `Exchange needs at least ${s.rules.exchangeMinBag} tiles in the bag`, key: "EXCHANGE_BAG_LOW" };
    if (s.sides[side].rack.length === 0) return { ok: false, reason: "Your rack is empty", key: "EXCHANGE_RACK_EMPTY" };
    return { ok: true };
  }

  exchange(side: number, playerId: string, tileIds: string[], now: number): void {
    const s = this.state;
    this.assertActive();
    this.assertTurn(side);
    const can = this.canExchange(side);
    if (!can.ok) throw new GameError("EXCHANGE_NOT_ALLOWED", can.reason!, [], can.key, { min: s.rules.exchangeMinBag });
    const ids = [...new Set(tileIds)];
    if (ids.length < 1 || ids.length > s.rules.rackSize) throw new GameError("BAD_EXCHANGE", `Exchange 1–${s.rules.rackSize} tiles`, [], "BAD_EXCHANGE", { max: s.rules.rackSize });
    const rack = s.sides[side].rack;
    if (!ids.every((id) => rack.some((t) => t.id === id))) throw new GameError("TILE_NOT_IN_RACK", "That tile is not on your rack");
    if (ids.length > s.bag.length) throw new GameError("BAD_EXCHANGE", "Not enough tiles in the bag", [], "EXCHANGE_TOO_MANY");
    this.implicitAccept(side, now);
    if (s.phase !== "PLAYING") return;
    // 1) remove from rack  2) draw the same number  3) return old tiles and reshuffle
    const old = ids.map((id) => rack.splice(rack.findIndex((t) => t.id === id), 1)[0]);
    rack.push(...drawTiles(s.bag, old.length));
    s.bag.push(...old);
    shuffle(s.bag, this.rngHolder());
    s.moveNumber++;
    if (s.rules.endGame.countExchangeAsPass) s.consecutivePasses++;
    else s.consecutivePasses = 0;
    this.record("EXCHANGE", now, { sideIndex: side, playerId, exchangedCount: old.length, timeUsedMs: s.turnStartedAt ? now - s.turnStartedAt : 0 });
    if (!this.checkPassEnd(now)) this.switchTurn(now);
    this.bump();
  }

  /** Manual tile management: the player draws tiles themselves. */
  drawManual(side: number, playerId: string, count: number, now: number): void {
    const s = this.state;
    this.assertActive();
    if (isAutoTiles(s.rules)) throw new GameError("NOT_ALLOWED", "Tiles are drawn automatically in this mode", [], "AUTO_TILES");
    const rack = s.sides[side].rack;
    const max = s.rules.rackSize - rack.length;
    if (!Number.isInteger(count) || count < 1 || count > max) throw new GameError("BAD_DRAW", `You can draw 1–${max} tiles`, [], "BAD_DRAW", { max });
    if (s.bag.length === 0) throw new GameError("BAG_EMPTY", "The bag is empty");
    const t = drawTiles(s.bag, count);
    rack.push(...t);
    this.record("DRAW", now, { sideIndex: side, playerId, drawnCount: t.length });
    this.bump();
  }

  resign(side: number, playerId: string, now: number): void {
    this.assertActive();
    this.record("RESIGN", now, { sideIndex: side, playerId });
    this.finish("RESIGN", now, side);
    this.bump();
  }

  // ───────────────────────────── pause ─────────────────────────────

  requestPause(side: number): void {
    const s = this.state;
    if (!s.rules.time.allowPause) throw new GameError("NOT_ALLOWED", "Pausing is disabled for this game", [], "PAUSE_DISABLED");
    if (s.phase !== "PLAYING" && s.phase !== "CHALLENGE_WINDOW") throw new GameError("BAD_PHASE", "Cannot pause now", [], "CANNOT_PAUSE");
    s.pauseRequestedBy = side;
    this.bump();
  }

  respondPause(side: number, acceptIt: boolean, now: number): void {
    const s = this.state;
    if (s.pauseRequestedBy === null || s.pauseRequestedBy === side) throw new GameError("BAD_PHASE", "No pause request to answer", [], "NO_PAUSE_REQUEST");
    s.pauseRequestedBy = null;
    if (acceptIt) this.pause(now);
    else this.bump();
  }

  pause(now: number): void {
    const s = this.state;
    if (s.phase !== "PLAYING" && s.phase !== "CHALLENGE_WINDOW") throw new GameError("BAD_PHASE", "Cannot pause now", [], "CANNOT_PAUSE");
    s.phaseBeforePause = s.phase;
    pauseClock(s.clock, now);
    s.phase = "PAUSED";
    s.pauseRequestedBy = null;
    this.record("PAUSE", now, {});
    this.bump();
  }

  resume(now: number): void {
    const s = this.state;
    if (s.phase !== "PAUSED") throw new GameError("BAD_PHASE", "The game is not paused", [], "NOT_PAUSED");
    s.phase = s.phaseBeforePause ?? "PLAYING";
    s.phaseBeforePause = null;
    startClock(s.clock, s.turn, now);
    this.record("RESUME", now, {});
    this.bump();
  }

  // ───────────────────────────── time ─────────────────────────────

  /** Advance server-side timers. Returns true if state changed. */
  tick(now: number): boolean {
    const s = this.state;
    if (s.phase === "CHALLENGE_RESULT" && s.challenge?.rechallengeDeadline && now >= s.challenge.rechallengeDeadline) {
      this.finalizeChallenge(s.challenge.first.valid, now);
      this.bump();
      return true;
    }
    if ((s.phase === "PLAYING" || s.phase === "CHALLENGE_WINDOW") && s.clock.runningSide !== null) {
      const side = s.clock.runningSide;
      const t = s.rules.time;
      const rem = remainingMs(s.clock, side, now);
      const endNow = (t.timeoutBehavior === "END_GAME" && rem <= 0)
        || (t.maxOvertimeMinutes !== null && -rem >= t.maxOvertimeMinutes * 60_000);
      if (endNow) {
        this.record("TIMEOUT", now, { sideIndex: side, note: `${s.sides[side].name} ran out of time` });
        this.finish("TIMEOUT", now, side);
        this.bump();
        return true;
      }
    }
    return false;
  }

  // ───────────────────────────── end ─────────────────────────────

  private finish(reason: EndReason, now: number, side?: number) {
    const s = this.state;
    if (s.phase === "FINISHED") return;
    if (s.pending && s.phase === "CHALLENGE_WINDOW") {
      // An unchallenged move stands when the game ends.
      const p = s.pending;
      s.sides[p.sideIndex].score += p.points;
      if (p.placements.length >= s.rules.scoring.bingoTileCount) s.sides[p.sideIndex].bingoCount++;
      s.pending = null;
      this.record("PLAY", now, {
        moveNumber: p.moveNumber, sideIndex: p.sideIndex, playerId: p.playerId, placements: p.placements,
        equations: p.equations.map((e) => e.text), scoreBreakdown: p.score, points: p.points,
        bingo: p.placements.length >= s.rules.scoring.bingoTileCount, status: "ACCEPTED", timeUsedMs: p.timeUsedMs, timestamp: p.submittedAt,
      });
    } else if (s.pending) {
      this.withdrawPending(now);
    }
    stopClock(s.clock, now);
    const eg = s.rules.endGame;
    const rackPts = s.sides.map((x) => rackPoints(x.rack));
    const adj = [0, 0];
    if (reason === "OUT" && side !== undefined) {
      const o = this.other(side);
      adj[side] += eg.outBonusMultiplier * rackPts[o];
      if (eg.deductFromOpponentOnOut) adj[o] -= rackPts[o];
    } else if ((reason === "PASSES" && eg.deductRackOnPassEnd) || (reason === "TIMEOUT" && eg.deductRackOnTimeoutEnd)) {
      adj[0] -= rackPts[0];
      adj[1] -= rackPts[1];
    }
    const sides: SideResult[] = s.sides.map((x, i) => {
      const over = overtimeMs(s.clock, i, now);
      const pen = timePenalty(over, s.rules.time.penaltyPointsPerMinute);
      return {
        sideIndex: i, boardScore: x.score, rackPoints: rackPts[i], endAdjustment: adj[i],
        timeUsedMs: usedMs(s.clock, i, now), overtimeMs: over, timePenalty: pen,
        finalScore: x.score + adj[i] - pen, bingoCount: x.bingoCount,
      };
    });
    let winnerSide: number | null;
    if (reason === "RESIGN" && side !== undefined) winnerSide = this.other(side);
    else if (sides[0].finalScore === sides[1].finalScore) winnerSide = null;
    else winnerSide = sides[0].finalScore > sides[1].finalScore ? 0 : 1;
    const result: GameResult = {
      reason, winnerSide, sides,
      scoreDifference: Math.abs(sides[0].finalScore - sides[1].finalScore),
      totalMoves: s.history.filter((h) => h.type === "PLAY" || h.type === "PASS" || h.type === "EXCHANGE").length,
      totalPlayingMs: s.startedAt ? now - s.startedAt : 0,
      endedAt: now,
      resignedSide: reason === "RESIGN" ? side : undefined,
    };
    s.result = result;
    s.phase = "FINISHED";
    s.pending = null;
    s.challenge = null;
    s.pauseRequestedBy = null;
    this.record("END", now, { note: reason, scoresAfter: sides.map((x) => x.finalScore) });
  }

  // ───────────────────────────── views ─────────────────────────────

  /**
   * Per-viewer projection. Never includes the bag or an opponent's rack.
   * `revealAll` is used only for finished-game replays.
   */
  view(viewerSide: number | null, now: number, opts: { revealAll?: boolean } = {}): GameView {
    const s = this.state;
    const reveal = !!opts.revealAll || s.phase === "FINISHED";
    const { bag, rng, sides, pending, history, ...rest } = s;
    void bag; void rng;
    const inWindow = s.phase === "CHALLENGE_WINDOW";
    return {
      ...structuredClone(rest),
      serverNow: now,
      viewerSide,
      bagCount: s.bag.length,
      sides: sides.map((x) => ({
        index: x.index, name: x.name, members: x.members, score: x.score, bingoCount: x.bingoCount,
        rackCount: x.rack.length,
        rack: reveal || viewerSide === x.index ? x.rack.map((t) => ({ ...t })) : undefined,
      })),
      pending: pending
        ? {
            ...structuredClone(pending),
            // Validity is hidden during the challenge window — the opponent must decide on their own.
            equations: pending.equations.map((e) => (inWindow ? { ...e, valid: true, error: undefined, sideValues: [] } : { ...e })),
          }
        : null,
      history: history.map((h) => {
        const c = { ...h };
        if (!reveal) delete c.racksAfter;
        return c;
      }),
    };
  }
}

export function sideOfPlayer(state: GameState, playerId: string): number | null {
  const i = state.sides.findIndex((s) => s.members.some((m) => m.id === playerId));
  return i < 0 ? null : i;
}
