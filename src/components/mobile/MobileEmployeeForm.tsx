'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { EditableEmployee } from '@/lib/types';
import { addEmployee } from '@/lib/utils';
import { EmployeeDetails, fileToBase64, getEmployeeDetails, isActiveEmployeeId, parseDisplayDate, toDisplayDate } from '@/lib/employees';
import Breadcrumbs, { Crumb } from '@/components/mobile/Breadcrumbs';
import { FormRow, RowFileButton, RowSelect, RowTextInput, SectionCard, saveButton } from '@/components/mobile/FormRow';
import { mobileOutlineButton, mobilePrimaryButton } from '@/components/auth/MobileAuthHeader';
import Form101LinkCreator from '@/components/form101/Form101LinkCreator';
import type { Form101Prefill } from '@/components/form101/Form101Wizard';

const FORM101_OPTIONS = [
  { value: 'כן', label: 'מולא' },
  { value: 'לא', label: 'לא מולא' },
];
const PENSION_OPTIONS = ['כן', 'לא', 'בבדיקה'].map((value) => ({ value, label: value }));

interface Values extends EmployeeDetails {
  form101: string;
  pension: string;
}

type Errors = Partial<Record<keyof Values | 'pensionFile', string>>;

interface MobileEmployeeFormProps {
  // Editing an existing employee when given, otherwise adding a new one
  employee?: EditableEmployee;
  employees: EditableEmployee[];
  recordId?: string;
  form101EmployerRecordId?: string;
  onHome: () => void;
  onPortal: () => void;
  onList: () => void;
  onSaved: () => void;
}

function validate(values: Values, pensionFile: File | null): Errors {
  const errors: Errors = {};
  if (values.firstName.trim().length < 2) errors.firstName = 'שם פרטי חייב להכיל לפחות 2 תווים';
  if (values.lastName.trim().length < 2) errors.lastName = 'שם משפחה חייב להכיל לפחות 2 תווים';
  if (!/^\d{1,9}$/.test(values.idNumber.trim())) errors.idNumber = 'יש להזין תעודת זהות (ספרות בלבד)';
  if (!parseDisplayDate(values.startDate)) errors.startDate = 'יש להזין תאריך בפורמט DD/MM/YYYY';
  if (!values.form101) errors.form101 = 'יש לבחור אפשרות';
  if (!values.pension) errors.pension = 'יש לבחור אפשרות';
  if (values.pension === 'כן' && !pensionFile) errors.pensionFile = 'יש להעלות קובץ פנסיה פעילה';
  return errors;
}

const toPrefill = (values: Values): Form101Prefill => ({
  firstName: values.firstName.trim(),
  lastName: values.lastName.trim(),
  idNumber: values.idNumber.trim(),
});

