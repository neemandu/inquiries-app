'use client';

import { useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { EditableEmployee, LeavingReason } from '@/lib/types';
import { getEmployeeName } from '@/lib/monthlyReport';
import { archiveEmployee, parseDisplayDate, toDisplayDate, toLeavingDate, toUploadedFile } from '@/lib/employees';
import Breadcrumbs from '@/components/mobile/Breadcrumbs';
import { FormRow, RowFileButton, RowSelect, RowTextInput, SectionCard, saveButton } from '@/components/mobile/FormRow';
import { mobilePrimaryButton } from '@/components/auth/MobileAuthHeader';

// Light outlined button (Figma: "העברת עובדים שנבחרו לארכיון")
const lightButton =
  'flex w-full items-center justify-center gap-2 border border-[#c1cce5] p-4 text-[15px] font-semibold text-[#0f1a33] disabled:opacity-50';

interface MobileEmployeeListProps {
  employees: EditableEmployee[];
  leavingReasons: LeavingReason[];
  is161Must: boolean;
  onHome: () => void;
  onPortal: () => void;
  onAdd: () => void;
  onEdit: (employeeId: string) => void;
  onArchived: () => void;
  onOpenArchive: () => void;
}

// One employee with a checkbox and an "עדכן" button (Figma: action card in the employee list and archive)
export function EmployeeCheckRow({
  name,
  checked,
  onToggle,
  onEdit,
}: {
  name: string;
  checked: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="flex w-full items-center gap-2 border-b border-[#eaeef6] bg-white p-3">
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
        <input type="checkbox" checked={checked} onChange={onToggle} className="peer sr-only" />
        <span className="flex size-6 shrink-0 items-center justify-center rounded-[2px] peer-focus-visible:ring-2 peer-focus-visible:ring-[#849acb]">
          {checked ? (
            <Image src="/icons/mobile/checkbox-24-checked.svg" alt="" width={18} height={18} />
          ) : (
            <Image src="/icons/mobile/checkbox-24-empty.svg" alt="" width={24} height={24} />
          )}
        </span>
        <span className="min-w-0 truncate text-[15px] text-[#0f1a33]">{name}</span>
      </label>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`עדכון פרטי ${name}`}
        className="shrink-0 border-[0.5px] border-[#1e3465] bg-[#fef8ec] px-[14px] py-2 text-[14px] font-semibold text-[#1e3465]"
      >
        עדכן
      </button>
    </div>
  );
}

