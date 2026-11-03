import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../cn';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastInput {
  message: string;
  tone?: ToastTone;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

export interface ToastItem extends ToastInput {
  id: string;
}

const toneStyles: Record<ToastTone, string> = {
  success: 'text-[#9BE3C5]',
  error: 'text-[#FFB4BE]',
  info: 'text-[#CBB8FA]',
};

function ToneIcon({ tone }: { tone: ToastTone }) {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'error' ? AlertCircle : Info;
  return <Icon aria-hidden="true" className={cn('size-4 shrink-0', toneStyles[tone])} />;
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const duration = input.duration ?? 4800;
      setToasts((current) => [...current.slice(-2), { ...input, id }]);
      const timer = window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
        timers.current.delete(id);
      }, duration);
      timers.current.set(id, timer);
      return id;
    },
    [],
  );

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) window.clearTimeout(timer);
    },
    [],
  );

  return { toasts, push, dismiss };
}

interface ToasterProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function Toaster({ toasts, onDismiss }: ToasterProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="no-print pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-auto flex max-w-[min(92vw,480px)] items-center gap-3 rounded-xl border border-white/10 bg-ink px-4 py-3 text-sm text-white shadow-float animate-rise-in"
        >
          <ToneIcon tone={toast.tone ?? 'info'} />
          <span className="min-w-0 flex-1 leading-6">{toast.message}</span>
          {toast.actionLabel && toast.onAction ? (
            <button
              type="button"
              onClick={() => {
                toast.onAction?.();
                onDismiss(toast.id);
              }}
              className="shrink-0 rounded-md px-2 py-1 text-[13px] font-semibold text-[#D9C8FD] transition-colors hover:bg-white/10 hover:text-white"
            >
              {toast.actionLabel}
            </button>
          ) : null}
          <button
            type="button"
            aria-label="إغلاق التنبيه"
            title="إغلاق التنبيه"
            onClick={() => onDismiss(toast.id)}
            className="shrink-0 rounded-md p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
