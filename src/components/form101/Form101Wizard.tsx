'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Bookmark, CheckCircle2, Download, Paperclip, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { assistant } from '@/lib/fonts';
import { toBase64 } from '@/lib/utils';
import { INCOME_TYPE_LABELS, MARITAL_STATUS_LABELS } from '@/lib/form101/schema';
import { Form101Draft, STEP_SECTIONS, emptyDraft, toSubmission, validateSections } from '@/components/form101/draft';
import { Card, Checkbox, Field, Note } from '@/components/form101/fields';
import { FamilyStep, IncomeStep, IntroStep, PersonalStep, ReliefsStep, Update } from '@/components/form101/steps';
import SignaturePad from '@/components/form101/SignaturePad';

const STEP_TITLES = ['הסבר והכנה', 'פרטים אישיים', 'הכנסות', 'משפחה', 'הקלות ותיאום מס', 'אישור וחתימה'];
const HEADINGS = [
  'טופס 101 – כרטיס עובד',
  'פרטי העובד האישיים',
  'הכנסה ממעסיק זה והכנסות אחרות',
  'ילדים ובן/בת הזוג',
  'פטור, זיכוי ותיאום מס',
  'בדיקת נתונים, הצהרה וחתימה',
];
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp'];
// Keeps the request under Vercel's 4.5 MB body limit after base64 encoding
const MAX_ATTACHMENTS_BYTES = 2.5 * 1024 * 1024;

interface Form101WizardProps {
  token: string;
  linkId: string;
  employerName: string;
  taxYear: number;
}

const draftKey = (linkId: string) => `form101-draft-${linkId}`;

