import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  FileDown,
  FileText,
  ListOrdered,
  Plus,
  Shield,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../shared/components/Button';
import { Dialog } from '../shared/components/Dialog';
import { Logo } from '../shared/components/Logo';
import { SaveStatus } from '../shared/components/SaveStatus';
import { Toaster, useToasts } from '../shared/components/Toast';
import {
  humanizeBrowserError,
  openLibraryPage,
  openStudioPage,
  openPrivacyPage,
} from '../shared/chrome';
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
} from '../shared/constants';
import { formatRelativeDate, formatStepCount } from '../shared/format';
import { getGuideIdFromLocation } from '../shared/chrome';
import { useAutosave } from '../shared/hooks/useAutosave';
import { fileToScreenshotDataUrl } from '../shared/images';
import {
  attachScreenshot,
  buildManualStep,
  detachScreenshot,
  getGuide,
  persistGuide,
} from '../shared/guideService';
import type { Annotation, Guide, GuideStep } from '../shared/types';
import { AnnotationEditor } from './AnnotationEditor';
import { StepCard } from './StepCard';

type LoadState = 'loading' | 'ready' | 'missing' | 'error';

export function EditorApp() {
  const [guideId] = useState(() => getGuideIdFromLocation());
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [busy, setBusy] = useState(false);
  const [pendingDeleteStep, setPendingDeleteStep] = useState<GuideStep | null>(null);
  const [annotationStepId, setAnnotationStepId] = useState<string | null>(null);
  const { toasts, push, dismiss } = useToasts();

  useEffect(() => {
    let active = true;
    if (!guideId) {
      setLoadState('missing');
      return;
    }
    getGuide(guideId)
      .then((result) => {
        if (!active) return;
        if (!result) {
          setLoadState('missing');
          return;
        }
        setGuide(result);
        setLoadState('ready');
      })
      .catch(() => {
        if (active) setLoadState('error');
      });
    return () => {
      active = false;
    };
  }, [guideId]);

  const { state: saveState, retry: retrySave, flushNow } = useAutosave<Guide>({
    value: guide,
    save: async (value) => {
      try {
        await persistGuide(value);
      } catch (error) {
        push({ message: humanizeBrowserError(error), tone: 'error' });
        throw error;
      }
    },
  });

  const updateGuide = useCallback((updater: (current: Guide) => Guide) => {
    setGuide((current) => (current ? updater(current) : current));
  }, []);

  const handleInstructionChange = useCallback(
    (stepId: string, value: string) => {
      updateGuide((current) => ({
        ...current,
        steps: current.steps.map((step) =>
          step.id === stepId ? { ...step, instruction: value } : step,
        ),
      }));
    },
    [updateGuide],
  );

  const handleMove = useCallback(
    (stepId: string, direction: -1 | 1) => {
      updateGuide((current) => {
        const index = current.steps.findIndex((step) => step.id === stepId);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= current.steps.length) return current;
        const steps = [...current.steps];
        [steps[index], steps[target]] = [steps[target], steps[index]];
        return { ...current, steps: steps.map((step, order) => ({ ...step, order: order + 1 })) };
      });
    },
    [updateGuide],
  );

  const handleDeleteStep = useCallback(
    async (step: GuideStep) => {
      if (!guide) return;
      setBusy(true);
      try {
        if (step.screenshotId) {
          await detachScreenshot(guide.id, step.id);
        }
        updateGuide((current) => ({
          ...current,
          steps: current.steps
            .filter((item) => item.id !== step.id)
            .map((item, order) => ({ ...item, order: order + 1 })),
        }));
        push({ message: 'حُذفت الخطوة.', tone: 'info' });
      } catch (error) {
        push({ message: humanizeBrowserError(error), tone: 'error' });
      } finally {
        setBusy(false);
        setPendingDeleteStep(null);
      }
    },
    [guide, push, updateGuide],
  );

  const handleAddStep = useCallback(() => {
    updateGuide((current) => {
      const next = buildManualStep();
      return { ...current, steps: [...current.steps, { ...next, order: current.steps.length + 1 }] };
    });
  }, [updateGuide]);

  const handleReplaceScreenshot = useCallback(
    async (stepId: string, file: File) => {
      if (!guide) return;
      setBusy(true);
      try {
        const dataUrl = await fileToScreenshotDataUrl(file);
        const updated = await attachScreenshot(guide.id, stepId, dataUrl);
        if (updated) setGuide(updated);
        push({ message: 'حُفظت اللقطة.', tone: 'success' });
      } catch (error) {
        push({
          message: error instanceof Error ? error.message : humanizeBrowserError(error),
          tone: 'error',
        });
      } finally {
        setBusy(false);
      }
    },
    [guide, push],
  );

  const handleRemoveScreenshot = useCallback(
    async (stepId: string) => {
      if (!guide) return;
      setBusy(true);
      try {
        const updated = await detachScreenshot(guide.id, stepId);
        if (updated) setGuide(updated);
        push({ message: 'أُزيلت اللقطة من الخطوة.', tone: 'info' });
      } catch (error) {
        push({ message: humanizeBrowserError(error), tone: 'error' });
      } finally {
        setBusy(false);
      }
    },
    [guide, push],
  );

  const handleOpenAnnotations = useCallback(
    async (stepId: string) => {
      const step = guide?.steps.find((item) => item.id === stepId);
      if (!step?.screenshotId) return;
      await flushNow();
      setAnnotationStepId(stepId);
    },
    [flushNow, guide],
  );

  const handleSaveAnnotations = useCallback(
    async (stepId: string, annotations: Annotation[]) => {
      if (!guide) throw new Error('تعذّر العثور على الدليل.');
      const next: Guide = {
        ...guide,
        steps: guide.steps.map((step) =>
          step.id === stepId ? { ...step, annotations } : step,
        ),
      };
      await persistGuide(next);
      setGuide(next);
      push({ message: 'حُفظت التعليقات على اللقطة.', tone: 'success' });
    },
    [guide, push],
  );

  const handleExport = useCallback(async () => {
    if (!guide) return;
    await persistGuide(guide);
    await openStudioPage(guide.id);
  }, [guide]);

  const annotationStep = useMemo(
    () =>
      annotationStepId
        ? (guide?.steps.find((step) => step.id === annotationStepId) ?? null)
        : null,
    [annotationStepId, guide],
  );

  const headerStats = useMemo(() => {
    if (!guide) return '';
    return `${formatStepCount(guide.steps.length)} · حُدّث ${formatRelativeDate(guide.updatedAt)}`;
  }, [guide]);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="no-print sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-3">
            <Logo showWordmark={false} markSize={32} />
            <div className="hidden items-center gap-1.5 text-[13px] text-muted sm:flex">
              <button
                type="button"
                onClick={() => void openLibraryPage()}
                className="rounded-md px-1.5 py-1 transition-colors hover:bg-[#F1EFF7] hover:text-ink"
              >
                أدلتي
              </button>
              <ArrowRight aria-hidden="true" className="size-3.5 rotate-180" />
              <span className="font-medium text-ink">المحرر</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {guide ? <SaveStatus state={saveState} onRetry={retrySave} /> : null}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void openLibraryPage()}
              className="hidden sm:inline-flex"
            >
              <BookOpen aria-hidden="true" className="size-3.5" />
              العودة للأدلة
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!guide || busy}
              onClick={() => void handleExport()}
            >
              <FileDown aria-hidden="true" className="size-3.5" />
              تصدير PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-6">
        {loadState === 'loading' ? (
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-2xl border border-line bg-surface" />
            <div className="h-32 animate-pulse rounded-2xl border border-line bg-surface" />
            <div className="h-32 animate-pulse rounded-2xl border border-line bg-surface" />
          </div>
        ) : loadState === 'missing' ? (
          <EmptyState
            title="لم نجد هذا الدليل"
            description="ربما حُذف الدليل أو أن الرابط غير صالح. يمكنك العودة إلى قائمة أدلتك."
            actionLabel="الذهاب إلى أدلتي"
            onAction={() => void openLibraryPage()}
          />
        ) : loadState === 'error' ? (
          <EmptyState
            title="تعذّر تحميل الدليل"
            description="حدث خطأ أثناء قراءة البيانات المحلية. حاول إعادة تحميل الصفحة."
            actionLabel="إعادة التحميل"
            onAction={() => window.location.reload()}
          />
        ) : guide ? (
          <>
            <section className="surface p-5">
              <label htmlFor="guide-title" className="eyebrow">
                عنوان الدليل
              </label>
              <input
                id="guide-title"
                value={guide.title}
                maxLength={MAX_TITLE_LENGTH}
                onChange={(event) =>
                  updateGuide((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="مثال: إضافة منتج جديد"
                className="mt-1.5 w-full border-0 bg-transparent p-0 text-2xl font-semibold text-ink outline-none placeholder:text-muted/50 focus:ring-0"
              />

              <label htmlFor="guide-description" className="eyebrow mt-4 block">
                وصف مختصر (اختياري)
              </label>
              <textarea
                id="guide-description"
                value={guide.description}
                maxLength={MAX_DESCRIPTION_LENGTH}
                rows={2}
                onChange={(event) =>
                  updateGuide((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="اشرح الهدف من هذا الدليل في سطر أو سطرين…"
                className="field mt-1.5 resize-none leading-6"
              />

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3 text-[12px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <ListOrdered aria-hidden="true" className="size-3.5" />
                  {headerStats}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Shield aria-hidden="true" className="size-3.5" />
                  محفوظ محليًا على جهازك
                </span>
              </div>
            </section>

            <div className="mt-5 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-ink">
                الخطوات
                <span className="ms-2 font-normal text-muted">({guide.steps.length})</span>
              </h2>
              <Button variant="soft" size="sm" onClick={handleAddStep} disabled={busy}>
                <Plus aria-hidden="true" className="size-3.5" />
                إضافة خطوة يدوية
              </Button>
            </div>

            {guide.steps.length === 0 ? (
              <div className="surface mt-3 flex flex-col items-center px-6 py-12 text-center">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <ListOrdered aria-hidden="true" className="size-5" />
                </span>
                <h3 className="mt-3 text-[15px] font-semibold text-ink">لا توجد خطوات بعد</h3>
                <p className="mt-1.5 max-w-sm text-[13px] leading-6 text-muted">
                  أضف خطوات يدويًا، أو ابدأ تسجيلًا جديدًا من النافذة المنبثقة لتوليد
                  الخطوات تلقائيًا.
                </p>
                <Button variant="soft" size="sm" className="mt-4" onClick={handleAddStep}>
                  <Plus aria-hidden="true" className="size-3.5" />
                  إضافة أول خطوة
                </Button>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {guide.steps.map((step, index) => (
                  <StepCard
                    key={step.id}
                    step={step}
                    index={index}
                    total={guide.steps.length}
                    busy={busy}
                    onInstructionChange={(value) => handleInstructionChange(step.id, value)}
                    onMove={(direction) => handleMove(step.id, direction)}
                    onDelete={() => setPendingDeleteStep(step)}
                    onReplaceScreenshot={(file) => void handleReplaceScreenshot(step.id, file)}
                    onRemoveScreenshot={() => void handleRemoveScreenshot(step.id)}
                    onEditScreenshot={() => void handleOpenAnnotations(step.id)}
                  />
                ))}
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
              <button
                type="button"
                onClick={() => void openPrivacyPage()}
                className="inline-flex items-center gap-1.5 text-[12px] text-muted transition-colors hover:text-primary"
              >
                <Shield aria-hidden="true" className="size-3.5" />
                كيف يتعامل دليل مع بياناتك؟
              </button>
              <Button variant="secondary" size="sm" onClick={() => void handleExport()}>
                <FileDown aria-hidden="true" className="size-3.5" />
                تصدير PDF
              </Button>
            </div>
          </>
        ) : null}
      </main>

      <Dialog
        open={pendingDeleteStep !== null}
        title="حذف هذه الخطوة؟"
        description="سيُحذف نص الخطوة ولقطتها نهائيًا. لا يمكن التراجع عن هذا الإجراء."
        onClose={() => setPendingDeleteStep(null)}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setPendingDeleteStep(null)}>
              إلغاء
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={busy}
              data-autofocus
              onClick={() => {
                if (pendingDeleteStep) void handleDeleteStep(pendingDeleteStep);
              }}
            >
              <Trash2 aria-hidden="true" className="size-3.5" />
              حذف الخطوة
            </Button>
          </>
        }
      />

      {annotationStep ? (
        <AnnotationEditor
          key={`${annotationStep.id}:${annotationStep.screenshotId ?? ''}`}
          step={annotationStep}
          stepNumber={Math.max(
            1,
            (guide?.steps.findIndex((item) => item.id === annotationStep.id) ?? -1) + 1,
          )}
          screenshotId={annotationStep.screenshotId ?? ''}
          initialAnnotations={annotationStep.annotations ?? []}
          onClose={() => setAnnotationStepId(null)}
          onSave={(annotations) => handleSaveAnnotations(annotationStep.id, annotations)}
        />
      ) : null}

      <Toaster toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="surface mx-auto mt-10 flex max-w-md flex-col items-center px-6 py-12 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl bg-[#FDF6E8] text-warning">
        {title.includes('تعذّر') ? (
          <AlertTriangle aria-hidden="true" className="size-5" />
        ) : (
          <FileText aria-hidden="true" className="size-5" />
        )}
      </span>
      <h2 className="mt-3 text-[15px] font-semibold text-ink">{title}</h2>
      <p className="mt-1.5 text-[13px] leading-6 text-muted">{description}</p>
      <Button variant="soft" size="sm" className="mt-4" onClick={onAction}>
        <Check aria-hidden="true" className="size-3.5" />
        {actionLabel}
      </Button>
    </div>
  );
}


