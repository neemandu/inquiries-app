'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ColumnConfig, EditableColumn, EditableEmployee } from '@/lib/types';
import { updateMonthlyEmployeeData } from '@/lib/utils';
import {
  DECREASE_ERROR,
  DOC_REQUIRED_COLUMNS,
  buildMonthlyUpdate,
  getEmployeeName,
  hasChanges,
  isDecrease,
  isFirstNameColumn,
  isLastNameColumn,
} from '@/lib/monthlyReport';
import Breadcrumbs from '@/components/mobile/Breadcrumbs';
import { mobilePrimaryButton } from '@/components/auth/MobileAuthHeader';

interface MobileEmployeeReportProps {
  employee: EditableEmployee;
  columnNames: ColumnConfig[];
  onBack: () => void;
  onHome: () => void;
  onPortal: () => void;
  onSaved: () => void;
  onHasChangesChange: (hasChanges: boolean) => void;
}

// Same visibility rule as the desktop monthly report: hidden only when the employer turned the column off
function isVisible(col: EditableColumn, columnNames: ColumnConfig[]) {
  if (isFirstNameColumn(col) || isLastNameColumn(col)) return false;
  const config = columnNames.find((c) => c.columnName === col.name || c.columnNameRecordId === col.columnId);
  return config ? config.isOn : true;
}

const displayValue = (value: EditableColumn['newValue']) =>
  typeof value === 'object' && value !== null ? value.fileName : String(value ?? '');

// Monthly report fields for a single employee (Figma: Client Portal mobile / monthly report specific worker)
export default function MobileEmployeeReport({
  employee,
  columnNames,
  onBack,
  onHome,
  onPortal,
  onSaved,
  onHasChangesChange,
}: MobileEmployeeReportProps) {
  const [draft, setDraft] = useState<EditableEmployee>(employee);
  const [saving, setSaving] = useState(false);
  const name = getEmployeeName(employee);
  const columns = draft.columns.filter((col) => isVisible(col, columnNames));

  useEffect(() => {
    onHasChangesChange(hasChanges(draft));
  }, [draft, onHasChangesChange]);

  const change = (columnId: string, value: string) =>
    setDraft((prev) => ({
      ...prev,
      columns: prev.columns.map((col) => (col.columnId === columnId ? { ...col, newValue: value } : col)),
    }));

  const save = async () => {
    const updateData = buildMonthlyUpdate([draft]);
    if (!updateData.length) {
      toast('אין שינויים לשמירה');
      return;
    }
    setSaving(true);
    try {
      if (!(await updateMonthlyEmployeeData(updateData))) {
        toast.error('שגיאה בשמירת הנתונים');
        return;
      }
      toast.success('הנתונים נשמרו בהצלחה');
      if (updateData[0].columns.some((col) => DOC_REQUIRED_COLUMNS.includes(col.name))) {
        toast('עבור שינויים במילואים, החזר הוצאות, שווי ארוחות, ימי מחלה ושינוי שכר בסיס, אנא העלו מסמכים רלוונטיים דרך לשונית "בירורים"', {
          duration: 10000,
        });
      }
      // The saved values become the new baseline
      setDraft((prev) => ({ ...prev, columns: prev.columns.map((col) => ({ ...col, oldValue: col.newValue ?? col.oldValue })) }));
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 px-5 pb-[100px] pt-5 leading-[normal]">
      <Breadcrumbs
        crumbs={[
          { label: 'דף הבית', onClick: onHome },
          { label: 'מערכת מעסיקים', onClick: onPortal },
          { label: `דיווח חודשי ${name}` },
        ]}
      />
      <h1 className="text-[16px] font-bold text-[#1e3465]">דיווח חודשי- {name}</h1>

      <div className="flex w-full flex-col gap-4 border-[0.5px] border-[#eaeef6] bg-white p-4 drop-shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
        {columns.length === 0 && <p className="py-6 text-center text-[#6b7280]">אין שדות לדיווח עבור עובד זה</p>}
        {columns.map((col) => {
          const value = displayValue(col.newValue ?? col.oldValue);
          const readOnly = col.type === 'autoNumber';
          const numeric = col.type === 'number' || col.type === 'int' || col.type === 'autoNumber';
          const decrease = !readOnly && value !== '' && isDecrease(col, value);
          const missing = col.isMust && value.trim() === '' && !col.name.includes('הערות');
          return (
            <label key={col.columnId} className="flex flex-col gap-1 bg-white p-4">
              <span className="flex items-center gap-3">
                <span className="min-w-0 flex-1 text-[16px] text-[#0f172a]">
                  {col.name}
                  {col.isMust && <span className="text-[#365fb7]"> *</span>}
                </span>
                <input
                  value={value}
                  onChange={(e) => change(col.columnId, e.target.value)}
                  readOnly={readOnly}
                  inputMode={numeric ? 'decimal' : undefined}
                  placeholder="הזן טקסט"
                  aria-invalid={decrease || missing}
                  className={`h-10 w-[160px] shrink-0 border bg-white px-[14px] text-right text-[16px] text-[#0f172a] outline-none placeholder:text-[#94a3b8] focus:border-[#1a3c34] ${
                    decrease || missing ? 'border-red-500' : 'border-[#e2e8f0]'
                  } ${readOnly ? 'bg-gray-100' : ''}`}
                />
              </span>
              {decrease && <span className="text-sm text-red-600">{DECREASE_ERROR}</span>}
            </label>
          );
        })}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex h-[45px] w-full items-center justify-center border border-[#849acb] px-[14px] text-[16px] font-bold text-[#0f1a33] disabled:opacity-60"
        >
          {saving ? 'שומר...' : 'שמירה'}
        </button>
      </div>

      <button type="button" onClick={onBack} className={mobilePrimaryButton}>
        חזור לרשימת הדיווחים
      </button>
    </div>
  );
}
