'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { EditableEmployee } from '@/lib/types';
import { heebo } from '@/lib/fonts';
import { getEmployeeName } from '@/lib/monthlyReport';
import { MissingDoc, fetchMissingDocs, uploadMissingDocFiles } from '@/lib/missingDocs';
import ActionRow from '@/components/mobile/ActionRow';
import Breadcrumbs from '@/components/mobile/Breadcrumbs';
import TabbedPanel from '@/components/mobile/TabbedPanel';
import { mobilePrimaryButton } from '@/components/auth/MobileAuthHeader';
import Form101LinkCreator from '@/components/form101/Form101LinkCreator';

export type EmployerTab = 'clarifications' | 'monthly-report';

const TABS: { key: EmployerTab; label: string }[] = [
  { key: 'clarifications', label: 'בירורים' },
  { key: 'monthly-report', label: 'דיווח חודשי' },
];

const secondaryButton =
  'flex w-full items-center justify-center border border-[#849acb] bg-white px-[14px] py-2 text-[16px] font-semibold text-[#0f1a33]';

interface MobileEmployerPortalProps {
  recordId?: string;
  // Set only for admins acting for a selected employer; others get their own employer on the server
  form101EmployerRecordId?: string;
  employees: EditableEmployee[];
  periodLabel: string;
  loading: boolean;
  tab: EmployerTab;
  onTabChange: (tab: EmployerTab) => void;
  onOpenEmployee: (employeeId: string) => void;
  onHome: () => void;
  onAddEmployee: () => void;
  onRemoveEmployee: () => void;
  onMonthlyReports: () => void;
}

// An employee is waiting for the monthly report while a required field is still empty
function isAwaitingReport(employee: EditableEmployee) {
  return employee.columns.some((col) => col.isMust && String(col.oldValue ?? '').trim() === '');
}

