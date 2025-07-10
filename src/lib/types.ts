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

// New types for editable monthly report
export interface EditableColumn {
  name: string;
  columnId: string;
  oldValue: string | number | { fileName: string; fileData: string };
  type: "int" | "string" | "doc" | "autoNumber";
  isMust: boolean;
  newValue?: string | number | { fileName: string; fileData: string };
}

// Add EditableEmployee interface for MonthlyReport component
export interface EditableEmployee {
  id: string;
  columns: EditableColumn[];
}

interface Column {
  name: string;
  columnId: string;
  oldValue: string | number | string[] | number[] | null;
  type:
    | "autoNumber"
    | "multipleRecordLinks"
    | "multipleLookupValues"
    | "multilineText";
  isMust: boolean;
}

interface EmployeeData {
  id: string;
  columns: Column[];
}

interface ColumnNameConfig {
  isOn: boolean;
  recordId: string | null;
  columnName: string;
  columnNameRecordId: string;
}

export interface EmployeeResponse {
  employees: EmployeeData[];
  leavingReasons: LeavingReason[];
  link101: string;
  changeTime: string;
  is161Must: boolean;
  recordId: string;
  columnNames: ColumnNameConfig[];
}

// Simplified update payload interface
export interface UpdateEmployeeColumn {
  name: string;
  columnId: string;
  oldValue: string | number;
  newValue: string | number | undefined;
  type: "int" | "string" | "doc" | "autoNumber";
  isMust: boolean;
}

export interface UpdateEmployeePayload {
  id: string;
  columns: UpdateEmployeeColumn[];
}

export type UpdateMonthlyEmployeesPayload = UpdateEmployeePayload[];

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

export interface Docs {
  id?: string;
  width?: number;
  height?: number;
  filename?: string;
  url?: string;
  type?: string;
  size?: number;
  thumbnails?: {
    small?: {
      url?: string;
    };
    medium?: {
      url?: string;
    };
    large?: {
      url?: string;
    };
    full?: {
      url?: string;
    };
  };
}

export interface MonthlyInquiry {
  asm: string;
  asm2: string | null;
  date: string;
  docs: Docs[];
  hova: string;
  prev: null;
  answer: string | null;
  details: string;
  remarks: string;
  question: string;
  supplier: string;
  isDocMandatory: boolean;
  isTextMandatory: boolean; // Note: typo in original data 'Manadatory'
}

export interface GeneralInquiry {
  sum: number | null;
  chen: string;
  docs: Docs[];
  answer: string | null;
  remarks: string | null;
  headline: string | null;
  question: string;
  supplier: string;
  isDocMandatory: boolean;
  isTextMandatory: boolean;
}

export interface InquiryData {
  employer: string;
  general: GeneralInquiry[];
  monthly: MonthlyInquiry[];
}

export interface ApiResponse {
  recordId: string;
  changeTime: string;
  is161Must: boolean;
  employees: Employee[];
  columnNames: ColumnConfig[];
  leavingReasons: LeavingReason[];
  link101: string;
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
  department: string;
}

export interface PDF {
  date: string;
  pdfUrl: string;
}

export interface PDFResponse {
  documents: PDF[];
}
