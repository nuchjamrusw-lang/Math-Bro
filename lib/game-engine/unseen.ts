/**
 * Tile tracking: tiles the viewer has not seen yet = full set − tiles on the board − the viewer's rack.
 * This equals bag + opponents' racks combined. It uses only public information, so it never reveals
 * the exact bag (which would let a player deduce the opponent's rack).
 */
import type { GameView } from "./engine";
import { STANDARD_TILE_SET, type TileDefinition, type TileFace } from "../game-rules/tiles";

export interface UnseenEntry { def: TileDefinition; unseen: number }

export function unseenTiles(view: GameView, mySide: number | null, set: TileDefinition[] = STANDARD_TILE_SET): { entries: UnseenEntry[]; total: number } {
  const seen = new Map<TileFace, number>();
  const add = (f: TileFace) => seen.set(f, (seen.get(f) ?? 0) + 1);
  for (const row of view.board) for (const cell of row) if (cell) add(cell.face);
  if (mySide !== null) for (const t of view.sides[mySide]?.rack ?? []) add(t.face);
  const entries = set.map((def) => ({ def, unseen: Math.max(0, def.count - (seen.get(def.face) ?? 0)) }));
  return { entries, total: entries.reduce((s, e) => s + e.unseen, 0) };
}
