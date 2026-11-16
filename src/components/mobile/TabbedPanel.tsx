import Image from 'next/image';

// Shown in a tab with nothing open (Figma: Clarifications- empty state)
export function AllClear({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <Image src="/icons/mobile/check-fat.svg" alt="" width={80} height={80} />
      <p className="text-center text-[20px] text-[#0f1a33]">{text}</p>
    </div>
  );
}

interface TabbedPanelProps<T extends string> {
  tabs: { key: T; label: string }[];
  active: T;
  onChange: (tab: T) => void;
  emptyText: string;
  children: React.ReactNode[];
}

// Gold-framed tabs with a list of rows (Figma: open inquiries / employer system tabs)
export default function TabbedPanel<T extends string>({ tabs, active, onChange, emptyText, children }: TabbedPanelProps<T>) {
  return (
    <div className="flex flex-col drop-shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
      <div role="tablist" className="flex min-h-11 gap-1">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={key === active}
            onClick={() => onChange(key)}
            className={`flex flex-auto items-center justify-center px-1 py-2 text-[16px] font-bold text-[#0f1a33] ${
              key === active ? 'bg-[#fef8ec]' : 'border-x border-t border-[#eaeef6] bg-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="flex flex-col gap-3 border-8 border-[#fef8ec] bg-white p-2">
        {children.length ? children : <AllClear text={emptyText} />}
      </div>
    </div>
  );
}
