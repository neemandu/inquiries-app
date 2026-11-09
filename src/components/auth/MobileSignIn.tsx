'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth, useSignIn } from '@clerk/nextjs';
import { isClerkAPIResponseError } from '@clerk/nextjs/errors';
import { Lock, Mail } from 'lucide-react';
import { assistant, heebo } from '@/lib/fonts';
import { isValidEmail } from '@/lib/email';
import MobileAuthHeader, { mobilePrimaryButton } from '@/components/auth/MobileAuthHeader';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

type Mode = 'code' | 'password';
type SignInResource = NonNullable<ReturnType<typeof useSignIn>['signIn']>;

const ERROR_MESSAGES: Record<string, string> = {
  form_identifier_not_found: 'לא נמצא משתמש עם כתובת הדואר האלקטרוני הזו',
  form_param_format_invalid: 'כתובת הדואר האלקטרוני אינה תקינה',
  form_password_incorrect: 'הסיסמה שגויה, נסו שוב או היכנסו עם קוד במייל',
  form_code_incorrect: 'הקוד שגוי, נסו שוב',
  verification_expired: 'תוקף הקוד פג, שלחו קוד חדש',
  verification_failed: 'האימות נכשל, שלחו קוד חדש',
  too_many_requests: 'יותר מדי ניסיונות, נסו שוב בעוד מספר דקות',
};

function errorMessage(err: unknown) {
  if (isClerkAPIResponseError(err)) {
    const code = err.errors[0]?.code;
    if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  }
  return 'אירעה שגיאה, נסו שוב';
}

const fieldClass =
  'flex h-[52px] items-center gap-2 border border-[#e5e7eb] bg-white px-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] focus-within:border-[#1a3c34]';
const inputClass = 'min-w-0 flex-1 bg-transparent text-right text-[16px] text-[#1b1b1b] outline-none placeholder:text-[#8b94a5]';

