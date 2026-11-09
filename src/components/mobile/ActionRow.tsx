import MaskIcon from '@/components/mobile/MaskIcon';

interface ActionRowProps {
  icon?: 'alert-triangle' | 'message-square';
  text: string;
  action: string;
  onClick: () => void;
  // outline: home screen cards; gold: open-inquiry list rows
  variant?: 'outline' | 'gold';
  className?: string;
}

const BUTTON_STYLES = {
  outline: 'border border-[#284587] text-[12px] text-[#0f1a33]',
  gold: 'border-[0.5px] border-[#1e3465] bg-[#fef8ec] text-[15px] text-[#1e3465]',
};

// Row with an icon, a label and an action button (Figma: "action card")
export default function ActionRow({ icon, text, action, onClick, variant = 'outline', className = '' }: ActionRowProps) {
  return (
    <div className={`flex w-full items-center gap-2 bg-white p-4 ${className}`}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {icon && (
          <span className="flex size-6 shrink-0 items-center justify-center text-[#1e3465]">
            <MaskIcon src={`/icons/mobile/${icon}.svg`} size={18} />
          </span>
        )}
        <span className={`min-w-0 text-[#0f1a33] ${variant === 'gold' ? 'text-[15px]' : 'text-[16px]'}`}>{text}</span>
      </div>
      <button
        type="button"
        onClick={onClick}
        className={`shrink-0 px-[14px] py-2 font-semibold ${BUTTON_STYLES[variant]}`}
      >
        {action}
      </button>
    </div>
  );
}
