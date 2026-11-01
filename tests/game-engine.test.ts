import { describe, expect, it } from "vitest";
import { GameEngine, GameError } from "@/lib/game-engine";
import { timePenalty } from "@/lib/timer-engine";
import { newGame, place, hRow, vCol, T0, ID } from "./helpers";
import type { TileFace } from "@/lib/game-rules/tiles";

const STRICT = { validation: "STRICT" as const };

function expectGameError(fn: () => unknown, code?: string) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(GameError);
    if (code) expect((e as GameError).code).toBe(code);
    return e as GameError;
  }
  throw new Error("expected GameError");
}

describe("first move", () => {
  it("valid first equation through the center scores with the star (3× piece)", () => {
    const g = newGame({ rules: STRICT, racks: [["7", "×", "2", "=", "5", "+", "9"], []] });
    g.submitMove(0, ID(0), place(g, 0, hRow(7, 4, ["7", "×", "2", "=", "5", "+", "9"])), T0 + 1000);
    // 7(2) ×(2) 2(1) =(1→×3 star) 5(2) +(2) 9(2) = 14
    expect(g.state.sides[0].score).toBe(14);
    expect(g.state.sides[0].rack).toHaveLength(8);
    expect(g.state.turn).toBe(1);
    expect(g.state.bag.length).toBe(100 - 16 - 7);
  });

  it("12. first move not covering the center fails", () => {
    const g = newGame({ rules: STRICT, racks: [["6", "=", "6"], []] });
    expectGameError(() => g.submitMove(0, ID(0), place(g, 0, hRow(3, 3, ["6", "=", "6"])), T0), "NOT_ON_CENTER");
  });

  it("diagonal placement fails", () => {
    const g = newGame({ rules: STRICT, racks: [["6", "=", "6"], []] });
    expectGameError(() => g.submitMove(0, ID(0), place(g, 0, [[6, 6, "6"], [7, 7, "="], [8, 8, "6"]]), T0), "INVALID_BOARD_PLACEMENT");
  });

  it("gapped placement fails", () => {
    const g = newGame({ rules: STRICT, racks: [["6", "=", "6"], []] });
    expectGameError(() => g.submitMove(0, ID(0), place(g, 0, [[7, 6, "6"], [7, 7, "="], [7, 9, "6"]]), T0), "INVALID_BOARD_PLACEMENT");
  });

  it("14. playing all 8 tiles earns the 40-point bingo", () => {
    const faces: TileFace[] = ["1", "8", "=", "9", "+", "3", "×", "3"];
    const g = newGame({ rules: STRICT, racks: [faces, []] });
    g.submitMove(0, ID(0), place(g, 0, hRow(7, 0, faces)), T0);
    // 1@TE(1) 8(2) =(1) 9@DP(4) +(2) 3(1) ×(2) 3@STAR(3) = 16 ×3 = 48, +40 bingo
    expect(g.state.sides[0].score).toBe(88);
    expect(g.state.sides[0].bingoCount).toBe(1);
    const play = g.state.history.find((h) => h.type === "PLAY")!;
    expect(play.bingo).toBe(true);
    expect(play.scoreBreakdown!.bingoBonus).toBe(40);
    expect(play.scoreBreakdown!.equations[0].equationMultiplier).toBe(3);
  });

  it("blank keeps 0 points while representing another symbol", () => {
    const g = newGame({ rules: STRICT, racks: [["6", "BLANK", "6"], []] });
    g.submitMove(0, ID(0), place(g, 0, [[7, 6, "6"], [7, 7, "BLANK", "="], [7, 8, "6"]]), T0);
    // 6(2) + blank(0 even on star) + 6(2)
    expect(g.state.sides[0].score).toBe(4);
    expect(g.state.board[7][7]).toMatchObject({ face: "BLANK", value: "=", points: 0 });
  });

  it("blank / choice tiles must be assigned before playing", () => {
    const g = newGame({ rules: STRICT, racks: [["6", "BLANK", "6", "+/-"], []] });
    expectGameError(() => g.submitMove(0, ID(0), place(g, 0, hRow(7, 6, ["6", "BLANK", "6"])), T0), "UNASSIGNED_TILE");
    expectGameError(() => g.submitMove(0, ID(0), place(g, 0, [[7, 6, "6"], [7, 7, "+/-", "="], [7, 8, "6"]]), T0), "UNASSIGNED_TILE");
  });
});

