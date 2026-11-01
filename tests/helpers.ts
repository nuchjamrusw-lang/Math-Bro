import { GameEngine, type CreateGameOptions } from "@/lib/game-engine";
import type { RulesOverride } from "@/lib/game-rules";
import type { Symbol, TileFace } from "@/lib/game-rules/tiles";

export const T0 = 1_700_000_000_000;

export function newGame(opts: { rules?: RulesOverride; racks?: [TileFace[], TileFace[]]; first?: number; referee?: boolean; seed?: number } = {}) {
  const racks = opts.racks ?? [[], []];
  // The starter draws first, so order the bag accordingly and pad racks to 8.
  const first = opts.first ?? 0;
  const order = first === 0 ? [racks[0], racks[1]] : [racks[1], racks[0]];
  const pad = (faces: TileFace[], used: TileFace[]): TileFace[] => {
    const res = [...faces];
    const fillers: TileFace[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "1", "2"];
    let i = 0;
    while (res.length < 8) {
      const f = fillers[i++];
      res.push(f);
    }
    void used;
    return res;
  };
  const a = pad(order[0], []);
  const b = pad(order[1], a);
  const config: CreateGameOptions = {
    id: "test",
    rules: opts.rules,
    sides: [
      { name: "Alpha", members: [{ id: "u1", name: "Alpha" }] },
      { name: "Bravo", members: [{ id: "u2", name: "Bravo" }] },
    ],
    seed: opts.seed ?? 42,
    bagOrder: [...a, ...b],
    firstSide: first,
    hasReferee: opts.referee,
  };
  const g = GameEngine.create(config);
  g.start(T0);
  return g;
}

/** Find a rack tile for each requested face and produce placement input. */
export function place(g: GameEngine, side: number, cells: [number, number, TileFace, Symbol?][]) {
  const rack = [...g.state.sides[side].rack];
  return cells.map(([row, col, face, value]) => {
    const i = rack.findIndex((t) => t.face === face);
    if (i < 0) throw new Error(`Side ${side} has no '${face}' tile; rack=${rack.map((t) => t.face).join(",")}`);
    const t = rack.splice(i, 1)[0];
    return { tileId: t.id, row, col, value };
  });
}

/** Lay out a horizontal sequence of faces starting at (row, col). */
export function hRow(row: number, col: number, faces: TileFace[]): [number, number, TileFace][] {
  return faces.map((f, i) => [row, col + i, f]);
}
export function vCol(row: number, col: number, faces: TileFace[]): [number, number, TileFace][] {
  return faces.map((f, i) => [row + i, col, f]);
}

export const ID = (side: number) => (side === 0 ? "u1" : "u2");
