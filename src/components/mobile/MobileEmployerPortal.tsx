'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { EditableEmployee } from '@/lib/types';
import { heebo } from '@/lib/fonts';
import { getEmployeeName } from '@/lib/monthlyReport';
import { MissingDoc, fetchMissingDocs } from '@/lib/missingDocs';
import ActionRow from '@/components/mobile/ActionRow';
import Breadcrumbs from '@/components/mobile/Breadcrumbs';
import TabbedPanel from '@/components/mobile/TabbedPanel';
import UploadButton from '@/components/mobile/UploadButton';
import MobileMissingDocUpload from '@/components/mobile/MobileMissingDocUpload';
import { mobileOutlineButton } from '@/components/auth/MobileAuthHeader';

export type EmployerTab = 'missing-docs' | 'monthly-report' | 'clarifications';

// Listed right to left, as in the Figma frames
const TABS: { key: EmployerTab; label: string }[] = [
  { key: 'missing-docs', label: 'מסמכים חסרים' },
  { key: 'monthly-report', label: 'דיווח חודשי' },
  { key: 'clarifications', label: 'בירורים' },
];

const secondaryButton =
  'flex w-full items-center justify-center border border-[#849acb] bg-white px-[14px] py-2 text-[16px] font-semibold text-[#0f1a33]';

interface MobileEmployerPortalProps {
  recordId?: string;
  employees: EditableEmployee[];
  periodLabel: string;
  loading: boolean;
  tab: EmployerTab;
  onTabChange: (tab: EmployerTab) => void;
  onOpenEmployee: (employeeId: string) => void;
  onHome: () => void;
  onManageEmployees: () => void;
  onMonthlyReports: () => void;
  onUpload: () => void;
}

// An employee is waiting for the monthly report while a required field is still empty
function isAwaitingReport(employee: EditableEmployee) {
  return employee.columns.some((col) => col.isMust && String(col.oldValue ?? '').trim() === '');
}

// Employer system: missing employee documents, the monthly report per employee and clarifications
// (Figma: client-portal-dashboard-employees missing documents / monthly Report / Clarifications)
export default function MobileEmployerPortal({
  recordId,
  employees,
  periodLabel,
  loading,
  tab,
  onTabChange,
  onOpenEmployee,
  onHome,
  onManageEmployees,
  onMonthlyReports,
  onUpload,
}: MobileEmployerPortalProps) {
  const [missingDocs, setMissingDocs] = useState<MissingDoc[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  // The missing document whose upload screen is open
  const [openDoc, setOpenDoc] = useState<MissingDoc | null>(null);

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

  const docs = missingDocs ?? [];

  if (openDoc) {
    const closeDoc = () => {
      setOpenDoc(null);
      onTabChange('missing-docs');
    };
    return (
      <MobileMissingDocUpload
        key={`${openDoc.employeeRecordId}-${openDoc.monthlyReportId}-${openDoc.fileType}`}
        doc={openDoc}
        employerId={recordId}
        hasNext={docs.some((doc) => doc !== openDoc)}
        onHome={onHome}
        onBack={closeDoc}
        onUploaded={(uploaded) => setMissingDocs((prev) => prev?.filter((doc) => doc !== uploaded) ?? null)}
        onNext={() => setOpenDoc(docs.find((doc) => doc !== openDoc) ?? null)}
        onNewUpload={onUpload}
      />
    );
  }

  const sortedEmployees = [...employees].sort((a, b) => Number(isAwaitingReport(b)) - Number(isAwaitingReport(a)));
  const awaitingCount = employees.filter(isAwaitingReport).length;
  const isMissingDocs = tab === 'missing-docs';

  // No data source for employer clarifications yet, so the tab always shows the empty state
  const summary = isMissingDocs
    ? docs.length
      ? `${docs.length} מסמכים חסרים`
      : 'אין מסמכים חסרים'
    : tab === 'clarifications'
      ? 'אין בירורים פתוחים'
      : `${awaitingCount} עובדים ממתינים לדיווח`;

  const rows = isMissingDocs
    ? docs.map((doc, i) => (
        <ActionRow
          key={`${doc.employeeRecordId}-${doc.fileType}-${i}`}
          variant="gold"
          className={i < docs.length - 1 ? 'border-b border-[#eaeef6]' : ''}
          icon="alert-triangle"
          text={`${doc.fileType} חסר עבור ${`${doc.firstName} ${doc.lastName}`.trim()}`}
          action="עדכן"
          onClick={() => setOpenDoc(doc)}
        />
      ))
    : tab === 'monthly-report'
      ? sortedEmployees.map((employee, i) => (
          <ActionRow
            key={employee.id}
            variant="gold"
            className={i < sortedEmployees.length - 1 ? 'border-b border-[#eaeef6]' : ''}
            text={getEmployeeName(employee)}
            action="עדכן"
            onClick={() => onOpenEmployee(employee.id)}
          />
        ))
      : [
          // Figma: Clarifications- empty state
          <div key="empty" className="flex flex-col items-center gap-3 py-8">
            <Image src="/icons/mobile/check-fat.svg" alt="" width={80} height={80} />
            <p className="text-[20px] text-[#0f1a33]">אין נושאים פתוחים</p>
          </div>,
        ];

  return (
    <div className="flex flex-1 flex-col leading-[normal]">
      <div className="flex flex-col gap-6 px-4 pb-6 pt-4">
        <Breadcrumbs crumbs={[{ label: 'דף הבית', onClick: onHome }, { label: 'מערכת מעסיקים' }]} />
        <h1 className={`${heebo.className} text-[24px] font-bold text-[#c57518]`}>מערכת מעסיקים</h1>

        {isMissingDocs && loadFailed && !loading ? (
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
        ) : loading || (isMissingDocs && missingDocs === null) ? (
          <p className="py-16 text-center text-lg text-gray-600">טוען נתונים...</p>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <p className="text-[16px] text-[#0f172a]">{summary}</p>
              {tab === 'monthly-report' && periodLabel && (
                <p className="text-[14px] text-[#6b7280]">תקופת דיווח: {periodLabel}</p>
              )}
            </div>

            <TabbedPanel
              tabs={TABS}
              active={tab}
              onChange={onTabChange}
              emptyText={isMissingDocs ? 'אין מסמכים חסרים' : 'אין עובדים בתקופת הדיווח'}
            >
              {rows}
            </TabbedPanel>
          </>
        )}
      </div>

      {/* Bottom drawer with the employer actions (Figma: DRAWER) */}
      <div className="mt-auto flex flex-col items-center gap-4 rounded-t-[32px] border border-[#c1cce5] px-9 pb-[calc(16px+env(safe-area-inset-bottom))] pt-2">
        <Image src="/icons/mobile/drawer-handle.svg" alt="" width={36} height={21} className="shrink-0" />
        <button type="button" onClick={onManageEmployees} className={mobileOutlineButton}>
          עריכת רשימת עובדים
        </button>
        <button type="button" onClick={onMonthlyReports} className={mobileOutlineButton}>
          דוחות חודשיים
        </button>
        <UploadButton variant="outline" onClick={onUpload} />
      </div>
    </div>
  );
}
