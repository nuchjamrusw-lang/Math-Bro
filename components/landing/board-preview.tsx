"use client";
import { useMemo } from "react";
import { GameBoard } from "@/components/board/board";
import { buildSampleBoard } from "@/lib/game-engine/sample-board";
import { STANDARD_LAYOUT } from "@/lib/game-rules/board-layout";

/** Landing-page board: real, engine-validated moves (see lib/game-engine/sample-board.ts). */
export function BoardPreview() {
  const { board, highlight } = useMemo(() => {
    const s = buildSampleBoard();
    return { board: s.board, highlight: new Set(s.lastMove.map((c) => `${c.row},${c.col}`)) };
  }, []);
  return <GameBoard board={board} layout={STANDARD_LAYOUT} highlight={highlight} />;
}
