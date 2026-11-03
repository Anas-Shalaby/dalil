import {
  AlertTriangle,
  AppWindow,
  BookOpen,
  Camera,
  CheckCircle2,
  Loader2,
  Monitor,
  Printer,
  Shield,
  Square,
} from 'lucide-react';
import { Button } from '../shared/components/Button';
import { cn } from '../shared/cn';
import type { CaptureStatus } from '../shared/types';

interface SourcePanelProps {
  status: CaptureStatus;
  sourceLabel: string | null;
  busySource: boolean;
  busyCapture: boolean;
  stepCount: number;
  onChoose: () => void;
  onCancel: () => void;
  onCapture: () => void;
  onStop: () => void;
  onOpenEditor: () => void;
  onOpenPrint: () => void;
}

const STATUS_TEXT: Partial<Record<CaptureStatus, string>> = {
  idle: 'جاهز لاختيار المصدر',
  'selecting-source': 'جارٍ اختيار المصدر',
  connecting: 'جارٍ الاتصال',
  recording: 'الالتقاط نشط',
  capturing: 'جارٍ التقاط الخطوة',
  stopping: 'جارٍ إنهاء التوثيق',
  completed: 'تم إنهاء التوثيق',
  error: 'توقف الالتقاط',
};

function StatusPill({ status }: { status: CaptureStatus }) {
  const active = status === 'recording';
  const busy = status === 'selecting-source' || status === 'connecting' || status === 'capturing' || status === 'stopping';
  const done = status === 'completed';
  const failed = status === 'error';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
        active && 'border-[#BDE7D5] bg-[#EDFAF4] text-success',
        done && 'border-[#BDE7D5] bg-[#EDFAF4] text-success',
        failed && 'border-[#F3C7CE] bg-[#FCEFF1] text-danger',
        busy && 'border-primary/20 bg-primary-soft text-primary-ink',
        status === 'idle' && 'border-line bg-[#F4F2F9] text-muted',
      )}
    >
      {busy ? (
        <Loader2 aria-hidden="true" className="size-3 animate-spin" />
      ) : done || active ? (
        <CheckCircle2 aria-hidden="true" className="size-3" />
      ) : failed ? (
        <AlertTriangle aria-hidden="true" className="size-3" />
      ) : (
        <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      )}
      {STATUS_TEXT[status] ?? 'الالتقاط'}
    </span>
  );
}

