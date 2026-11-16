'use client';

import { useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { MonthlyInquiry } from '@/lib/types';
import { saveMonthlyInquiry } from '@/lib/inquiries';
import Breadcrumbs from '@/components/mobile/Breadcrumbs';
import { FormRow, RowFileButton, RowTextInput, RowValue, SectionCard, saveButton } from '@/components/mobile/FormRow';
import { mobilePrimaryButton } from '@/components/auth/MobileAuthHeader';

interface MobileMissingInvoiceUploadProps {
  inquiry: MonthlyInquiry;
  recordId?: string;
  // Another inquiry still missing its invoice, for "שמור ועבור למסמך הבא"
  hasNext: boolean;
  onHome: () => void;
  onBack: () => void;
  // The invoice was saved; updates the inquiry lists without leaving this screen
  onSaved: (inquiry: MonthlyInquiry, resolved: boolean) => void;
  onNext: () => void;
  onNewUpload: () => void;
}

// "23/01/2026", as in the design (the Hebrew locale would use dots)
function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

// Upload the invoice an open inquiry is missing, then confirm it was sent
// (Figma: client-portal-dashboard-missing doc, its file-chosen state, and client-portal - specific invoice)
export default function MobileMissingInvoiceUpload({
  inquiry,
  recordId,
  hasNext,
  onHome,
  onBack,
  onSaved,
  onNext,
  onNewUpload,
}: MobileMissingInvoiceUploadProps) {
  const [remarks, setRemarks] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const date = formatDate(inquiry.date);

  const save = async (goToNext: boolean) => {
    if (!file) return;
    if (!recordId) {
      toast.error('חסר מזהה מעסיק לשמירת המסמך');
      return;
    }
    setSaving(true);
    try {
      const { updatedInquiry, resolved } = await saveMonthlyInquiry({
        inquiry,
        // The remark is sent as the inquiry's answer; an earlier answer is kept when no remark is added
        answer: remarks.trim() || inquiry.answer || '',
        files: [file],
        forceClose: inquiry.forceClose || '',
        recordId,
      });
      onSaved(updatedInquiry, resolved);
      if (goToNext) {
        // Straight to the next missing document; back to the list when this was the last one
        toast.success('המסמך הועלה בהצלחה');
        if (hasNext) onNext();
        else onBack();
      } else {
        setSent(true);
      }
    } catch (error) {
      console.error('Failed to upload missing invoice', error);
      toast.error('העלאת המסמך נכשלה, נסו שוב');
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
          { label: 'מסמך חסר' },
        ]}
      />
      <h1 className="text-[16px] font-bold text-[#1e3465]">העלאת מסמך חסר</h1>

      {sent ? (
        <>
          <div className="flex items-center gap-2 p-4">
            <Image src="/icons/mobile/check-fat.svg" alt="" width={24} height={24} className="shrink-0" />
            <p className="p-2 text-[16px] text-[#0f172a]">תשובה נשלחה</p>
          </div>
          <button type="button" onClick={onNewUpload} className={mobilePrimaryButton}>
            העלה מסמך חדש
          </button>
          <button type="button" onClick={onBack} className={saveButton}>
            חזור למסך הבירורים
          </button>
        </>
      ) : (
        <>
          <SectionCard>
            <FormRow label="המסמך החסר">
              <RowValue>{inquiry.supplier}</RowValue>
            </FormRow>
            {date && (
              <FormRow label="תאריך המסמך">
                <RowValue>{date}</RowValue>
              </FormRow>
            )}
            {inquiry.question && (
              <FormRow label="הערת המשרד">
                <RowValue>{inquiry.question}</RowValue>
              </FormRow>
            )}
            <FormRow label="הוסף הערה">
              <RowTextInput value={remarks} onChange={setRemarks} />
            </FormRow>
            <RowFileButton
              centered
              file={file}
              onChange={setFile}
            />
          </SectionCard>

          {/* Both save buttons are the same blue, dimmed until a file is chosen */}
          <button
            type="button"
            onClick={() => save(false)}
            disabled={saving || !file}
            className={mobilePrimaryButton}
          >
            {saving ? 'שומר...' : 'שמירה'}
          </button>
          <button type="button" onClick={() => save(true)} disabled={saving || !file} className={mobilePrimaryButton}>
            שמור ועבור למסמך הבא
          </button>
        </>
      )}
    </div>
  );
}
