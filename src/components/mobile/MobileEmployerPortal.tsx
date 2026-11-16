'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { EditableEmployee } from '@/lib/types';
import { heebo } from '@/lib/fonts';
import { getEmployeeName } from '@/lib/monthlyReport';
import { MissingDoc, fetchMissingDocs, missingDocKey } from '@/lib/missingDocs';
import ActionRow from '@/components/mobile/ActionRow';
import Breadcrumbs from '@/components/mobile/Breadcrumbs';
import TabbedPanel, { AllClear } from '@/components/mobile/TabbedPanel';
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
  // A missing document to open straight away (picked on the home screen)
  initialDoc?: MissingDoc | null;
  // Called once the initial document has been opened, so returning here later shows the list
  onInitialDocOpened?: () => void;
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
  initialDoc = null,
  onInitialDocOpened,
}: MobileEmployerPortalProps) {
  const [missingDocs, setMissingDocs] = useState<MissingDoc[] | null>(null);
  // The missing document whose upload screen is open
  const [openDoc, setOpenDoc] = useState<MissingDoc | null>(initialDoc);
  // The bottom drawer starts collapsed; its handle expands it
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadMissingDocs = useCallback(async () => {
    if (!recordId) return;
    setMissingDocs(null);
    try {
      setMissingDocs(await fetchMissingDocs(recordId));
    } catch (error) {
      // Shown as "no missing documents" rather than an error message (by request)
      console.warn('Failed to load missing documents', error);
      setMissingDocs([]);
    }
  }, [recordId]);

  useEffect(() => {
    loadMissingDocs();
  }, [loadMissingDocs]);

  useEffect(() => {
    if (initialDoc) onInitialDocOpened?.();
  }, [initialDoc, onInitialDocOpened]);

  const docs = missingDocs ?? [];

  if (openDoc) {
    const openKey = missingDocKey(openDoc);
    const others = docs.filter((doc) => missingDocKey(doc) !== openKey);
    const closeDoc = () => {
      setOpenDoc(null);
      onTabChange('missing-docs');
    };
    return (
      <MobileMissingDocUpload
        key={openKey}
        doc={openDoc}
        employerId={recordId}
        hasNext={others.length > 0}
        onHome={onHome}
        onBack={closeDoc}
        onUploaded={(uploaded) =>
          setMissingDocs((prev) => prev?.filter((doc) => missingDocKey(doc) !== missingDocKey(uploaded)) ?? null)
        }
        onNext={() => setOpenDoc(others[0] ?? null)}
        onNewUpload={onUpload}
      />
    );
  }

  const sortedEmployees = [...employees].sort((a, b) => Number(isAwaitingReport(b)) - Number(isAwaitingReport(a)));
  const awaitingCount = employees.filter(isAwaitingReport).length;
  const isMissingDocs = tab === 'missing-docs';

  // Each tab shows its own count, e.g. "מסמכים חסרים (3)"; missing documents get none while loading.
  // No data source for employer clarifications yet, so that tab is always 0.
  const counts: Record<EmployerTab, number | null> = {
    'missing-docs': missingDocs ? missingDocs.length : null,
    'monthly-report': awaitingCount,
    clarifications: 0,
  };
  const tabs = TABS.map(({ key, label }) => ({
    key,
    label: counts[key] === null ? label : `${label} (${counts[key]})`,
  }));

  const employeeRows = sortedEmployees.map((employee, i) => (
    <ActionRow
      key={employee.id}
      variant="gold"
      className={i < sortedEmployees.length - 1 ? 'border-b border-[#eaeef6]' : ''}
      text={getEmployeeName(employee)}
      action="עדכן"
      onClick={() => onOpenEmployee(employee.id)}
    />
  ));

  // A tab whose count is 0 shows the check mark; the monthly report still lists the employees under it
  const rows = isMissingDocs
    ? docs.length
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
      : [<AllClear key="clear" text="אין מסמכים חסרים" />]
    : tab === 'monthly-report'
      ? awaitingCount
        ? employeeRows
        : [<AllClear key="clear" text="אין עובדים ממתינים לדיווח" />, ...employeeRows]
      : [<AllClear key="clear" text="אין נושאים פתוחים" />];

  return (
    <div className="flex flex-1 flex-col leading-[normal]">
      <div className="flex flex-col gap-6 px-4 pb-6 pt-4">
        <Breadcrumbs crumbs={[{ label: 'דף הבית', onClick: onHome }, { label: 'מערכת מעסיקים' }]} />
        <h1 className={`${heebo.className} text-[24px] font-bold text-[#c57518]`}>מערכת מעסיקים</h1>

        {loading || (isMissingDocs && missingDocs === null) ? (
          <p className="py-16 text-center text-lg text-gray-600">טוען נתונים...</p>
        ) : (
          <>
            {tab === 'monthly-report' && periodLabel && (
              <p className="text-[14px] text-[#6b7280]">תקופת דיווח: {periodLabel}</p>
            )}

            <TabbedPanel
              tabs={tabs}
              active={tab}
              onChange={onTabChange}
              emptyText={isMissingDocs ? 'אין מסמכים חסרים' : 'אין עובדים בתקופת הדיווח'}
            >
              {rows}
            </TabbedPanel>
          </>
        )}
      </div>

      {/* Bottom drawer with the employer actions (Figma: DRAWER), collapsed until its handle is tapped */}
      <div className="mt-auto flex flex-col items-center rounded-t-[32px] border border-[#c1cce5] px-9 pb-[calc(16px+env(safe-area-inset-bottom))] pt-2">
        <button
          type="button"
          onClick={() => setDrawerOpen((open) => !open)}
          aria-expanded={drawerOpen}
          aria-controls="employer-drawer-actions"
          aria-label={drawerOpen ? 'סגירת פעולות' : 'פתיחת פעולות'}
          className="flex w-full justify-center py-1"
        >
          <Image src="/icons/mobile/drawer-handle.svg" alt="" width={36} height={21} className="shrink-0" />
        </button>
        <div
          className={`grid w-full transition-[grid-template-rows] duration-300 ${
            drawerOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div id="employer-drawer-actions" inert={!drawerOpen} className="overflow-hidden">
            <div className="flex flex-col items-center gap-4 pt-4">
              <button type="button" onClick={onManageEmployees} className={mobileOutlineButton}>
                עריכת רשימת עובדים
              </button>
              <button type="button" onClick={onMonthlyReports} className={mobileOutlineButton}>
                דוחות חודשיים
              </button>
              <UploadButton variant="outline" onClick={onUpload} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