export function SourcePanel({
  status,
  sourceLabel,
  busySource,
  busyCapture,
  stepCount,
  onChoose,
  onCancel,
  onCapture,
  onStop,
  onOpenEditor,
  onOpenPrint,
}: SourcePanelProps) {
  const recording = status === 'recording' || status === 'capturing';
  const choosing = status === 'selecting-source';
  const connecting = status === 'connecting';
  const completed = status === 'completed';

  return (
    <section className="surface overflow-hidden" aria-label="جلسة التقاط سطح المكتب">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Monitor aria-hidden="true" className="size-4" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-ink">التقاط من الكمبيوتر</h2>
            <p className="mt-0.5 text-[12px] text-muted">
              {sourceLabel ?? 'لم يُحدد مصدر بعد'}
            </p>
          </div>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="px-5 py-5">
        {status === 'idle' ? (
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xl">
              <h3 className="text-[15px] font-semibold text-ink">
                اختر نافذة البرنامج الذي تريد توثيقه
              </h3>
              <p className="mt-1.5 text-[13px] leading-6 text-muted">
                ستفتح نافذة Chrome الرسمية لاختيار نافذة أو شاشة. ننصح باختيار{' '}
                <strong className="font-semibold text-ink">نافذة البرنامج</strong> بدل الشاشة
                الكاملة، حتى لا تظهر واجهة دليل نفسها داخل اللقطات.
              </p>
              <ul className="mt-3 space-y-1.5 text-[12px] text-muted">
                <li className="flex items-center gap-2">
                  <Shield aria-hidden="true" className="size-3.5 text-success" />
                  لا يبدأ الالتقاط قبل اختيارك الصريح للمصدر.
                </li>
                <li className="flex items-center gap-2">
                  <Shield aria-hidden="true" className="size-3.5 text-success" />
                  الصور تُحفظ على جهازك فقط، بلا إرسال لأي جهة.
                </li>
              </ul>
            </div>

            <Button
              size="lg"
              className="shrink-0"
              onClick={onChoose}
              loading={busySource}
            >
              <AppWindow aria-hidden="true" className="size-4" />
              اختيار نافذة أو شاشة
            </Button>
          </div>
        ) : null}

        {choosing ? (
          <div className="flex flex-col gap-3 rounded-xl border border-primary/15 bg-primary-soft/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Loader2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
              <div>
                <p className="text-[13px] font-semibold text-ink">نافذة الاختيار مفتوحة الآن</p>
                <p className="mt-1 text-[12px] leading-5 text-muted">
                  اختر نافذة البرنامج أو الشاشة من نافذة Chrome. الانتظار لا يلتقط أي شيء.
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              إلغاء
            </Button>
          </div>
        ) : null}

        {connecting ? (
          <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary-soft/60 px-4 py-4">
            <Loader2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
            <div>
              <p className="text-[13px] font-semibold text-ink">
                جارٍ الاتصال بمصدر الالتقاط…
              </p>
              <p className="mt-1 text-[12px] leading-5 text-muted">
                قد يستغرق الأمر لحظات. لا تغلق النافذة.
              </p>
            </div>
          </div>
        ) : null}

        {recording ? (
          <div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                  <span className="size-2 animate-soft-pulse rounded-full bg-success" aria-hidden="true" />
                  الالتقاط جاهز — انتقل إلى البرنامج ثم ارجع لهذه الصفحة
                </p>
                <p className="mt-1.5 text-[12px] leading-5 text-muted">
                  اضغط «التقاط خطوة» بعد كل إجراء تريد توثيقه. لقطات متعددة تُضاف كخطوات منفصلة.
                </p>
              </div>
              <Button
                size="lg"
                className="shrink-0"
                onClick={onCapture}
                loading={busyCapture || status === 'capturing'}
                disabled={status !== 'recording'}
              >
                <Camera aria-hidden="true" className="size-4" />
                التقاط خطوة
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
              <span className="text-[12px] text-muted">
                {stepCount === 0
                  ? 'لم تُلتقط خطوات بعد.'
                  : `تم توثيق ${stepCount} ${stepCount === 1 ? 'خطوة' : 'خطوات'} حتى الآن.`}
              </span>
              <Button variant="ghost" size="sm" onClick={onStop} disabled={busyCapture}>
                <Square aria-hidden="true" className="size-3" fill="currentColor" />
                إيقاف الالتقاط
              </Button>
            </div>
          </div>
        ) : null}

        {status === 'error' ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#FCEFF1] text-danger">
                <AlertTriangle aria-hidden="true" className="size-4" />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-ink">
                  توقف الالتقاط — خطواتك المحفوظة لم تتأثر
                </p>
                <p className="mt-1 text-[12px] leading-5 text-muted">
                  اختر مصدرًا جديدًا لمتابعة التوثيق، أو أنهِ الجلسة وحرّر ما تم حفظه.
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="md"
              className="shrink-0"
              onClick={onChoose}
              loading={busySource}
            >
              <AppWindow aria-hidden="true" className="size-4" />
              اختيار مصدر جديد
            </Button>
          </div>
        ) : null}

        {completed ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#EDFAF4] text-success">
                <CheckCircle2 aria-hidden="true" className="size-4" />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-ink">تم حفظ الدليل بنجاح</p>
                <p className="mt-1 text-[12px] leading-5 text-muted">
                  يمكنك الآن تحرير الخطوات وإضافة التوضيحات أو طباعة الدليل PDF.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="secondary" size="md" onClick={onOpenPrint}>
                <Printer aria-hidden="true" className="size-3.5" />
                طباعة / PDF
              </Button>
              <Button size="md" onClick={onOpenEditor}>
                <BookOpen aria-hidden="true" className="size-3.5" />
                فتح المحرر
              </Button>
            </div>
          </div>
        ) : null}

        {status === 'stopping' ? (
          <div className="flex items-center gap-3 rounded-xl border border-line bg-[#FBFAFE] px-4 py-4">
            <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin text-primary" />
            <p className="text-[13px] text-muted">جارٍ حفظ الدليل وتحرير الموارد…</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
