'use client';

import Image from 'next/image';
import { MonthlyInquiry } from '@/lib/types';
import { getInquiryGaps } from '@/lib/inquiries';
import { heebo } from '@/lib/fonts';
import MaskIcon from '@/components/mobile/MaskIcon';
import { mobilePrimaryButton } from '@/components/auth/MobileAuthHeader';

const MAX_INQUIRY_CARDS = 3;

interface MobileHomeProps {
  firstName: string;
  loading: boolean;
  monthlyInquiries: MonthlyInquiry[];
  generalCount: number;
  missingDocsCount: number;
  onOpenInquiry: (inquiry: MonthlyInquiry) => void;
  onOpenInquiries: () => void;
  onOpenGeneralInquiries: () => void;
  onOpenEmployerPortal: () => void;
  onOpenMissingDocs: () => void;
  onUpload: () => void;
}

function monthLabel(dateStr: string) {
  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
}

function UploadButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`${mobilePrimaryButton} gap-2`}>
      <MaskIcon src="/icons/mobile/camera.svg" size={20} />
      סרוק / העלה מסמך חדש
    </button>
  );
}

const sectionCard =
  'flex w-full flex-col border-[0.5px] border-[#eaeef6] bg-white p-4 drop-shadow-[0_4px_10px_rgba(0,0,0,0.05)]';

function Section({ title, onTitleClick, children }: { title: string; onTitleClick: () => void; children: React.ReactNode }) {
  return (
    <section className={`${sectionCard} gap-4`}>
      <button type="button" onClick={onTitleClick} className="flex w-full items-center text-[#c57518]">
        <span className={`${heebo.className} flex-1 text-right text-[16px] font-bold`}>{title}</span>
        <MaskIcon src="/icons/mobile/caret-double-left.svg" size={10} />
      </button>
      {children}
    </section>
  );
}

function ActionCard({
  icon,
  text,
  action,
  onClick,
}: {
  icon: 'alert-triangle' | 'message-square';
  text: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="flex w-full items-center gap-2 bg-white p-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex size-6 shrink-0 items-center justify-center text-[#1e3465]">
          <MaskIcon src={`/icons/mobile/${icon}.svg`} size={18} />
        </span>
        <span className="min-w-0 text-[16px] text-[#0f1a33]">{text}</span>
      </div>
      <button
        type="button"
        onClick={onClick}
        className="shrink-0 border border-[#284587] px-[14px] py-2 text-[12px] font-semibold text-[#0f1a33]"
      >
        {action}
      </button>
    </div>
  );
}

// Mobile home screen with the open items that need the client's attention (Figma: Client Portal mobile / Homepage)
export default function MobileHome({
  firstName,
  loading,
  monthlyInquiries,
  generalCount,
  missingDocsCount,
  onOpenInquiry,
  onOpenInquiries,
  onOpenGeneralInquiries,
  onOpenEmployerPortal,
  onOpenMissingDocs,
  onUpload,
}: MobileHomeProps) {
  const incomplete = monthlyInquiries
    .map((inquiry) => ({ inquiry, ...getInquiryGaps(inquiry) }))
    .filter(({ missingAnswer, missingDocs }) => missingAnswer || missingDocs);
  const total = monthlyInquiries.length;
  const done = total - incomplete.length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  const isEmpty = total === 0 && generalCount === 0 && missingDocsCount === 0;

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6 px-8 py-6 leading-[normal]">
        <p className="text-[16px] font-bold text-[#1e3465]">שלום {firstName}</p>
        <p className="py-16 text-center text-lg text-gray-600">טוען נתונים...</p>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-1 flex-col items-center leading-[normal]">
        <div className="flex w-full flex-col gap-6 px-5 pb-[100px] pt-5">
          <div className="flex w-full flex-col gap-3">
            <p className="text-[16px] font-bold text-[#0f1a33]">שלום {firstName},</p>
            <div className="flex flex-col items-center justify-center gap-3 p-4">
              <MaskIcon src="/icons/mobile/check-fat.svg" size={80} className="text-[#1e3465]" />
              <p className="text-[20px] text-[#0f1a33]">אין נושאים פתוחים</p>
            </div>
          </div>
          <UploadButton onClick={onUpload} />
        </div>
        <Image src="/images/home-empty-shelf.png" alt="" width={321} height={158} className="h-[158px] w-[321px] object-cover" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col justify-between gap-6 px-8 pb-8 leading-[normal]">
      <div className="flex w-full flex-col items-center gap-6 py-6">
        <p className="w-full text-[16px] font-bold text-[#1e3465]">שלום {firstName}</p>

        {total > 0 && (
          <div className={sectionCard}>
            <div className="flex w-full flex-col gap-4 bg-white p-4">
              <p className="text-[16px] font-bold text-[#1e3465]">התקדמות בבירורים</p>
              <div className="flex flex-col gap-4" dir="ltr">
                <p className="text-[16px] font-bold text-[#1e3465]">{percent}%</p>
                <div
                  className="h-3 w-full overflow-hidden bg-[#f3f4f6]"
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="התקדמות בבירורים"
                >
                  <div className="h-full bg-[#1e3465]" style={{ width: `${percent}%` }} />
                </div>
                <div className="flex items-center justify-between text-[16px] text-[#849acb]">
                  <span className="flex items-center gap-2">
                    <span className="size-2 bg-[#1e3465]" />
                    <span dir="rtl">{done} הושלמו</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="size-2 bg-[#e5e7eb]" />
                    <span dir="rtl">{incomplete.length} נותרו</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {(total > 0 || generalCount > 0) && (
          <Section title="מערכת בירורים" onTitleClick={onOpenInquiries}>
            {incomplete.slice(0, MAX_INQUIRY_CARDS).map(({ inquiry, missingDocs }) => (
              <ActionCard
                key={inquiry.recordId}
                icon="alert-triangle"
                text={[inquiry.supplier, monthLabel(inquiry.date)].filter(Boolean).join(' ')}
                action={missingDocs ? 'צירוף' : 'מענה'}
                onClick={() => onOpenInquiry(inquiry)}
              />
            ))}
            {total > 0 && (
              <ActionCard icon="message-square" text={`${total} בירורים פתוחים`} action="צפייה" onClick={onOpenInquiries} />
            )}
            {generalCount > 0 && (
              <ActionCard
                icon="message-square"
                text={`${generalCount} בירורים כלליים`}
                action="צפייה"
                onClick={onOpenGeneralInquiries}
              />
            )}
          </Section>
        )}

        {missingDocsCount > 0 && (
          <Section title="מערכת מעסיקים" onTitleClick={onOpenEmployerPortal}>
            <ActionCard
              icon="alert-triangle"
              text={`${missingDocsCount} מסמכים חסרים לעובדים`}
              action="צירוף"
              onClick={onOpenMissingDocs}
            />
          </Section>
        )}
      </div>

      <UploadButton onClick={onUpload} />
    </div>
  );
}