/** Board: row 7 "5 × 0 = 0" from (7,7). */
function crossSetup(rules: object = STRICT) {
  const g = newGame({ rules, racks: [["5", "×", "0", "=", "0"], ["1", "=", "1", "2", "3"]] });
  g.submitMove(0, ID(0), place(g, 0, hRow(7, 7, ["5", "×", "0", "=", "0"])), T0);
  return g;
}

describe("subsequent moves & intersecting equations", () => {
  it("first setup scores 5@star(6)+×(2)+0(1)+=(1)+0@DP(2) = 12", () => {
    expect(crossSetup().state.sides[0].score).toBe(12);
  });

  it("11. a move not touching existing tiles fails", () => {
    const g = crossSetup();
    expectGameError(() => g.submitMove(1, ID(1), place(g, 1, vCol(0, 0, ["1", "=", "1"])), T0 + 1), "MISSING_CONNECTION");
  });

  it("validates & scores both the vertical and the horizontal equation created by one move", () => {
    const g = crossSetup();
    const prev = g.preview(1, place(g, 1, vCol(5, 6, ["1", "=", "1"])));
    expect(prev.ok).toBe(true);
    expect(prev.equations.map((e) => e.text).sort()).toEqual(["1 = 1", "15 × 0 = 0"]);
    expect(prev.allValid).toBe(true);
    g.submitMove(1, ID(1), place(g, 1, vCol(5, 6, ["1", "=", "1"])), T0 + 2);
    // vertical: 1 + =@DP(2) + 1 = 4 ; horizontal "15×0=0": 1 + 2(5 on used star) + 2 + 1 + 1 + 1 = 8
    expect(g.state.sides[1].score).toBe(12);
  });

  it("rejects the whole move if any one affected equation is wrong", () => {
    const g = crossSetup();
    // col 12: 1 = 1 is fine, but row 7 becomes "5×0=01" (leading zero)
    const prev = g.preview(1, place(g, 1, vCol(7, 12, ["1", "=", "1"])));
    expect(prev.allValid).toBe(false);
    expect(prev.errors[0].code).toBe("INVALID_NUMBER_FORMATION");
    expectGameError(() => g.submitMove(1, ID(1), place(g, 1, vCol(7, 12, ["1", "=", "1"])), T0 + 2));
  });

  it("17. an invalid move in strict mode changes nothing", () => {
    const g = crossSetup();
    const before = JSON.stringify({ b: g.state.board, s: g.state.sides, bag: g.state.bag, t: g.state.turn });
    expectGameError(() => g.submitMove(1, ID(1), place(g, 1, vCol(5, 6, ["1", "=", "2"])), T0 + 2), "INCORRECT_EQUATION");
    expect(JSON.stringify({ b: g.state.board, s: g.state.sides, bag: g.state.bag, t: g.state.turn })).toBe(before);
  });

  it("extending an existing equation at both ends", () => {
    // A: 3 + 4 = 7 ; B: 9 - 3 + 4 = 7 + 3 (spec example)
    const g = newGame({ rules: STRICT, racks: [["3", "+", "4", "=", "7"], ["9", "-", "+", "3"]] });
    g.submitMove(0, ID(0), place(g, 0, hRow(7, 7, ["3", "+", "4", "=", "7"])), T0);
    g.submitMove(1, ID(1), place(g, 1, [[7, 5, "9"], [7, 6, "-"], [7, 12, "+"], [7, 13, "3"]]), T0 + 1);
    const play = g.state.history.filter((h) => h.type === "PLAY")[1];
    expect(play.equations).toEqual(["9 - 3 + 4 = 7 + 3"]);
    expect(g.state.sides[1].score).toBeGreaterThan(0);
  });

  it("13. premium squares are not reused on later turns", () => {
    // A: 7 × 2 = 5 + 9 with '=' on the star. B: vertical 3 = 3 through the existing '='.
    const g = newGame({ rules: STRICT, racks: [["7", "×", "2", "=", "5", "+", "9"], ["3", "3"]] });
    g.submitMove(0, ID(0), place(g, 0, hRow(7, 4, ["7", "×", "2", "=", "5", "+", "9"])), T0);
    g.submitMove(1, ID(1), place(g, 1, [[6, 7, "3"], [8, 7, "3"]]), T0 + 1);
    // 3(1) + =(1, star NOT reapplied) + 3(1)
    expect(g.state.sides[1].score).toBe(3);
  });

  it("piece premiums multiply before equation premiums", () => {
    // Bingo row 7 from (7,0): TE at col 0, DP at col 3, STAR at col 7 → (sum with piece mults) × 3
    const faces: TileFace[] = ["1", "8", "=", "9", "+", "3", "×", "3"];
    const g = newGame({ rules: STRICT, racks: [faces, []] });
    const p = g.preview(0, place(g, 0, hRow(7, 0, faces)));
    const eq = p.score!.equations[0];
    expect(eq.tileSum).toBe(16);
    expect(eq.tiles.find((t) => t.col === 3)!.score).toBe(4);
    expect(eq.total).toBe(48);
  });

  it("cannot place on an occupied square, or out of turn", () => {
    const g = crossSetup();
    expectGameError(() => g.submitMove(1, ID(1), place(g, 1, [[7, 7, "1"]]), T0 + 1), "INVALID_BOARD_PLACEMENT");
    expectGameError(() => g.submitMove(0, ID(0), place(g, 0, [[6, 7, "1"]]), T0 + 1), "NOT_YOUR_TURN");
  });

  it("cannot play a tile that is not on the rack", () => {
    const g = crossSetup();
    const foreign = g.state.sides[0].rack[0].id;
    expectGameError(() => g.submitMove(1, ID(1), [{ tileId: foreign, row: 6, col: 7 }], T0 + 1), "TILE_NOT_IN_RACK");
  });
});

