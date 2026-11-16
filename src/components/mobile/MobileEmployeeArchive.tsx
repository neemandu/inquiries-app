'use client';

import { useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { EditableEmployee } from '@/lib/types';
import { getEmployeeName } from '@/lib/monthlyReport';
import Breadcrumbs from '@/components/mobile/Breadcrumbs';
import { SectionCard } from '@/components/mobile/FormRow';
import { EmployeeCheckRow } from '@/components/mobile/MobileEmployeeList';
import { mobilePrimaryButton } from '@/components/auth/MobileAuthHeader';

const actionButton =
  'flex flex-1 items-center justify-center gap-2 border p-4 text-[15px] font-semibold disabled:opacity-50';

// No backend scenario lists archived employees or restores/deletes them yet, so the actions only explain that
const notAvailable = () => toast.info('הפעולה עדיין לא זמינה', { description: 'לא נשלח דבר' });

interface MobileEmployeeArchiveProps {
  // Archived employees; empty until a data source for the archive exists
  employees: EditableEmployee[];
  onHome: () => void;
  onPortal: () => void;
  onList: () => void;
}

// Archived employees: restore or delete the checked ones (Figma: client-portal-dashboard- employees- archive)
export default function MobileEmployeeArchive({ employees, onHome, onPortal, onList }: MobileEmployeeArchiveProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const sorted = [...employees].sort((a, b) => getEmployeeName(a).localeCompare(getEmployeeName(b), 'he'));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex flex-1 flex-col gap-6 px-5 pb-[100px] pt-5 leading-[normal]">
      <Breadcrumbs
        crumbs={[
          { label: 'דף הבית', onClick: onHome },
          { label: 'מערכת מעסיקים', onClick: onPortal },
          { label: 'ארכיון עובדים' },
        ]}
      />
      <h1 className="text-[16px] font-bold text-[#1e3465]">ארכיון עובדים</h1>

      <SectionCard>
        {sorted.length ? (
          sorted.map((employee) => (
            <EmployeeCheckRow
              key={employee.id}
              name={getEmployeeName(employee)}
              checked={selected.has(employee.id)}
              onToggle={() => toggle(employee.id)}
              onEdit={notAvailable}
            />
          ))
        ) : (
          <p className="py-10 text-center text-[16px] text-[#6b7280]">אין עובדים בארכיון</p>
        )}
      </SectionCard>

      {/* Right to left: restore, delete (Figma) */}
      <div className="flex w-full gap-4">
        <button
          type="button"
          onClick={notAvailable}
          disabled={!selected.size}
          className={`${actionButton} border-[#c1cce5] text-[#0f1a33]`}
        >
          <Image src="/icons/mobile/user-plus.svg" alt="" width={20} height={20} className="shrink-0" />
          הוצאה מהארכיון
        </button>
        <button
          type="button"
          onClick={notAvailable}
          disabled={!selected.size}
          className={`${actionButton} border-[#eb131e] text-[#eb131e]`}
        >
          <Image src="/icons/mobile/user-minus-red.svg" alt="" width={20} height={20} className="shrink-0" />
          מחיקת עובדים
        </button>
      </div>

      <button type="button" onClick={onList} className={mobilePrimaryButton}>
        חזור לרשימת העובדים
      </button>
    </div>
  );
}
