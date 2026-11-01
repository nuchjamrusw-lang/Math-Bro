/** Tile bag & rack management. Deterministic given an RNG state, so games can be persisted & replayed. */
import { STANDARD_TILE_SET, type TileDefinition, type TileFace, type TileKind, getTileDefinition } from "../game-rules/tiles";

export interface Tile {
  id: string;
  face: TileFace;
  points: number;
  kind: TileKind;
}

/** mulberry32 — small, fast, seedable PRNG. State is a uint32 stored in the game state. */
export function nextRandom(state: { rng: number }): number {
  let t = (state.rng = (state.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function createTileSet(set: TileDefinition[] = STANDARD_TILE_SET): Tile[] {
  const tiles: Tile[] = [];
  let seq = 0;
  for (const def of set) {
    for (let i = 0; i < def.count; i++) {
      tiles.push({ id: `t${seq++}`, face: def.face, points: def.points, kind: def.kind });
    }
  }
  return tiles;
}

export function shuffle<T>(arr: T[], rngState: { rng: number }): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom(rngState) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Remove and return up to `count` tiles from the end of the bag. */
export function drawTiles(bag: Tile[], count: number): Tile[] {
  const n = Math.max(0, Math.min(count, bag.length));
  return bag.splice(bag.length - n, n);
}

export function rackPoints(rack: Tile[]): number {
  return rack.reduce((s, t) => s + (t.kind === "blank" ? 0 : t.points), 0);
}

/**
 * Draw-order rank (spec 4.1): closest to 20 goes first. BLANK beats everything,
 * all operators / '=' rank below 0.
 */
export function drawOrderRank(tile: Tile): number {
  if (tile.kind === "blank") return 100;
  if (tile.kind === "number") return Number(tile.face);
  return -1;
}

export function tileDefinitionFor(face: TileFace) {
  return getTileDefinition(face);
}
