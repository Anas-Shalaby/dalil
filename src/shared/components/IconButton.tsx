import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../cn';

type IconButtonVariant = 'default' | 'ghost' | 'danger';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: IconButtonVariant;
  size?: 'sm' | 'md';
}

const variants: Record<IconButtonVariant, string> = {
  default:
    'border border-line bg-surface text-muted shadow-card hover:border-[#DCD8E8] hover:bg-[#FAF9FD] hover:text-ink',
  ghost: 'text-muted hover:bg-[#F1EFF7] hover:text-ink',
  danger: 'text-muted/80 hover:bg-[#FCEFF1] hover:text-danger',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { label, variant = 'default', size = 'md', className, children, type = 'button', ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-lg transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45',
          size === 'sm' ? 'size-8' : 'size-9',
          variants[variant],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
