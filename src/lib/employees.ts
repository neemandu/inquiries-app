import { EditableEmployee } from '@/lib/types';
import { isFirstNameColumn, isLastNameColumn } from '@/lib/monthlyReport';

// Removes an employee from the employer's active list (Make scenario shared with the desktop form)
const ARCHIVE_EMPLOYEE_WEBHOOK = 'https://hook.eu2.make.com/6yvgowfqvfq0maax195lb7s0x2ayb53m';

export interface UploadedFile {
  contentType: string;
  file: string; // base64 without the data: prefix
  file_name: string;
}

export interface ArchiveEmployeePayload {
  recordId: string;
  leavingDate: string;
  leavingReason: string;
  remarks?: string;
  '161File'?: UploadedFile;
}

export function archiveEmployee(payload: ArchiveEmployeePayload) {
  return fetch(ARCHIVE_EMPLOYEE_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function toUploadedFile(file: File): Promise<UploadedFile> {
  return { contentType: file.type || 'application/pdf', file: await fileToBase64(file), file_name: file.name };
}

// Parses a DD/MM/YYYY date typed by the user; null when it isn't a real date
export function parseDisplayDate(value: string): Date | null {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match.map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

export function toDisplayDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

// The leaving-date format the archive scenario already receives from the desktop form
export function toLeavingDate(date: Date) {
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' });
}

const columnValue = (employee: EditableEmployee, match: (name: string) => boolean) =>
  String(employee.columns.find((col) => match(col.name))?.oldValue ?? '').trim();

export interface EmployeeDetails {
  firstName: string;
  lastName: string;
  idNumber: string;
  department: string;
  startDate: string; // DD/MM/YYYY
}

// Best-effort details for the edit screen; only columns present in the monthly data can be filled
export function getEmployeeDetails(employee: EditableEmployee): EmployeeDetails {
  const rawStart = columnValue(employee, (name) => name.includes('תחילת'));
  const parsedStart = parseDisplayDate(rawStart) ?? (rawStart ? new Date(rawStart) : null);
  return {
    firstName: String(employee.columns.find(isFirstNameColumn)?.oldValue ?? '').trim(),
    lastName: String(employee.columns.find(isLastNameColumn)?.oldValue ?? '').trim(),
    idNumber: columnValue(employee, (name) => name.includes('תעודת') && name.includes('זהות')),
    department: columnValue(employee, (name) => name.includes('מחלקה')),
    startDate: parsedStart && !isNaN(parsedStart.getTime()) ? toDisplayDate(parsedStart) : '',
  };
}

// Same rule as the desktop form: an ID that already belongs to an active employee can't be added again
export function isActiveEmployeeId(employees: EditableEmployee[], idNumber: string) {
  return employees.some(
    (employee) =>
      columnValue(employee, (name) => name.includes('תעודת') && name.includes('זהות')) === idNumber.trim() &&
      columnValue(employee, (name) => name.includes('סטטוס')) === 'עובד'
  );
}