describe("challenge mode", () => {
  const CH = { validation: "CHALLENGE" as const };

  it("hides validity from the opponent during the challenge window", () => {
    const g = newGame({ rules: CH, racks: [["7", "×", "2", "=", "5", "+", "8"], []] });
    g.submitMove(0, ID(0), place(g, 0, hRow(7, 4, ["7", "×", "2", "=", "5", "+", "8"])), T0);
    expect(g.state.phase).toBe("CHALLENGE_WINDOW");
    const v = g.view(1, T0);
    expect(v.pending!.equations[0].valid).toBe(true);
    expect(v.pending!.equations[0].error).toBeUndefined();
  });

  it("19. challenging an incorrect equation withdraws the tiles and restores the previous state", () => {
    const g = newGame({ rules: CH, racks: [["7", "×", "2", "=", "5", "+", "8"], []] });
    const rackBefore = g.state.sides[0].rack.map((t) => t.id).sort();
    const bagBefore = g.state.bag.length;
    g.submitMove(0, ID(0), place(g, 0, hRow(7, 4, ["7", "×", "2", "=", "5", "+", "8"])), T0 + 5000);
    expect(g.state.board[7][4]).not.toBeNull();
    const rec = g.challenge(1, ID(1), T0 + 6000);
    expect(rec.first.valid).toBe(false);
    expect(g.state.phase).toBe("CHALLENGE_RESULT");
    g.acceptChallengeResult(0, T0 + 7000); // mover accepts the ruling
    expect(g.state.board.flat().every((c) => c === null)).toBe(true);
    expect(g.state.sides[0].score).toBe(0);
    expect(g.state.sides[0].rack.map((t) => t.id).sort()).toEqual(rackBefore);
    expect(g.state.bag.length).toBe(bagBefore);
    expect(g.state.turn).toBe(1); // challenger plays next
    expect(g.state.challenges[0].finalRuling).toBe("INVALID");
    expect(g.state.history.find((h) => h.type === "PLAY")!.status).toBe("WITHDRAWN");
  });

  it("18. challenging a correct equation costs the challenger their turn", () => {
    const g = newGame({ rules: CH, racks: [["7", "×", "2", "=", "5", "+", "9"], []] });
    g.submitMove(0, ID(0), place(g, 0, hRow(7, 4, ["7", "×", "2", "=", "5", "+", "9"])), T0);
    g.challenge(1, ID(1), T0 + 1000);
    g.acceptChallengeResult(1, T0 + 2000); // challenger accepts losing
    expect(g.state.sides[0].score).toBe(14);
    expect(g.state.sides[0].rack).toHaveLength(8);
    expect(g.state.turn).toBe(0);
    expect(g.state.phase).toBe("PLAYING");
  });

  it("clock is stopped during a challenge review", () => {
    const g = newGame({ rules: CH, racks: [["6", "=", "6"], []] });
    g.submitMove(0, ID(0), place(g, 0, hRow(7, 6, ["6", "=", "6"])), T0 + 10_000);
    g.challenge(1, ID(1), T0 + 15_000);
    expect(g.state.clock.runningSide).toBeNull();
    expect(g.state.clock.usedMs).toEqual([10_000, 5_000]);
  });

  it("acting without challenging accepts the move and refills the mover's rack", () => {
    const g = newGame({ rules: CH, racks: [["6", "=", "6"], ["=", "6"]] });
    g.submitMove(0, ID(0), place(g, 0, hRow(7, 6, ["6", "=", "6"])), T0);
    expect(g.state.sides[0].rack).toHaveLength(5); // drawn only after acceptance
    expect(g.state.sides[0].score).toBe(0);
    g.submitMove(1, ID(1), place(g, 1, vCol(8, 6, ["=", "6"])), T0 + 1);
    expect(g.state.sides[0].score).toBe(7);
    expect(g.state.sides[0].rack).toHaveLength(8);
    expect(g.state.phase).toBe("CHALLENGE_WINDOW");
    g.accept(0, T0 + 2);
    expect(g.state.sides[1].score).toBeGreaterThan(0);
    expect(g.state.phase).toBe("PLAYING");
  });

  it("re-challenge without a referee: system re-checks and both results are recorded", () => {
    const g = newGame({ rules: CH, racks: [["7", "×", "2", "=", "5", "+", "9"], []] });
    g.submitMove(0, ID(0), place(g, 0, hRow(7, 4, ["7", "×", "2", "=", "5", "+", "9"])), T0);
    g.challenge(1, ID(1), T0 + 1);
    expectGameError(() => g.rechallenge(0, ID(0), T0 + 2)); // winner cannot re-challenge
    expectGameError(() => g.submitMove(1, ID(1), [], T0 + 2)); // nobody may play during re-challenge window
    g.rechallenge(1, ID(1), T0 + 3);
    const rec = g.state.challenges[0];
    expect(rec.first.valid).toBe(true);
    expect(rec.second!.valid).toBe(true);
    expect(rec.rechallenge!.requestedBy).toBe(ID(1));
    expect(rec.finalRuling).toBe("VALID");
    expect(g.state.turn).toBe(0);
  });

  it("re-challenge with a referee waits for and applies the referee ruling", () => {
    const g = newGame({ rules: CH, referee: true, racks: [["7", "×", "2", "=", "5", "+", "9"], []] });
    g.submitMove(0, ID(0), place(g, 0, hRow(7, 4, ["7", "×", "2", "=", "5", "+", "9"])), T0);
    g.challenge(1, ID(1), T0 + 1);
    g.rechallenge(1, ID(1), T0 + 2);
    expect(g.state.phase).toBe("REFEREE_REVIEW");
    expectGameError(() => g.pass(1, ID(1), T0 + 3));
    g.refereeRule("ref", false, T0 + 4);
    const rec = g.state.challenges[0];
    expect(rec.second).toMatchObject({ by: "REFEREE", refereeId: "ref", valid: false });
    expect(rec.finalRuling).toBe("INVALID");
    expect(g.state.sides[0].score).toBe(0);
    expect(g.state.turn).toBe(1);
  });

  it("re-challenge window expires automatically via tick()", () => {
    const g = newGame({ rules: CH, racks: [["6", "=", "6"], []] });
    g.submitMove(0, ID(0), place(g, 0, hRow(7, 6, ["6", "=", "6"])), T0);
    g.challenge(1, ID(1), T0 + 1000);
    expect(g.tick(T0 + 5000)).toBe(false);
    expect(g.tick(T0 + 1000 + 20_000)).toBe(true);
    expect(g.state.phase).toBe("PLAYING");
    expect(g.state.challenges[0].finalRuling).toBe("VALID");
  });
});

