import { ChevronDown } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cn } from '../shared/cn';
import { normalizeHexColor } from '../pdf/settings';

export function SettingsSection({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="border-t border-line px-4 py-4 first:border-t-0">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[12.5px] font-semibold text-ink">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-[11px] leading-5 text-muted">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

const inputClass =
  'h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-[12px] text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-primary/50 focus:ring-2 focus:ring-primary/15';

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
  maxLength,
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  maxLength?: number;
  id?: string;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-[11.5px] font-medium text-ink">
        {label}
      </label>
      {hint ? <p className="mb-1 text-[10.5px] leading-4 text-muted">{hint}</p> : null}
      <input
        id={inputId}
        type="text"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
    </div>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  rows = 3,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  hint?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[11.5px] font-medium text-ink">
        {label}
      </label>
      {hint ? <p className="mb-1 text-[10.5px] leading-4 text-muted">{hint}</p> : null}
      <textarea
        id={id}
        value={value}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(inputClass, 'h-auto resize-y py-2 leading-5')}
      />
    </div>
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  hint?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[11.5px] font-medium text-ink">
        {label}
      </label>
      {hint ? <p className="mb-1 text-[10.5px] leading-4 text-muted">{hint}</p> : null}
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
          className={cn(inputClass, 'appearance-none pl-7 pr-2.5')}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-2 my-auto size-3.5 text-muted"
        />
      </div>
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span>
        <span className="block text-[11.5px] font-medium text-ink">{label}</span>
        {hint ? <span className="mt-0.5 block text-[10.5px] leading-4 text-muted">{hint}</span> : null}
      </span>
      <span className="relative inline-flex shrink-0">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span
          aria-hidden="true"
          className="h-[20px] w-[34px] rounded-full border border-line bg-[#E7E4EF] transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-[3px] right-[3px] size-[14px] rounded-full bg-white shadow-sm transition-transform peer-checked:-translate-x-[14px]"
        />
      </span>
    </label>
  );
}

export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label htmlFor={id} className="text-[11.5px] font-medium text-ink">
          {label}
        </label>
        <span className="text-[10.5px] tabular-nums text-muted">
          {value}
          {suffix ?? ''}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#E7E4EF] accent-[#7440E9]"
      />
    </div>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[11.5px] font-medium text-ink">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <span
          className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-line"
          style={{ backgroundColor: value }}
        >
          <input
            id={id}
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            aria-label={label}
          />
        </span>
        <input
          type="text"
          value={value}
          onChange={(event) => {
            const next = event.target.value.trim();
            if (/^#?[0-9a-f]{0,6}$/i.test(next)) {
              onChange(next.startsWith('#') ? next : `#${next}`);
            }
          }}
          onBlur={(event) => onChange(normalizeHexColor(event.target.value, value))}
          spellCheck={false}
          className={cn(inputClass, 'font-mono text-[11px] uppercase')}
          aria-label={`${label} — قيمة HEX`}
        />
      </div>
    </div>
  );
}
