/**
 * A-Math expression/equation validator.
 *
 * Input is the ordered list of resolved symbols in a line of tiles, e.g.
 * ["1","2","×","3","=","3","6"]. Handles:
 *  - multi-digit numbers from consecutive 0–9 tiles (max digits configurable, no leading zero)
 *  - tiles 10–20 are atomic and (by default) cannot be joined with other number tiles
 *  - × ÷ before + −, left-to-right within the same precedence
 *  - unary minus only at the start of an equation side, never before 0, no unary plus
 *  - exact rational arithmetic (fractions), division by zero rejected
 *  - one or more '=' with every side evaluating to the same value
 */
import { Fraction } from "./fraction";
import type { ValidationError } from "./errors";
import { DEFAULT_RULES, type MathRules } from "../game-rules/config";
import { isDigitSymbol, isNumberSymbol, isOperatorSymbol } from "../game-rules/tiles";

export { Fraction } from "./fraction";
export * from "./errors";

export type Token =
  | { type: "num"; value: number; text: string; start: number; end: number }
  | { type: "op"; op: "+" | "-" | "×" | "÷"; start: number; end: number }
  | { type: "eq"; start: number; end: number };

export type Result<T> = { ok: true; value: T } | { ok: false; error: ValidationError };

const fail = (code: ValidationError["code"], message: string, index?: number): { ok: false; error: ValidationError } => ({
  ok: false,
  error: { code, message, index },
});

export function tokenize(symbols: string[], rules: MathRules = DEFAULT_RULES.math): Result<Token[]> {
  const tokens: Token[] = [];
  let i = 0;
  while (i < symbols.length) {
    const s = symbols[i];
    if (isDigitSymbol(s)) {
      let j = i;
      while (j < symbols.length && isDigitSymbol(symbols[j])) j++;
      // A 10–20 tile directly next to this run would form an illegal number.
      if (!rules.allowJoiningTwoDigitTiles && j < symbols.length && isNumberSymbol(symbols[j])) {
        return fail("INVALID_NUMBER_FORMATION", `Tile ${symbols[j]} cannot be joined with other numbers`, j);
      }
      const run = symbols.slice(i, j);
      if (run.length > rules.maxDigitsPerNumber) {
        return fail("INVALID_NUMBER_FORMATION", `Numbers may have at most ${rules.maxDigitsPerNumber} digits (got ${run.join("")})`, i);
      }
      if (run.length > 1 && run[0] === "0") {
        return fail("INVALID_NUMBER_FORMATION", `A number cannot start with 0 (${run.join("")})`, i);
      }
      const text = run.join("");
      tokens.push({ type: "num", value: Number(text), text, start: i, end: j - 1 });
      i = j;
    } else if (isNumberSymbol(s)) {
      // two-digit tile 10..20
      const next = symbols[i + 1];
      if (!rules.allowJoiningTwoDigitTiles && next !== undefined && isNumberSymbol(next)) {
        return fail("INVALID_NUMBER_FORMATION", `Tile ${s} cannot be joined with other numbers`, i);
      }
      tokens.push({ type: "num", value: Number(s), text: s, start: i, end: i });
      i++;
    } else if (isOperatorSymbol(s)) {
      tokens.push({ type: "op", op: s, start: i, end: i });
      i++;
    } else if (s === "=") {
      tokens.push({ type: "eq", start: i, end: i });
      i++;
    } else {
      return fail("INVALID_OPERATOR_PLACEMENT", `Unknown symbol '${s}'`, i);
    }
  }
  return { ok: true, value: tokens };
}

