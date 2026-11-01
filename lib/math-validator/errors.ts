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


export interface ValidationError {
  code: ValidationErrorCode;
  message: string;
  /** Index of the offending symbol within the equation (for highlighting). */
  index?: number;
  /** Board cells involved, if known. */
  cells?: { row: number; col: number }[];
  /** i18n key (under "verr.") describing the exact reason, plus its parameters. */
  reason?: string;
  params?: Record<string, string | number>;
}
