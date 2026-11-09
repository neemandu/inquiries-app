'use client';

// Building blocks of the Form 101 wizard (Figma: Client Portal mobile / mobile-wizard-*)

export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-4 border border-[#eaeef6] bg-white p-4 drop-shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
      {title && <h2 className="text-[16px] font-bold text-[#1e3465]">{title}</h2>}
      {children}
    </section>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return <p className="bg-[#fef8ec] p-3 text-[16px] leading-[1.4] text-black">{children}</p>;
}

export function Field({
  label,
  hint,
  required,
  error,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex w-full flex-col gap-[6px]">
      <span className="flex items-center justify-between gap-2 text-[16px]">
        <span className="font-semibold text-[#0f1a33]">
          {required && <span className="text-[#c57518]">* </span>}
          {label}
        </span>
        {hint && <span className="text-[14px] text-[#6b7280]">{hint}</span>}
      </span>
      {children}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </label>
  );
}

const inputClass = (error?: string) =>
  `h-10 w-full border bg-[#fcfcfc] px-3 text-right text-[16px] text-black outline-none focus:border-[#1e3465] ${
    error ? 'border-red-500' : 'border-[#eaeef6]'
  }`;

interface TextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  error?: string;
}

export function TextInput({ value, onChange, error, ...props }: TextInputProps) {
  return (
    <input
      {...props}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={!!error}
      className={inputClass(error)}
    />
  );
}

export function TextField({
  label,
  hint,
  required,
  error,
  ...input
}: TextInputProps & { label: string; hint?: string; required?: boolean }) {
  return (
    <Field label={label} hint={hint} required={required} error={error}>
      <TextInput {...input} error={error} />
    </Field>
  );
}

export function DateField(props: Omit<React.ComponentProps<typeof TextField>, 'type'>) {
  return <TextField {...props} type="date" />;
}

export function NumberInput({
  value,
  onChange,
  min = 0,
  max = 99,
  ...props
}: Omit<TextInputProps, 'value' | 'onChange'> & { value: number | null; onChange: (value: number | null) => void; min?: number; max?: number }) {
  return (
    <TextInput
      {...props}
      inputMode="numeric"
      value={value ?? ''}
      onChange={(raw) => {
        const digits = raw.replace(/\D/g, '');
        onChange(digits === '' ? null : Math.min(max, Math.max(min, Number(digits))));
      }}
    />
  );
}

export function Choice<T extends string>({
  label,
  required,
  error,
  options,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  error?: string;
  options: { value: T; label: string }[];
  value: T | '' | null;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex w-full flex-col gap-[6px]">
      <span className="text-[16px] font-semibold text-[#0f1a33]">
        {required && <span className="text-[#c57518]">* </span>}
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={`min-h-10 border px-3 py-2 text-[15px] ${
                selected ? 'border-[#1e3465] bg-[#1e3465] text-white' : 'border-[#eaeef6] bg-[#fcfcfc] text-[#0f1a33]'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  children,
  error,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex cursor-pointer items-start gap-3 text-[16px] leading-[1.4] text-[#0f1a33]">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 size-5 shrink-0 accent-[#1e3465]"
        />
        <span>{children}</span>
      </label>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}

export function SecondaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="flex items-center justify-center gap-2 border border-[#849acb] bg-white px-4 py-2 text-[15px] font-semibold text-[#0f1a33] disabled:opacity-50"
    >
      {children}
    </button>
  );
}
