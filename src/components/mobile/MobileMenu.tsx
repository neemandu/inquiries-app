'use client';

import { useEffect } from 'react';
import MaskIcon from '@/components/mobile/MaskIcon';

export type MobileMenuKey = 'home' | 'pending-inquiries' | 'monthly-report' | 'pay-slip';

const MENU_ITEMS: { key: MobileMenuKey | null; label: string; icon: string; size: number }[] = [
  { key: 'home', label: 'ראשי', icon: '/icons/mobile/home.svg', size: 22 },
  { key: 'pending-inquiries', label: 'בירורים פתוחים', icon: '/icons/mobile/file.svg', size: 24 },
  { key: 'monthly-report', label: 'פורטל מעסיקים', icon: '/icons/mobile/calculator.svg', size: 24 },
  { key: 'pay-slip', label: 'מסמכים להורדה', icon: '/icons/mobile/download.svg', size: 24 },
  // Not built yet — shown as coming soon
  { key: null, label: 'הגדרות', icon: '/icons/mobile/settings.svg', size: 22 },
  { key: null, label: 'ארכיון', icon: '/icons/mobile/archive.svg', size: 22 },
];

interface MobileMenuProps {
  open: boolean;
  activeKey: MobileMenuKey | null;
  onClose: () => void;
  onSelect: (key: MobileMenuKey) => void;
}

// Slide-in navigation for mobile (Figma: Client Portal mobile / bottom-navigation-bar)
export default function MobileMenu({ open, activeKey, onClose, onSelect }: MobileMenuProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" dir="rtl">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden />
      <nav
        aria-label="תפריט ראשי"
        className="absolute right-0 top-0 flex min-w-[165px] flex-col items-start gap-4 border-t border-[#e2e8f0] bg-white p-5 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="סגירת תפריט"
          className="flex h-9 items-center justify-center text-[#0f1a33]"
        >
          <MaskIcon src="/icons/mobile/menu.svg" size={20} />
        </button>
        {MENU_ITEMS.map(({ key, label, icon, size }) => {
          const isActive = key !== null && key === activeKey;
          return (
            <button
              key={label}
              type="button"
              disabled={key === null}
              onClick={() => key && onSelect(key)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-1 text-[16px] ${isActive ? 'font-bold text-[#0f1a33]' : 'text-[#9ca3af]'}`}
            >
              <MaskIcon src={icon} size={size} />
              <span className="whitespace-nowrap">{label}</span>
              {key === null && (
                <span className="ms-1 rounded bg-gray-100 px-1.5 text-xs text-gray-500">בקרוב</span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
