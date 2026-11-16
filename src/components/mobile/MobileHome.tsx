'use client';

import Image from 'next/image';
import { MonthlyInquiry } from '@/lib/types';
import { getInquiryGaps, inquiryMonthLabel } from '@/lib/inquiries';
import { MissingDoc, missingDocKey } from '@/lib/missingDocs';
import { heebo } from '@/lib/fonts';
import MaskIcon from '@/components/mobile/MaskIcon';
import ActionRow from '@/components/mobile/ActionRow';
import UploadButton from '@/components/mobile/UploadButton';

// The home screen previews only the first open items of each system; the title row leads to the full list
const MAX_PREVIEW_ROWS = 2;

interface MobileHomeProps {
  firstName: string;
  loading: boolean;
  monthlyInquiries: MonthlyInquiry[];
  generalCount: number;
  // Missing employee documents; null until loaded
  missingDocs: MissingDoc[] | null;
  onOpenInquiry: (inquiry: MonthlyInquiry) => void;
  onOpenInquiries: () => void;
  onOpenGeneralInquiries: () => void;
  onOpenMissingDocs: () => void;
  onOpenMissingDoc: (doc: MissingDoc) => void;
  onUpload: () => void;
}

const sectionCard =
  'flex w-full flex-col border-[0.5px] border-[#eaeef6] bg-white p-4 drop-shadow-[0_4px_10px_rgba(0,0,0,0.05)]';

function Section({
  title,
  count,
  onTitleClick,
  children,
}: {
  title: string;
  count?: number;
  onTitleClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className={`${sectionCard} gap-4`}>
      <button type="button" onClick={onTitleClick} className="flex w-full items-center gap-2 text-[#c57518]">
        <span className={`${heebo.className} flex-1 text-right text-[16px] font-bold`}>
          {title}
          {count !== undefined && ` (${count})`}
        </span>
        <MaskIcon src="/icons/mobile/caret-double-left.svg" size={10} />
      </button>
      {children}
    </section>
  );
}

// Mobile home screen with the open items that need the client's attention (Figma: Client Portal mobile / Homepage)
export default function MobileHome({
  firstName,
  loading,
  monthlyInquiries,
  generalCount,
  missingDocs,
  onOpenInquiry,
  onOpenInquiries,
  onOpenGeneralInquiries,
  onOpenMissingDocs,
  onOpenMissingDoc,
  onUpload,
}: MobileHomeProps) {
  // Newest first, so the preview shows the latest open inquiries
  const incomplete = monthlyInquiries
    .map((inquiry) => ({ inquiry, ...getInquiryGaps(inquiry) }))
    .filter(({ missingAnswer, missingDocs }) => missingAnswer || missingDocs)
    .sort((a, b) => (new Date(b.inquiry.date).getTime() || 0) - (new Date(a.inquiry.date).getTime() || 0));
  const isEmpty = incomplete.length === 0 && generalCount === 0 && !missingDocs?.length;

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

        {(incomplete.length > 0 || generalCount > 0) && (
          <Section title="מערכת בירורים" count={incomplete.length} onTitleClick={onOpenInquiries}>
            {incomplete.slice(0, MAX_PREVIEW_ROWS).map(({ inquiry }) => (
              <ActionRow
                key={inquiry.recordId}
                icon="alert-triangle"
                text={[inquiry.supplier, inquiryMonthLabel(inquiry.date)].filter(Boolean).join(' ')}
                action="השב"
                onClick={() => onOpenInquiry(inquiry)}
              />
            ))}
            {generalCount > 0 && (
              <ActionRow
                icon="message-square"
                text={`${generalCount} בירורים כלליים`}
                action="צפייה"
                onClick={onOpenGeneralInquiries}
              />
            )}
          </Section>
        )}

        <Section title="מערכת מעסיקים" count={missingDocs?.length ?? 0} onTitleClick={onOpenMissingDocs}>
          {missingDocs?.length ? (
            missingDocs.slice(0, MAX_PREVIEW_ROWS).map((doc) => (
              <ActionRow
                key={missingDocKey(doc)}
                icon="alert-triangle"
                text={`${doc.fileType} חסר עבור ${`${doc.firstName} ${doc.lastName}`.trim()}`}
                action="השב"
                onClick={() => onOpenMissingDoc(doc)}
              />
            ))
          ) : (
            <p className="text-[16px] text-[#6b7280]">אין מסמכים חסרים</p>
          )}
        </Section>
      </div>

      <UploadButton onClick={onUpload} />
    </div>
  );
}
