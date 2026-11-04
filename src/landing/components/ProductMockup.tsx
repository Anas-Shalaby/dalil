import { Check, Globe } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../shared/cn';

type MockStepStatus = 'done' | 'active' | 'todo';

interface ProductMockupProps {
  t?: (path: string) => string;
  variant?: 'hero' | 'record';
}

const MOCK_STEPS_EN: ReadonlyArray<{ title: string; status: MockStepStatus }> = [
  { title: 'Open dashboard', status: 'done' },
  { title: 'Create new client', status: 'active' },
  { title: 'Enable notifications', status: 'todo' },
];

const MOCK_STEPS_AR: ReadonlyArray<{ title: string; status: MockStepStatus }> = [
  { title: 'افتح لوحة التحكم', status: 'done' },
  { title: 'أنشئ عميلًا جديدًا', status: 'active' },
  { title: 'فعّل الإشعارات', status: 'todo' },
];

function BrowserFrame({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl shadow-[#1E40AF]/15 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-2.5 border-b border-line bg-canvas px-3 py-2.5 sm:px-4 dark:border-slate-700 dark:bg-slate-900">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-[#E4DAFC]" />
          <span className="size-2.5 rounded-full bg-[#E4DAFC]" />
          <span className="size-2.5 rounded-full bg-[#E4DAFC]" />
        </span>
        <span className="flex flex-1 items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] text-muted dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          <Globe aria-hidden="true" className="size-3" />
          app.example.com/dashboard
        </span>
      </div>
      <div className="flex h-[360px] flex-col gap-3 bg-[#F8F6FE] p-3 sm:h-[400px] sm:p-4 lg:h-[440px] dark:bg-slate-800/50">
        {children}
        {footer}
      </div>
    </div>
  );
}

export function AnnotatedScreenshot({
  label = 'Add a note here',
  highlighted = false,
}: {
  label?: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`relative h-[132px] shrink-0 overflow-hidden rounded-xl border border-line bg-white sm:h-[150px] dark:border-slate-700 dark:bg-slate-800 ${highlighted ? 'ring-2 ring-primary' : ''}`}
    >
      <div className="absolute inset-0 p-3">
        <div className="flex items-center justify-between">
          <div className="h-2.5 w-24 rounded bg-[#E9E7F1] dark:bg-slate-700" />
          <div className="size-5 rounded-full bg-[#DBEAFE] dark:bg-primary/20" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="h-8 rounded-lg border border-line bg-white dark:border-slate-700 dark:bg-slate-800" />
          <div className="h-8 rounded-lg border border-line bg-white dark:border-slate-700 dark:bg-slate-800" />
          <div className="h-8 rounded-lg border border-line bg-white dark:border-slate-700 dark:bg-slate-800" />
        </div>
        <div className="mt-2 h-11 rounded-lg border border-line bg-white dark:border-slate-700 dark:bg-slate-800" />
      </div>
      <div className="absolute start-3 top-2 z-10">
        <div className="relative">
          <p className="rounded-full bg-[#1E40AF] px-2.5 py-1 text-[10px] font-semibold text-white shadow-lg">
            {label}
          </p>
          <svg
            aria-hidden="true"
            viewBox="0 0 40 20"
            className="absolute start-0 top-full h-[10px] w-[20px]"
          >
            <path d="M2 0 L38 0 L20 20 Z" fill="#1E40AF" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function GuideMock({ t }: { t?: (path: string) => string }) {
  const steps = t ? MOCK_STEPS_AR : MOCK_STEPS_EN;
  return (
    <BrowserFrame>
      <AnnotatedScreenshot label={t ? t('demo.steps.0.label') : 'أضف شرحًا هنا'} />
      <ol className="flex-1 space-y-1.5 overflow-hidden">
        {steps.map((step, index) => {
          const isDone = step.status === 'done';
          const isActive = step.status === 'active';
          return (
            <li
              key={step.title}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-2 py-1.5',
                isActive ? 'bg-primary-soft ring-1 ring-primary/30' : '',
              )}
            >
              <span
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                  isDone
                    ? 'bg-primary text-white'
                    : isActive
                      ? 'bg-white text-primary ring-2 ring-primary'
                      : 'bg-[#DBEAFE] text-muted dark:bg-slate-700 dark:text-slate-400',
                )}
              >
                {isDone ? <Check aria-hidden="true" className="size-3" /> : index + 1}
              </span>
              <span className="truncate text-[11px] font-medium text-ink dark:text-slate-300">
                {step.title}
              </span>
            </li>
          );
        })}
      </ol>
    </BrowserFrame>
  );
}