/** Evaluate one side of an equation (no '='). */
export function evaluateSide(tokens: Token[], rules: MathRules = DEFAULT_RULES.math): Result<Fraction> {
  if (tokens.length === 0) return fail("INVALID_OPERATOR_PLACEMENT", "Each side of '=' must contain an expression");
  let pos = 0;
  let negateFirst = false;
  const first = tokens[0];
  if (first.type === "op") {
    if (first.op === "-" && rules.allowUnaryMinus) {
      const next = tokens[1];
      if (!next || next.type !== "num") {
        return fail("INVALID_OPERATOR_PLACEMENT", "A minus sign must be followed by a number", first.start);
      }
      if (next.value === 0) return fail("INVALID_NUMBER_FORMATION", "A sign cannot be placed in front of 0", first.start);
      negateFirst = true;
      pos = 1;
    } else if (first.op === "+") {
      return fail("INVALID_OPERATOR_PLACEMENT", "A plus sign cannot be placed in front of a number", first.start);
    } else {
      return fail("INVALID_OPERATOR_PLACEMENT", `An expression cannot start with '${first.op}'`, first.start);
    }
  }

  // Expect: num (op num)*
  const nums: Fraction[] = [];
  const ops: ("+" | "-" | "×" | "÷")[] = [];
  let expectNum = true;
  for (; pos < tokens.length; pos++) {
    const t = tokens[pos];
    if (expectNum) {
      if (t.type !== "num") {
        return fail("INVALID_OPERATOR_PLACEMENT", "Two operators cannot be placed next to each other", t.start);
      }
      let v = Fraction.of(t.value);
      if (negateFirst && nums.length === 0) v = v.neg();
      nums.push(v);
      expectNum = false;
    } else {
      if (t.type !== "op") return fail("INVALID_OPERATOR_PLACEMENT", "Unexpected token", t.start);
      ops.push(t.op);
      expectNum = true;
    }
  }
  if (expectNum) {
    const last = tokens[tokens.length - 1];
    return fail("INVALID_OPERATOR_PLACEMENT", "An expression cannot end with an operator", last.end);
  }

  // Pass 1: × and ÷ left-to-right.
  const terms: Fraction[] = [nums[0]];
  const addOps: ("+" | "-")[] = [];
  for (let k = 0; k < ops.length; k++) {
    const op = ops[k];
    const rhs = nums[k + 1];
    if (op === "×") terms[terms.length - 1] = terms[terms.length - 1].mul(rhs);
    else if (op === "÷") {
      if (rhs.isZero()) {
        const tok = tokens.filter((t) => t.type === "op")[k];
        return fail("DIVISION_BY_ZERO", "Division by zero is not allowed", tok?.start);
      }
      terms[terms.length - 1] = terms[terms.length - 1].div(rhs);
    } else {
      addOps.push(op);
      terms.push(rhs);
    }
  }
  // Pass 2: + and − left-to-right.
  let acc = terms[0];
  for (let k = 0; k < addOps.length; k++) acc = addOps[k] === "+" ? acc.add(terms[k + 1]) : acc.sub(terms[k + 1]);
  return { ok: true, value: acc };
}

/** Evaluate an expression (no '=') given as symbols. */
export function evaluateExpression(symbols: string[], rules: MathRules = DEFAULT_RULES.math): Result<Fraction> {
  const t = tokenize(symbols, rules);
  if (!t.ok) return t;
  if (t.value.some((x) => x.type === "eq")) return fail("INVALID_OPERATOR_PLACEMENT", "Expression must not contain '='");
  return evaluateSide(t.value, rules);
}

export interface EquationCheck {
  valid: boolean;
  text: string;
  sideValues: string[];
  error?: ValidationError;
}

export function symbolsToText(symbols: string[]): string {
  // Join digits tightly, pad operators.
  let out = "";
  symbols.forEach((s, i) => {
    const prev = symbols[i - 1];
    const tight = prev !== undefined && isNumberSymbol(prev) && isNumberSymbol(s);
    out += (i === 0 || tight ? "" : " ") + s;
  });
  return out;
}

export function validateEquation(symbols: string[], rules: MathRules = DEFAULT_RULES.math): EquationCheck {
  const text = symbolsToText(symbols);
  const t = tokenize(symbols, rules);
  if (!t.ok) return { valid: false, text, sideValues: [], error: t.error };
  const tokens = t.value;
  const eqCount = tokens.filter((x) => x.type === "eq").length;
  if (eqCount === 0) {
    return { valid: false, text, sideValues: [], error: { code: "MISSING_EQUALS", message: "An equation needs at least one '=' sign" } };
  }
  if (eqCount > 1 && !rules.allowMultipleEquals) {
    return { valid: false, text, sideValues: [], error: { code: "INVALID_OPERATOR_PLACEMENT", message: "Only one '=' is allowed" } };
  }
  const sides: Token[][] = [[]];
  for (const tok of tokens) {
    if (tok.type === "eq") sides.push([]);
    else sides[sides.length - 1].push(tok);
  }
  const values: Fraction[] = [];
  for (const side of sides) {
    if (side.length === 0) {
      return { valid: false, text, sideValues: [], error: { code: "INVALID_OPERATOR_PLACEMENT", message: "'=' must have an expression on both sides" } };
    }
    const r = evaluateSide(side, rules);
    if (!r.ok) return { valid: false, text, sideValues: values.map(String), error: r.error };
    values.push(r.value);
  }
  const sideValues = values.map(String);
  const allEqual = values.every((v) => v.equals(values[0]));
  if (!allEqual) {
    return {
      valid: false, text, sideValues,
      error: { code: "INCORRECT_EQUATION", message: `Sides are not equal (${sideValues.join(" ≠ ")})` },
    };
  }
  return { valid: true, text, sideValues };
}
