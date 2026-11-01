/**
 * Board placement analysis: geometry rules (line, contiguity, connection, center) and
 * extraction of every equation (horizontal & vertical) affected by a move.
 */
import type { Board, BoardTile, Coord } from "./board";
import { inBounds, isBoardEmpty } from "./board";
import type { BoardLayout } from "../game-rules/board-layout";
import type { ValidationError } from "../math-validator/errors";

export interface NewTile extends BoardTile, Coord {}

export interface SequenceCell extends Coord {
  tile: BoardTile;
  isNew: boolean;
}

export interface Sequence {
  direction: "H" | "V";
  cells: SequenceCell[];
}

export type PlacementAnalysis =
  | { ok: true; sequences: Sequence[]; direction: "H" | "V" }
  | { ok: false; error: ValidationError };

const err = (code: ValidationError["code"], message: string, cells: Coord[] | undefined, reason: string): PlacementAnalysis => ({
  ok: false,
  error: { code, message, cells, reason },
});

function readSequence(board: Board, overlay: Map<string, NewTile>, start: Coord, dir: "H" | "V"): Sequence {
  const dr = dir === "V" ? 1 : 0;
  const dc = dir === "H" ? 1 : 0;
  const at = (r: number, c: number): { tile: BoardTile; isNew: boolean } | null => {
    if (!inBounds(board, r, c)) return null;
    const n = overlay.get(`${r},${c}`);
    if (n) return { tile: n, isNew: true };
    const b = board[r][c];
    return b ? { tile: b, isNew: false } : null;
  };
  let r = start.row, c = start.col;
  while (at(r - dr, c - dc)) { r -= dr; c -= dc; }
  const cells: SequenceCell[] = [];
  while (true) {
    const cell = at(r, c);
    if (!cell) break;
    cells.push({ row: r, col: c, ...cell });
    r += dr; c += dc;
  }
  return { direction: dir, cells };
}

export function analyzePlacement(board: Board, layout: BoardLayout, placed: NewTile[]): PlacementAnalysis {
  if (placed.length === 0) return err("INVALID_BOARD_PLACEMENT", "Place at least one tile", undefined, "placeNone");
  const seen = new Set<string>();
  for (const p of placed) {
    const k = `${p.row},${p.col}`;
    if (!inBounds(board, p.row, p.col)) return err("INVALID_BOARD_PLACEMENT", "Tile is outside the board", [p], "outside");
    if (board[p.row][p.col]) return err("INVALID_BOARD_PLACEMENT", "That square is already occupied", [p], "occupied");
    if (seen.has(k)) return err("INVALID_BOARD_PLACEMENT", "Two tiles cannot share a square", [p], "sameSquare");
    seen.add(k);
  }
  const rows = new Set(placed.map((p) => p.row));
  const cols = new Set(placed.map((p) => p.col));
  let direction: "H" | "V";
  if (rows.size === 1 && cols.size === 1) direction = "H"; // single tile, refined below
  else if (rows.size === 1) direction = "H";
  else if (cols.size === 1) direction = "V";
  else return err("INVALID_BOARD_PLACEMENT", "Tiles must be placed in a single row or column (no diagonals)", placed, "notLine");

  const overlay = new Map(placed.map((p) => [`${p.row},${p.col}`, p] as const));

  // Contiguity along the line (gaps may only be filled by existing tiles).
  if (placed.length > 1) {
    const fixed = direction === "H" ? placed[0].row : placed[0].col;
    const along = placed.map((p) => (direction === "H" ? p.col : p.row));
    const min = Math.min(...along), max = Math.max(...along);
    for (let i = min; i <= max; i++) {
      const r = direction === "H" ? fixed : i;
      const c = direction === "H" ? i : fixed;
      if (!overlay.has(`${r},${c}`) && !board[r][c]) {
        return err("INVALID_BOARD_PLACEMENT", "Tiles in a move must form one continuous line", placed, "gap");
      }
    }
  }

  const firstMove = isBoardEmpty(board);
  if (firstMove) {
    const { row, col } = layout.center;
    if (!overlay.has(`${row},${col}`)) return err("NOT_ON_CENTER", "The first equation must cover the center star", placed, "center");
  } else {
    const touches = placed.some((p) =>
      [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dr, dc]) => inBounds(board, p.row + dr, p.col + dc) && board[p.row + dr][p.col + dc]),
    );
    if (!touches) return err("MISSING_CONNECTION", "At least one new tile must touch a tile already on the board", placed, "connect");
  }

  const sequences: Sequence[] = [];
  if (placed.length === 1) {
    for (const d of ["H", "V"] as const) {
      const s = readSequence(board, overlay, placed[0], d);
      if (s.cells.length >= 2) sequences.push(s);
    }
    if (sequences.length) direction = sequences[0].direction;
  } else {
    const main = readSequence(board, overlay, placed[0], direction);
    sequences.push(main);
    const cross = direction === "H" ? "V" : "H";
    for (const p of placed) {
      const s = readSequence(board, overlay, p, cross);
      if (s.cells.length >= 2) sequences.push(s);
    }
  }
  if (sequences.length === 0) return err("NO_EQUATION_FORMED", "This move does not form an equation", placed, "noEquation");
  return { ok: true, sequences, direction };
}

export function sequenceSymbols(seq: Sequence): string[] {
  return seq.cells.map((c) => c.tile.value);
}
