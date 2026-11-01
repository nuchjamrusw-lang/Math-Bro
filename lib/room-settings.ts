/** Room settings chosen on the Create Room screen and how they map onto engine rules. */
import { z } from "zod";
import { buildRules, CUSTOM_TIME_LIMITS, TIME_PRESETS, type GameRulesConfig } from "./game-rules/config";

export const roomSettingsSchema = z.object({
  gameType: z.enum(["1v1", "2v2"]).default("1v1"),
  timeMode: z.enum(["BLITZ", "RAPID", "STANDARD", "CUSTOM"]).default("STANDARD"),
  customMinutes: z.number().int().min(CUSTOM_TIME_LIMITS.min).max(CUSTOM_TIME_LIMITS.max).default(22),
  timeoutBehavior: z.enum(["OVERTIME_PENALTY", "END_GAME"]).default("OVERTIME_PENALTY"),
  scoreManagement: z.enum(["AUTO_SCORE_AUTO_TILES", "AUTO_SCORE_ONLY", "AUTO_TILES_ONLY", "MANUAL"]).default("AUTO_SCORE_AUTO_TILES"),
  validation: z.enum(["CHALLENGE", "STRICT"]).default("CHALLENGE"),
  voiceEnabled: z.boolean().default(true),
  privacy: z.enum(["PRIVATE", "PUBLIC"]).default("PRIVATE"),
  allowSpectators: z.boolean().default(true),
  replayEnabled: z.boolean().default(true),
  allowPause: z.boolean().default(false),
});

export type RoomSettings = z.infer<typeof roomSettingsSchema>;
export const DEFAULT_ROOM_SETTINGS: RoomSettings = roomSettingsSchema.parse({});

export function minutesFor(s: RoomSettings): number {
  return s.timeMode === "CUSTOM" ? s.customMinutes : TIME_PRESETS[s.timeMode];
}

export function rulesFromSettings(s: RoomSettings): GameRulesConfig {
  return buildRules({
    scoreManagement: s.scoreManagement,
    validation: s.validation,
    time: {
      mode: s.timeMode,
      minutesPerSide: minutesFor(s),
      timeoutBehavior: s.timeoutBehavior,
      allowPause: s.allowPause,
    },
  });
}
