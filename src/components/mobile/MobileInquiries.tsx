'use client';

import { MonthlyInquiry } from '@/lib/types';
import { getInquiryGaps, inquiryMonthLabel } from '@/lib/inquiries';
import { heebo } from '@/lib/fonts';
import ActionRow from '@/components/mobile/ActionRow';
import Breadcrumbs from '@/components/mobile/Breadcrumbs';
import UploadButton from '@/components/mobile/UploadButton';
import TabbedPanel from '@/components/mobile/TabbedPanel';

export type InquiryTab = 'clarifications' | 'missing-invoices';

const TABS: { key: InquiryTab; label: string }[] = [
  { key: 'clarifications', label: 'הבהרות' },
  { key: 'missing-invoices', label: 'חשבוניות חסרות' },
];

interface MobileInquiriesProps {
  inquiries: MonthlyInquiry[];
  loading: boolean;
  tab: InquiryTab;
  onTabChange: (tab: InquiryTab) => void;
  onOpenInquiry: (inquiry: MonthlyInquiry) => void;
  onHome: () => void;
  onUpload: () => void;
}

// Open inquiries split into ones needing an answer and ones missing an invoice
// (Figma: Client Portal mobile / בירורים פתוחים הבהרות + חשבוניות חסרות)
export default function MobileInquiries({
  inquiries,
  loading,
  tab,
  onTabChange,
  onOpenInquiry,
  onHome,
  onUpload,
}: MobileInquiriesProps) {
  const rows = inquiries.map((inquiry) => ({ inquiry, ...getInquiryGaps(inquiry) }));
  const isClarifications = tab === 'clarifications';
  const clarifications = rows.filter((row) => row.missingAnswer);
  const missingInvoices = rows.filter((row) => row.missingDocs);
  const items = isClarifications ? clarifications : missingInvoices;
  // Each tab shows its own count, e.g. "הבהרות (3)"
  const counts: Record<InquiryTab, number> = {
    clarifications: clarifications.length,
    'missing-invoices': missingInvoices.length,
  };
  const tabs = TABS.map(({ key, label }) => ({ key, label: `${label} (${counts[key]})` }));

  return (
    <div className="flex flex-1 flex-col gap-3 px-5 pb-6 pt-5 leading-[normal]">
      <Breadcrumbs crumbs={[{ label: 'דף הבית', onClick: onHome }, { label: 'בירורים פתוחים' }]} />
      <h1 className={`${heebo.className} text-[24px] font-bold text-[#c57518]`}>בירורים פתוחים</h1>

      {loading ? (
        <p className="py-16 text-center text-lg text-gray-600">טוען נתונים...</p>
      ) : (
        <>
          <TabbedPanel
            tabs={tabs}
            active={tab}
            onChange={onTabChange}
            emptyText={isClarifications ? 'אין חשבוניות שצריכות הבהרה' : 'אין חשבוניות חסרות'}
          >
            {items.map(({ inquiry }, i) => (
              <ActionRow
                key={inquiry.recordId}
                variant="gold"
                className={i < items.length - 1 ? 'border-b border-[#eaeef6]' : ''}
                icon={isClarifications ? 'message-square' : 'alert-triangle'}
                text={
                  isClarifications
                    ? `חשבונית של ${inquiry.supplier}`
                    : [inquiry.supplier, inquiryMonthLabel(inquiry.date)].filter(Boolean).join(' ')
                }
                action="השב"
                onClick={() => onOpenInquiry(inquiry)}
              />
            ))}
          </TabbedPanel>
        </>
      )}

      <UploadButton onClick={onUpload} />
    </div>
  );
}
