import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { PdfDocumentPage } from '../pdf/components/PdfPage';
import type { PdfDesignSettings, PdfDocumentPlan, PdfPagePlan } from '../pdf/types';
import { IconButton } from '../shared/components/IconButton';

const ZOOM_MIN = 0.35;
const ZOOM_MAX = 1;
const ZOOM_STEP = 0.05;

interface DocumentPreviewProps {
  plan: PdfDocumentPlan;
  settings: PdfDesignSettings;
  direction: 'rtl' | 'ltr';
  zoom: number;
  currentPage: number;
  onZoomChange: (zoom: number) => void;
  onPageChange: (pageIndex: number) => void;
}

function pageLabel(page: PdfPagePlan): string {
  return page.kind === 'cover' ? 'الغلاف' : `صفحة ${page.pageNumber}`;
}

export function DocumentPreview({
  plan,
  settings,
  direction,
  zoom,
  currentPage,
  onZoomChange,
  onPageChange,
}: DocumentPreviewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollingToPage = useRef(false);

  const pages = plan.pages;
  const safeCurrent = Math.min(Math.max(currentPage, 0), Math.max(pages.length - 1, 0));

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const target = container.querySelector<HTMLElement>(
      `[data-preview-page="${safeCurrent}"]`,
    );
    if (!target) return;
    scrollingToPage.current = true;
    if (typeof container.scrollTo === 'function') {
      container.scrollTo({ top: Math.max(0, target.offsetTop - 16), behavior: 'auto' });
    } else {
      try {
        container.scrollTop = Math.max(0, target.offsetTop - 16);
      } catch {
        // jsdom has no layout; ignore scroll positioning in tests.
      }
    }
    const timer = window.setTimeout(() => {
      scrollingToPage.current = false;
    }, 120);
    return () => window.clearTimeout(timer);
  }, [safeCurrent, zoom, pages.length]);

  const handleScroll = () => {
    if (scrollingToPage.current) return;
    const container = scrollRef.current;
    if (!container) return;
    const marker = container.scrollTop + container.clientHeight * 0.3;
    const items = Array.from(
      container.querySelectorAll<HTMLElement>('[data-preview-page]'),
    );
    let nearest = 0;
    for (const item of items) {
      const index = Number(item.dataset.previewPage);
      if (Number.isFinite(index) && item.offsetTop <= marker) nearest = index;
    }
    if (nearest !== safeCurrent) onPageChange(nearest);
  };

  const goTo = (index: number) => {
    const next = Math.min(Math.max(index, 0), pages.length - 1);
    onPageChange(next);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface/80 px-4 py-2">
        <div className="flex items-center gap-1.5">
          <IconButton
            label="الصفحة السابقة"
            variant="ghost"
            size="sm"
            disabled={safeCurrent <= 0}
            onClick={() => goTo(safeCurrent - 1)}
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </IconButton>
          <span className="min-w-[104px] text-center text-[11.5px] tabular-nums text-muted">
            {pages.length > 0 ? (
              <>
                <span className="font-semibold text-ink">{safeCurrent + 1}</span> من{' '}
                {pages.length}
              </>
            ) : (
              'لا صفحات'
            )}
          </span>
          <IconButton
            label="الصفحة التالية"
            variant="ghost"
            size="sm"
            disabled={safeCurrent >= pages.length - 1}
            onClick={() => goTo(safeCurrent + 1)}
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </IconButton>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] text-muted sm:inline">معاينة مباشرة</span>
          <div className="flex items-center gap-1 rounded-lg border border-line bg-surface p-0.5">
            <IconButton
              label="تصغير المعاينة"
              variant="ghost"
              size="sm"
              disabled={zoom <= ZOOM_MIN}
              onClick={() => onZoomChange(Math.max(ZOOM_MIN, Number((zoom - ZOOM_STEP).toFixed(2))))}
            >
              <Minus aria-hidden="true" className="size-3.5" />
            </IconButton>
            <span className="w-10 text-center text-[11px] tabular-nums text-muted">
              {Math.round(zoom * 100)}٪
            </span>
            <IconButton
              label="تكبير المعاينة"
              variant="ghost"
              size="sm"
              disabled={zoom >= ZOOM_MAX}
              onClick={() => onZoomChange(Math.min(ZOOM_MAX, Number((zoom + ZOOM_STEP).toFixed(2))))}
            >
              <Plus aria-hidden="true" className="size-3.5" />
            </IconButton>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="pdf-preview-scroll relative min-h-0 flex-1 overflow-auto bg-[#EEECF4] px-4 py-5"
        tabIndex={0}
        aria-label="معاينة صفحات المستند"
      >
        {pages.length === 0 ? (
          <p className="py-16 text-center text-[12.5px] text-muted">لا توجد صفحات لعرضها.</p>
        ) : (
          <div className="relative mx-auto flex w-fit flex-col items-center gap-5">
            {pages.map((page, index) => (
              <div
                key={`${page.kind}-${index}`}
                data-preview-page={index}
                className="flex flex-col items-center gap-1.5"
                style={{
                  width: Math.round(plan.geometry.widthPx * zoom),
                }}
              >
                <div
                  className="relative shrink-0 overflow-hidden bg-white shadow-[0_10px_28px_-16px_rgba(25,24,39,0.4)] ring-1 ring-black/5"
                  style={{
                    width: Math.round(plan.geometry.widthPx * zoom),
                    height: Math.round(plan.geometry.heightPx * zoom),
                  }}
                >
                  <div
                    style={{
                      width: plan.geometry.widthPx,
                      height: plan.geometry.heightPx,
                      transform: `scale(${zoom})`,
                      transformOrigin: 'top left',
                    }}
                  >
                    <PdfDocumentPage
                      page={page}
                      settings={settings}
                      geometry={plan.geometry}
                      direction={direction}
                      pageIndex={index}
                    />
                  </div>
                </div>
                <span
                  className={
                    index === safeCurrent
                      ? 'text-[10.5px] font-medium text-primary'
                      : 'text-[10.5px] text-muted'
                  }
                >
                  {pageLabel(page)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
