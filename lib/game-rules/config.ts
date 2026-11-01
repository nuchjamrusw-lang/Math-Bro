/**
 * Configurable rules. Every rule that is ambiguous or varies between tournaments lives here,
 * so the engine never hard-codes it. See docs/RULES_CONFIG.md for the meaning of each option.
 */
import { STANDARD_LAYOUT_ROWS } from "./board-layout";

export type ScoreManagement = "AUTO_SCORE_AUTO_TILES" | "AUTO_SCORE_ONLY" | "AUTO_TILES_ONLY" | "MANUAL";
export type ValidationMode = "CHALLENGE" | "STRICT";
export type TimeControlMode = "BLITZ" | "RAPID" | "STANDARD" | "CUSTOM";
export type TimeoutBehavior = "OVERTIME_PENALTY" | "END_GAME";

export interface MathRules {
  /** Max number of single-digit tiles that may be joined into one number (spec: 2-3). */
  maxDigitsPerNumber: number;
  /** Tiles 10–20 cannot be joined with other number tiles (standard A-Math). */
  allowJoiningTwoDigitTiles: boolean;
  /** A minus sign may make a number negative at the start of an equation side. */
  allowUnaryMinus: boolean;
  /** Equations may contain more than one '=' (e.g. 2+2=4=1+3). */
  allowMultipleEquals: boolean;
}

export interface ScoringRules {
  bingoTileCount: number;
  bingoBonus: number;
  /** How several equation multipliers in one equation combine. */
  equationMultiplierStacking: "MULTIPLY" | "ADD";
  /** Score every equation formed by a move (main + cross equations). */
  scoreCrossEquations: boolean;
}

export interface ChallengeRules {
  rechallengeEnabled: boolean;
  /** Seconds the losing side has to request a re-challenge after the first ruling. */
  rechallengeWindowSeconds: number;
  /** A failed challenge makes the challenger lose their turn. */
  failedChallengeLosesTurn: boolean;
  /** Count a lost turn from a failed challenge as a pass for the end-game pass rule. */
  countLostTurnAsPass: boolean;
  /** Count a withdrawn (successfully challenged) move as a pass for the end-game pass rule. */
  countWithdrawnMoveAsPass: boolean;
  /** In challenge mode, show validity in the move preview (helps but removes bluffing). */
  showValidityPreview: boolean;
}

export interface EndGameRules {
  /** Consecutive scoreless passes (all sides combined) that end the game. */
  consecutivePassesToEnd: number;
  countExchangeAsPass: boolean;
  /** Multiplier on the opponent's remaining rack points awarded to the player who goes out. */
  outBonusMultiplier: number;
  /** Also deduct remaining rack points from the opponent when a player goes out. */
  deductFromOpponentOnOut: boolean;
  /** On a pass-out end, deduct each side's remaining rack points from that side. */
  deductRackOnPassEnd: boolean;
  /** On a timeout end, deduct each side's remaining rack points from that side. */
  deductRackOnTimeoutEnd: boolean;
}

export interface TimeRules {
  mode: TimeControlMode;
  minutesPerSide: number;
  timeoutBehavior: TimeoutBehavior;
  penaltyPointsPerMinute: number;
  /** null = unlimited overtime. Otherwise game ends after this much overtime. */
  maxOvertimeMinutes: number | null;
  warningSeconds: number;
  allowPause: boolean;
}

export interface GameRulesConfig {
  layoutRows: string[];
  rackSize: number;
  exchangeMinBag: number;
  scoreManagement: ScoreManagement;
  validation: ValidationMode;
  math: MathRules;
  scoring: ScoringRules;
  challenge: ChallengeRules;
  endGame: EndGameRules;
  time: TimeRules;
}

export const TIME_PRESETS: Record<Exclude<TimeControlMode, "CUSTOM">, number> = {
  BLITZ: 5,
  RAPID: 12,
  STANDARD: 22,
};
export const CUSTOM_TIME_LIMITS = { min: 1, max: 90 };

export const DEFAULT_RULES: GameRulesConfig = {
  layoutRows: STANDARD_LAYOUT_ROWS,
  rackSize: 8,
  exchangeMinBag: 5,
  scoreManagement: "AUTO_SCORE_AUTO_TILES",
  validation: "CHALLENGE",
  math: {
    maxDigitsPerNumber: 3,
    allowJoiningTwoDigitTiles: false,
    allowUnaryMinus: true,
    allowMultipleEquals: true,
  },
  scoring: {
    bingoTileCount: 8,
    bingoBonus: 40,
    equationMultiplierStacking: "MULTIPLY",
    scoreCrossEquations: true,
  },
  challenge: {
    rechallengeEnabled: true,
    rechallengeWindowSeconds: 20,
    failedChallengeLosesTurn: true,
    countLostTurnAsPass: false,
    countWithdrawnMoveAsPass: false,
    showValidityPreview: false,
  },
  endGame: {
    consecutivePassesToEnd: 3,
    countExchangeAsPass: false,
    outBonusMultiplier: 2,
    deductFromOpponentOnOut: false,
    deductRackOnPassEnd: true,
    deductRackOnTimeoutEnd: true,
  },
  time: {
    mode: "STANDARD",
    minutesPerSide: 22,
    timeoutBehavior: "OVERTIME_PENALTY",
    penaltyPointsPerMinute: 10,
    maxOvertimeMinutes: null,
    warningSeconds: 60,
    allowPause: false,
  },
};

export function isAutoScore(c: GameRulesConfig): boolean {
  return c.scoreManagement === "AUTO_SCORE_AUTO_TILES" || c.scoreManagement === "AUTO_SCORE_ONLY";
}
export function isAutoTiles(c: GameRulesConfig): boolean {
  return c.scoreManagement === "AUTO_SCORE_AUTO_TILES" || c.scoreManagement === "AUTO_TILES_ONLY";
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? (T[K] extends unknown[] ? T[K] : DeepPartial<T[K]>) : T[K] };
export type RulesOverride = DeepPartial<GameRulesConfig>;

export function buildRules(override: RulesOverride = {}): GameRulesConfig {
  const base = structuredClone(DEFAULT_RULES);
  const merge = (t: Record<string, unknown>, s: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(s)) {
      if (v === undefined) continue;
      if (v && typeof v === "object" && !Array.isArray(v) && t[k] && typeof t[k] === "object") {
        merge(t[k] as Record<string, unknown>, v as Record<string, unknown>);
      } else t[k] = v;
    }
  };
  merge(base as unknown as Record<string, unknown>, override as Record<string, unknown>);
  if (base.time.mode !== "CUSTOM") base.time.minutesPerSide = TIME_PRESETS[base.time.mode];
  base.time.minutesPerSide = Math.min(CUSTOM_TIME_LIMITS.max, Math.max(CUSTOM_TIME_LIMITS.min, Math.round(base.time.minutesPerSide)));
  if (base.validation === "STRICT") base.challenge.showValidityPreview = true;
  return base;
}