// Employer's employee list: edit an employee, add a new one or archive the checked ones
// (Figma: Client Portal mobile / עריכת רשימת עובדים)
export default function MobileEmployeeList({
  employees,
  leavingReasons,
  is161Must,
  onHome,
  onPortal,
  onAdd,
  onEdit,
  onArchived,
  onOpenArchive,
}: MobileEmployeeListProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [archiving, setArchiving] = useState(false);
  const [leavingDate, setLeavingDate] = useState(() => toDisplayDate(new Date()));
  const [leavingReason, setLeavingReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [file161, setFile161] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const sorted = [...employees].sort((a, b) => getEmployeeName(a).localeCompare(getEmployeeName(b), 'he'));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const closeArchive = () => {
    setArchiving(false);
    setErrors({});
  };

  // One leaving date and reason apply to every checked employee; one request is sent per employee
  const confirmArchive = async () => {
    const date = parseDisplayDate(leavingDate);
    const found: Record<string, string> = {};
    if (!date) found.leavingDate = 'יש להזין תאריך בפורמט DD/MM/YYYY';
    if (!leavingReason) found.leavingReason = 'יש לבחור סיבת עזיבה';
    if (is161Must && !file161) found.file161 = 'קובץ 161 הוא שדה חובה';
    setErrors(found);
    if (Object.keys(found).length || !date) return;

    setSending(true);
    const file = is161Must && file161 ? await toUploadedFile(file161) : undefined;
    const ids = [...selected];
    const results = await Promise.allSettled(
      ids.map(async (recordId) => {
        const response = await archiveEmployee({
          recordId,
          leavingDate: toLeavingDate(date),
          leavingReason,
          remarks: remarks.trim(),
          ...(file && { '161File': file }),
        });
        if (!response.ok) throw new Error(`status ${response.status}`);
      })
    );
    setSending(false);

    const failed = ids.filter((_, i) => results[i].status === 'rejected');
    const names = (list: string[]) =>
      list.map((id) => getEmployeeName(employees.find((e) => e.id === id) ?? { id, columns: [] })).join(', ');
    if (failed.length < ids.length) {
      toast.success(failed.length ? 'חלק מהעובדים הועברו לארכיון' : 'העובדים הועברו לארכיון');
      onArchived();
    }
    if (failed.length) {
      console.error('Failed to archive employees', results);
      toast.error('העברה לארכיון נכשלה', { description: names(failed) });
    }
    setSelected(new Set(failed));
    if (!failed.length) {
      closeArchive();
      setLeavingReason('');
      setRemarks('');
      setFile161(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 px-5 pb-[100px] pt-5 leading-[normal]">
      <Breadcrumbs
        crumbs={[
          { label: 'דף הבית', onClick: onHome },
          { label: 'מערכת מעסיקים', onClick: onPortal },
          { label: 'עריכת רשימת עובדים' },
        ]}
      />
      <h1 className="text-[16px] font-bold text-[#1e3465]">עריכת רשימת עובדים</h1>

      <SectionCard>
        {sorted.length ? (
          sorted.map((employee) => (
            <EmployeeCheckRow
              key={employee.id}
              name={getEmployeeName(employee)}
              checked={selected.has(employee.id)}
              onToggle={() => toggle(employee.id)}
              onEdit={() => onEdit(employee.id)}
            />
          ))
        ) : (
          <p className="py-10 text-center text-[16px] text-[#6b7280]">אין עובדים ברשימה</p>
        )}
      </SectionCard>

      <button type="button" onClick={onAdd} className={lightButton}>
        הוספת עובד חדש
      </button>

      {archiving ? (
        <SectionCard>
          <p className="text-[16px] font-bold text-[#1e3465]">העברה לארכיון: {selected.size} עובדים</p>
          <FormRow label="תאריך עזיבה" error={errors.leavingDate}>
            <RowTextInput value={leavingDate} onChange={setLeavingDate} placeholder="DD/MM/YYYY" inputMode="numeric" maxLength={10} dir="ltr" />
          </FormRow>
          <FormRow label="סיבת עזיבה" error={errors.leavingReason}>
            <RowSelect
              value={leavingReason}
              onChange={setLeavingReason}
              options={leavingReasons.map(({ Reason }) => ({ value: Reason, label: Reason }))}
            />
          </FormRow>
          <FormRow label="הערות">
            <RowTextInput value={remarks} onChange={setRemarks} />
          </FormRow>
          {is161Must && (
            <FormRow label="טופס 161" error={errors.file161}>
              <RowFileButton file={file161} onChange={setFile161} />
            </FormRow>
          )}
          <button type="button" onClick={confirmArchive} disabled={sending || !selected.size} className={saveButton}>
            {sending ? 'מעביר לארכיון...' : 'אישור והעברה לארכיון'}
          </button>
          <button type="button" onClick={closeArchive} disabled={sending} className="text-[15px] text-[#6b7280] underline">
            ביטול
          </button>
        </SectionCard>
      ) : (
        <button type="button" onClick={() => setArchiving(true)} disabled={!selected.size} className={lightButton}>
          <Image src="/icons/mobile/user-minus.svg" alt="" width={20} height={20} className="shrink-0" />
          העברת עובדים שנבחרו לארכיון
        </button>
      )}

      <button type="button" onClick={onOpenArchive} className={lightButton}>
        <Image src="/icons/mobile/archive.svg" alt="" width={22} height={22} className="shrink-0" />
        ארכיון עובדים
      </button>

      <button type="button" onClick={onPortal} className={mobilePrimaryButton}>
        חזור לעמוד הבירורים
      </button>
    </div>
  );
}
