'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { assistant } from '@/lib/fonts';
import Form101Wizard from '@/components/form101/Form101Wizard';

interface Session {
  employerName: string;
  taxYear: number;
  linkId: string;
}

// Public page opened from an employee's personal Form 101 link (/form101?t=...)
function Form101Page() {
  const token = useSearchParams().get('t') ?? '';
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('הקישור חסר. נא לפתוח את הקישור המלא שקיבלת מהמעסיק.');
      return;
    }
    fetch(`/api/form101/session?t=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message);
        setSession(result);
      })
      .catch((err: Error) => setError(err.message || 'לא ניתן לפתוח את הטופס כרגע'));
  }, [token]);

  if (session) {
    return <Form101Wizard token={token} linkId={session.linkId} employerName={session.employerName} taxYear={session.taxYear} />;
  }
  return (
    <div className={`${assistant.className} flex min-h-dvh items-center justify-center bg-[#fcfcfc] p-6 text-center`} dir="rtl">
      <p className="text-[18px] text-[#0f1a33]">{error || 'טוען...'}</p>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Form101Page />
    </Suspense>
  );
}
