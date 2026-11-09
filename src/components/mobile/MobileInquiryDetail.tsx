'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { MonthlyInquiry } from '@/lib/types';
import { saveMonthlyInquiry } from '@/lib/inquiries';
import Breadcrumbs from '@/components/mobile/Breadcrumbs';
import { mobilePrimaryButton } from '@/components/auth/MobileAuthHeader';

interface MobileInquiryDetailProps {
  inquiry: MonthlyInquiry;
  recordId?: string;
  onBack: () => void;
  onHome: () => void;
  onSaved: (inquiry: MonthlyInquiry, resolved: boolean) => void;
}

const secondaryButton =
  'flex w-full items-center justify-center border border-[#849acb] px-[14px] py-2 text-[16px] font-semibold text-[#0f1a33] disabled:opacity-60';

function formatAmount(value: string) {
  const num = Number(String(value).replace(/,/g, '').trim());
  return value && !Number.isNaN(num) ? `${num.toLocaleString('he-IL')} ₪` : '';
}

// Answer a single inquiry or attach its invoice (Figma: Client Portal mobile / client-portal - specific invoice)
export default function MobileInquiryDetail({ inquiry, recordId, onBack, onHome, onSaved }: MobileInquiryDetailProps) {
  const [answer, setAnswer] = useState(inquiry.answer || '');
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const title = `חשבונית של ${inquiry.supplier}`;
  const date = new Date(inquiry.date);
  const meta = [
    Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('he-IL'),
    formatAmount(inquiry.hova),
    inquiry.details,
  ].filter(Boolean);

  const save = async (files: File[]) => {
    if (!recordId) {
      toast.error('חסר מזהה מעסיק לשמירת הבירור');
      return;
    }
    setSaving(true);
    try {
      const { updatedInquiry, resolved } = await saveMonthlyInquiry({
        inquiry,
        answer,
        files,
        forceClose: inquiry.forceClose || '',
        recordId,
      });
      toast.success(files.length ? 'המסמך הועלה בהצלחה' : 'התשובה נשלחה בהצלחה');
      onSaved(updatedInquiry, resolved);
    } catch (error) {
      console.error('Failed to save inquiry', error);
      toast.error('השליחה נכשלה, נסו שוב');
    } finally {
      setSaving(false);
    }
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length) save(files);
  };

  return (
    <div className="flex flex-1 flex-col gap-6 px-5 pb-[100px] pt-5 leading-[normal]">
      <Breadcrumbs
        crumbs={[
          { label: 'דף הבית', onClick: onHome },
          { label: 'בירורים פתוחים', onClick: onBack },
          { label: inquiry.supplier },
        ]}
      />

      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-[16px] font-bold text-[#1e3465]">{title}</h1>
          {meta.length > 0 && <p className="text-[14px] text-[#6b7280]">{meta.join(' · ')}</p>}
        </div>

        <div className="flex w-full flex-col gap-4 border-[0.5px] border-[#eaeef6] bg-white p-4 drop-shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
          <div className="flex w-full items-center justify-between gap-2">
            <Image src="/icons/mobile/msg-icon-bg.svg" alt="" width={50} height={58} unoptimized className="shrink-0" />
            <label className="flex h-[150px] min-w-0 flex-1 flex-col gap-3 border border-[#eaeef6] p-2">
              <span className="text-[16px] text-[#0f172a]">{inquiry.question || 'השיבו לבירור'}</span>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="השב כאן"
                className="min-h-0 flex-1 resize-none bg-transparent text-[16px] text-[#0f172a] outline-none placeholder:text-[#bdb5b5]"
              />
            </label>
          </div>

          <div className="flex w-full flex-col gap-4">
            <button
              type="button"
              onClick={() => save([])}
              disabled={saving || !answer.trim()}
              className={secondaryButton}
            >
              {saving ? 'שולח...' : 'שלח'}
            </button>
            <button type="button" onClick={() => fileInput.current?.click()} disabled={saving} className={secondaryButton}>
              העלה מסמך חדש
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={handleFiles}
              className="hidden"
            />
          </div>

          {inquiry.docs?.length > 0 && (
            <div className="flex flex-col gap-1 text-[14px]">
              <span className="text-[#6b7280]">מסמכים מצורפים</span>
              {inquiry.docs.map((doc, i) =>
                doc.url ? (
                  <a key={doc.id || i} href={doc.url} target="_blank" rel="noreferrer" className="truncate text-[#365fb7] underline">
                    {doc.filename || `מסמך ${i + 1}`}
                  </a>
                ) : (
                  <span key={doc.id || i} className="truncate text-[#0f1a33]">{doc.filename || `מסמך ${i + 1}`}</span>
                )
              )}
            </div>
          )}
        </div>
      </div>

      <button type="button" onClick={onBack} className={mobilePrimaryButton}>
        חזור לרשימת הבירורים
      </button>
    </div>
  );
}
