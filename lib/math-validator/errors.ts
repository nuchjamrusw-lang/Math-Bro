export type ValidationErrorCode =
  | "INCORRECT_EQUATION"
  | "INVALID_OPERATOR_PLACEMENT"
  | "INVALID_NUMBER_FORMATION"
  | "DIVISION_BY_ZERO"
  | "MISSING_EQUALS"
  | "INVALID_BOARD_PLACEMENT"
  | "MISSING_CONNECTION"
  | "NOT_ON_CENTER"
  | "NO_EQUATION_FORMED"
  | "UNASSIGNED_TILE";

export const ERROR_TITLES: Record<ValidationErrorCode, { en: string; th: string }> = {
  INCORRECT_EQUATION: { en: "Incorrect Equation", th: "สมการไม่เท่ากัน" },
  INVALID_OPERATOR_PLACEMENT: { en: "Invalid Operator Placement", th: "วางเครื่องหมายไม่ถูกต้อง" },
  INVALID_NUMBER_FORMATION: { en: "Invalid Number Formation", th: "การสร้างตัวเลขไม่ถูกต้อง" },
  DIVISION_BY_ZERO: { en: "Division by Zero", th: "ห้ามหารด้วยศูนย์" },
  MISSING_EQUALS: { en: "Missing Equals Sign", th: "สมการต้องมีเครื่องหมาย =" },
  INVALID_BOARD_PLACEMENT: { en: "Invalid Board Placement", th: "วางเบี้ยบนกระดานไม่ถูกต้อง" },
  MISSING_CONNECTION: { en: "Missing Connection", th: "เบี้ยใหม่ต้องเชื่อมกับเบี้ยเดิม" },
  NOT_ON_CENTER: { en: "Must Cover the Center Star", th: "สมการแรกต้องผ่านช่องดาวกลางกระดาน" },
  NO_EQUATION_FORMED: { en: "No Equation Formed", th: "การลงครั้งนี้ไม่ได้สร้างสมการ" },
  UNASSIGNED_TILE: { en: "Unassigned Tile", th: "ต้องกำหนดค่าเบี้ยก่อนลง" },
};

export interface ValidationError {
  code: ValidationErrorCode;
  message: string;
  /** Index of the offending symbol within the equation (for highlighting). */
  index?: number;
  /** Board cells involved, if known. */
  cells?: { row: number; col: number }[];
}
