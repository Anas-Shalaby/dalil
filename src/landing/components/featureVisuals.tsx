import { Check, Pencil, Plus } from 'lucide-react';

interface FeatureVisualMockProps {
  t?: (path: string) => string;
}

export function EditMock({ t }: FeatureVisualMockProps = {}) {
  const steps: ReadonlyArray<{ title: string; description: string; state: 'editing' | 'done' }> = [
    { title: t ? t('features.items.0.title') : 'افتح لوحة التحكم', description: t ? 'تأكيد الإذن ثم افتح القائمة الرئيسية.' : 'تأكيد الإذن ثم افتح القائمة الرئيسية.', state: 'done' },
    { title: t ? t('features.items.1.title') : 'أنشئ عميلًا جديدًا', description: t ? 'املأ البيانات واختر الخطة المناسبة.' : 'املأ البيانات واختر الخطة المناسبة.', state: 'editing' },
    { title: t ? t('features.items.2.title') : 'فعّل الإشعارات', description: t ? 'فعّل التنبيهات بعد الحفظ.' : 'فعّل التنبيهات بعد الحفظ.', state: 'done' },
  ];

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-2xl shadow-[#1E40AF]/15 sm:p-6 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-ink dark:text-slate-300">محرر الدليل</p>
        <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-semibold text-primary-ink dark:bg-primary/10 dark:text-primary">
          مسودة
        </span>
      </div>
      <ol className="mt-5 space-y-3">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className={`rounded-xl border p-3 ${
              step.state === 'editing'
                ? 'border-primary/40 bg-primary-soft/50 dark:border-primary/30 dark:bg-primary/10'
                : 'border-line bg-canvas dark:border-slate-700 dark:bg-slate-800'
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  step.state === 'done' ? 'bg-primary text-white' : 'bg-white text-primary ring-2 ring-primary dark:bg-slate-700 dark:text-primary'
                }`}
              >
                {step.state === 'done' ? <Check aria-hidden="true" className="size-3" /> : index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-ink dark:text-slate-300">{step.title}</span>
                <span className="mt-1 block truncate text-[12px] leading-6 text-muted dark:text-slate-400">{step.description}</span>
              </span>
              <button
                type="button"
                aria-label={`Edit: ${step.title}`}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-muted transition-colors hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
              >
                <Pencil aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary-soft/40 px-3 py-2.5 text-[13px] font-semibold text-primary-ink transition-colors hover:bg-primary-soft dark:border-primary/30 dark:bg-primary/10 dark:text-primary"
      >
        <Plus aria-hidden="true" className="size-4" />
        {t ? t('features.items.3.points.0') : 'أضف خطوة'}
      </button>
    </div>
  );
}

export function PdfMock() {
  return (
    <div className="relative mx-auto w-44 rounded-xl border border-line bg-white p-4 shadow-2xl shadow-[#1E40AF]/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
      <div className="h-2.5 w-14 rounded-full bg-primary" />
      <div className="mt-3 h-2.5 w-24 rounded bg-[#E9E7F1] dark:bg-slate-700" />
      <div className="mt-3 space-y-2">
        <div className="h-2 w-full rounded bg-[#DBEAFE] dark:bg-primary/20" />
        <div className="h-2 w-4/5 rounded bg-[#DBEAFE] dark:bg-primary/20" />
        <div className="h-2 w-3/5 rounded bg-[#DBEAFE] dark:bg-primary/20" />
      </div>
      <div className="mt-4 flex justify-between border-t border-line pt-2 text-[9px] text-muted dark:border-slate-700 dark:text-slate-400">
        <span>دليل العمليات</span>
        <span>الصفحة 1 من 3</span>
      </div>
      <span className="absolute -top-2.5 start-4 inline-flex items-center gap-1 rounded-full bg-[#1E40AF] px-2.5 py-1 text-[10px] font-semibold text-white shadow-lg">
        PDF جاهز
      </span>
    </div>
  );
}

export function ArabicMock() {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-2xl shadow-[#1E40AF]/15 sm:p-6 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary dark:bg-primary/10">
          <span className="text-[13px] font-bold">د</span>
        </span>
        <div>
          <p className="text-[13px] font-semibold text-ink dark:text-slate-300">دليل عمليات الإعداد</p>
          <p className="text-[11px] text-muted dark:text-slate-400">Full Arabic experience</p>
        </div>
      </div>
      <div className="mt-5 space-y-2.5" dir="rtl" lang="ar">
        <div className="h-2.5 w-32 rounded bg-[#E9E7F1] dark:bg-slate-700" />
        <div className="h-2 w-4/5 rounded bg-[#DBEAFE] dark:bg-primary/20" />
        <div className="h-2 w-2/3 rounded bg-[#DBEAFE] dark:bg-primary/20" />
        <div className="h-2 w-5/6 rounded bg-[#DBEAFE] dark:bg-primary/20" />
      </div>
      <p className="mt-5 text-[12px] leading-7 text-muted dark:text-slate-400" dir="rtl" lang="ar">
        جميع الخطوات مكتوبة بالعربية الفصحى الواضحة، مع اتجاه نص من اليمين إلى اليسار.
      </p>
    </div>
  );
}
