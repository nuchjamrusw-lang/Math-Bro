/**
 * Demo board for the landing page, built by playing real moves through the placement analyser and
 * equation validator — so it can only ever show connected, mathematically correct equations.
 */
import { createBoard, type Board } from "./board";
import { analyzePlacement, sequenceSymbols, type NewTile } from "./placement";
import { validateEquation } from "../math-validator";
import { STANDARD_LAYOUT } from "../game-rules/board-layout";
import { getTileDefinition, type Symbol, type TileFace } from "../game-rules/tiles";

type Cell = [row: number, col: number, face: TileFace, value?: Symbol];

export const SAMPLE_MOVES: Cell[][] = [
  // 7 × 2 = 5 + 9 through the center star
  [[7, 4, "7"], [7, 5, "×"], [7, 6, "2"], [7, 7, "="], [7, 8, "5"], [7, 9, "+"], [7, 10, "9"]],
  // 3 × 3 = 9 (vertical, ends on the 9)
  [[3, 10, "3"], [4, 10, "×"], [5, 10, "3"], [6, 10, "="]],
  // 12 ÷ 4 = 3 (horizontal, ends on the 3)
  [[3, 5, "1"], [3, 6, "2"], [3, 7, "÷"], [3, 8, "4"], [3, 9, "="]],
  // 7 − 1 = 6 (vertical, starts on the 7)
  [[8, 4, "-"], [9, 4, "1"], [10, 4, "="], [11, 4, "6"]],
  // 6 = 2 × 3 with a BLANK used as ×
  [[11, 5, "="], [11, 6, "2"], [11, 7, "BLANK", "×"], [11, 8, "3"]],
];

export function buildSampleBoard(moves: Cell[][] = SAMPLE_MOVES): { board: Board; lastMove: { row: number; col: number }[]; equations: string[] } {
  let board = createBoard(STANDARD_LAYOUT.size);
  const equations: string[] = [];
  moves.forEach((move, m) => {
    const placed: NewTile[] = move.map(([row, col, face, value]) => {
      const d = getTileDefinition(face);
      return { tileId: `s${m}-${row}-${col}`, face, kind: d.kind, points: d.points, value: value ?? d.options[0], moveNumber: m + 1, sideIndex: m % 2, row, col };
    });
    const a = analyzePlacement(board, STANDARD_LAYOUT, placed);
    if (!a.ok) throw new Error(`Sample move ${m + 1} is not a legal placement: ${a.error.message}`);
    for (const seq of a.sequences) {
      const check = validateEquation(sequenceSymbols(seq));
      if (!check.valid) throw new Error(`Sample move ${m + 1} forms an invalid equation "${check.text}": ${check.error?.message}`);
      equations.push(check.text);
    }
    board = board.map((r) => r.slice());
    for (const p of placed) board[p.row][p.col] = { tileId: p.tileId, face: p.face, kind: p.kind, points: p.points, value: p.value, moveNumber: p.moveNumber, sideIndex: p.sideIndex };
  });
  const last = moves[moves.length - 1].map(([row, col]) => ({ row, col }));
  return { board, lastMove: last, equations };
}
