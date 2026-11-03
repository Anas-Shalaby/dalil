import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { cn } from '../cn';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface SaveStatusProps {
  state: SaveState;
  onRetry?: () => void;
  className?: string;
}

export function SaveStatus({ state, onRetry, className }: SaveStatusProps) {
  if (state === 'idle') return null;

  if (state === 'saving') {
    return (
      <span
        role="status"
        className={cn(
          'inline-flex items-center gap-1.5 text-xs font-medium text-muted',
          className,
        )}
      >
        <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
        جارٍ الحفظ…
      </span>
    );
  }

  if (state === 'saved') {
    return (
      <span
        role="status"
        className={cn(
          'inline-flex items-center gap-1.5 text-xs font-medium text-success',
          className,
        )}
      >
        <Check aria-hidden="true" className="size-3.5" />
        تم الحفظ
      </span>
    );
  }

  return (
    <span
      role="alert"
      className={cn('inline-flex items-center gap-1.5 text-xs font-medium text-danger', className)}
    >
      <AlertCircle aria-hidden="true" className="size-3.5" />
      تعذّر الحفظ
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="ms-0.5 rounded px-1 py-0.5 font-semibold underline decoration-danger/30 underline-offset-2 hover:bg-[#FCEFF1]"
        >
          إعادة المحاولة
        </button>
      ) : null}
    </span>
  );
}
