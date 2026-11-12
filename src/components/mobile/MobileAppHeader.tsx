'use client';

import Image from 'next/image';
import ClientUserButton from '@/components/auth/ClientUserButton';
import { Bell } from 'lucide-react';
import MaskIcon from '@/components/mobile/MaskIcon';

interface MobileAppHeaderProps {
  firstName: string;
  hasNotifications: boolean;
  onMenuClick: () => void;
  onBellClick: () => void;
}

// Signed-in mobile header (Figma: Client Portal mobile / header-top-bar)
export default function MobileAppHeader({ firstName, hasNotifications, onMenuClick, onBellClick }: MobileAppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-[#e5e7eb] bg-white px-6">
      <div className="flex items-center gap-8">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="פתיחת תפריט"
          className="flex h-9 items-center justify-center text-[#0f1a33]"
        >
          <MaskIcon src="/icons/mobile/menu.svg" size={20} />
        </button>
        <Image src="/big_logo.jpg" alt="לוגו" width={640} height={156} priority className="h-8 w-auto" />
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBellClick}
          aria-label={hasNotifications ? 'יש נושאים פתוחים' : 'אין נושאים פתוחים'}
          className="relative flex size-7 items-center justify-center text-[#0f1a33]"
        >
          <Bell className="size-5" strokeWidth={2} aria-hidden />
          {hasNotifications && <span className="absolute right-0.5 top-0.5 size-[7px] rounded-full bg-[#2d6a4f]" />}
        </button>
        <div className="flex items-center gap-2">
          <ClientUserButton
            appearance={{
              elements: {
                avatarBox: 'size-7 rounded-none border border-[#d1d5db]',
                userButtonPopoverActionButton__manageAccount: { display: 'none' },
              },
            }}
          />
          {firstName && <span className="text-[16px] text-[#0f1a33]">{firstName}</span>}
        </div>
      </div>
    </header>
  );
}