// Add a new employee or edit an existing one; Form 101 links are created from here
// (Figma: Client Portal mobile / הוספת עובד חדש)
export default function MobileEmployeeForm({
  employee,
  employees,
  recordId,
  form101EmployerRecordId,
  onHome,
  onPortal,
  onList,
  onSaved,
}: MobileEmployeeFormProps) {
  const isEdit = !!employee;
  const emptyValues = (): Values => ({
    ...(employee
      ? getEmployeeDetails(employee)
      : { firstName: '', lastName: '', idNumber: '', department: '', startDate: '' }),
    form101: '',
    pension: '',
  });
  const [values, setValues] = useState<Values>(emptyValues);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [pensionFile, setPensionFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  // Set after a new employee was added: the details the Form 101 link is created for
  const [added, setAdded] = useState<{ prefill: Form101Prefill; needs101: boolean } | null>(null);

  const set = (key: keyof Values) => (value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const reset = () => {
    setValues(emptyValues());
    setContractFile(null);
    setPensionFile(null);
    setErrors({});
    setAdded(null);
  };

  const save = async () => {
    const found = validate(values, pensionFile);
    if (!isEdit && !found.idNumber && isActiveEmployeeId(employees, values.idNumber)) {
      found.idNumber = 'לא ניתן להוסיף עובד עם תעודת זהות זו כי הוא כבר קיים כעובד';
    }
    setErrors(found);
    if (Object.keys(found).length) return;

    if (isEdit) {
      // No backend scenario updates an existing employee yet, so nothing is sent
      toast.info('שמירת שינויים בפרטי עובד קיים עדיין לא זמינה', { description: 'הפרטים לא נשמרו' });
      return;
    }
    if (!recordId) {
      toast.error('לא נמצא מעסיק לשמירת העובד');
      return;
    }

    setSaving(true);
    try {
      const startDate = parseDisplayDate(values.startDate)!;
      const response = await addEmployee({
        record_id: recordId,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        tz: values.idNumber.trim(),
        startDate: toDisplayDate(startDate),
        is101Full: values.form101 === 'כן',
        pension: {
          contentType: 'application/pdf',
          file_name: pensionFile?.name || '',
          file: pensionFile ? await fileToBase64(pensionFile) : '',
        },
        workFile: {
          contentType: 'application/pdf',
          file_name: contractFile?.name || '',
          file: contractFile ? await fileToBase64(contractFile) : '',
        },
        department: values.department.trim(),
      });
      if (!response.success) {
        if (response.code === 'EMPLOYEE_ALREADY_EXISTS_ACTIVE' || response.message?.includes('כבר קיים')) {
          setErrors({ idNumber: response.message || 'העובד כבר קיים כעובד' });
        }
        toast.error('שגיאה בהוספת העובד', { description: response.message || 'אנא נסו שוב או פנו למשרד' });
        return;
      }
      toast.success('העובד נוסף בהצלחה');
      setAdded({ prefill: toPrefill(values), needs101: values.form101 === 'לא' });
      onSaved();
    } catch (error) {
      console.error('Failed to add employee', error);
      toast.error('שגיאה בהוספת העובד', { description: 'אנא נסו שוב או פנו למשרד' });
    } finally {
      setSaving(false);
    }
  };

  const title = isEdit ? 'עריכת פרטי עובד' : 'הוספת עובד חדש';
  const crumbs: Crumb[] = [
    { label: 'דף הבית', onClick: onHome },
    { label: 'מערכת מעסיקים', onClick: onPortal },
    { label: 'עריכת רשימת עובדים', onClick: onList },
    { label: title },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6 px-5 pb-[100px] pt-5 leading-[normal]">
      <Breadcrumbs crumbs={crumbs} />
      <h1 className="text-[16px] font-bold text-[#1e3465]">{title}</h1>

      {added ? (
        <SectionCard>
          <p className="text-[16px] text-[#0f172a]">
            {`${added.prefill.firstName} ${added.prefill.lastName}`.trim()} נוסף/ה לרשימת העובדים.
          </p>
          {added.needs101 && (
            <Form101LinkCreator employerRecordId={form101EmployerRecordId} employee={added.prefill} />
          )}
          <button type="button" onClick={reset} className={mobileOutlineButton}>
            הוספת עובד נוסף
          </button>
        </SectionCard>
      ) : (
        <>
          <SectionCard>
            <FormRow label="שם פרטי" error={errors.firstName}>
              <RowTextInput value={values.firstName} onChange={set('firstName')} maxLength={40} />
            </FormRow>
            <FormRow label="שם משפחה" error={errors.lastName}>
              <RowTextInput value={values.lastName} onChange={set('lastName')} maxLength={40} />
            </FormRow>
            <FormRow label="תעודת זהות" error={errors.idNumber}>
              <RowTextInput
                value={values.idNumber}
                onChange={(v) => set('idNumber')(v.replace(/\D/g, ''))}
                inputMode="numeric"
                maxLength={9}
                dir="ltr"
              />
            </FormRow>
            <FormRow label="מחלקה" error={errors.department}>
              <RowTextInput value={values.department} onChange={set('department')} />
            </FormRow>
            <FormRow label="תאריך תחילת עבודה" error={errors.startDate}>
              <RowTextInput
                value={values.startDate}
                onChange={set('startDate')}
                placeholder="DD/MM/YYYY"
                inputMode="numeric"
                maxLength={10}
                dir="ltr"
              />
            </FormRow>
            <FormRow label="הסכם העסקה">
              <RowFileButton file={contractFile} onChange={setContractFile} />
            </FormRow>
            <FormRow label="טופס 101" error={errors.form101}>
              <RowSelect value={values.form101} onChange={set('form101')} options={FORM101_OPTIONS} />
            </FormRow>
            <FormRow label="פנסיה פעילה" error={errors.pension}>
              <RowSelect value={values.pension} onChange={set('pension')} options={PENSION_OPTIONS} />
            </FormRow>
            {values.pension === 'כן' && (
              <FormRow label="אישור פנסיה פעילה" error={errors.pensionFile}>
                <RowFileButton
                  file={pensionFile}
                  onChange={(file) => {
                    setPensionFile(file);
                    setErrors((prev) => ({ ...prev, pensionFile: undefined }));
                  }}
                />
              </FormRow>
            )}
          </SectionCard>

          {/* An existing employee without Form 101 can get a link right away; a new one gets it once added */}
          {isEdit && values.form101 === 'לא' && (
            <Form101LinkCreator employerRecordId={form101EmployerRecordId} employee={toPrefill(values)} />
          )}

          <button type="button" onClick={save} disabled={saving} className={saveButton}>
            {saving ? 'שומר...' : 'שמירה'}
          </button>
        </>
      )}

      <button type="button" onClick={onList} className={mobilePrimaryButton}>
        חזור לרשימת הדיווחים
      </button>
    </div>
  );
}
