'use client';

import { useEffect, useState } from 'react';
import { Copy, Link2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Choice, Field, TextInput } from '@/components/form101/fields';
import { SUPPORTED_TAX_YEARS, expectedTaxYear, isSupportedTaxYear } from '@/lib/form101/years';

interface EmployerDetails {
  address: string;
  phone: string;
  deductionsFile: string;
}

const storageKey = (recordId?: string) => `form101-employer-${recordId || 'self'}`;

// Lets an employer create a personal Form 101 link to send to a new employee.
// The employer details printed in section א are remembered on this device.
export default function Form101LinkCreator({ employerRecordId }: { employerRecordId?: string }) {
  const [details, setDetails] = useState<EmployerDetails>({ address: '', phone: '', deductionsFile: '' });
  const expectedYear = expectedTaxYear();
  // Supported years plus the year a new hire most likely needs, even if its form isn't loaded yet
  const yearOptions = [...new Set([...SUPPORTED_TAX_YEARS, expectedYear])].sort();
  const [taxYear, setTaxYear] = useState(expectedYear);
  const yearSupported = isSupportedTaxYear(taxYear);
  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(storageKey(employerRecordId));
    if (saved) setDetails(JSON.parse(saved));
    setLink(null);
  }, [employerRecordId]);

  const create = async () => {
    setCreating(true);
    setError('');
    try {
      const response = await fetch('/api/form101/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...details, employerRecordId, taxYear }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        setError(result.message || 'יצירת הקישור נכשלה');
        return;
      }
      localStorage.setItem(storageKey(employerRecordId), JSON.stringify(details));
      setLink({ url: result.url, expiresAt: result.expiresAt });
    } catch {
      setError('יצירת הקישור נכשלה');
    } finally {
      setCreating(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link.url);
    toast.success('הקישור הועתק');
  };

  const share = () => link && navigator.share?.({ title: 'טופס 101', text: 'קישור אישי למילוי טופס 101', url: link.url });

  return (
    <section className="flex w-full flex-col gap-4 border border-[#eaeef6] bg-white p-4 text-right leading-[normal]" dir="rtl">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-[16px] font-bold text-[#1e3465]">
          <Link2 className="size-4" aria-hidden /> טופס 101 לעובד/ת חדש/ה
        </h2>
        <p className="text-[14px] text-[#6b7280]">
          צרו קישור אישי ושלחו אותו לעובד/ת. הטופס הממולא והחתום יישמר אוטומטית במסמכי המעסיק. הקישור בתוקף 14 יום.
        </p>
      </div>
      <Choice
        label="שנת המס"
        required
        value={String(taxYear)}
        onChange={(v) => { setTaxYear(Number(v)); setLink(null); }}
        options={yearOptions.map((year) => ({ value: String(year), label: String(year) }))}
      />
      {!yearSupported && (
        <p className="bg-[#fef8ec] p-3 text-[14px] text-[#0f1a33]">
          טופס 101 לשנת {taxYear} טרם פורסם או טרם נטען למערכת, ולכן לא ניתן ליצור קישור לשנה זו.
        </p>
      )}
      <Field label="כתובת המעסיק" required>
        <TextInput value={details.address} onChange={(v) => setDetails((d) => ({ ...d, address: v }))} />
      </Field>
      <div className="flex gap-3">
        <Field label="טלפון המעסיק" required>
          <TextInput type="tel" dir="ltr" value={details.phone} onChange={(v) => setDetails((d) => ({ ...d, phone: v }))} />
        </Field>
        <Field label="מספר תיק ניכויים" required>
          <TextInput inputMode="numeric" maxLength={9} dir="ltr" value={details.deductionsFile}
            onChange={(v) => setDetails((d) => ({ ...d, deductionsFile: v.replace(/\D/g, '') }))} />
        </Field>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="button" onClick={create} disabled={creating || !yearSupported}
        className="flex items-center justify-center bg-[linear-gradient(90deg,#1d447c,#081437)] px-4 py-3 text-[16px] font-semibold text-white disabled:opacity-60">
        {creating ? 'יוצר קישור...' : 'יצירת קישור למילוי הטופס'}
      </button>
      {link && (
        <div className="flex flex-col gap-2 bg-[#fef8ec] p-3">
          <input readOnly dir="ltr" value={link.url} aria-label="קישור אישי לטופס 101" onFocus={(e) => e.target.select()}
            className="h-10 w-full border border-[#eaeef6] bg-white px-2 text-[13px]" />
          <div className="flex gap-2">
            <button type="button" onClick={copy} className="flex flex-1 items-center justify-center gap-2 border border-[#849acb] bg-white py-2 font-semibold">
              <Copy className="size-4" aria-hidden /> העתקה
            </button>
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button type="button" onClick={share} className="flex flex-1 items-center justify-center gap-2 border border-[#849acb] bg-white py-2 font-semibold">
                <Share2 className="size-4" aria-hidden /> שיתוף
              </button>
            )}
          </div>
          <span className="text-[13px] text-[#6b7280]">בתוקף עד {new Date(link.expiresAt).toLocaleDateString('he-IL')}</span>
        </div>
      )}
    </section>
  );
}
