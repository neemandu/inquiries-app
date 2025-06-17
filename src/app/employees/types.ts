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

export interface Employee {
  salary: number | null;
  lastName: string;
  recordId: string;
  firstName: string;
  traveling: boolean | null;
  arrivalDate: string;
}

export interface ColumnConfig {
  column: string;
  isOn: boolean;
}

export interface ApiResponse {
  recordId: string;
  employees: Employee[];
  columnNames: ColumnConfig[];
}