describe("exchange, pass and end of game", () => {
  it("exchange swaps tiles, keeps rack size and costs the turn", () => {
    const g = newGame({ rules: STRICT });
    const ids = g.state.sides[0].rack.slice(0, 3).map((t) => t.id);
    g.exchange(0, ID(0), ids, T0 + 1);
    expect(g.state.sides[0].rack).toHaveLength(8);
    expect(g.state.sides[0].rack.some((t) => ids.includes(t.id))).toBe(false);
    expect(g.state.bag).toHaveLength(84);
    expect(g.state.turn).toBe(1);
  });

  it("15. exchange is not allowed with fewer than 5 tiles in the bag", () => {
    const g = newGame({ rules: STRICT });
    g.state.bag = g.state.bag.slice(0, 4);
    expectGameError(() => g.exchange(0, ID(0), [g.state.sides[0].rack[0].id], T0 + 1), "EXCHANGE_NOT_ALLOWED");
    g.state.bag = [...g.state.bag, ...g.state.sides[1].rack.splice(0, 1)];
    expect(g.canExchange(0).ok).toBe(true);
  });

  it("3 consecutive passes end the game and each side loses its own rack points", () => {
    const g = newGame({ rules: STRICT, racks: [["13", "BLANK", "+"], ["19", "="]] });
    g.pass(0, ID(0), T0 + 1);
    g.pass(1, ID(1), T0 + 2);
    expect(g.state.phase).toBe("PLAYING");
    g.pass(0, ID(0), T0 + 3);
    expect(g.state.phase).toBe("FINISHED");
    const r = g.state.result!;
    expect(r.reason).toBe("PASSES");
    const rackA = g.state.sides[0].rack.reduce((s, t) => s + (t.kind === "blank" ? 0 : t.points), 0);
    expect(r.sides[0].endAdjustment).toBe(-rackA);
    expect(r.sides[0].finalScore).toBe(-rackA);
  });

  it("a play resets the consecutive pass counter", () => {
    const g = newGame({ rules: STRICT, racks: [["6", "=", "6"], []] });
    g.pass(0, ID(0), T0 + 1);
    g.pass(1, ID(1), T0 + 2);
    g.submitMove(0, ID(0), place(g, 0, hRow(7, 6, ["6", "=", "6"])), T0 + 3);
    expect(g.state.consecutivePasses).toBe(0);
  });

  it("16. going out with an empty bag: opponent rack points × 2 added to the winner (blank counts 0)", () => {
    const g = newGame({ rules: STRICT, racks: [["6", "=", "6"], ["13", "BLANK", "+"]] });
    g.state.sides[0].rack = g.state.sides[0].rack.filter((t, i, a) => ["6", "="].includes(t.face) && a.findIndex((x) => x.id === t.id) === i).slice(0, 3);
    g.state.sides[1].rack = g.state.sides[1].rack.filter((t) => ["13", "BLANK", "+"].includes(t.face));
    g.state.bag = [];
    g.submitMove(0, ID(0), place(g, 0, hRow(7, 6, ["6", "=", "6"])), T0 + 1000);
    expect(g.state.phase).toBe("FINISHED");
    const r = g.state.result!;
    expect(r.reason).toBe("OUT");
    // 13(6) + BLANK(0) + +(2) = 8 → ×2 = 16; move "6 = 6" with = on star: 2 + 3 + 2 = 7
    expect(r.sides[0]).toMatchObject({ boardScore: 7, endAdjustment: 16, finalScore: 23 });
    expect(r.sides[1]).toMatchObject({ endAdjustment: 0, finalScore: 0 });
    expect(r.winnerSide).toBe(0);
  });

  it("resign: the other side wins regardless of score", () => {
    const g = newGame({ rules: STRICT, racks: [["6", "=", "6"], []] });
    g.submitMove(0, ID(0), place(g, 0, hRow(7, 6, ["6", "=", "6"])), T0 + 1);
    g.resign(0, ID(0), T0 + 2);
    expect(g.state.result!.winnerSide).toBe(1);
  });
});