// Employer system: missing employee documents and the monthly report per employee
// (Figma: Client Portal mobile / client-portal-dashboard-employees Clarifications + monthly Report)
export default function MobileEmployerPortal({
  recordId,
  form101EmployerRecordId,
  employees,
  periodLabel,
  loading,
  tab,
  onTabChange,
  onOpenEmployee,
  onHome,
  onAddEmployee,
  onRemoveEmployee,
  onMonthlyReports,
}: MobileEmployerPortalProps) {
  const [missingDocs, setMissingDocs] = useState<MissingDoc[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showEmployeeActions, setShowEmployeeActions] = useState(false);
  const [showForm101, setShowForm101] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const loadMissingDocs = useCallback(async () => {
    if (!recordId) return;
    setLoadFailed(false);
    setMissingDocs(null);
    try {
      setMissingDocs(await fetchMissingDocs(recordId));
    } catch (error) {
      // Handled on screen with a retry button, so it's logged as a warning rather than an error
      console.warn('Failed to load missing documents', error);
      setLoadFailed(true);
    }
  }, [recordId]);

  useEffect(() => {
    loadMissingDocs();
  }, [loadMissingDocs]);

  // Closing the file picker without choosing a file clears the target row
  useEffect(() => {
    const input = fileInput.current;
    const clear = () => setTargetIndex(null);
    input?.addEventListener('cancel', clear);
    return () => input?.removeEventListener('cancel', clear);
  }, [loading, tab]);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    const doc = targetIndex !== null ? missingDocs?.[targetIndex] : undefined;
    if (!doc || !files.length || !recordId) {
      setTargetIndex(null);
      return;
    }
    setUploading(true);
    try {
      await uploadMissingDocFiles(doc, files, recordId);
      toast.success('המסמך הועלה בהצלחה');
      setMissingDocs((prev) => prev?.filter((d) => d !== doc) ?? null);
    } catch (error) {
      console.error('Failed to upload missing document', error);
      toast.error('העלאת המסמך נכשלה, נסו שוב');
    } finally {
      setUploading(false);
      setTargetIndex(null);
    }
  };

  const sortedEmployees = [...employees].sort((a, b) => Number(isAwaitingReport(b)) - Number(isAwaitingReport(a)));
  const awaitingCount = employees.filter(isAwaitingReport).length;
  const isClarifications = tab === 'clarifications';
  const docs = missingDocs ?? [];

  return (
    <div className="flex flex-1 flex-col gap-4 px-5 pb-[100px] pt-5 leading-[normal]">
      <Breadcrumbs crumbs={[{ label: 'דף הבית', onClick: onHome }, { label: 'מערכת מעסיקים' }]} />
      <h1 className={`${heebo.className} text-[24px] font-bold text-[#c57518]`}>מערכת מעסיקים</h1>

      {isClarifications && loadFailed && !loading ? (
        <>
          <TabbedPanel tabs={TABS} active={tab} onChange={onTabChange} emptyText="">
            {[
              <div key="error" className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-[16px] text-[#0f1a33]">לא ניתן לטעון כרגע את המסמכים החסרים</p>
                <button type="button" onClick={loadMissingDocs} className={secondaryButton}>
                  נסו שוב
                </button>
              </div>,
            ]}
          </TabbedPanel>
        </>
      ) : loading || (isClarifications && missingDocs === null) ? (
        <p className="py-16 text-center text-lg text-gray-600">טוען נתונים...</p>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <p className="text-[16px] text-[#0f172a]">
              {isClarifications ? `${docs.length} בירורים פתוחים` : `${awaitingCount} עובדים ממתינים לדיווח`}
            </p>
            {!isClarifications && periodLabel && (
              <p className="text-[14px] text-[#6b7280]">תקופת דיווח: {periodLabel}</p>
            )}
          </div>

          <TabbedPanel
            tabs={TABS}
            active={tab}
            onChange={onTabChange}
            emptyText={isClarifications ? 'אין מסמכים חסרים' : 'אין עובדים בתקופת הדיווח'}
          >
            {isClarifications
              ? docs.map((doc, i) => (
                  <ActionRow
                    key={`${doc.employeeRecordId}-${doc.fileType}-${i}`}
                    variant="gold"
                    className={i < docs.length - 1 ? 'border-b border-[#eaeef6]' : ''}
                    icon="alert-triangle"
                    text={`${doc.fileType} חסר עבור ${`${doc.firstName} ${doc.lastName}`.trim()}`}
                    action={uploading && targetIndex === i ? 'מעלה...' : 'עדכן'}
                    onClick={() => {
                      if (uploading) return;
                      setTargetIndex(i);
                      fileInput.current?.click();
                    }}
                  />
                ))
              : sortedEmployees.map((employee, i) => (
                  <ActionRow
                    key={employee.id}
                    variant="gold"
                    className={i < sortedEmployees.length - 1 ? 'border-b border-[#eaeef6]' : ''}
                    text={getEmployeeName(employee)}
                    action="עדכן"
                    onClick={() => onOpenEmployee(employee.id)}
                  />
                ))}
          </TabbedPanel>
          <input
            ref={fileInput}
            type="file"
            accept="image/*,application/pdf"
            multiple
            onChange={handleFiles}
            className="hidden"
          />
        </>
      )}

      <div className="flex flex-col gap-4 pt-4">
        <button
          type="button"
          onClick={() => setShowEmployeeActions((open) => !open)}
          aria-expanded={showEmployeeActions}
          className={mobilePrimaryButton}
        >
          עריכת רשימת עובדים
        </button>
        {showEmployeeActions && (
          <div className="flex gap-3">
            <button type="button" onClick={onAddEmployee} className={secondaryButton}>הוספת עובד</button>
            <button type="button" onClick={onRemoveEmployee} className={secondaryButton}>הסרת עובד</button>
          </div>
        )}
        {showEmployeeActions && (
          <button type="button" onClick={() => setShowForm101((open) => !open)} aria-expanded={showForm101} className={secondaryButton}>
            טופס 101 לעובד/ת חדש/ה
          </button>
        )}
        {showEmployeeActions && showForm101 && <Form101LinkCreator employerRecordId={form101EmployerRecordId} />}
        <button type="button" onClick={onMonthlyReports} className={mobilePrimaryButton}>
          דוחות חודשיים
        </button>
      </div>
    </div>
  );
}
