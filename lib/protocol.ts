/** Wire protocol shared by the Socket.IO server and clients. */
import { z } from "zod";
import type { RoomSettings } from "./room-settings";
import type { GameView } from "./game-engine";

export type MemberRole = "PLAYER" | "SPECTATOR" | "REFEREE";

export interface RoomMemberInfo {
  userId: string;
  username: string;
  avatarColor: string;
  guest: boolean;
  role: MemberRole;
  side: number | null;
  connected: boolean;
  isHost: boolean;
}

export interface RoomSnapshot {
  code: string;
  hostId: string;
  settings: RoomSettings;
  status: "LOBBY" | "PLAYING" | "FINISHED";
  members: RoomMemberInfo[];
  matchId: string | null;
  voiceDisabled: boolean;
  createdAt: number;
  seatsPerSide: number;
}

export interface PublicRoomInfo {
  code: string;
  host: string;
  gameType: string;
  timeMode: string;
  validation: string;
  players: number;
  capacity: number;
}

const symbol = z.string().max(3);
const placement = z.object({ tileId: z.string().max(10), row: z.number().int().min(0).max(30), col: z.number().int().min(0).max(30), value: symbol.optional() });

export const gameActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("play"), placements: z.array(placement).min(1).max(8), declaredScore: z.number().int().min(0).max(2000).nullable().optional() }),
  z.object({ type: z.literal("pass") }),
  z.object({ type: z.literal("exchange"), tileIds: z.array(z.string().max(10)).min(1).max(8) }),
  z.object({ type: z.literal("accept") }),
  z.object({ type: z.literal("challenge") }),
  z.object({ type: z.literal("rechallenge") }),
  z.object({ type: z.literal("acceptRuling") }),
  z.object({ type: z.literal("referee"), valid: z.boolean() }),
  z.object({ type: z.literal("draw"), count: z.number().int().min(1).max(8) }),
  z.object({ type: z.literal("resign") }),
  z.object({ type: z.literal("pauseRequest") }),
  z.object({ type: z.literal("pauseRespond"), accept: z.boolean() }),
  z.object({ type: z.literal("pause") }),
  z.object({ type: z.literal("resume") }),
]);
export type GameAction = z.infer<typeof gameActionSchema>;

export interface ActionEnvelope { action: GameAction; version: number }

export type Ack<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string; code?: string; key?: string; params?: Record<string, string | number>; details?: unknown };

export interface GameStatePayload { view: GameView }

export interface GameNotice {
  kind: "BINGO" | "CHALLENGE" | "RULING" | "TIMEOUT" | "END" | "INFO" | "PAUSE";
  /** English fallback text. */
  message: string;
  /** i18n key under "notice." and its parameters. */
  key?: string;
  params?: Record<string, string | number>;
  sideIndex?: number | null;
}