describe("timer", () => {
  it("20. penalty is 10 points per started minute of overtime", () => {
    expect(timePenalty(0)).toBe(0);
    expect(timePenalty(1_000)).toBe(10);
    expect(timePenalty(30_000)).toBe(10);
    expect(timePenalty(60_000)).toBe(10);
    expect(timePenalty(61_000)).toBe(20);
    expect(timePenalty(120_000)).toBe(20);
    expect(timePenalty(121_000)).toBe(30);
    expect(timePenalty(500)).toBe(10); // fractions of a second round up
  });

  it("clock only runs for the side to move and penalties are applied at the end", () => {
    const g = newGame({ rules: { ...STRICT, time: { mode: "BLITZ" } }, racks: [["6", "=", "6"], []] });
    expect(g.state.clock.initialMs).toBe(5 * 60_000);
    // A thinks 5:00 + 61s → 20-point penalty
    g.submitMove(0, ID(0), place(g, 0, hRow(7, 6, ["6", "=", "6"])), T0 + 5 * 60_000 + 61_000);
    expect(g.state.clock.usedMs[1]).toBe(0);
    g.pass(1, ID(1), T0 + 5 * 60_000 + 61_000 + 10_000);
    expect(g.state.clock.usedMs[1]).toBe(10_000);
    g.resign(1, ID(1), T0 + 400_000);
    const r = g.state.result!;
    expect(r.sides[0].timePenalty).toBe(20);
    expect(r.sides[0].finalScore).toBe(7 - 20);
    expect(r.sides[1].timePenalty).toBe(0);
  });

  it("END_GAME timeout behaviour ends the game when time runs out", () => {
    const g = newGame({ rules: { ...STRICT, time: { mode: "BLITZ", timeoutBehavior: "END_GAME" } } });
    expect(g.tick(T0 + 60_000)).toBe(false);
    expect(g.tick(T0 + 5 * 60_000)).toBe(true);
    expect(g.state.result!.reason).toBe("TIMEOUT");
  });

  it("custom time is clamped to the configured limits", () => {
    const g = newGame({ rules: { time: { mode: "CUSTOM", minutesPerSide: 500 } } });
    expect(g.state.clock.initialMs).toBe(90 * 60_000);
  });
});

