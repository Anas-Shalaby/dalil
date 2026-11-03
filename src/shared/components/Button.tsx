import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white shadow-[0_1px_2px_rgba(78,34,159,0.28)] hover:bg-primary-hover active:bg-[#592EBF] disabled:bg-primary/45',
  secondary:
    'border border-line bg-surface text-ink shadow-card hover:border-[#DCD8E8] hover:bg-[#FBFAFE] active:bg-[#F5F3FA] disabled:text-muted/60',
  ghost:
    'text-muted hover:bg-[#F1EFF7] hover:text-ink active:bg-[#EBE8F3] disabled:text-muted/50',
  danger:
    'bg-danger text-white hover:bg-[#9D1E32] active:bg-[#89192B] disabled:bg-danger/45',
  soft:
    'bg-primary-soft text-primary-ink hover:bg-[#E9E0FD] active:bg-[#E0D3FC] disabled:bg-primary-soft/60',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 rounded-lg px-3 text-[13px]',
  md: 'h-10 rounded-xl px-4 text-[13px]',
  lg: 'h-12 rounded-xl px-5 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    children,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors duration-150 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
});
