import { describe, expect, it } from "vitest";
import { evaluateExpression, validateEquation, Fraction, tokenize } from "@/lib/math-validator";

const s = (str: string) => str.trim().split(/\s+/);
const ok = (str: string) => validateEquation(s(str));

describe("math validator", () => {
  it("1. 7 × 2 = 5 + 9 passes", () => expect(ok("7 × 2 = 5 + 9").valid).toBe(true));
  it("2. 7 × 7 = 4 2 + 7 passes (multi-digit 42)", () => expect(ok("7 × 7 = 4 2 + 7").valid).toBe(true));
  it("3. 4 + 4 × 3 = 16", () => {
    const r = evaluateExpression(s("4 + 4 × 3"));
    expect(r.ok && r.value.toString()).toBe("16");
  });
  it("4. 5 + 4 × 9 ÷ 2 = 23", () => {
    const r = evaluateExpression(s("5 + 4 × 9 ÷ 2"));
    expect(r.ok && r.value.toString()).toBe("23");
  });
  it("5. 2 ÷ 4 = 4 ÷ 8 passes (exact fractions)", () => expect(ok("2 ÷ 4 = 4 ÷ 8").valid).toBe(true));
  it("6. 0 ÷ 5 is allowed", () => {
    const r = evaluateExpression(s("0 ÷ 5"));
    expect(r.ok && r.value.toString()).toBe("0");
    expect(ok("0 ÷ 5 = 0").valid).toBe(true);
  });
  it("7. 5 ÷ 0 fails", () => {
    const r = ok("5 ÷ 0 = 0");
    expect(r.valid).toBe(false);
    expect(r.error?.code).toBe("DIVISION_BY_ZERO");
  });
  it("8. 07 fails (leading zero)", () => {
    const r = ok("0 7 = 7");
    expect(r.valid).toBe(false);
    expect(r.error?.code).toBe("INVALID_NUMBER_FORMATION");
    expect(ok("0 1 2 = 1 2").valid).toBe(false);
  });
  it("9. +7 fails (no unary plus)", () => {
    expect(ok("+ 7 = 7").valid).toBe(false);
    expect(ok("7 = + 7").valid).toBe(false);
    expect(ok("+ 7 = 7").error?.code).toBe("INVALID_OPERATOR_PLACEMENT");
  });
  it("10. -6 = 4 - 10 passes", () => expect(ok("- 6 = 4 - 10").valid).toBe(true));

  it("unary minus only at the start of a side, never before 0", () => {
    expect(ok("4 - 10 = - 6").valid).toBe(true);
    expect(ok("- 0 = 0").valid).toBe(false);
    expect(ok("0 = - 0").valid).toBe(false);
    expect(ok("3 × - 2 = - 6").valid).toBe(false);
    expect(ok("- - 6 = 6").valid).toBe(false);
  });
  it("adjacent operators are rejected", () => {
    expect(ok("3 + × 2 = 5").error?.code).toBe("INVALID_OPERATOR_PLACEMENT");
    expect(ok("3 + 2 = 5 +").valid).toBe(false);
    expect(ok("= 5").valid).toBe(false);
    expect(ok("5 = = 5").valid).toBe(false);
  });
  it("requires an equals sign", () => expect(ok("3 + 4").error?.code).toBe("MISSING_EQUALS"));
  it("simple and chained equations", () => {
    expect(ok("6 = 6").valid).toBe(true);
    expect(ok("2 + 2 = 4 = 1 + 3").valid).toBe(true);
    expect(ok("2 + 2 = 4 = 5").valid).toBe(false);
  });
  it("incorrect equation reports side values", () => {
    const r = ok("7 × 2 = 5 + 8");
    expect(r.valid).toBe(false);
    expect(r.error?.code).toBe("INCORRECT_EQUATION");
    expect(r.sideValues).toEqual(["14", "13"]);
  });
  it("multi-digit numbers up to 3 digits", () => {
    expect(ok("1 8 5 = 1 8 5").valid).toBe(true);
    expect(ok("1 2 3 4 = 1 2 3 4").error?.code).toBe("INVALID_NUMBER_FORMATION");
    const t = tokenize(s("1 8 5"));
    expect(t.ok && t.value[0]).toMatchObject({ type: "num", value: 185 });
  });
  it("tiles 10–20 cannot be joined with other numbers", () => {
    expect(ok("12 = 12").valid).toBe(true);
    expect(ok("1 12 = 112").valid).toBe(false);
    expect(ok("12 3 = 123").valid).toBe(false);
    expect(ok("10 10 = 1010").valid).toBe(false);
  });
  it("left-to-right evaluation for same precedence", () => {
    expect(ok("8 ÷ 4 × 2 = 4").valid).toBe(true);
    expect(ok("10 - 3 - 2 = 5").valid).toBe(true);
    expect(ok("2 ÷ 3 × 3 = 2").valid).toBe(true);
  });
  it("fractions never use floating point", () => {
    const third = new Fraction(1, 3);
    expect(third.add(third).add(third).equals(Fraction.of(1))).toBe(true);
    expect(ok("1 ÷ 3 + 1 ÷ 3 + 1 ÷ 3 = 1").valid).toBe(true);
    expect(ok("1 ÷ 3 = 3 3 3 ÷ 9 9 9").valid).toBe(true);
  });
});
