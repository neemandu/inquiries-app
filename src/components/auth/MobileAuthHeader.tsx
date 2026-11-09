import Image from 'next/image';

// Header of the signed-out mobile screens; the design's user/bell/menu items only apply once signed in
export default function MobileAuthHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center border-b border-[#e5e7eb] bg-white px-6">
      <Image src="/big_logo.jpg" alt="לוגו" width={640} height={156} priority className="h-8 w-auto" />
    </header>
  );
}

export const mobilePrimaryButton =
  'flex w-full items-center justify-center border border-white bg-[linear-gradient(90deg,#1d447c,#081437)] px-4 py-[15px] text-[16px] font-semibold leading-[21px] text-white transition-opacity hover:opacity-95 disabled:opacity-60';