export function RecordingMock({ t }: { t?: (path: string) => string }) {
  return (
    <BrowserFrame>
      <div className="flex items-center gap-2.5 rounded-xl border border-danger/20 bg-danger/5 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
        <span className="relative flex size-3 shrink-0" aria-hidden="true">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-60" />
          <span className="relative inline-flex size-2.5 rounded-full bg-danger" />
        </span>
        <span className="text-[11px] font-semibold text-danger dark:text-danger/90">
          {t ? t('demo.steps.0.title') : 'التسجيل جارٍ الآن'}
        </span>
        <span className="mr-auto font-mono text-[11px] text-ink/70 dark:text-slate-400">00:42</span>
        <span className="rounded-lg bg-ink px-2.5 py-1 text-[10px] font-semibold text-white">إيقاف</span>
      </div>
      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="h-2.5 w-32 rounded bg-[#E9E7F1] dark:bg-slate-700" />
        <div className="h-24 rounded-xl border border-line bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
          <div className="h-2 w-20 rounded bg-[#DBEAFE] dark:bg-primary/20" />
          <div className="mt-3 h-8 rounded-lg bg-[#F8F6FE] dark:bg-slate-700" />
        </div>
        <div className="h-20 rounded-xl border border-line bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
          <div className="h-2 w-24 rounded bg-[#DBEAFE] dark:bg-primary/20" />
          <div className="mt-3 h-8 rounded-lg bg-[#F8F6FE] dark:bg-slate-700" />
        </div>
      </div>
    </BrowserFrame>
  );
}

export function StepsMock({ t }: { t?: (path: string) => string }) {
  const steps = t ? MOCK_STEPS_AR : MOCK_STEPS_EN;
  const todoText = t ? t('demo.steps.2.description') : "لم تبدأ بعد هذه الخطوة.";
  const doneText = t ? 'أُكملت بنجاح.' : 'أُكملت بنجاح.';
  const activeText = t ? 'الخطوة الحالية — وضّح التفاصيل التي تحتاجها.' : 'الخطوة الحالية — وضّح التفاصيل التي تحتاجها.';
  return (
    <div className="flex h-64 flex-col rounded-2xl border border-line bg-surface p-5 shadow-2xl shadow-[#1E40AF]/15 sm:h-72 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-ink dark:text-slate-300">خطوات الدليل</p>
        <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-semibold text-primary-ink dark:bg-primary/10 dark:text-primary">
          {steps.length} خطوة
        </span>
      </div>
      <ol className="mt-5 flex-1 space-y-4">
        {steps.map((step, index) => (
          <li key={step.title} className="flex items-start gap-3">
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                step.status === 'done'
                  ? 'bg-primary text-white'
                  : step.status === 'active'
                    ? 'bg-white text-primary ring-2 ring-primary'
                    : 'bg-[#DBEAFE] text-muted dark:bg-slate-700 dark:text-slate-400'
              }`}
            >
              {step.status === 'done' ? <Check aria-hidden="true" className="size-3.5" /> : index + 1}
            </span>
            <span className="pt-0.5">
              <span className="block text-[13px] font-semibold text-ink dark:text-slate-300">
                {step.title}
              </span>
              <span className="mt-1 block text-[12px] leading-6 text-muted dark:text-slate-400">
                {step.status === 'todo' ? todoText : step.status === 'done' ? doneText : activeText}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ProductMockup({ t, variant = 'hero' }: ProductMockupProps) {
  if (variant === 'record') {
    return <RecordingMock t={t} />;
  }
  return <GuideMock t={t} />;
}
