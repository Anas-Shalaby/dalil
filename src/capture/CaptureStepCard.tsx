import { AppWindow, Monitor, Square, Trash2 } from 'lucide-react';
import { IconButton } from '../shared/components/IconButton';
import { ScreenshotView } from '../shared/components/ScreenshotView';
import { MAX_INSTRUCTION_LENGTH } from '../shared/constants';
import type { CaptureSurface, GuideStep } from '../shared/types';

const SURFACE_LABEL: Record<CaptureSurface, string> = {
  window: 'نافذة',
  screen: 'شاشة',
  tab: 'تبويب',
  unknown: 'سطح المكتب',
};

interface CaptureStepCardProps {
  step: GuideStep;
  index: number;
  busy: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
  onDelete: () => void;
}

export function CaptureStepCard({
  step,
  index,
  busy,
  onChange,
  onBlur,
  onDelete,
}: CaptureStepCardProps) {
  const surface = step.captureSource ?? 'unknown';
  const SurfaceIcon = surface === 'screen' ? Monitor : AppWindow;

  return (
    <article className="surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-[13px] font-semibold text-primary-ink"
            aria-hidden="true"
          >
            {index + 1}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-[#F4F2F9] px-2 py-1 text-[11px] font-medium text-muted">
            <SurfaceIcon aria-hidden="true" className="size-3" />
            {SURFACE_LABEL[surface]}
          </span>
        </div>
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

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
        <ScreenshotView
          screenshotId={step.screenshotId}
          alt={`لقطة الخطوة ${index + 1}`}
          className="w-full shrink-0 rounded-xl border border-line sm:w-52"
          imgClassName="max-h-36"
          eager={index < 3}
        />

        <div className="min-w-0 flex-1">
          <label htmlFor={`capture-instruction-${step.id}`} className="eyebrow">
            وصف الخطوة
          </label>
          <textarea
            id={`capture-instruction-${step.id}`}
            value={step.instruction}
            maxLength={MAX_INSTRUCTION_LENGTH}
            rows={3}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            placeholder="اكتب ماذا فعلت في هذه الخطوة…"
            className="field mt-1.5 resize-none leading-6"
          />
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted/80">
            <span className="inline-flex items-center gap-1">
              <Square aria-hidden="true" className="size-2.5" />
              لقطة محفوظة محليًا
            </span>
            <span>
              {step.instruction.length}/{MAX_INSTRUCTION_LENGTH}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
