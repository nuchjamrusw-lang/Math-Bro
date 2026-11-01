import { describe, expect, it } from "vitest";
import { buildReplayFrames, GameError } from "@/lib/game-engine";
import { buildRules } from "@/lib/game-rules/config";
import { scoreSequence } from "@/lib/scoring-engine";
import { STANDARD_LAYOUT } from "@/lib/game-rules/board-layout";
import type { Sequence } from "@/lib/game-engine/placement";
import type { BoardTile } from "@/lib/game-engine/board";
import { newGame, place, hRow, vCol, T0, ID } from "./helpers";

const STRICT = { validation: "STRICT" as const };
const tile = (value: string, points: number): BoardTile => ({ tileId: value, face: value as never, kind: "number", points, value: value as never, moveNumber: 1, sideIndex: 0 });

describe("scoring engine details", () => {
  it("two equation premiums in one equation multiply (2× and 3× → 6×)", () => {
    // Row 0: (0,0)=TE … (0,3)=DP … (0,7)=TE. A 8-long equation from col 0 to col 7 covers TE, DP, TE.
    const cells = ["1", "0", "+", "2", "=", "6", "+", "6"].map((v, i) => ({ row: 0, col: i, tile: tile(v, 1), isNew: true }));
    const seq: Sequence = { direction: "H", cells };
    const s = scoreSequence(seq, STANDARD_LAYOUT, buildRules().scoring);
    expect(s.equationMultipliers).toEqual([3, 3]);
    expect(s.equationMultiplier).toBe(9);
    // tiles 8×1 with one DP (col 3) → 9, ×9 = 81
    expect(s.tileSum).toBe(9);
    expect(s.total).toBe(81);
    const additive = scoreSequence(seq, STANDARD_LAYOUT, buildRules({ scoring: { equationMultiplierStacking: "ADD" } }).scoring);
    expect(additive.equationMultiplier).toBe(6);
  });

  it("existing tiles on premiums count at face value only", () => {
    const cells = [
      { row: 0, col: 0, tile: tile("5", 2), isNew: false }, // TE, old
      { row: 0, col: 1, tile: tile("=", 1), isNew: true },
      { row: 0, col: 2, tile: tile("5", 2), isNew: true },
    ];
    const s = scoreSequence({ direction: "H", cells }, STANDARD_LAYOUT, buildRules().scoring);
    expect(s.equationMultiplier).toBe(1);
    expect(s.total).toBe(5);
  });
});

describe("score & tile management modes", () => {
  it("manual score: the declared score is required and recorded", () => {
    const g = newGame({ rules: { ...STRICT, scoreManagement: "AUTO_TILES_ONLY" }, racks: [["6", "=", "6"], []] });
    expect(() => g.submitMove(0, ID(0), place(g, 0, hRow(7, 6, ["6", "=", "6"])), T0)).toThrow(GameError);
    g.submitMove(0, ID(0), place(g, 0, hRow(7, 6, ["6", "=", "6"])), T0, 11);
    expect(g.state.sides[0].score).toBe(11);
    expect(g.state.sides[0].rack).toHaveLength(8); // tiles still automatic
  });

  it("manual tiles: no automatic draw; the player draws with an explicit action", () => {
    const g = newGame({ rules: { ...STRICT, scoreManagement: "AUTO_SCORE_ONLY" }, racks: [["6", "=", "6"], []] });
    g.submitMove(0, ID(0), place(g, 0, hRow(7, 6, ["6", "=", "6"])), T0);
    expect(g.state.sides[0].score).toBe(7);
    expect(g.state.sides[0].rack).toHaveLength(5);
    expect(() => g.drawManual(0, ID(0), 4, T0 + 1)).toThrow(/1–3/);
    g.drawManual(0, ID(0), 3, T0 + 1);
    expect(g.state.sides[0].rack).toHaveLength(8);
    expect(g.state.history.at(-1)!.type).toBe("DRAW");
  });

  it("manual draw is rejected in automatic tile mode", () => {
    const g = newGame({ rules: STRICT });
    expect(() => g.drawManual(0, ID(0), 1, T0)).toThrow(/automatically/);
  });

  it("fully manual mode still validates in strict mode and keeps board/timer", () => {
    const g = newGame({ rules: { ...STRICT, scoreManagement: "MANUAL" }, racks: [["6", "=", "7"], []] });
    expect(() => g.submitMove(0, ID(0), place(g, 0, hRow(7, 6, ["6", "=", "7"])), T0, 5)).toThrow(/Sides are not equal/);
  });
});

