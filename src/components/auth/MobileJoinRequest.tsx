'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { ArrowLeft, Mail, Phone, UserRound, type LucideIcon } from 'lucide-react';
import { assistant, heebo } from '@/lib/fonts';
import { isValidPhone } from '@/lib/phone';
import MobileAuthHeader, { mobilePrimaryButton } from '@/components/auth/MobileAuthHeader';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Fields = { fullName: string; phone: string; email: string };

function validate({ fullName, phone, email }: Fields) {
  const errors: Partial<Fields> = {};
  if (fullName.trim().length < 2) errors.fullName = 'נא להזין שם מלא';
  if (!isValidPhone(phone)) errors.phone = 'נא להזין מספר טלפון נייד תקין';
  if (email.trim() && !EMAIL_PATTERN.test(email.trim())) errors.email = 'כתובת הדואר האלקטרוני אינה תקינה';
  return errors;
}

type FieldProps = {
  label: string;
  required?: boolean;
  icon: LucideIcon;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

function Field({ label, required, icon: Icon, error, ...inputProps }: FieldProps) {
  return (
    <label className="flex w-full flex-col gap-[6px]">
      <span className="text-[16px] font-semibold leading-[18px] text-[#111827]">
        {label}
        {required ? (
          <span className="text-[#365fb7]"> *</span>
        ) : (
          <span className="font-normal text-[#6b7280]"> (לא חובה)</span>
        )}
      </span>
      <span
        className={`flex h-[52px] items-center gap-2 border bg-white px-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] focus-within:border-[#1a3c34] ${error ? 'border-red-500' : 'border-[#e5e7eb]'}`}
      >
        <Icon className="size-[18px] shrink-0 text-[#8b94a5]" strokeWidth={1.8} aria-hidden />
        <input
          {...inputProps}
          aria-invalid={!!error}
          className="min-w-0 flex-1 bg-transparent text-right text-[16px] text-[#1b1b1b] outline-none placeholder:text-[#8b94a5]"
        />
      </span>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </label>
  );
}

// Join request sent to the office for mobile; does not create an account (Figma: Client Portal mobile / sign up screen)
export default function MobileJoinRequest() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [fields, setFields] = useState<Fields>({ fullName: '', phone: '', email: '' });
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Partial<Fields>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  useEffect(() => {
    if (isSignedIn) router.replace('/');
  }, [isSignedIn, router]);

  const update = (key: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFields(prev => ({ ...prev, [key]: e.target.value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'sending') return;
    const nextErrors = validate(fields);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setStatus('sending');
    try {
      const response = await fetch('/api/join-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, website }),
      });
      setStatus(response.ok ? 'sent' : 'failed');
    } catch {
      setStatus('failed');
    }
  };

  const backToSignIn = (
    <Link href="/sign-in" className="flex h-10 items-center justify-center gap-[6px] text-[16px] font-semibold text-[#365fb7]">
      חזרה לכניסה
      <ArrowLeft className="size-[17px]" aria-hidden />
    </Link>
  );

  return (
    <div
      className={`${assistant.className} flex min-h-dvh flex-col bg-[linear-gradient(90deg,#1d447c,#081437)] md:hidden`}
      dir="rtl"
    >
      <MobileAuthHeader />

      <div className="flex h-[245px] shrink-0 flex-col items-center justify-end gap-8 px-6 py-8">
        <h1 className={`${heebo.className} w-full text-center text-[36px] font-extralight leading-[1.4] text-[#f6921e]`}>
          בקשת הצטרפות
        </h1>
        <p className="w-full text-[16px] leading-[21px] text-white">
          שליחת הפנייה אינה יוצרת חשבון.
          <br />
          המשרד ייצור עמכם קשר להמשך ההצטרפות.
        </p>
      </div>

      {status === 'sent' ? (
        <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-[#fcfcfc] px-6 py-8 text-center">
          <p className="text-[20px] font-semibold text-[#111827]">הפנייה נשלחה למשרד</p>
          <p className="text-[16px] leading-[21px] text-[#6b7280]">נחזור אליכם בהקדם. לאחר האישור תוכלו להיכנס לאפליקציה.</p>
          {backToSignIn}
        </main>
      ) : (
        <form
          onSubmit={submit}
          noValidate
          className="relative flex flex-1 flex-col items-center justify-between bg-[#fcfcfc] px-6 py-8"
        >
          <p className="w-full text-[16px] leading-[21px] text-[#6b7280]">
            השאירו פרטי קשר. המשרד יטפל בפנייה ויוסיף אתכם לאפליקציה לאחר אישור.
          </p>

          <div className="flex w-full flex-col gap-4 pt-[14px] pb-6">
            <Field
              label="שם מלא"
              required
              icon={UserRound}
              error={errors.fullName}
              value={fields.fullName}
              onChange={update('fullName')}
              placeholder="הזינו שם פרטי ושם משפחה"
              autoComplete="name"
              maxLength={100}
            />
            <Field
              label="מספר טלפון"
              required
              icon={Phone}
              error={errors.phone}
              value={fields.phone}
              onChange={update('phone')}
              placeholder="הזינו מספר טלפון נייד"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
            />
            <Field
              label="דואר אלקטרוני"
              icon={Mail}
              error={errors.email}
              value={fields.email}
              onChange={update('email')}
              placeholder="הזינו כתובת דואר אלקטרוני"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={254}
            />
            {/* Honeypot: hidden from people, filled in by bots */}
            <input
              name="website"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              className="absolute -left-[9999px] h-px w-px opacity-0"
            />
          </div>

          <div className="flex w-[calc(100%+19px)] flex-col">
            <button type="submit" disabled={status === 'sending'} className={mobilePrimaryButton}>
              שליחת פנייה למשרד
            </button>
            {status === 'failed' && (
              <p className="mt-2 text-center text-sm text-red-600">השליחה נכשלה, נסו שוב בעוד מספר דקות</p>
            )}
          </div>

          {backToSignIn}
        </form>
      )}
    </div>
  );
}
