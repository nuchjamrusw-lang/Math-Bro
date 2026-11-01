import { describe, expect, it } from "vitest";
import { STANDARD_LAYOUT, STANDARD_LAYOUT_ROWS, parseLayout, PREMIUM_INFO } from "@/lib/game-rules/board-layout";
import { STANDARD_TILE_SET, totalTileCount } from "@/lib/game-rules/tiles";
import { createTileSet, drawOrderRank, rackPoints } from "@/lib/tile-manager";

describe("board layout", () => {
  it("has 225 cells in a 15×15 grid", () => {
    expect(STANDARD_LAYOUT.size).toBe(15);
    expect(STANDARD_LAYOUT.cells.flat()).toHaveLength(225);
    STANDARD_LAYOUT.cells.forEach((r) => expect(r).toHaveLength(15));
  });
  it("has exactly one center star at (7,7) acting as 3× piece", () => {
    expect(STANDARD_LAYOUT.center).toEqual({ row: 7, col: 7 });
    expect(STANDARD_LAYOUT.cells.flat().filter((t) => t === "STAR")).toHaveLength(1);
    expect(PREMIUM_INFO.STAR.pieceMultiplier).toBe(3);
  });
  it("premium squares are fixed data with the expected counts", () => {
    const count = (t: string) => STANDARD_LAYOUT.cells.flat().filter((x) => x === t).length;
    expect(count("TE")).toBe(8);
    expect(count("DE")).toBe(16);
    expect(count("TP")).toBe(12);
    expect(count("DP")).toBe(24);
    expect(STANDARD_LAYOUT.cells[0][0]).toBe("TE");
    expect(STANDARD_LAYOUT.cells[1][1]).toBe("DE");
    expect(STANDARD_LAYOUT.cells[1][5]).toBe("TP");
    expect(STANDARD_LAYOUT.cells[0][3]).toBe("DP");
  });
  it("is symmetric in both axes and both diagonals", () => {
    const c = STANDARD_LAYOUT.cells;
    for (let r = 0; r < 15; r++) for (let k = 0; k < 15; k++) {
      expect(c[r][k]).toBe(c[14 - r][k]);
      expect(c[r][k]).toBe(c[r][14 - k]);
      expect(c[r][k]).toBe(c[k][r]);
    }
  });
  it("coordinates are unique and the parser rejects bad layouts", () => {
    const keys = new Set<string>();
    STANDARD_LAYOUT.cells.forEach((row, r) => row.forEach((_, k) => keys.add(`${r},${k}`)));
    expect(keys.size).toBe(225);
    expect(() => parseLayout(STANDARD_LAYOUT_ROWS.map((r) => r.replace("*", ".")))).toThrow();
    expect(() => parseLayout(["R..", "..."])).toThrow();
  });
});

describe("tile set", () => {
  it("contains exactly 100 tiles", () => {
    expect(totalTileCount()).toBe(100);
    expect(createTileSet()).toHaveLength(100);
  });
  it("matches the official distribution and points", () => {
    const get = (f: string) => STANDARD_TILE_SET.find((d) => d.face === f)!;
    expect(get("0")).toMatchObject({ count: 5, points: 1 });
    expect(get("1")).toMatchObject({ count: 6, points: 1 });
    expect(get("13")).toMatchObject({ count: 1, points: 6 });
    expect(get("19")).toMatchObject({ count: 1, points: 7 });
    expect(get("=")).toMatchObject({ count: 11, points: 1 });
    expect(get("+/-")).toMatchObject({ count: 5, points: 1 });
    expect(get("×/÷")).toMatchObject({ count: 4, points: 1 });
    expect(get("BLANK")).toMatchObject({ count: 4, points: 0 });
  });
  it("draw-order rank: BLANK highest, then 20 … 0, operators lowest", () => {
    const tiles = createTileSet();
    const r = (f: string) => drawOrderRank(tiles.find((t) => t.face === f)!);
    expect(r("BLANK")).toBeGreaterThan(r("20"));
    expect(r("20")).toBeGreaterThan(r("19"));
    expect(r("0")).toBeGreaterThan(r("+"));
    expect(r("=")).toBe(r("×/÷"));
  });
  it("blank is worth 0 rack points", () => {
    const tiles = createTileSet();
    expect(rackPoints(tiles.filter((t) => t.face === "BLANK"))).toBe(0);
  });
});
