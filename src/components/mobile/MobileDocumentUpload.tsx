'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { EditableEmployee } from '@/lib/types';
import { getEmployeeName } from '@/lib/monthlyReport';
import { DOCUMENT_TYPES, uploadEmployerDocument } from '@/lib/missingDocs';
import Breadcrumbs from '@/components/mobile/Breadcrumbs';
import { FormRow, RowFileButton, RowSelect, SectionCard } from '@/components/mobile/FormRow';
import { mobilePrimaryButton } from '@/components/auth/MobileAuthHeader';

// "כללי" isn't tied to an employee; the upload is sent for the employer itself
const GENERAL = 'general';

interface MobileDocumentUploadProps {
  employees: EditableEmployee[];
  employerId?: string;
  onHome: () => void;
  onPortal: () => void;
}

// Upload a new document for an employee or for the employer
// (Figma: client-portal-dashboard-new upload)
export default function MobileDocumentUpload({ employees, employerId, onHome, onPortal }: MobileDocumentUploadProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [fileType, setFileType] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const employeeOptions = [
    { value: GENERAL, label: 'כללי' },
    ...[...employees]
      .sort((a, b) => getEmployeeName(a).localeCompare(getEmployeeName(b), 'he'))
      .map((employee) => ({ value: employee.id, label: getEmployeeName(employee) })),
  ];

  const save = async () => {
    const found: Record<string, string> = {};
    if (!employeeId) found.employeeId = 'יש לבחור עובד או "כללי"';
    if (!fileType) found.fileType = 'יש לבחור סוג מסמך';
    if (!file) found.file = 'יש לבחור קובץ להעלאה';
    setErrors(found);
    if (Object.keys(found).length || !file) return;
    if (!employerId) {
      toast.error('לא נמצא מעסיק לשמירת המסמך');
      return;
    }

    setSending(true);
    try {
      await uploadEmployerDocument({
        employerId,
        employeeId: employeeId === GENERAL ? '' : employeeId,
        fileType,
        files: [file],
      });
      toast.success('המסמך הועלה בהצלחה', { description: 'אפשר להעלות מסמך נוסף' });
      // Keep the employee so the next document for the same person is quicker
      setFileType('');
      setFile(null);
    } catch (error) {
      console.error('Failed to upload document', error);
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
          { label: 'מערכת מעסיקים', onClick: onPortal },
          { label: 'העלאת מסמך חדש' },
        ]}
      />
      <h1 className="text-[16px] font-bold text-[#1e3465]">העלאת מסמך חדש</h1>

      <SectionCard>
        <FormRow label="שיוך לעובד" error={errors.employeeId}>
          <RowSelect
            value={employeeId}
            onChange={(value) => {
              setEmployeeId(value);
              setErrors((prev) => ({ ...prev, employeeId: '' }));
            }}
            options={employeeOptions}
          />
        </FormRow>
        <FormRow label="סוג המסמך" error={errors.fileType}>
          <RowSelect
            value={fileType}
            onChange={(value) => {
              setFileType(value);
              setErrors((prev) => ({ ...prev, fileType: '' }));
            }}
            options={DOCUMENT_TYPES}
          />
        </FormRow>
        <RowFileButton
          centered
          file={file}
          onChange={(picked) => {
            setFile(picked);
            setErrors((prev) => ({ ...prev, file: '' }));
          }}
        />
        {errors.file && <p className="text-center text-[13px] text-red-600">{errors.file}</p>}
      </SectionCard>

      <button type="button" onClick={save} disabled={sending} className={mobilePrimaryButton}>
        {sending ? 'מעלה...' : 'שמור והעלה מסמך נוסף'}
      </button>
    </div>
  );
}
