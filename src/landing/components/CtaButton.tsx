import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { Download } from 'lucide-react';
import { CHROME_WEB_STORE_URL } from '../../shared/launch';
import { cn } from '../../shared/cn';

type CtaVariant = 'primary' | 'secondary' | 'light';
type CtaSize = 'sm' | 'md' | 'lg';

interface CtaButtonProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  variant?: CtaVariant;
  size?: CtaSize;
  children?: ReactNode;
}

const variantClasses: Record<CtaVariant, string> = {
  primary:
    'inline-flex items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-white shadow-lg shadow-primary/25 transition-colors duration-150 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-primary-ink',
  secondary:
    'inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-5 font-semibold text-ink shadow-card transition-colors duration-150 hover:border-primary/40 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
  light: 'inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 font-semibold text-[#1E40AF] shadow-lg shadow-[#1E40AF]/30 transition-colors duration-150 hover:bg-[#BFDBFE] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
};

const sizeClasses: Record<CtaSize, string> = {
  sm: 'h-10 px-4 text-[13px]',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-sm',
};

export function CtaButton({ variant = 'primary', size = 'lg', className, children }: CtaButtonProps) {
  return (
    <a
      href={CHROME_WEB_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      {children}
      <Download aria-hidden="true" className="size-4" />
    </a>
  );
}
