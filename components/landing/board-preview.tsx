"use client";
import { useMemo } from "react";
import { GameBoard } from "@/components/board/board";
import { createBoard } from "@/lib/game-engine/board";
import { STANDARD_LAYOUT } from "@/lib/game-rules/board-layout";
import { getTileDefinition, type Symbol, type TileFace } from "@/lib/game-rules/tiles";

function put(board: ReturnType<typeof createBoard>, r: number, c: number, dir: "H" | "V", items: (TileFace | [TileFace, Symbol])[]) {
  items.forEach((it, i) => {
    const [face, value] = Array.isArray(it) ? it : [it, it as Symbol];
    const d = getTileDefinition(face);
    board[dir === "V" ? r + i : r][dir === "H" ? c + i : c] = { tileId: `p${r}${c}${i}`, face, kind: d.kind, points: d.points, value, moveNumber: 1, sideIndex: 0 };
  });
}

export function BoardPreview() {
  const board = useMemo(() => {
    const b = createBoard();
    put(b, 7, 4, "H", ["7", "×", "2", "=", "5", "+", "9"]);
    put(b, 3, 10, "V", ["1", "2", "÷", "3", "=", "4"]);
    put(b, 9, 3, "H", ["1", "8", ["BLANK", "÷"], "6", "=", "3"]);
    put(b, 4, 6, "V", ["2", "+", "4"]);
    return b;
  }, []);
  const highlight = useMemo(() => new Set(["9,3", "9,4", "9,5", "9,6", "9,7", "9,8"]), []);
  return <GameBoard board={board} layout={STANDARD_LAYOUT} highlight={highlight} />;
}
