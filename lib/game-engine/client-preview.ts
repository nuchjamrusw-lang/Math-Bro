/** Run the authoritative engine's dry-run preview on a client-side view (no hidden data needed). */
import { GameEngine, type GameView, type MovePreview } from "./engine";
import type { GameState, PlacementInput } from "./types";

export function previewFromView(view: GameView, side: number, placements: PlacementInput[]): MovePreview {
  const state = {
    ...view,
    sides: view.sides.map((s) => ({ index: s.index, name: s.name, members: s.members, rack: s.rack ?? [], score: s.score, bingoCount: s.bingoCount })),
    bag: [],
    rng: 0,
    history: [],
    pending: null,
  } as unknown as GameState;
  return new GameEngine(state).preview(side, placements);
}
