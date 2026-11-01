/** Rebuild the board/score/rack state at every recorded event, for the Replay viewer. */
import { createBoard, type Board } from "./board";
import type { MoveRecord } from "./types";
import type { Tile } from "../tile-manager";

export interface ReplayFrame {
  index: number;
  record: MoveRecord | null;
  board: Board;
  scores: number[];
  racks: Tile[][] | null;
  bagCount: number;
  /** Cells placed by this frame's move (for highlighting). */
  highlight: { row: number; col: number }[];
}

export function buildReplayFrames(history: MoveRecord[], size = 15): ReplayFrame[] {
  const frames: ReplayFrame[] = [];
  let board = createBoard(size);
  frames.push({ index: 0, record: null, board, scores: [0, 0], racks: null, bagCount: 100, highlight: [] });
  for (const rec of history) {
    let highlight: { row: number; col: number }[] = [];
    if (rec.type === "PLAY" && rec.status === "ACCEPTED" && rec.placements) {
      board = board.map((r) => r.slice());
      for (const p of rec.placements) {
        board[p.row][p.col] = {
          tileId: p.tileId, face: p.face, kind: p.kind, points: p.points, value: p.value,
          moveNumber: rec.moveNumber, sideIndex: rec.sideIndex ?? 0,
        };
      }
      highlight = rec.placements.map((p) => ({ row: p.row, col: p.col }));
    } else if (rec.type === "PLAY" && rec.placements) {
      highlight = rec.placements.map((p) => ({ row: p.row, col: p.col }));
    }
    frames.push({
      index: frames.length, record: rec, board, scores: rec.scoresAfter, racks: rec.racksAfter ?? null,
      bagCount: rec.bagCountAfter, highlight,
    });
  }
  return frames;
}
