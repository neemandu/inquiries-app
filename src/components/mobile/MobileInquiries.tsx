'use client';

import { MonthlyInquiry } from '@/lib/types';
import { getInquiryGaps, inquiryMonthLabel } from '@/lib/inquiries';
import { heebo } from '@/lib/fonts';
import ActionRow from '@/components/mobile/ActionRow';
import Breadcrumbs from '@/components/mobile/Breadcrumbs';
import UploadButton from '@/components/mobile/UploadButton';

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
  const items = rows.filter((row) => (isClarifications ? row.missingAnswer : row.missingDocs));

  return (
    <div className="flex flex-1 flex-col gap-3 px-5 pb-6 pt-5 leading-[normal]">
      <Breadcrumbs crumbs={[{ label: 'דף הבית', onClick: onHome }, { label: 'בירורים פתוחים' }]} />
      <h1 className={`${heebo.className} text-[24px] font-bold text-[#c57518]`}>בירורים פתוחים</h1>

      {loading ? (
        <p className="py-16 text-center text-lg text-gray-600">טוען נתונים...</p>
      ) : (
        <>
          <p className="text-[16px] text-[#0f1a33]">
            {isClarifications ? `${items.length} חשבוניות צריכות הבהרה` : `${items.length} חשבוניות חסרות`}
          </p>

          <div className="flex flex-1 flex-col drop-shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
            <div role="tablist" className="flex h-11 gap-1">
              {TABS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={key === tab}
                  onClick={() => onTabChange(key)}
                  className={`flex flex-1 items-center justify-center p-2 text-[16px] font-bold text-[#0f1a33] ${
                    key === tab ? 'bg-[#fef8ec]' : 'border-x border-t border-[#eaeef6] bg-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div role="tabpanel" className="flex flex-1 flex-col gap-3 border-8 border-[#fef8ec] bg-white p-2">
              {items.length ? (
                items.map(({ inquiry }, i) => (
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
                    action={isClarifications ? 'השב' : 'צירוף'}
                    onClick={() => onOpenInquiry(inquiry)}
                  />
                ))
              ) : (
                <p className="py-10 text-center text-[16px] text-[#6b7280]">
                  {isClarifications ? 'אין חשבוניות שצריכות הבהרה' : 'אין חשבוניות חסרות'}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      <UploadButton onClick={onUpload} />
    </div>
  );
}
