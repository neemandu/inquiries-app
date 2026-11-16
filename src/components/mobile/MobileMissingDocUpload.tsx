'use client';

import { useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { MissingDoc, uploadMissingDocFiles } from '@/lib/missingDocs';
import Breadcrumbs from '@/components/mobile/Breadcrumbs';
import { FormRow, RowFileButton, RowTextInput, RowValue, SectionCard, saveButton } from '@/components/mobile/FormRow';
import { mobilePrimaryButton } from '@/components/auth/MobileAuthHeader';

interface MobileMissingDocUploadProps {
  doc: MissingDoc;
  employerId?: string;
  hasNext: boolean;
  onHome: () => void;
  onBack: () => void;
  // The document was uploaded and is no longer missing
  onUploaded: (doc: MissingDoc) => void;
  onNext: () => void;
  onNewUpload: () => void;
}

// Upload one missing employee document, then confirm it was sent
// (Figma: client-portal-dashboard-employees-missing doc / uploaded / sent)
export default function MobileMissingDocUpload({
  doc,
  employerId,
  hasNext,
  onHome,
  onBack,
  onUploaded,
  onNext,
  onNewUpload,
}: MobileMissingDocUploadProps) {
  const [remarks, setRemarks] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const employeeName = `${doc.firstName} ${doc.lastName}`.trim();

  const save = async (goToNext: boolean) => {
    if (!file) return;
    if (!employerId) {
      toast.error('לא נמצא מעסיק לשמירת המסמך');
      return;
    }
    setSending(true);
    try {
      await uploadMissingDocFiles(doc, [file], employerId, remarks);
      onUploaded(doc);
      if (goToNext) {
        // Straight to the next missing document; back to the list when this was the last one
        toast.success('המסמך הועלה בהצלחה');
        if (hasNext) onNext();
        else onBack();
      } else {
        setSent(true);
      }
    } catch (error) {
      console.error('Failed to upload missing document', error);
      toast.error('העלאת המסמך נכשלה, נסו שוב');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 px-5 pb-[100px] pt-5 leading-[normal]">
      <Breadcrumbs
        crumbs={[
          { label: 'דף הבית', onClick: onHome },
          { label: 'מערכת מעסיקים', onClick: onBack },
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
              <RowValue>{doc.fileType}</RowValue>
            </FormRow>
            {employeeName && (
              <FormRow label="עבור העובד">
                <RowValue>{employeeName}</RowValue>
              </FormRow>
            )}
            {doc.accountantComments && (
              <FormRow label="הערת המשרד">
                <RowValue>{doc.accountantComments}</RowValue>
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
            disabled={sending || !file}
            className={mobilePrimaryButton}
          >
            {sending ? 'שומר...' : 'שמירה'}
          </button>
          <button type="button" onClick={() => save(true)} disabled={sending || !file} className={mobilePrimaryButton}>
            שמור ועבור למסמך הבא
          </button>
        </>
      )}
    </div>
  );
}
