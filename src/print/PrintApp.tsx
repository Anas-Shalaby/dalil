import { AlertTriangle, ArrowRight, FileText, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AnnotatedImage } from '../shared/components/AnnotatedImage';
import { Button } from '../shared/components/Button';
import { LogoMark } from '../shared/components/Logo';
import { loadAllScreenshots } from '../shared/components/ScreenshotView';
import { getGuideIdFromLocation, openLibraryPage } from '../shared/chrome';
import { PRODUCT_NAME } from '../shared/constants';
import { formatDateOnly } from '../shared/format';
import { getGuide } from '../shared/guideService';
import type { Guide } from '../shared/types';

type LoadState = 'loading' | 'ready' | 'missing' | 'error';

export function PrintApp() {
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [images, setImages] = useState<Map<string, string | null>>(new Map());

  useEffect(() => {
    const guideId = getGuideIdFromLocation();
    if (!guideId) {
      setLoadState('missing');
      return;
    }

    getGuide(guideId)
      .then(async (result) => {
        if (!result) {
          setLoadState('missing');
          return;
        }
        setGuide(result);
        const ids = result.steps
          .map((step) => step.screenshotId)
          .filter((id): id is string => Boolean(id));
        if (ids.length > 0) {
          setImages(await loadAllScreenshots(ids));
        }
        setLoadState('ready');
      })
      .catch(() => setLoadState('error'));
  }, []);

  const handlePrint = () => window.print();

  return (
    <div className="print-page min-h-screen bg-canvas py-8">
      <div className="no-print mx-auto mb-6 flex max-w-3xl items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-card">
        <div className="flex items-center gap-2.5">
          <LogoMark size={30} />
          <div>
            <p className="text-[13px] font-semibold text-ink">جاهز للطباعة</p>
            <p className="text-[11px] text-muted">
              اختر «حفظ كـ PDF» من نافذة الطباعة للحصول على ملف.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void openLibraryPage()}
          >
            <ArrowRight aria-hidden="true" className="size-3.5 rotate-180" />
            أدلتي
          </Button>
          <Button variant="primary" size="sm" disabled={loadState !== 'ready'} onClick={handlePrint}>
            <Printer aria-hidden="true" className="size-3.5" />
            طباعة / حفظ PDF
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-[8mm]">
        {loadState === 'loading' ? (
          <div className="print-document rounded-2xl border border-line bg-surface p-10">
            <div className="h-6 w-1/2 animate-pulse rounded bg-[#F0EEF6]" />
            <div className="mt-6 space-y-4">
              <div className="h-40 animate-pulse rounded-xl bg-[#F4F2F9]" />
              <div className="h-40 animate-pulse rounded-xl bg-[#F4F2F9]" />
            </div>
          </div>
        ) : loadState !== 'ready' || !guide ? (
          <div className="print-document rounded-2xl border border-line bg-surface p-10 text-center">
            <AlertTriangle aria-hidden="true" className="mx-auto size-6 text-warning" />
            <h1 className="mt-3 text-[16px] font-semibold text-ink">
              {loadState === 'missing' ? 'لم نجد هذا الدليل' : 'تعذّر تجهيز الطباعة'}
            </h1>
            <p className="mt-1.5 text-[13px] text-muted">
              تأكد من فتح الدليل من مكتبة أدلتك ثم أعد المحاولة.
            </p>
            <Button
              variant="soft"
              size="sm"
              className="no-print mt-4"
              onClick={() => void openLibraryPage()}
            >
              العودة إلى أدلتي
            </Button>
          </div>
        ) : (
          <article className="print-document rounded-2xl border border-line bg-white p-10 shadow-card">
            <header className="border-b border-line pb-6">
              <div className="flex items-center gap-2.5">
                <LogoMark size={30} />
                <span className="text-[13px] font-semibold text-primary-ink">{PRODUCT_NAME}</span>
              </div>
              <h1 className="mt-4 text-3xl font-bold leading-tight text-ink">
                {guide.title}
              </h1>
              {guide.description ? (
                <p className="mt-3 max-w-2xl text-[14px] leading-7 text-muted">
                  {guide.description}
                </p>
              ) : null}
              <p className="mt-3 text-[12px] text-muted">
                عدد الخطوات: {guide.steps.length} · تاريخ الإنشاء: {formatDateOnly(guide.createdAt)}
              </p>
            </header>

            {guide.steps.length === 0 ? (
              <p className="mt-8 flex items-center gap-2 text-[14px] text-muted">
                <FileText aria-hidden="true" className="size-4" />
                لا توجد خطوات في هذا الدليل.
              </p>
            ) : (
              <ol className="mt-8 space-y-6">
                {guide.steps.map((step, index) => {
                  const dataUrl = step.screenshotId
                    ? (images.get(step.screenshotId) ?? null)
                    : null;
                  return (
                    <li
                      key={step.id}
                      className="print-step flex gap-4 border-b border-line/70 pb-6 last:border-0"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-[14px] font-semibold text-white">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-medium leading-7 text-ink">
                          {step.instruction ||
                            (step.captureSource
                              ? 'خطوة موثّقة من سطح المكتب. راجع الصورة أدناه.'
                              : 'تفاعل مع العنصر المحدد.')}
                        </p>
                        {dataUrl ? (
                          step.annotations && step.annotations.length > 0 ? (
                            <AnnotatedImage
                              src={dataUrl}
                              annotations={step.annotations}
                              alt={`لقطة الشاشة للخطوة ${index + 1}`}
                              className="print-image mt-3 h-auto w-auto max-w-full rounded-lg border border-line"
                            />
                          ) : (
                            <img
                              src={dataUrl}
                              alt={`لقطة الشاشة للخطوة ${index + 1}`}
                              className="print-image mt-3 rounded-lg border border-line"
                            />
                          )
                        ) : step.screenshotId || step.screenshotState === 'unavailable' ? (
                          <p className="mt-2 text-[11px] text-muted">
                            {step.screenshotNote ?? 'لم تُوفَّر لقطة لهذه الخطوة.'}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            <footer className="print-footer mt-10 border-t border-line pt-4">
              <p className="text-[11px] text-muted">
                أُنشئ هذا الدليل بواسطة {PRODUCT_NAME} · dalil
              </p>
            </footer>
          </article>
        )}
      </div>

      {loadState === 'ready' && guide ? (
        <div className="no-print mt-8 flex justify-center">
          <Button variant="secondary" size="md" onClick={handlePrint}>
            <Printer aria-hidden="true" className="size-4" />
            طباعة / حفظ PDF
          </Button>
        </div>
      ) : null}
    </div>
  );
}