function downloadPdf(base64: string, fileName: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Employee-facing Form 101 wizard opened from a personal link (Figma: Client Portal mobile / mobile-wizard-*)
export default function Form101Wizard({ token, linkId, employerName, taxYear }: Form101WizardProps) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Form101Draft>(() => emptyDraft(taxYear));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submittedPdf, setSubmittedPdf] = useState<string | null>(null);

  // Restore a draft saved earlier on this device for this link
  useEffect(() => {
    const saved = localStorage.getItem(draftKey(linkId));
    if (!saved) return;
    try {
      const { draft: savedDraft, step: savedStep } = JSON.parse(saved);
      setDraft({ ...savedDraft, taxYear, signature: '', declaration: { ...savedDraft.declaration, accepted: false } });
      setStep(Math.min(savedStep ?? 0, 4));
    } catch {
      localStorage.removeItem(draftKey(linkId));
    }
  }, [linkId, taxYear]);

  const update: Update = useCallback((mutate) => {
    setDraft((prev) => {
      const next = structuredClone(prev);
      mutate(next);
      return next;
    });
  }, []);

  // Re-check the current step as the employee fixes fields, once errors are showing
  useEffect(() => {
    if (Object.keys(errors).length) setErrors(validateSections(draft, STEP_SECTIONS[step]));
    // Only re-validate when the data changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const saveDraft = () => {
    // The signature and declaration are never stored; they are given again before sending
    const { signature: _signature, ...rest } = draft;
    void _signature;
    localStorage.setItem(draftKey(linkId), JSON.stringify({ draft: rest, step }));
    toast.success('הטיוטה נשמרה במכשיר זה');
  };

  const goTo = (next: number) => {
    setStep(next);
    setErrors({});
    window.scrollTo({ top: 0 });
  };

  const next = () => {
    const stepErrors = validateSections(draft, STEP_SECTIONS[step]);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length) {
      toast.error('יש שדות חסרים או שגויים בשלב זה');
      return;
    }
    goTo(step + 1);
  };

  const addAttachments = (files: FileList | null) => {
    const incoming = Array.from(files ?? []).filter((f) => ACCEPTED_TYPES.includes(f.type));
    const total = [...attachments, ...incoming].reduce((sum, f) => sum + f.size, 0);
    if (total > MAX_ATTACHMENTS_BYTES) {
      toast.error('ניתן לצרף עד 2.5MB של מסמכים');
      return;
    }
    setAttachments((prev) => [...prev, ...incoming]);
  };

  const submit = async () => {
    const allErrors = validateSections(draft, STEP_SECTIONS.flat());
    if (Object.keys(allErrors).length) {
      setErrors(validateSections(draft, STEP_SECTIONS[step]));
      const firstStep = STEP_SECTIONS.findIndex((sections) => Object.keys(allErrors).some((path) => sections.includes(path.split('.')[0])));
      toast.error('יש לתקן שדות חסרים לפני השליחה');
      if (firstStep !== step) goTo(firstStep);
      return;
    }
    setSubmitting(true);
    try {
      const encoded = await Promise.all(
        attachments.map(async (file) => ({ fileName: file.name, contentType: file.type, file: (await toBase64(file)).split(',')[1] }))
      );
      const response = await fetch('/api/form101/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, data: toSubmission(draft), attachments: encoded }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        toast.error(result.message || 'שליחת הטופס נכשלה, נסו שוב');
        return;
      }
      localStorage.removeItem(draftKey(linkId));
      setSubmittedPdf(result.pdf);
    } catch {
      toast.error('שליחת הטופס נכשלה, נסו שוב');
    } finally {
      setSubmitting(false);
    }
  };

  const fullName = `${draft.employee.firstName} ${draft.employee.lastName}`.trim();

  if (submittedPdf) {
    return (
      <div className={`${assistant.className} flex min-h-dvh flex-col items-center justify-center gap-6 bg-[#fcfcfc] p-6 text-center leading-[normal]`} dir="rtl">
        <CheckCircle2 className="size-20 text-[#1e3465]" aria-hidden />
        <h1 className="text-[24px] font-bold text-[#1e3465]">טופס 101 נשלח בהצלחה!</h1>
        <p className="text-[16px] leading-[1.5] text-[#0f1a33]">
          תודה רבה{draft.employee.firstName ? `, ${draft.employee.firstName}` : ''}. הטופס נשמר בתיק המעסיק{employerName ? ` ${employerName}` : ''}.
        </p>
        <button type="button" onClick={() => downloadPdf(submittedPdf, `טופס 101 ${taxYear} - ${fullName}.pdf`)}
          className="flex items-center gap-2 bg-[linear-gradient(90deg,#1d447c,#081437)] px-6 py-3 text-[16px] font-semibold text-white">
          <Download className="size-5" aria-hidden /> הורדת עותק של הטופס
        </button>
      </div>
    );
  }

  const percent = Math.round(((step + 1) / STEP_TITLES.length) * 100);
  const stepProps = { draft, update, errors };

  return (
    <div className={`${assistant.className} flex min-h-dvh flex-col bg-[#fcfcfc] leading-[normal]`} dir="rtl">
      <header className="sticky top-0 z-20 flex flex-col gap-3 border-b border-[#eaeef6] bg-white px-4 pb-4 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button type="button" onClick={() => goTo(step - 1)} aria-label="לשלב הקודם"
                className="flex size-7 items-center justify-center border border-[#eaeef6] bg-[#fcfcfc]">
                <ArrowRight className="size-[14px]" aria-hidden />
              </button>
            )}
            <div className="flex flex-col text-[16px]">
              <span className="font-bold text-[#0f1a33]">{employerName || 'HR Portal'}</span>
              <span className="text-black">טופס 101 לשנת המס {taxYear}</span>
            </div>
          </div>
          <button type="button" onClick={saveDraft} className="flex items-center gap-1 border border-[#eaeef6] bg-white px-[10px] py-[6px] text-[16px] font-semibold text-[#0f1a33]">
            שמור להמשך <Bookmark className="size-3" aria-hidden />
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[16px]">
            <span className="text-black">שלב {step + 1} מתוך {STEP_TITLES.length} • {STEP_TITLES[step]}</span>
            <span className="font-bold text-[#1e3465]">{percent}% הושלמו</span>
          </div>
          <div className="h-[6px] w-full bg-[#e5e7eb]" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-[#1e3465] transition-[width]" style={{ width: `${percent}%` }} />
          </div>
        </div>
        <h1 className="text-[16px] font-bold text-[#1e3465]">{HEADINGS[step]}</h1>
      </header>

      <main className="flex flex-1 flex-col gap-4 px-4 pb-8 pt-4">
        {step === 0 && <IntroStep employerName={employerName} taxYear={taxYear} />}
        {step === 1 && <PersonalStep {...stepProps} />}
        {step === 2 && <IncomeStep {...stepProps} />}
        {step === 3 && <FamilyStep {...stepProps} />}
        {step === 4 && <ReliefsStep {...stepProps} />}
        {step === 5 && (
          <>
            <Card title="סיכום">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[15px]">
                <dt className="text-[#6b7280]">שם מלא</dt><dd>{fullName}</dd>
                <dt className="text-[#6b7280]">{draft.employee.hasIsraeliId ? 'תעודת זהות' : 'דרכון'}</dt>
                <dd>{draft.employee.hasIsraeliId ? draft.employee.idNumber : draft.employee.passportNumber}</dd>
                <dt className="text-[#6b7280]">מצב משפחתי</dt>
                <dd>{draft.employee.maritalStatus ? MARITAL_STATUS_LABELS[draft.employee.maritalStatus] : ''}</dd>
                <dt className="text-[#6b7280]">הכנסה ממעסיק זה</dt><dd>{INCOME_TYPE_LABELS[draft.income.type]}</dd>
                <dt className="text-[#6b7280]">הכנסות אחרות</dt><dd>{draft.otherIncome.has ? 'יש' : 'אין'}</dd>
                <dt className="text-[#6b7280]">ילדים</dt><dd>{draft.children.length}</dd>
                <dt className="text-[#6b7280]">תיאום מס</dt><dd>{draft.taxCoordination.reason === 'none' ? 'לא' : 'כן'}</dd>
              </dl>
              <p className="text-[14px] text-[#6b7280]">אפשר לחזור לשלבים הקודמים בחץ שבראש העמוד כדי לתקן.</p>
            </Card>
            <Card title="מסמכים מצורפים">
              <p className="text-[15px] text-[#0f1a33]">
                צילום תעודת זהות כולל ספח (או דרכון ואישור שהייה), וכל אישור שנדרש להקלות שסימנת.
              </p>
              {attachments.map((file, i) => (
                <div key={`${file.name}-${i}`} className="flex items-center justify-between gap-2 text-[15px]">
                  <span className="flex min-w-0 items-center gap-2"><Paperclip className="size-4 shrink-0" aria-hidden /><span className="truncate">{file.name}</span></span>
                  <button type="button" aria-label={`הסרת ${file.name}`} className="text-red-600" onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              <label className="flex cursor-pointer items-center justify-center gap-2 border border-dashed border-[#849acb] bg-[#fcfcfc] p-4 text-[15px] font-semibold text-[#1e3465]">
                <Paperclip className="size-4" aria-hidden /> לחץ כאן לצירוף מסמכים
                <input type="file" multiple accept={ACCEPTED_TYPES.join(',')} className="hidden"
                  onChange={(e) => { addAttachments(e.target.files); e.target.value = ''; }} />
              </label>
              <span className="text-[13px] text-[#6b7280]">PDF או תמונה, עד 2.5MB בסך הכול</span>
            </Card>
            <Card title="הצהרה">
              <Checkbox checked={draft.declaration.accepted} error={errors['declaration.accepted']}
                onChange={(c) => update((d) => { d.declaration.accepted = c; })}>
                אני מצהיר/ה כי הפרטים שמסרתי בטופס זה הינם מלאים ונכונים. ידוע לי שהשמטה או מסירת פרטים לא נכונים הינה עבירה
                על פקודת מס הכנסה. אני מתחייב/ת להודיע למעסיק על כל שינוי שיחול בפרטיי האישיים ובפרטים דלעיל תוך שבוע ימים
                מתאריך השינוי.
              </Checkbox>
              <Field label="חתימה" required error={errors.signature}>
                <SignaturePad value={draft.signature} onChange={(v) => update((d) => { d.signature = v; })} />
              </Field>
            </Card>
            <Note>לאחר השליחה הטופס יישמר בתיק המעסיק ותוכל/י להוריד עותק.</Note>
          </>
        )}
      </main>

      <footer className="sticky bottom-0 flex items-center justify-between border-t border-[#eaeef6] bg-white p-4">
        {step > 0 ? (
          <button type="button" onClick={() => goTo(step - 1)}
            className="flex items-center gap-[6px] border border-[#eaeef6] bg-white px-4 py-[10px] text-[16px] font-semibold text-[#0f1a33]">
            <ArrowRight className="size-3" aria-hidden /> חזור
          </button>
        ) : <span />}
        {step < STEP_TITLES.length - 1 ? (
          <button type="button" onClick={next}
            className="flex items-center gap-[6px] bg-[linear-gradient(90deg,#1d447c,#081437)] px-5 py-[10px] text-[16px] font-semibold text-white">
            {step === 0 ? 'מתחילים' : 'המשך לשלב הבא'} <ArrowLeft className="size-3" aria-hidden />
          </button>
        ) : (
          <button type="button" onClick={submit} disabled={submitting}
            className="flex items-center gap-[6px] bg-[linear-gradient(90deg,#1d447c,#081437)] px-5 py-[10px] text-[16px] font-semibold text-white disabled:opacity-60">
            {submitting ? 'שולח...' : 'שליחת הטופס'}
          </button>
        )}
      </footer>
    </div>
  );
}