// Email sign-in for mobile: a code sent by email, or the account password
// (Figma: Client Portal mobile / Sign in screen; the design's phone/SMS step uses email since Clerk can't send SMS to Israel)
export default function MobileSignIn() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('code');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [codeSent, setCodeSent] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const codeInputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isSignedIn) router.replace('/');
  }, [isSignedIn, router]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setCodeSent(false);
    setSecondsLeft(0);
  };

  const changeEmail = (value: string) => {
    setEmail(value);
    // A code was sent to the previous address; let the user send one to the new address right away
    if (codeSent) {
      setCodeSent(false);
      setSecondsLeft(0);
    }
  };

  const finish = async (result: SignInResource) => {
    if (result.status === 'complete' && setActive) {
      await setActive({ session: result.createdSessionId });
      router.push('/');
    } else {
      setError('נדרש שלב אימות נוסף שאינו נתמך במסך זה');
    }
  };

  // Runs a sign-in step with the shared checks, pending state and error handling
  const run = async (step: (signInResource: SignInResource) => Promise<void>) => {
    if (!isLoaded || pending) return;
    if (!isValidEmail(email)) {
      setError('כתובת הדואר האלקטרוני אינה תקינה');
      return;
    }
    setPending(true);
    setError('');
    try {
      await step(signIn);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  const sendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (secondsLeft > 0) return;
    run(async (s) => {
      const { supportedFirstFactors } = await s.create({ identifier: email.trim() });
      const emailFactor = supportedFirstFactors?.find(f => f.strategy === 'email_code');
      if (!emailFactor || !('emailAddressId' in emailFactor)) {
        setError('לא ניתן לשלוח קוד לכתובת הזו. נסו כניסה עם סיסמה.');
        return;
      }
      await s.prepareFirstFactor({ strategy: 'email_code', emailAddressId: emailFactor.emailAddressId });
      setCodeSent(true);
      setDigits(Array(CODE_LENGTH).fill(''));
      setSecondsLeft(RESEND_SECONDS);
      codeInputs.current[0]?.focus();
    });
  };

  const verifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== CODE_LENGTH) return;
    run(async (s) => finish(await s.attemptFirstFactor({ strategy: 'email_code', code })));
  };

  const signInWithPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('נא להזין סיסמה');
      return;
    }
    run(async (s) => {
      const { supportedFirstFactors } = await s.create({ identifier: email.trim() });
      if (!supportedFirstFactors?.some(f => f.strategy === 'password')) {
        setError('לא הוגדרה סיסמה לחשבון זה. היכנסו עם קוד במייל.');
        return;
      }
      await finish(await s.attemptFirstFactor({ strategy: 'password', password }));
    });
  };

  // Handles typing a single digit as well as pasting / autofilling the whole code
  const changeDigit = (index: number, value: string) => {
    const chars = value.replace(/\D/g, '').slice(0, CODE_LENGTH - index);
    setDigits(prev => {
      const next = [...prev];
      if (!chars) next[index] = '';
      chars.split('').forEach((c, i) => (next[index + i] = c));
      return next;
    });
    if (chars) codeInputs.current[Math.min(index + chars.length, CODE_LENGTH - 1)]?.focus();
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Backspace' || digits[index] || index === 0) return;
    e.preventDefault();
    changeDigit(index - 1, '');
    codeInputs.current[index - 1]?.focus();
  };

  const timeLeft = `00:${String(secondsLeft).padStart(2, '0')}`;
  const emailField = (
    <label className={fieldClass}>
      <Mail className="size-[18px] shrink-0 text-[#8b94a5]" strokeWidth={1.8} aria-hidden />
      <input
        type="email"
        inputMode="email"
        autoComplete="username"
        dir="ltr"
        value={email}
        onChange={e => changeEmail(e.target.value)}
        placeholder="הזינו כתובת דואר אלקטרוני"
        aria-label="כתובת דואר אלקטרוני"
        className={inputClass}
      />
    </label>
  );
  const modeSwitch = (
    <button
      type="button"
      onClick={() => switchMode(mode === 'code' ? 'password' : 'code')}
      className="self-start text-[15px] font-semibold text-[#365fb7]"
    >
      {mode === 'code' ? 'כניסה עם סיסמה' : 'כניסה עם קוד במייל'}
    </button>
  );

  return (
    <div
      className={`${assistant.className} flex min-h-dvh flex-col bg-[linear-gradient(90deg,#1d447c,#081437)] md:hidden`}
      dir="rtl"
    >
      <MobileAuthHeader />

      <div className="flex h-[245px] shrink-0 flex-col justify-between">
        <div className="flex h-[165px] items-center justify-center p-4">
          <Image
            src="/images/signin-binders.png"
            alt=""
            width={91}
            height={108}
            priority
            className="h-[108px] w-[91px] object-cover opacity-30"
          />
        </div>
        <h1 className={`${heebo.className} pb-6 text-center text-[36px] font-extralight leading-[1.4] text-[#f6921e]`}>
          כניסה
        </h1>
      </div>

      <main className="flex flex-1 flex-col justify-center gap-6 bg-[#fcfcfc] px-8 pt-8 pb-20">
        {mode === 'code' ? (
          <>
            <form onSubmit={sendCode} noValidate className="flex flex-col gap-6">
              <p className="text-[16px] leading-[1.5] text-black">
                הכנסו את כתובת הדואר האלקטרוני שלכם ונשלח אליכם קוד אימות.
              </p>
              <div className="flex flex-col gap-4">
                {emailField}
                <button type="submit" disabled={!isLoaded || pending || secondsLeft > 0} className={mobilePrimaryButton}>
                  שלח קוד
                </button>
                {modeSwitch}
              </div>
              {error && !codeSent && <p className="text-sm text-red-600">{error}</p>}
            </form>

            <form onSubmit={verifyCode} className="flex flex-col gap-4">
              <p className="text-[16px] font-bold text-[#1b1b1b]">הזינו את קוד האימות</p>
              <div className="flex justify-between" dir="ltr">
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => {
                      codeInputs.current[i] = el;
                    }}
                    value={digit}
                    onChange={e => changeDigit(i, e.target.value)}
                    onKeyDown={e => handleCodeKeyDown(i, e)}
                    onFocus={e => e.target.select()}
                    inputMode="numeric"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    aria-label={`ספרה ${i + 1} בקוד האימות`}
                    className="h-[56px] w-[52px] border border-[#e5e7eb] bg-white text-center text-[20px] font-bold text-[#1b1b1b] outline-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.06)] focus:border-2 focus:border-[#1a3c34] focus:text-[#1a3c34]"
                  />
                ))}
              </div>
              {/* Kept in the layout before sending so the form doesn't shift when the code is sent */}
              <p className={`text-[16px] text-[#9ca3af] ${codeSent ? '' : 'invisible'}`} aria-hidden={!codeSent}>
                הקוד נשלח לכתובת שהזנתם. ניתן לשלוח קוד חדש בעוד {timeLeft}
              </p>
              {error && codeSent && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={!isLoaded || pending || digits.join('').length !== CODE_LENGTH}
                className={mobilePrimaryButton}
              >
                אימות
              </button>
            </form>
          </>
        ) : (
          <form onSubmit={signInWithPassword} noValidate className="flex flex-col gap-6">
            <p className="text-[16px] leading-[1.5] text-black">הכנסו את כתובת הדואר האלקטרוני והסיסמה שלכם.</p>
            <div className="flex flex-col gap-4">
              {emailField}
              <label className={fieldClass}>
                <Lock className="size-[18px] shrink-0 text-[#8b94a5]" strokeWidth={1.8} aria-hidden />
                <input
                  type="password"
                  autoComplete="current-password"
                  dir="ltr"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="הזינו סיסמה"
                  aria-label="סיסמה"
                  className={inputClass}
                />
              </label>
              <button type="submit" disabled={!isLoaded || pending} className={mobilePrimaryButton}>
                {pending ? 'מתחבר...' : 'כניסה'}
              </button>
              {modeSwitch}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}
      </main>
    </div>
  );
}
