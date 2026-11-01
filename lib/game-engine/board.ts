import type { Symbol, TileFace, TileKind } from "../game-rules/tiles";

export interface BoardTile {
  tileId: string;
  face: TileFace;
  kind: TileKind;
  points: number;
  /** The symbol the tile represents (chosen value for BLANK and +/-, ×/÷). */
  value: Symbol;
  moveNumber: number;
  sideIndex: number;
}

export type Board = (BoardTile | null)[][];

export interface Coord { row: number; col: number }

export function createBoard(size = 15): Board {
  return Array.from({ length: size }, () => Array<BoardTile | null>(size).fill(null));
}

export function inBounds(board: Board, r: number, c: number): boolean {
  return r >= 0 && c >= 0 && r < board.length && c < board.length;
}

export function isBoardEmpty(board: Board): boolean {
  return board.every((row) => row.every((c) => c === null));
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((c) => (c ? { ...c } : null)));
}