describe("start of game & serialisation", () => {
  it("draw for first move: closest to 20 starts, BLANK beats all", () => {
    const g = GameEngine.create({
      id: "x", seed: 1, bagOrder: ["3", "BLANK"],
      sides: [{ name: "A", members: [{ id: "a", name: "A" }] }, { name: "B", members: [{ id: "b", name: "B" }] }],
    });
    g.start(T0);
    expect(g.state.drawOrder[0].draws.map((d) => d.face)).toEqual(["3", "BLANK"]);
    expect(g.state.turn).toBe(1);
    expect(g.state.sides.every((s) => s.rack.length === 8)).toBe(true);
    expect(g.state.bag.length).toBe(84);
  });

  it("ties in the draw are redrawn", () => {
    const g = GameEngine.create({
      id: "x", seed: 1, bagOrder: ["+", "="],
      sides: [{ name: "A", members: [{ id: "a", name: "A" }] }, { name: "B", members: [{ id: "b", name: "B" }] }],
    });
    g.start(T0);
    expect(g.state.drawOrder.length).toBeGreaterThan(1);
  });

  it("views never leak the opponent's rack or the bag", () => {
    const g = newGame();
    const v = g.view(0, T0);
    expect(v.sides[0].rack).toHaveLength(8);
    expect(v.sides[1].rack).toBeUndefined();
    expect((v as unknown as Record<string, unknown>).bag).toBeUndefined();
    expect(v.history.every((h) => h.racksAfter === undefined)).toBe(true);
    expect(JSON.stringify(v)).not.toContain(g.state.sides[1].rack[0].id + '"');
  });

  it("state survives a JSON round trip (server restart / reconnect)", () => {
    const g = newGame({ rules: STRICT, racks: [["6", "=", "6"], []] });
    const g2 = new GameEngine(JSON.parse(JSON.stringify(g.state)));
    g2.submitMove(0, ID(0), place(g2, 0, hRow(7, 6, ["6", "=", "6"])), T0 + 1);
    expect(g2.state.sides[0].score).toBe(7);
  });
});
