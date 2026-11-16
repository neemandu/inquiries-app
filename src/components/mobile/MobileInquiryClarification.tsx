'use client';

import { useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { MonthlyInquiry } from '@/lib/types';
import { saveMonthlyInquiry } from '@/lib/inquiries';
import Breadcrumbs from '@/components/mobile/Breadcrumbs';
import { FormRow, RowFileButton, RowValue, SectionCard, saveButton, saveButtonIdle } from '@/components/mobile/FormRow';
import { mobilePrimaryButton } from '@/components/auth/MobileAuthHeader';

interface MobileInquiryClarificationProps {
  inquiry: MonthlyInquiry;
  recordId?: string;
  onBack: () => void;
  onHome: () => void;
  // The answer was saved; updates the inquiry lists without leaving this screen
  onSaved: (inquiry: MonthlyInquiry, resolved: boolean) => void;
}

// "23/01/2026", as in the design (the Hebrew locale would use dots)
function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function formatAmount(value: string) {
  const num = Number(String(value).replace(/,/g, '').trim());
  return value && !Number.isNaN(num) ? `${num.toLocaleString('he-IL')} ש"ח` : '';
}

// The invoice's own image when the office attached one, otherwise the generic document icon
// (Figma annotation on the icon: "מקום לתמונה של החשבונית")
function InvoicePreview({ inquiry }: { inquiry: MonthlyInquiry }) {
  const doc = inquiry.docs?.find((d) => d.url);
  const icon = <Image src="/icons/mobile/file-image.svg" alt="" width={100} height={117} unoptimized />;
  if (!doc) return <div className="flex justify-center">{icon}</div>;
  const isImage = doc.type?.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(doc.filename || '');
  return (
    <a href={doc.url} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2" aria-label="פתיחת המסמך">
      {isImage ? (
        // An external file URL, so next/image (which needs configured hosts) doesn't fit here
        // eslint-disable-next-line @next/next/no-img-element
        <img src={doc.url} alt={doc.filename || 'המסמך'} className="max-h-[240px] w-auto max-w-full border border-[#eaeef6]" />
      ) : (
        icon
      )}
      <span className="max-w-full truncate text-[14px] text-[#365fb7] underline">{doc.filename || 'פתיחת המסמך'}</span>
    </a>
  );
}

// Answer what a document is, optionally with a replacement document, then confirm it was sent
// (Figma: client-portal - specific invoice empty / upload / sent)
export default function MobileInquiryClarification({
  inquiry,
  recordId,
  onBack,
  onHome,
  onSaved,
}: MobileInquiryClarificationProps) {
  const [answer, setAnswer] = useState(inquiry.answer || '');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const hasChanges = answer.trim() !== (inquiry.answer || '').trim() || !!file;

  const save = async () => {
    if (!answer.trim() && !file) {
      setError('יש לכתוב תשובה או לצרף מסמך');
      return;
    }
    if (!recordId) {
      toast.error('חסר מזהה מעסיק לשמירת הבירור');
      return;
    }
    setSaving(true);
    try {
      const { updatedInquiry, resolved } = await saveMonthlyInquiry({
        inquiry,
        answer: answer.trim(),
        files: file ? [file] : [],
        forceClose: inquiry.forceClose || '',
        recordId,
      });
      onSaved(updatedInquiry, resolved);
      setFile(null);
      setSent(true);
    } catch (err) {
      console.error('Failed to save inquiry', err);
      toast.error('השליחה נכשלה, נסו שוב');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 px-5 pb-[100px] pt-5 leading-[normal]">
      <Breadcrumbs
        crumbs={[
          { label: 'דף הבית', onClick: onHome },
          { label: 'בירורים פתוחים', onClick: onBack },
          { label: 'מהות מסמך' },
        ]}
      />
      {/* A general title; the supplier and amount go inside the card (Figma annotation) */}
      <h1 className="text-[16px] font-bold text-[#1e3465]">בירור מהות מסמך</h1>

      {sent ? (
        <>
          <div className="flex items-center gap-2 p-4">
            <Image src="/icons/mobile/check-fat.svg" alt="" width={24} height={24} className="shrink-0" />
            <p className="p-2 text-[16px] text-[#0f172a]">תשובה נשלחה</p>
          </div>
          <button type="button" onClick={() => setSent(false)} className={mobilePrimaryButton}>
            העלה מסמך נוסף
          </button>
          <button type="button" onClick={onBack} className={saveButton}>
            חזור למסך הבירורים
          </button>
        </>
      ) : (
        <>
          <SectionCard>
            <FormRow label="מקור המסמך">
              <RowValue>{inquiry.supplier}</RowValue>
            </FormRow>
            {formatDate(inquiry.date) && (
              <FormRow label="תאריך המסמך">
                <RowValue>{formatDate(inquiry.date)}</RowValue>
              </FormRow>
            )}
            {formatAmount(inquiry.hova) && (
              <FormRow label="סכום">
                <RowValue>{formatAmount(inquiry.hova)}</RowValue>
              </FormRow>
            )}
            {inquiry.details && (
              <FormRow label="פרטים">
                <RowValue>{inquiry.details}</RowValue>
              </FormRow>
            )}
            <div className="flex w-full flex-col gap-1">
              <label className="flex w-full items-start gap-3 bg-white p-4">
                <span className="w-[113px] shrink-0 text-[16px] text-[#0f172a]">
                  {inquiry.question || 'מה מהות המסמך?'}
                </span>
                <textarea
                  value={answer}
                  onChange={(e) => {
                    setAnswer(e.target.value);
                    setError('');
                  }}
                  placeholder="הזן טקסט"
                  rows={3}
                  className="min-w-0 flex-1 resize-none border border-[#eaeef6] bg-white p-2 text-[16px] text-[#0f1a33] placeholder:text-[#9ca3af] focus:border-[#849acb] focus:outline-none"
                />
              </label>
              {error && <p className="px-4 text-[13px] text-red-600">{error}</p>}
            </div>
            <InvoicePreview inquiry={inquiry} />
          </SectionCard>

          <div className="flex w-full items-stretch gap-3">
            <RowFileButton
              stretch
              label="העלאת מסמך חלופי"
              file={file}
              onChange={(picked) => {
                setFile(picked);
                setError('');
              }}
            />
            <button
              type="button"
              onClick={save}
              disabled={saving || !hasChanges}
              className={`${saveButton} ${saveButtonIdle} flex-1`}
            >
              {saving ? 'שומר...' : 'שמירה'}
            </button>
          </div>

          <button type="button" onClick={save} disabled={saving} className={mobilePrimaryButton}>
            {saving ? 'שולח...' : 'שלח תשובה'}
          </button>
        </>
      )}
    </div>
  );
}
