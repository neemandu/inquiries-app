export interface ColumnSettingsType {
  travel: boolean;
  competition: boolean;
  ignoreFiles: boolean;
  accounting: boolean;
  salary: boolean;
  other: boolean;
}

export type ViewType =
  | "monthly-report"
  | "add-employee"
  | "employee-recognition"
  | "pay-slip"
  | "vacations";
