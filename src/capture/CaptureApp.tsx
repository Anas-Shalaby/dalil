import {
  AlertTriangle,
  BookOpen,
  Camera,
  CheckCircle2,
  FileText,
  Monitor,
  RefreshCw,
  Shield,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { getCaptureGuideIdFromLocation } from '../shared/chrome';
import { Button } from '../shared/components/Button';
import { Dialog } from '../shared/components/Dialog';
import { Logo } from '../shared/components/Logo';
import { SaveStatus } from '../shared/components/SaveStatus';
import { Toaster, useToasts } from '../shared/components/Toast';
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
} from '../shared/constants';
import { formatStepCount } from '../shared/format';
import type { GuideStep } from '../shared/types';
import { CaptureStepCard } from './CaptureStepCard';
import { createChromeCaptureServices, type CaptureServices } from './services';
import { SourcePanel } from './SourcePanel';
import { useCaptureSession } from './useCaptureSession';

interface CaptureAppProps {
  services?: CaptureServices;
  initialGuideId?: string | null;
}

export function CaptureApp({ services: injectedServices, initialGuideId }: CaptureAppProps) {
  const services = useMemo(
    () => injectedServices ?? createChromeCaptureServices(),
    [injectedServices],
  );
  const [resolvedGuideId] = useState(() =>
    initialGuideId === undefined ? getCaptureGuideIdFromLocation() : initialGuideId,
  );
  const session = useCaptureSession(resolvedGuideId, services);
  const [pendingDelete, setPendingDelete] = useState<GuideStep | null>(null);
  const { toasts, push, dismiss } = useToasts();

  const {
    machine,
    guide,
    loadState,
    loadError,
    actionError,
    saveState,
    saveError,
    busy,
  } = session;

  const errorMessage =
    actionError?.message ??
    machine.error?.message ??
    machine.notice?.message ??
    (saveState === 'error' ? (saveError ?? 'تعذّر حفظ الدليل.') : null);

  const handleCapture = async () => {
    const step = await session.captureStep();
    if (step) {
      push({
        message: 'تمت إضافة الخطوة. اكتب وصفها إن أردت.',
        tone: 'success',
      });
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const deleted = await session.deleteStep(pendingDelete.id);
    setPendingDelete(null);
    if (deleted) push({ message: 'حُذفت الخطوة ولقطتها.', tone: 'info' });
  };

  const handleFinish = async () => {
    const finished = await session.finish();
    if (finished) {
      push({
        message: 'تم حفظ الدليل بنجاح. يمكنك تحريره وطباعته الآن.',
        tone: 'success',
      });
    }
  };

  const handleOpenLibrary = () => {
    void services.openLibrary().catch(() => undefined);
  };

  const canFinish =
    (machine.status === 'idle' ||
      machine.status === 'error' ||
      machine.status === 'recording') &&
    !busy.capture &&
    !busy.finish;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="no-print sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-3 px-5">
          <Logo subtitle="التقاط من الكمبيوتر" />
          <div className="flex items-center gap-2">
            <SaveStatus
              state={saveState}
              onRetry={() => {
                void session.flushNow().catch(() => undefined);
              }}
            />
            <Button variant="ghost" size="sm" onClick={handleOpenLibrary}>
              <BookOpen aria-hidden="true" className="size-3.5" />
              أدلتي
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-6">
        {loadState === 'loading' ? (
          <div className="space-y-4" aria-busy="true">
            <div className="h-40 animate-pulse rounded-2xl border border-line bg-surface" />
            <div className="h-28 animate-pulse rounded-2xl border border-line bg-surface" />
            <div className="h-40 animate-pulse rounded-2xl border border-line bg-surface" />
          </div>
        ) : loadState === 'conflict' ? (
          <StateCard
            icon={<Monitor aria-hidden="true" className="size-5" />}
            tone="primary"
            title="جلسة التقاط أخرى مفتوحة"
            description="التقاط سطح المكتب يعمل في نافذة واحدة في كل مرة. أكمل الجلسة المفتوحة أولًا، ثم عد إلى هنا."
          >
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {session.conflictTabId !== null ? (
                <Button
                  size="md"
                  onClick={() => void session.focusOtherSession()}
                >
                  <Monitor aria-hidden="true" className="size-3.5" />
                  العودة إلى الجلسة الحالية
                </Button>
              ) : null}
              <Button variant="secondary" size="md" onClick={session.reload}>
                <RefreshCw aria-hidden="true" className="size-3.5" />
                إعادة المحاولة
              </Button>
            </div>
          </StateCard>
        ) : loadState === 'missing' ? (
          <StateCard
            icon={<FileText aria-hidden="true" className="size-5" />}
            tone="warning"
            title="لم نجد هذا الدليل"
            description="ربما حُذف الدليل أو أن الرابط غير صالح. يمكنك العودة إلى أدلتك أو بدء جلسة التقاط جديدة."
          >
            <Button variant="soft" size="sm" className="mt-5" onClick={handleOpenLibrary}>
              العودة إلى أدلتي
            </Button>
          </StateCard>
        ) : loadState === 'error' ? (
          <StateCard
            icon={<AlertTriangle aria-hidden="true" className="size-5" />}
            tone="danger"
            title="تعذّر تجهيز جلسة الالتقاط"
            description={loadError?.message ?? 'حدث خطأ أثناء قراءة البيانات المحلية.'}
          >
            <Button variant="soft" size="sm" className="mt-5" onClick={session.reload}>
              <RefreshCw aria-hidden="true" className="size-3.5" />
              إعادة المحاولة
            </Button>
          </StateCard>
        ) : guide ? (
          <div className="space-y-4">
            {errorMessage ? (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-[#F3C7CE] bg-[#FCEFF1] px-3.5 py-3 text-[12px] leading-5 text-danger"
              >
                <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <p className="flex-1">{errorMessage}</p>
                <button
                  type="button"
                  onClick={session.dismissErrors}
                  aria-label="إغلاق الرسالة"
                  className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              </div>
            ) : null}

            <SourcePanel
              status={machine.status}
              sourceLabel={machine.sourceLabel}
              busySource={busy.source}
              busyCapture={busy.capture}
              stepCount={guide.steps.length}
              onChoose={() => void session.chooseSource()}
              onCancel={session.cancelSourceChoice}
              onCapture={() => void handleCapture()}
              onStop={session.stopCapture}
              onOpenEditor={() => void session.openEditor()}
              onOpenPrint={() => void session.openPrint()}
            />

            <section className="surface p-5" aria-labelledby="capture-guide-title">
              <label htmlFor="capture-guide-title" className="eyebrow">
                اسم الدليل
              </label>
              <input
                id="capture-guide-title"
                value={guide.title}
                maxLength={MAX_TITLE_LENGTH}
                disabled={machine.status === 'stopping' || machine.status === 'completed'}
                onChange={(event) => session.setTitle(event.target.value)}
                onBlur={() => void session.flushNow().catch(() => undefined)}
                placeholder="مثال: إضافة منتج في برنامج المخزون"
                className="mt-1.5 w-full border-0 bg-transparent p-0 text-2xl font-semibold text-ink outline-none placeholder:text-muted/50 focus:ring-0 disabled:opacity-70"
              />
              <label htmlFor="capture-guide-description" className="eyebrow mt-4 block">
                وصف مختصر (اختياري)
              </label>
              <textarea
                id="capture-guide-description"
                value={guide.description}
                maxLength={MAX_DESCRIPTION_LENGTH}
                rows={2}
                disabled={machine.status === 'stopping' || machine.status === 'completed'}
                onChange={(event) => session.setDescription(event.target.value)}
                onBlur={() => void session.flushNow().catch(() => undefined)}
                placeholder="ما الهدف من هذا الدليل؟"
                className="field mt-1.5 resize-none leading-6"
              />
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3 text-[12px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Camera aria-hidden="true" className="size-3.5" />
                  {formatStepCount(guide.steps.length)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Shield aria-hidden="true" className="size-3.5" />
                  محفوظ محليًا على جهازك
                </span>
              </div>
            </section>

            <section aria-labelledby="capture-steps-title">
              <div className="mb-2 flex items-center justify-between">
                <h2 id="capture-steps-title" className="text-[15px] font-semibold text-ink">
                  الخطوات الملتقطة
                  <span className="ms-2 font-normal text-muted">({guide.steps.length})</span>
                </h2>
                <span className="text-[11px] text-muted">
                  تُحفظ كل خطوة تلقائيًا بعد التقاطها
                </span>
              </div>

              {guide.steps.length === 0 ? (
                <div className="surface flex flex-col items-center px-6 py-10 text-center">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Camera aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="mt-3 text-[14px] font-semibold text-ink">لا توجد خطوات بعد</h3>
                  <p className="mt-1.5 max-w-md text-[12px] leading-6 text-muted">
                    اختر مصدر الالتقاط، انتقل إلى البرنامج، ثم ارجع واضغط «التقاط خطوة» بعد كل
                    إجراء تريد توثيقه.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {guide.steps.map((step, index) => (
                    <CaptureStepCard
                      key={step.id}
                      step={step}
                      index={index}
                      busy={busy.deleteStepId === step.id || busy.capture || busy.finish}
                      onChange={(value) => session.setStepInstruction(step.id, value)}
                      onBlur={() => void session.flushNow().catch(() => undefined)}
                      onDelete={() => setPendingDelete(step)}
                    />
                  ))}
                </div>
              )}
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
              <p className="inline-flex max-w-md items-start gap-1.5 text-[11px] leading-5 text-muted">
                <Shield aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                يمكنك إغلاق هذه الصفحة في أي وقت. الخطوات واللقطات المحفوظة تبقى على جهازك.
              </p>

              {machine.status !== 'completed' ? (
                <Button
                  size="md"
                  onClick={() => void handleFinish()}
                  loading={busy.finish || machine.status === 'stopping'}
                  disabled={!canFinish}
                >
                  <CheckCircle2 aria-hidden="true" className="size-4" />
                  إنهاء التوثيق وفتح المحرر
                </Button>
              ) : (
                <Button size="md" onClick={() => void session.openEditor()}>
                  <BookOpen aria-hidden="true" className="size-4" />
                  فتح المحرر
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </main>

      <Dialog
        open={pendingDelete !== null}
        title="حذف هذه الخطوة؟"
        description="ستُحذف الخطوة ولقطتها نهائيًا من الدليل. لا يمكن التراجع عن هذا الإجراء."
        onClose={() => setPendingDelete(null)}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setPendingDelete(null)}>
              إلغاء
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={pendingDelete ? busy.deleteStepId === pendingDelete.id : false}
              data-autofocus
              onClick={() => void handleDelete()}
            >
              حذف الخطوة
            </Button>
          </>
        }
      />

      <Toaster toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

function StateCard({
  icon,
  title,
  description,
  tone,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  tone: 'primary' | 'warning' | 'danger';
  children?: React.ReactNode;
}) {
  const toneClass =
    tone === 'danger'
      ? 'bg-[#FCEFF1] text-danger'
      : tone === 'warning'
        ? 'bg-[#FDF6E8] text-warning'
        : 'bg-primary-soft text-primary';

  return (
    <div className="surface mx-auto mt-8 flex max-w-lg flex-col items-center px-6 py-12 text-center">
      <span className={`flex size-11 items-center justify-center rounded-xl ${toneClass}`}>
        {icon}
      </span>
      <h1 className="mt-3 text-[16px] font-semibold text-ink">{title}</h1>
      <p className="mt-1.5 text-[13px] leading-6 text-muted">{description}</p>
      {children}
    </div>
  );
}
