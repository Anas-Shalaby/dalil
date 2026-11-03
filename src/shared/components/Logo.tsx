import { cn } from '../cn';

interface LogoMarkProps {
  className?: string;
  size?: number;
}

export function LogoMark({ className, size = 36 }: LogoMarkProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <rect width="40" height="40" rx="12" fill="#7440E9" />
      <rect x="9.5" y="7.5" width="21" height="25" rx="5.5" fill="white" />
      <rect x="14" y="13" width="12" height="2.6" rx="1.3" fill="#7440E9" />
      <rect x="14" y="18.7" width="9.5" height="2.6" rx="1.3" fill="#B99BFA" />
      <rect x="14" y="24.4" width="6.5" height="2.6" rx="1.3" fill="#D9C8FD" />
      <circle cx="26.2" cy="26.8" r="1.7" fill="#7440E9" />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  markSize?: number;
  showWordmark?: boolean;
  subtitle?: string;
}

export function Logo({
  className,
  markSize = 34,
  showWordmark = true,
  subtitle,
}: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={markSize} />
      {showWordmark ? (
        <div className="leading-none">
          <span className="block text-[17px] font-semibold text-ink">دليل</span>
          {subtitle ? (
            <span className="mt-1 block text-[11px] font-medium text-muted">{subtitle}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function GuideArtwork({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 96"
      fill="none"
      className={cn('text-primary', className)}
    >
      <rect x="1" y="1" width="118" height="94" rx="20" fill="#F5F1FE" />
      <rect
        x="1"
        y="1"
        width="118"
        height="94"
        rx="20"
        stroke="#E4DAFC"
        strokeDasharray="4 5"
      />
      <rect x="32" y="22" width="56" height="52" rx="10" fill="white" />
      <rect x="32" y="22" width="56" height="52" rx="10" stroke="#E9E7F1" />
      <circle cx="44" cy="38" r="6" fill="#F2EDFE" />
      <path
        d="M41.8 38.1L43.5 39.8L46.6 36.5"
        stroke="#7440E9"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="55" y="35.5" width="20" height="3" rx="1.5" fill="#C9B8F7" />
      <rect x="55" y="41.5" width="13" height="2.5" rx="1.25" fill="#E9E7F1" />
      <circle cx="44" cy="56" r="6" fill="#F2EDFE" />
      <path
        d="M41.8 56.1L43.5 57.8L46.6 54.5"
        stroke="#7440E9"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="55" y="53.5" width="20" height="3" rx="1.5" fill="#C9B8F7" />
      <rect x="55" y="59.5" width="13" height="2.5" rx="1.25" fill="#E9E7F1" />
      <path
        d="M87 64L94 57L100 63L108 54"
        stroke="#7440E9"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
