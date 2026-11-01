import type { GameView } from "@/lib/game-engine";
import type { Ack, GameAction } from "@/lib/protocol";

/** Abstracts online (socket) and local (in-browser engine) games so one GameView serves both. */
export interface GameController {
  mode: "online" | "local";
  view: GameView;
  mySide: number | null;
  isReferee: boolean;
  act: (a: GameAction) => Promise<Ack>;
}
