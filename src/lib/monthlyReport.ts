import { ApiResponse, EditableColumn, EditableEmployee, UpdateMonthlyEmployeesPayload } from '@/lib/types';

// Changes to these columns need a supporting document (uploaded through "מסמכים חסרים")
export const DOC_REQUIRED_COLUMNS = ['מילואים', 'החזר הוצאות', 'שווי ארוחות', 'ימי מחלה', 'תעריף חודשי / שעתי'];

// These columns can't be updated to a value lower than the previous month's
export const NO_DECREASE_COLUMNS = ['תעריף חודשי / שעתי', 'נסיעות חודשי', 'שעות נוספות גלובליות'];
export const DECREASE_ERROR = 'לא ניתן לעדכן ערך נמוך יותר מחודש קודם';

type CellValue = EditableColumn['newValue'];

// File values are compared and sent by their file name
const comparable = (value: CellValue) =>
  typeof value === 'object' && value !== null && 'fileName' in value ? value.fileName : value;

// Converts the monthly API response into editable rows where newValue starts equal to oldValue
export function toEditableEmployees(apiResponse: ApiResponse): EditableEmployee[] {
  return apiResponse.employees.map(employee => ({
    id: employee.id,
    columns: employee.columns.map(col => ({
      name: col.name,
      columnId: col.columnId,
      oldValue: Array.isArray(col.oldValue) ? col.oldValue.join(', ') : (col.oldValue ?? ''),
      type: col.type === 'multilineText' ? 'string' :
            col.type === 'autoNumber' ? 'autoNumber' :
            col.type === 'number' ? 'number' :
            col.type === 'multipleRecordLinks' ? 'string' :
            col.type === 'multipleLookupValues' ? 'string' : 'string',
      isMust: col.isMust,
      newValue: Array.isArray(col.oldValue) ? col.oldValue.join(', ') : (col.oldValue ?? '')
    } as EditableColumn))
  }));
}

export function isFirstNameColumn(col: Pick<EditableColumn, 'name' | 'columnId'>) {
  return col.name.includes('שם פרטי') || col.name.includes('First Name') || col.columnId.includes('firstName');
}

export function isLastNameColumn(col: Pick<EditableColumn, 'name' | 'columnId'>) {
  return col.name.includes('שם משפחה') || col.name.includes('Last Name') || col.columnId.includes('lastName');
}

export function getEmployeeName(employee: EditableEmployee): string {
  const firstName = employee.columns.find(isFirstNameColumn)?.oldValue || '';
  const lastName = employee.columns.find(isLastNameColumn)?.oldValue || '';
  return `${firstName} ${lastName}`.trim() || `עובד ${employee.id.slice(-4)}`;
}

// True when a no-decrease column is being set below last month's value
export function isDecrease(col: EditableColumn, value: string | number) {
  if (!NO_DECREASE_COLUMNS.includes(col.name)) return false;
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const oldValue = typeof col.oldValue === 'number' ? col.oldValue : parseFloat(String(col.oldValue));
  return numValue < oldValue;
}

export function hasChanges(employee: EditableEmployee) {
  return employee.columns.some(
    col => col.newValue !== undefined && col.newValue !== null && comparable(col.newValue) !== comparable(col.oldValue)
  );
}

// Builds the update payload with only the employees and columns that changed
export function buildMonthlyUpdate(employees: EditableEmployee[]): UpdateMonthlyEmployeesPayload {
  return employees
    .map(emp => ({
      id: emp.id,
      columns: emp.columns
        .filter(col => col.newValue !== undefined && col.newValue !== null && comparable(col.newValue) !== comparable(col.oldValue))
        .map(col => {
          let newValue = comparable(col.newValue);
          let oldValue = comparable(col.oldValue);
          const isNumeric = col.type === 'number' || col.type === 'autoNumber' || col.type === 'int';

          // Convert to number if type is number or autoNumber
          if (isNumeric && newValue !== undefined && newValue !== null && newValue !== '') {
            newValue = Number(newValue);
          }
          if (isNumeric && oldValue !== undefined && oldValue !== null && oldValue !== '') {
            oldValue = Number(oldValue);
          }

          // Map type to backend-compatible values
          const backendType: 'string' | 'int' | 'doc' | 'autoNumber' =
            col.type === 'number' ? 'int'
            : col.type === 'multilineText' ? 'string'
            : col.type;

          return {
            name: col.name,
            columnId: col.columnId,
            oldValue,
            newValue,
            type: backendType,
            isMust: col.isMust
          };
        })
    }))
    // Filter out employees that have no changed columns
    .filter(emp => emp.columns.length > 0) as UpdateMonthlyEmployeesPayload;
}
