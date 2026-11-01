/**
 * Scoring engine. For every equation formed by a move:
 *   1. each tile contributes its own points
 *   2. NEW tiles on piece premiums are multiplied (2× / 3×)
 *   3. tile scores are summed
 *   4. the sum is multiplied by every equation premium covered by a NEW tile
 * Premiums under tiles placed in earlier turns are never reused.
 * Bingo: +bonus when `bingoTileCount` tiles are placed in one move.
 */
import type { Sequence } from "../game-engine/placement";
import { premiumAt, type BoardLayout, type PremiumType } from "../game-rules/board-layout";
import type { ScoringRules } from "../game-rules/config";
import { symbolsToText } from "../math-validator";

export interface TileScoreDetail {
  row: number;
  col: number;
  value: string;
  basePoints: number;
  isNew: boolean;
  premium: PremiumType;
  pieceMultiplier: number;
  score: number;
}

export interface EquationScore {
  text: string;
  direction: "H" | "V";
  tiles: TileScoreDetail[];
  tileSum: number;
  equationMultiplier: number;
  equationMultipliers: number[];
  total: number;
}

export interface MoveScore {
  equations: EquationScore[];
  equationsTotal: number;
  bingo: boolean;
  bingoBonus: number;
  total: number;
}

export function scoreSequence(seq: Sequence, layout: BoardLayout, rules: ScoringRules): EquationScore {
  const tiles: TileScoreDetail[] = [];
  const eqMults: number[] = [];
  for (const cell of seq.cells) {
    const prem = premiumAt(layout, cell.row, cell.col);
    const pieceMult = cell.isNew ? prem.pieceMultiplier : 1;
    if (cell.isNew && prem.equationMultiplier > 1) eqMults.push(prem.equationMultiplier);
    const base = cell.tile.kind === "blank" ? 0 : cell.tile.points;
    tiles.push({
      row: cell.row, col: cell.col, value: cell.tile.value, basePoints: base, isNew: cell.isNew,
      premium: cell.isNew ? prem.type : "NORMAL", pieceMultiplier: pieceMult, score: base * pieceMult,
    });
  }
  const tileSum = tiles.reduce((s, t) => s + t.score, 0);
  const equationMultiplier = eqMults.length === 0
    ? 1
    : rules.equationMultiplierStacking === "MULTIPLY"
      ? eqMults.reduce((a, b) => a * b, 1)
      : eqMults.reduce((a, b) => a + b, 0);
  return {
    text: symbolsToText(seq.cells.map((c) => c.tile.value)),
    direction: seq.direction, tiles, tileSum, equationMultiplier, equationMultipliers: eqMults,
    total: tileSum * equationMultiplier,
  };
}

export function scoreMove(sequences: Sequence[], tilesPlaced: number, layout: BoardLayout, rules: ScoringRules): MoveScore {
  const scored = (rules.scoreCrossEquations ? sequences : sequences.slice(0, 1)).map((s) => scoreSequence(s, layout, rules));
  const equationsTotal = scored.reduce((s, e) => s + e.total, 0);
  const bingo = tilesPlaced >= rules.bingoTileCount;
  const bingoBonus = bingo ? rules.bingoBonus : 0;
  return { equations: scored, equationsTotal, bingo, bingoBonus, total: equationsTotal + bingoBonus };
}
