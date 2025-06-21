export interface ColumnSettingsType {
  travel: boolean;
  competition: boolean;
  ignoreFiles: boolean;
  accounting: boolean;
  salary: boolean;
  other: boolean;
}

// New dynamic column settings interface
export interface DynamicColumnSettings {
  [columnNameRecordId: string]: boolean;
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
  columnNameRecordId: string;
  columnName: string;
  isOn: boolean;
  recordId: string;
}

export interface LeavingReason {
  Reason: string;
}

export interface ApiResponse {
  recordId: string;
  employees: Employee[];
  columnNames: ColumnConfig[];
  leavingReasons: LeavingReason[];
}
export interface Pension {
  contentType: string;
  file_name: string;
  file: string;
}

export interface WorkFile {
  contentType: string;
  file_name: string;
  file: string;
}

export interface AddEmployee {
  record_id: string;
  firstName: string;
  lastName: string;
  startDate: string;
  is101Full: boolean;
  pension: Pension;
  workFile: WorkFile;
}

export interface PDF {
  date: string;
  pdfUrl: string;
}

export interface PDFResponse {
  documents: PDF[];
}
