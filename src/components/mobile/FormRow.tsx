import { useRef } from 'react';
import Image from 'next/image';

// Label on the right, a 128px control on the left (Figma: form-field-row)
export function FormRow({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-1">
      <label className="flex w-full items-center gap-3 bg-white p-4">
        <span className="min-w-0 flex-1 text-[16px] text-[#0f172a]">{label}</span>
        {children}
      </label>
      {error && <p className="px-4 text-[13px] text-red-600">{error}</p>}
    </div>
  );
}

const controlBox = 'h-10 w-32 shrink-0 border border-[#eaeef6] bg-white p-2 text-[16px] text-[#0f1a33]';

export function RowTextInput({
  value,
  onChange,
  placeholder = 'הזן טקסט',
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & { value: string; onChange: (value: string) => void }) {
  return (
    <input
      {...props}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${controlBox} placeholder:text-[#9ca3af] focus:border-[#849acb] focus:outline-none`}
    />
  );
}

export function RowSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <span className="relative w-32 shrink-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${controlBox} w-full appearance-none pl-8 focus:border-[#849acb] focus:outline-none`}
      >
        <option value="" disabled>
          בחר אפשרות
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Image
        src="/icons/mobile/caret-down.svg"
        alt=""
        width={16}
        height={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
      />
    </span>
  );
}

// "Upload file" button; shows the chosen file's name once picked
export function RowFileButton({
  file,
  onChange,
  centered = false,
  stretch = false,
  label = 'העלאת קובץ',
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  // Centered under the form rows instead of in a row's 128px control slot (Figma: missing doc / new upload)
  centered?: boolean;
  // Fills its share of a button row (Figma: specific invoice "העלאת מסמך חלופי")
  stretch?: boolean;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={`flex shrink-0 items-center border border-[#eaeef6] bg-[#c1cce5] py-2 text-[16px] text-[#0f1a33] ${stretch ? 'gap-1 px-1' : 'gap-1.5 px-2'} ${
          stretch ? 'min-w-0 flex-1 justify-center' : centered ? 'max-w-full self-center' : 'w-32'
        }`}
      >
        <span className={`min-w-0 ${stretch ? 'break-words text-center' : 'flex-1 truncate text-right'}`}>
          {file ? (centered || stretch ? `נבחר קובץ  ${file.name}` : file.name) : label}
        </span>
        <Image src="/icons/mobile/upload-simple.svg" alt="" width={24} height={24} className="shrink-0" />
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          onChange(e.target.files?.[0] ?? null);
          e.target.value = '';
        }}
      />
    </>
  );
}

// Read-only value in a form row (Figma: missing doc "המסמך החסר")
export function RowValue({ children }: { children: React.ReactNode }) {
  return <span className="w-32 shrink-0 px-2 text-[16px] text-[#0f1a33]">{children}</span>;
}

// White card holding the form rows or list rows (Figma: action-required-section)
export function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-4 border-[0.5px] border-[#eaeef6] bg-white p-4 drop-shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
      {children}
    </div>
  );
}

export const saveButton =
  'flex h-[45px] w-full items-center justify-center border border-[#849acb] px-[14px] py-2 text-[16px] font-bold text-[#0f1a33] disabled:opacity-60';

// "שמירה" greyed out until there's something to save (Figma: specific invoice empty)
export const saveButtonIdle = 'disabled:text-[#c1cce5] disabled:opacity-100';
