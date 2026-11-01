/** Turn engine/server errors and notices into localized text. */
import type { ValidationError } from "../math-validator/errors";
import type { Ack, GameNotice } from "../protocol";
import type { TDynFn } from "./index";

export function validationTitle(td: TDynFn, e: ValidationError) {
  return td(`vt.${e.code}`, undefined, e.code);
}
export function validationDetail(td: TDynFn, e: ValidationError) {
  return e.reason ? td(`verr.${e.reason}`, e.params, e.message) : e.message;
}

/** Localized message for a failed request ack. */
export function ackError(td: TDynFn, ack: Extract<Ack, { ok: false }> | { error?: string; code?: string; key?: string; params?: Record<string, string | number>; details?: unknown }) {
  const details = Array.isArray(ack.details) ? (ack.details as ValidationError[]) : [];
  if (details[0]?.code && details[0].reason) {
    return `${validationTitle(td, details[0])}: ${validationDetail(td, details[0])}`;
  }
  const key = ack.key ?? ack.code;
  if (key) {
    const s = td(`err.${key}`, ack.params, "");
    if (s) return s;
    const v = td(`vt.${key}`, undefined, "");
    if (v) return v;
  }
  return ack.error || td("err.GENERIC");
}

export function noticeText(td: TDynFn, n: GameNotice) {
  return n.key ? td(`notice.${n.key}`, n.params, n.message) : n.message;
}
