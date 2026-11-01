/**
 * Board layout configuration.
 *
 * ⚠️ VERIFY BEFORE OFFICIAL COMPETITION USE:
 * The layout below follows the classic 15×15 crossword-board premium geometry that the
 * A-Math board is based on, with the A-Math colour/semantics mapping
 *   R = Triple Equation (red), Y = Double Equation (yellow),
 *   B = Triple Piece (blue),   O = Double Piece (orange),
 *   * = Center Star (acts as Triple Piece, per project spec), . = normal.
 * It has NOT been checked against an official A-Math board reference. To change it,
 * edit the string grid only — nothing else in the engine/UI depends on positions.
 */

export type PremiumType = "TE" | "DE" | "TP" | "DP" | "STAR" | "NORMAL";

export interface PremiumInfo {
  type: PremiumType;
  /** Multiplier applied to the single tile (piece) placed here for the first time. */
  pieceMultiplier: number;
  /** Multiplier applied to the whole equation when a new tile is placed here. */
  equationMultiplier: number;
  label: string;
}

export const PREMIUM_INFO: Record<PremiumType, PremiumInfo> = {
  TE: { type: "TE", pieceMultiplier: 1, equationMultiplier: 3, label: "3× Equation" },
  DE: { type: "DE", pieceMultiplier: 1, equationMultiplier: 2, label: "2× Equation" },
  TP: { type: "TP", pieceMultiplier: 3, equationMultiplier: 1, label: "3× Piece" },
  DP: { type: "DP", pieceMultiplier: 2, equationMultiplier: 1, label: "2× Piece" },
  STAR: { type: "STAR", pieceMultiplier: 3, equationMultiplier: 1, label: "Center ★ (3× Piece)" },
  NORMAL: { type: "NORMAL", pieceMultiplier: 1, equationMultiplier: 1, label: "" },
};

const CHAR_TO_TYPE: Record<string, PremiumType> = {
  R: "TE", Y: "DE", B: "TP", O: "DP", "*": "STAR", ".": "NORMAL",
};

export const STANDARD_LAYOUT_ROWS: string[] = [
  "R..O...R...O..R",
  ".Y...B...B...Y.",
  "..Y...O.O...Y..",
  "O..Y...O...Y..O",
  "...............",
  ".B...B...B...B.",
  "..O...O.O...O..",
  "R..O...*...O..R",
  "..O...O.O...O..",
  ".B...B...B...B.",
  "...............",
  "O..Y...O...Y..O",
  "..Y...O.O...Y..",
  ".Y...B...B...Y.",
  "R..O...R...O..R",
];

export interface BoardLayout {
  size: number;
  center: { row: number; col: number };
  cells: PremiumType[][];
}

export function parseLayout(rows: string[]): BoardLayout {
  const size = rows.length;
  const cells = rows.map((r, ri) => {
    if (r.length !== size) throw new Error(`Layout row ${ri} has length ${r.length}, expected ${size}`);
    return [...r].map((ch) => {
      const t = CHAR_TO_TYPE[ch];
      if (!t) throw new Error(`Unknown layout char '${ch}' at row ${ri}`);
      return t;
    });
  });
  let center: { row: number; col: number } | null = null;
  cells.forEach((row, r) => row.forEach((t, c) => { if (t === "STAR") center = { row: r, col: c }; }));
  if (!center) throw new Error("Layout must contain exactly one center star");
  return { size, center, cells };
}

export const STANDARD_LAYOUT: BoardLayout = parseLayout(STANDARD_LAYOUT_ROWS);

export function premiumAt(layout: BoardLayout, row: number, col: number): PremiumInfo {
  return PREMIUM_INFO[layout.cells[row][col]];
}
