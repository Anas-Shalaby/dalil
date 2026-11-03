import {
  ArrowDown,
  ArrowUp,
  Camera,
  CameraOff,
  ImagePlus,
  Monitor,
  MousePointerClick,
  PencilLine,
  Trash2,
  Type,
} from 'lucide-react';
import { useRef, type ChangeEvent } from 'react';
import { IconButton } from '../shared/components/IconButton';
import { ScreenshotView } from '../shared/components/ScreenshotView';
import { cn } from '../shared/cn';
import { MAX_INSTRUCTION_LENGTH } from '../shared/constants';
import type { ActionType, GuideStep } from '../shared/types';

const ACTION_LABELS: Record<ActionType, string> = {
  click: 'نقرة',
  input: 'إدخال',
  select: 'اختيار',
  toggle: 'تحديد',
  manual: 'خطوة يدوية',
};

function ActionIcon({ actionType }: { actionType: ActionType }) {
  if (actionType === 'input') return <Type aria-hidden="true" className="size-3" />;
  if (actionType === 'select') return <ArrowDown aria-hidden="true" className="size-3" />;
  if (actionType === 'toggle') return <ArrowUp aria-hidden="true" className="size-3" />;
  return <MousePointerClick aria-hidden="true" className="size-3" />;
}

interface StepCardProps {
  step: GuideStep;
  index: number;
  total: number;
  busy: boolean;
  onInstructionChange: (value: string) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
  onReplaceScreenshot: (file: File) => void;
  onRemoveScreenshot: () => void;
  onEditScreenshot: () => void;
}

export function StepCard({
  step,
  index,
  total,
  busy,
  onInstructionChange,
  onMove,
  onDelete,
  onReplaceScreenshot,
  onRemoveScreenshot,
  onEditScreenshot,
}: StepCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canMoveUp = index > 0;
  const canMoveDown = index < total - 1;
  const hasScreenshot = Boolean(step.screenshotId);
  const showNote = !hasScreenshot && Boolean(step.screenshotNote);
  const annotationCount = step.annotations?.length ?? 0;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onReplaceScreenshot(file);
    event.target.value = '';
  };

  return (
    <article
      className="surface p-4 transition-shadow focus-within:shadow-pop"
      aria-labelledby={`step-title-${step.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-[13px] font-semibold text-primary-ink"
            aria-hidden="true"
          >
            {index + 1}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-[#F4F2F9] px-2 py-1 text-[11px] font-medium text-muted">
            {step.captureSource ? (
              <>
                <Monitor aria-hidden="true" className="size-3" />
                {step.captureSource === 'screen'
                  ? 'لقطة شاشة كاملة'
                  : step.captureSource === 'tab'
                    ? 'لقطة تبويب'
                    : 'لقطة من الكمبيوتر'}
              </>
            ) : (
              <>
                <ActionIcon actionType={step.actionType} />
                {ACTION_LABELS[step.actionType]}
              </>
            )}
          </span>
          {step.elementLabel ? (
            <span
              className="hidden truncate text-[11px] text-muted/90 sm:block"
              title={step.elementLabel}
            >
              {step.elementLabel}
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <IconButton
            label="تحريك الخطوة للأعلى"
            size="sm"
            variant="ghost"
            disabled={!canMoveUp || busy}
            onClick={() => onMove(-1)}
          >
            <ArrowUp aria-hidden="true" className="size-3.5" />
          </IconButton>
          <IconButton
            label="تحريك الخطوة للأسفل"
            size="sm"
            variant="ghost"
            disabled={!canMoveDown || busy}
            onClick={() => onMove(1)}
          >
            <ArrowDown aria-hidden="true" className="size-3.5" />
          </IconButton>
          <IconButton
            label="حذف الخطوة"
            size="sm"
            variant="danger"
            disabled={busy}
            onClick={onDelete}
          >
            <Trash2 aria-hidden="true" className="size-3.5" />
          </IconButton>
        </div>
      </div>

      <label htmlFor={`step-instruction-${step.id}`} className="sr-only">
        {`تعليمات الخطوة ${index + 1}`}
      </label>
      <textarea
        id={`step-instruction-${step.id}`}
        value={step.instruction}
        maxLength={MAX_INSTRUCTION_LENGTH}
        onChange={(event) => onInstructionChange(event.target.value)}
        placeholder={
          step.captureSource
            ? 'اكتب وصف هذه الخطوة من البرنامج…'
            : 'اكتب تعليمات هذه الخطوة بالعربية…'
        }
        rows={2}
        className={cn('field mt-3 resize-none leading-6', !step.instruction && 'text-muted')}
      />

      <div className="mt-3 flex items-start gap-3">
        {hasScreenshot ? (
          <ScreenshotView
            screenshotId={step.screenshotId}
            annotations={step.annotations}
            alt={`لقطة الشاشة للخطوة ${index + 1}`}
            className="w-40 shrink-0 rounded-xl border border-line sm:w-48"
            imgClassName="max-h-32"
          />
        ) : null}

        <div className="min-w-0 flex-1">
          {showNote ? (
            <p className="flex items-start gap-1.5 rounded-lg bg-[#FDF6E8] px-2.5 py-2 text-[11px] leading-5 text-warning">
              <CameraOff aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              {step.screenshotNote}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {hasScreenshot ? (
              <button
                type="button"
                disabled={busy}
                onClick={onEditScreenshot}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary-soft px-2.5 py-1.5 text-[11px] font-semibold text-primary-ink transition-colors hover:bg-[#E9E0FD] disabled:opacity-50"
              >
                <PencilLine aria-hidden="true" className="size-3.5" />
                تعديل الصورة
                {annotationCount > 0 ? (
                  <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-primary-ink">
                    {annotationCount}
                  </span>
                ) : null}
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] font-medium text-muted transition-colors hover:border-[#DCD8E8] hover:text-ink disabled:opacity-50"
            >
              <ImagePlus aria-hidden="true" className="size-3.5" />
              {hasScreenshot ? 'استبدال اللقطة' : 'إضافة لقطة'}
            </button>
            {hasScreenshot ? (
              <button
                type="button"
                disabled={busy}
                onClick={onRemoveScreenshot}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-muted transition-colors hover:bg-[#FCEFF1] hover:text-danger disabled:opacity-50"
              >
                <Camera aria-hidden="true" className="size-3.5" />
                إزالة اللقطة
              </button>
            ) : null}
            <span className="text-[11px] text-muted/80">
              {step.instruction.length}/{MAX_INSTRUCTION_LENGTH}
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>
    </article>
  );
}
