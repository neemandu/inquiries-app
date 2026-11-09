import Image from 'next/image';
import Link from 'next/link';
import { assistant, heebo } from '@/lib/fonts';

// Full-screen welcome shown to signed-out users on mobile (Figma: Client Portal mobile / Welcome screen)
export default function MobileWelcome() {
  return (
    <div
      className={`${assistant.className} fixed inset-0 z-40 flex flex-col items-center justify-center overflow-y-auto bg-[linear-gradient(90deg,#1d447c_0.32%,#081437_99.1%)] md:hidden`}
      dir="rtl"
    >
      <div className="relative h-[447px] w-[391px] max-w-full shrink-0">
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-10">
          <Image
            src="/images/welcome-bookshelf.png"
            alt=""
            width={2048}
            height={2048}
            priority
            className="absolute left-[-18.85%] top-[-9.86%] h-[120.64%] w-[137.7%] max-w-none"
          />
        </div>
        <h1 className={`${heebo.className} absolute inset-x-0 top-[165px] mx-auto w-[345px] max-w-full text-center text-[40px] font-extralight text-[#f6921e]`}>
          ברוכים הבאים
        </h1>
        <p className="absolute inset-x-0 top-[322px] mx-auto w-[345px] max-w-full text-center text-[20px] leading-[1.5] text-white">
          הנהלת חשבונות וניהול עובדים, בפשטות
        </p>
      </div>

      <div className="mt-12 flex w-[345px] max-w-full shrink-0 flex-col gap-8 px-4">
        <Link
          href="/sign-up"
          className="flex items-center justify-center border border-white px-4 py-[15px] text-[16px] font-semibold leading-[21px] text-white transition-colors hover:bg-white/10"
        >
          הרשמה
        </Link>
        <Link
          href="/sign-in"
          className="flex items-center justify-center border border-white bg-white px-4 py-[15px] text-[16px] font-semibold leading-[21px] text-[#0f1a33] transition-opacity hover:opacity-90"
        >
          כניסה
        </Link>
      </div>
    </div>
  );
}
