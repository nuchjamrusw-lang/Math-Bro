/**
 * Tile set configuration (100 tiles) — official A-Math distribution as specified.
 * Kept as data so the distribution can be changed without touching the engine.
 */

/** Resolved symbol that a tile represents on the board. */
export type NumberSymbol =
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10"
  | "11" | "12" | "13" | "14" | "15" | "16" | "17" | "18" | "19" | "20";
export type OperatorSymbol = "+" | "-" | "×" | "÷";
export type Symbol = NumberSymbol | OperatorSymbol | "=";

/** The printed face of a physical tile. */
export type TileFace = NumberSymbol | OperatorSymbol | "+/-" | "×/÷" | "=" | "BLANK";

export type TileKind = "number" | "operator" | "choice" | "equals" | "blank";

export interface TileDefinition {
  face: TileFace;
  count: number;
  points: number;
  kind: TileKind;
  /** Symbols this tile may stand for. Single-element for fixed tiles. */
  options: Symbol[];
}

export const NUMBER_SYMBOLS: NumberSymbol[] = [
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10",
  "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
];
export const OPERATOR_SYMBOLS: OperatorSymbol[] = ["+", "-", "×", "÷"];
export const ALL_SYMBOLS: Symbol[] = [...NUMBER_SYMBOLS, ...OPERATOR_SYMBOLS, "="];

const n = (face: NumberSymbol, count: number, points: number): TileDefinition => ({
  face, count, points, kind: "number", options: [face],
});

export const STANDARD_TILE_SET: TileDefinition[] = [
  n("0", 5, 1), n("1", 6, 1), n("2", 6, 1), n("3", 5, 1),
  n("4", 5, 2), n("5", 4, 2), n("6", 4, 2), n("7", 4, 2), n("8", 4, 2), n("9", 4, 2),
  n("10", 2, 3), n("11", 1, 4), n("12", 2, 3), n("13", 1, 6), n("14", 1, 4),
  n("15", 1, 4), n("16", 1, 4), n("17", 1, 6), n("18", 1, 4), n("19", 1, 7), n("20", 1, 5),
  { face: "+", count: 4, points: 2, kind: "operator", options: ["+"] },
  { face: "-", count: 4, points: 2, kind: "operator", options: ["-"] },
  { face: "+/-", count: 5, points: 1, kind: "choice", options: ["+", "-"] },
  { face: "×", count: 4, points: 2, kind: "operator", options: ["×"] },
  { face: "÷", count: 4, points: 2, kind: "operator", options: ["÷"] },
  { face: "×/÷", count: 4, points: 1, kind: "choice", options: ["×", "÷"] },
  { face: "=", count: 11, points: 1, kind: "equals", options: ["="] },
  { face: "BLANK", count: 4, points: 0, kind: "blank", options: ALL_SYMBOLS },
];

export function getTileDefinition(face: TileFace, set: TileDefinition[] = STANDARD_TILE_SET): TileDefinition {
  const def = set.find((d) => d.face === face);
  if (!def) throw new Error(`Unknown tile face: ${face}`);
  return def;
}

export function totalTileCount(set: TileDefinition[] = STANDARD_TILE_SET): number {
  return set.reduce((s, d) => s + d.count, 0);
}

export function isNumberSymbol(s: string): s is NumberSymbol {
  return (NUMBER_SYMBOLS as string[]).includes(s);
}
export function isOperatorSymbol(s: string): s is OperatorSymbol {
  return (OPERATOR_SYMBOLS as string[]).includes(s);
}
/** Single digit tiles (0-9) can be concatenated into multi-digit numbers. */
export function isDigitSymbol(s: string): boolean {
  return s.length === 1 && s >= "0" && s <= "9";
}
