/** Tiny brute-force helper used by the E2E smoke test to find a first move from a rack. */
import { validateEquation } from "../lib/math-validator";
import { getTileDefinition, type TileFace } from "../lib/game-rules/tiles";

export interface RackTile { id: string; face: TileFace }
export interface Choice { tile: RackTile; value: string }

export function findFirstEquation(rack: RackTile[], wantValid = true, maxLen = 5): Choice[] | null {
  const usable = rack.filter((t) => t.face !== "BLANK");
  const rec = (seq: Choice[], used: Set<string>): Choice[] | null => {
    if (seq.length >= 3) {
      const ok = validateEquation(seq.map((c) => c.value)).valid;
      if (ok === wantValid) return seq;
    }
    if (seq.length === maxLen) return null;
    for (const t of usable) {
      if (used.has(t.id)) continue;
      for (const v of getTileDefinition(t.face).options) {
        used.add(t.id);
        const r = rec([...seq, { tile: t, value: v }], used);
        used.delete(t.id);
        if (r) return r;
      }
    }
    return null;
  };
  return rec([], new Set());
}