describe("end of game variants", () => {
  it("challenge mode: going out ends the game once the move is accepted", () => {
    const g = newGame({ rules: { validation: "CHALLENGE" }, racks: [["6", "=", "6"], ["13"]] });
    g.state.sides[0].rack = g.state.sides[0].rack.filter((t) => t.face === "6" || t.face === "=").slice(0, 3);
    g.state.sides[1].rack = g.state.sides[1].rack.filter((t) => t.face === "13");
    g.state.bag = [];
    g.submitMove(0, ID(0), place(g, 0, hRow(7, 6, ["6", "=", "6"])), T0);
    expect(g.state.phase).toBe("CHALLENGE_WINDOW");
    g.accept(1, T0 + 1);
    expect(g.state.phase).toBe("FINISHED");
    expect(g.state.result!.reason).toBe("OUT");
    expect(g.state.result!.sides[0].endAdjustment).toBe(12); // 13 is worth 6 → ×2
  });

  it("END_GAME timeout: racks are deducted and the pending move stands", () => {
    const g = newGame({ rules: { validation: "CHALLENGE", time: { mode: "BLITZ", timeoutBehavior: "END_GAME" } }, racks: [["6", "=", "6"], []] });
    g.submitMove(0, ID(0), place(g, 0, hRow(7, 6, ["6", "=", "6"])), T0 + 1000);
    expect(g.tick(T0 + 1000 + 5 * 60_000)).toBe(true);
    const r = g.state.result!;
    expect(r.reason).toBe("TIMEOUT");
    expect(r.sides[0].boardScore).toBe(7);
    expect(r.sides[1].endAdjustment).toBeLessThan(0);
  });

  it("maxOvertimeMinutes ends the game after the configured overtime", () => {
    const g = newGame({ rules: { time: { mode: "BLITZ", maxOvertimeMinutes: 2 } } });
    expect(g.tick(T0 + 6 * 60_000)).toBe(false); // 1 min overtime → keeps going
    expect(g.tick(T0 + 7 * 60_000)).toBe(true);
    expect(g.state.result!.sides[g.state.turn].timePenalty).toBe(20);
  });

  it("exchanges do not count as passes by default but can be configured to", () => {
    const g = newGame({ rules: STRICT });
    g.pass(0, ID(0), T0 + 1);
    g.exchange(1, ID(1), [g.state.sides[1].rack[0].id], T0 + 2);
    expect(g.state.consecutivePasses).toBe(0);
    const g2 = newGame({ rules: { ...STRICT, endGame: { countExchangeAsPass: true } } });
    g2.pass(0, ID(0), T0 + 1);
    g2.exchange(1, ID(1), [g2.state.sides[1].rack[0].id], T0 + 2);
    g2.pass(0, ID(0), T0 + 3);
    expect(g2.state.phase).toBe("FINISHED");
  });
});

describe("replay", () => {
  it("rebuilds the board, scores and racks at every event", () => {
    const g = newGame({ rules: { validation: "CHALLENGE" }, racks: [["7", "×", "2", "=", "5", "+", "8", "6"], ["=", "6", "1"]] });
    // invalid move, challenged & withdrawn
    g.submitMove(0, ID(0), place(g, 0, hRow(7, 4, ["7", "×", "2", "=", "5", "+", "8"])), T0 + 1);
    g.challenge(1, ID(1), T0 + 2);
    g.acceptChallengeResult(0, T0 + 3);
    // B plays 6 = 6? B has "=", "6" plus fillers; play vertical through center
    g.submitMove(1, ID(1), place(g, 1, [[7, 6, "6"], [7, 7, "="], [7, 8, "1"]]), T0 + 4); // wrong but unchallenged
    g.accept(0, T0 + 5);
    g.resign(0, ID(0), T0 + 6);
    const frames = buildReplayFrames(g.state.history);
    const withdrawn = frames.find((f) => f.record?.status === "WITHDRAWN")!;
    expect(withdrawn.board.flat().filter(Boolean)).toHaveLength(0);
    const accepted = frames.find((f) => f.record?.type === "PLAY" && f.record.status === "ACCEPTED")!;
    expect(accepted.board[7][7]!.value).toBe("=");
    expect(accepted.scores[1]).toBeGreaterThan(0);
    expect(accepted.racks![1]).toHaveLength(8);
    // stepping backwards gives the earlier state
    expect(frames[accepted.index - 1].board[7][7]).toBeNull();
  });
});

describe("placement edge cases", () => {
  it("single tile that extends an equation is validated in both directions", () => {
    const g = newGame({ rules: STRICT, racks: [["5", "×", "0", "=", "0"], ["1"]] });
    g.submitMove(0, ID(0), place(g, 0, hRow(7, 7, ["5", "×", "0", "=", "0"])), T0);
    g.submitMove(1, ID(1), place(g, 1, [[7, 6, "1"]]), T0 + 1); // "15 × 0 = 0"
    expect(g.state.board[7][6]!.value).toBe("1");
    expect(g.state.history.at(-1)!.equations).toEqual(["15 × 0 = 0"]);
  });

  it("a two-tile 'equation' without '=' is rejected", () => {
    const g = newGame({ rules: STRICT, racks: [["6", "=", "6"], ["1", "2"]] });
    g.submitMove(0, ID(0), place(g, 0, hRow(7, 6, ["6", "=", "6"])), T0);
    expect(() => g.submitMove(1, ID(1), place(g, 1, vCol(8, 6, ["1"])), T0 + 1)).toThrow(GameError); // "61" vertical: no '='
  });
});

describe("tile tracking (unseen tiles)", () => {
  it("unseen = bag + opponent rack, built only from public information", async () => {
    const { unseenTiles } = await import("@/lib/game-engine");
    const g = newGame({ rules: STRICT, racks: [["6", "=", "6"], []] });
    g.submitMove(0, ID(0), place(g, 0, hRow(7, 6, ["6", "=", "6"])), T0);
    for (const side of [0, 1]) {
      const v = g.view(side, T0);
      const u = unseenTiles(v, side);
      expect(u.total).toBe(v.bagCount + v.sides[1 - side].rackCount);
      // it must match the real hidden tiles exactly, face by face
      const hidden = [...g.state.bag, ...g.state.sides[1 - side].rack];
      for (const e of u.entries) expect(e.unseen).toBe(hidden.filter((t) => t.face === e.def.face).length);
    }
    const spec = unseenTiles(g.view(null, T0), null);
    expect(spec.total).toBe(g.state.bag.length + 16);
  });
});
