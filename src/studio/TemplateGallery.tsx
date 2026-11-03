import { Check } from 'lucide-react';
import { memo, useMemo } from 'react';
import { buildGeometry } from '../pdf/document';
import { PdfDocumentPage } from '../pdf/components/PdfPage';
import { applyTemplateDefaults, createDefaultSettings, PDF_TEMPLATES } from '../pdf/templates';
import type { PdfDesignSettings, PdfPagePlan, PdfTemplate } from '../pdf/types';
import { cn } from '../shared/cn';

const THUMB_SCALE = 0.19;

export const TemplateThumbnail = memo(function TemplateThumbnail({
  template,
  direction = 'rtl',
}: {
  template: PdfTemplate;
  direction?: 'rtl' | 'ltr';
}) {
  const { settings, geometry, page } = useMemo(() => {
    const base = createDefaultSettings(
      {
        title: 'دليل العمليات',
        description: 'خطوات واضحة ومنظمة',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      template.id,
    );
    const next: PdfDesignSettings = {
      ...applyTemplateDefaults(base, template.id),
      author: 'فريق دليل',
      company: 'شركة دليل',
      documentDate: '2026-01-01',
    };
    const planPage: PdfPagePlan = {
      kind: 'cover',
      index: 0,
      pageNumber: null,
      totalPages: 3,
    };
    return { settings: next, geometry: buildGeometry(next), page: planPage };
  }, [template.id]);

  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden rounded-md border border-line bg-white"
      style={{
        width: Math.round(geometry.widthPx * THUMB_SCALE),
        height: Math.round(geometry.heightPx * THUMB_SCALE),
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: geometry.widthPx,
          height: geometry.heightPx,
          transform: `scale(${THUMB_SCALE})`,
          transformOrigin: 'top right',
        }}
      >
        <PdfDocumentPage
          page={page}
          settings={settings}
          geometry={geometry}
          direction={direction}
          pageIndex={0}
        />
      </div>
    </div>
  );
});

export function TemplateGallery({
  selected,
  direction,
  onSelect,
}: {
  selected: PdfDesignSettings['templateId'];
  direction: 'rtl' | 'ltr';
  onSelect: (template: PdfTemplate) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {PDF_TEMPLATES.map((template) => {
        const isSelected = template.id === selected;
        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template)}
            aria-pressed={isSelected}
            aria-label={`استخدام قالب ${template.name}`}
            className={cn(
              'group relative flex flex-col gap-2 rounded-xl border bg-surface p-2 text-right transition-all',
              isSelected
                ? 'border-primary shadow-[0_0_0_3px_rgba(116,64,233,0.12)]'
                : 'border-line hover:border-[#D8D2E7] hover:shadow-card',
            )}
          >
            <div className="flex justify-center overflow-hidden rounded-md bg-[#F6F4FB] p-1.5">
              <TemplateThumbnail template={template} direction={direction} />
            </div>
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <p className="truncate text-[11.5px] font-semibold text-ink">{template.name}</p>
                <p className="truncate text-[10px] text-muted">{template.tagline}</p>
              </div>
              {isSelected ? (
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                  <Check aria-hidden="true" className="size-2.5" />
                </span>
              ) : null}
            </div>
            <div className="flex gap-1" aria-hidden="true">
              {template.swatches.map((swatch) => (
                <span
                  key={swatch}
                  className="size-2.5 rounded-full border border-black/5"
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
