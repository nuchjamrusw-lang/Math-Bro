import type { Board } from "./board";
import type { Tile } from "../tile-manager";
import type { GameRulesConfig } from "../game-rules/config";
import type { ClockState } from "../timer-engine";
import type { Symbol } from "../game-rules/tiles";
import type { MoveScore } from "../scoring-engine";
import type { ValidationError } from "../math-validator/errors";

export interface SideMember { id: string; name: string }

export interface SideState {
  index: number;
  name: string;
  members: SideMember[];
  rack: Tile[];
  /** Score from moves (board points + bingo, or declared in manual mode). */
  score: number;
  bingoCount: number;
}

/** What the client sends: which rack tile goes where, and its chosen symbol if needed. */
export interface PlacementInput {
  tileId: string;
  row: number;
  col: number;
  value?: Symbol;
}

export interface ResolvedPlacement {
  tileId: string;
  row: number;
  col: number;
  value: Symbol;
  face: Tile["face"];
  points: number;
  kind: Tile["kind"];
}

export interface EquationResult {
  text: string;
  direction: "H" | "V";
  valid: boolean;
  sideValues: string[];
  error?: ValidationError;
  cells: { row: number; col: number }[];
}

export type Phase =
  | "WAITING"
  | "PLAYING"
  | "CHALLENGE_WINDOW"
  | "CHALLENGE_RESULT"
  | "REFEREE_REVIEW"
  | "PAUSED"
  | "FINISHED";

export interface PendingMove {
  moveNumber: number;
  sideIndex: number;
  playerId: string;
  placements: ResolvedPlacement[];
  equations: EquationResult[];
  score: MoveScore | null;
  declaredScore: number | null;
  /** Points that will be credited if the move stands. */
  points: number;
  timeUsedMs: number;
  submittedAt: number;
}

export interface ChallengeCheck {
  valid: boolean;
  by: "SYSTEM" | "REFEREE";
  refereeId?: string;
  errors: ValidationError[];
  equations: EquationResult[];
  checkedAt: number;
}

export interface ChallengeRecord {
  id: string;
  moveNumber: number;
  challengerSide: number;
  challengerId: string;
  challengedSide: number;
  challengedId: string;
  equations: string[];
  requestedAt: number;
  first: ChallengeCheck;
  rechallenge?: { requestedBy: string; requestedSide: number; requestedAt: number };
  second?: ChallengeCheck;
  finalRuling?: "VALID" | "INVALID";
  resolvedAt?: number;
  /** Deadline for the losing side to request a re-challenge. */
  rechallengeDeadline?: number;
}

export type MoveType =
  | "START" | "PLAY" | "PASS" | "EXCHANGE" | "CHALLENGE" | "RECHALLENGE" | "DRAW"
  | "PAUSE" | "RESUME" | "RESIGN" | "TIMEOUT" | "END";

export interface MoveRecord {
  seq: number;
  moveNumber: number;
  type: MoveType;
  sideIndex: number | null;
  playerId: string | null;
  placements?: ResolvedPlacement[];
  equations?: string[];
  scoreBreakdown?: MoveScore | null;
  points: number;
  bingo?: boolean;
  /** PLAY status: ACCEPTED or WITHDRAWN (successfully challenged). */
  status?: "ACCEPTED" | "WITHDRAWN";
  exchangedCount?: number;
  drawnCount?: number;
  challengeId?: string;
  timeUsedMs: number;
  timestamp: number;
  scoresAfter: number[];
  /** Private: racks after this event (replay only, stripped from live views). */
  racksAfter?: Tile[][];
  bagCountAfter: number;
  note?: string;
}

export type EndReason = "OUT" | "PASSES" | "TIMEOUT" | "RESIGN";

export interface SideResult {
  sideIndex: number;
  boardScore: number;
  rackPoints: number;
  endAdjustment: number;
  timeUsedMs: number;
  overtimeMs: number;
  timePenalty: number;
  finalScore: number;
  bingoCount: number;
}

export interface GameResult {
  reason: EndReason;
  winnerSide: number | null; // null = draw
  sides: SideResult[];
  scoreDifference: number;
  totalMoves: number;
  totalPlayingMs: number;
  endedAt: number;
  resignedSide?: number;
}

export interface DrawOrderRound { draws: { sideIndex: number; face: Tile["face"] }[] }

export interface GameState {
  id: string;
  version: number;
  rules: GameRulesConfig;
  hasReferee: boolean;
  phase: Phase;
  phaseBeforePause: Phase | null;
  pauseRequestedBy: number | null;
  sides: SideState[];
  board: Board;
  bag: Tile[];
  rng: number;
  turn: number;
  moveNumber: number;
  consecutivePasses: number;
  turnStartedAt: number | null;
  startedAt: number | null;
  clock: ClockState;
  drawOrder: DrawOrderRound[];
  pending: PendingMove | null;
  challenge: ChallengeRecord | null;
  challenges: ChallengeRecord[];
  history: MoveRecord[];
  result: GameResult | null;
  seq: number;
}
