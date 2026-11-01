import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/en";
import { th } from "@/lib/i18n/th";
import { zh } from "@/lib/i18n/zh";
import { makeT, pickLang } from "@/lib/i18n";
import { ackError } from "@/lib/i18n/format";
import { validateEquation } from "@/lib/math-validator";
import { HOW_TO_PLAY } from "@/lib/i18n/how-to-play";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("i18n dictionaries", () => {
  for (const [name, dict] of [["th", th], ["zh", zh]] as const) {
    it(`${name} has exactly the English keys, non-empty, with the same placeholders`, () => {
      expect(Object.keys(dict).sort()).toEqual(Object.keys(en).sort());
      for (const k of Object.keys(en) as (keyof typeof en)[]) {
        expect(dict[k].trim().length, k).toBeGreaterThan(0);
        expect(placeholders(dict[k]), k).toEqual(placeholders(en[k]));
      }
    });
  }

  it("how-to-play exists for every language with the same structure", () => {
    const shape = (l: keyof typeof HOW_TO_PLAY) => HOW_TO_PLAY[l].sections.map((s) => s.items.length);
    expect(shape("th")).toEqual(shape("en"));
    expect(shape("zh")).toEqual(shape("en"));
  });

  it("interpolates parameters and picks a language", () => {
    expect(makeT("th").t("game.theirTurn", { name: "Ann" })).toBe("ตาของ Ann");
    expect(makeT("zh").t("score.tiles", { n: 8 })).toBe("8 张牌");
    expect(pickLang("zh", "th-TH")).toBe("zh");
    expect(pickLang(undefined, "en-US,en;q=0.9")).toBe("en");
    expect(pickLang(undefined, "fr-FR")).toBe("th");
  });

  it("localizes engine validation errors and server error codes", () => {
    const { td } = makeT("th");
    const r = validateEquation(["7", "×", "2", "=", "5", "+", "8"]);
    expect(ackError(td, { error: "x", code: "INCORRECT_EQUATION", details: [r.error] })).toBe("สมการไม่เท่ากัน: สองข้างไม่เท่ากัน (14 ≠ 13)");
    expect(ackError(td, { error: "x", code: "BAD_PHASE", key: "NOT_YOUR_TURN" })).toBe("ยังไม่ถึงตาของคุณ");
    expect(ackError(td, { error: "x", code: "SEATS_EMPTY", params: { n: 2 } })).toBe("แต่ละฝ่ายต้องมีผู้เล่น 2 คน");
    expect(ackError(td, { error: "Fallback text", code: "SOMETHING_NEW" })).toBe("Fallback text");
  });
});
