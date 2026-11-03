import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  FileDown,
  FileText,
  Printer,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildGeometry,
  buildStepSources,
  guideDirectionText,
  paginateDocument,
  resolvePdfDirection,
} from '../pdf/document';
import {
  exportErrorMessage,
  MAX_EXPORT_PAGES,
  pdfFileName,
  waitForPageAssets,
  type ExportProgress,
} from '../pdf/exportPdf';
import { createTextMeasurer } from '../pdf/measure';
import { applyPresetSettings } from '../pdf/presets';
import {
  createSettingsForGuide,
  pageDimensions,
  sanitizeFileStem,
} from '../pdf/settings';
import { applyTemplateDefaults } from '../pdf/templates';
import type {
  PdfDesignSettings,
  PdfDocumentPlan,
  PdfImageQuality,
  PdfPreset,
  PdfTemplate,
} from '../pdf/types';
import { Button } from '../shared/components/Button';
import { Logo } from '../shared/components/Logo';
import { Toaster, useToasts } from '../shared/components/Toast';
import { openEditorPage, openLibraryPage } from '../shared/chrome';
import { getGuideIdFromLocation } from '../shared/chrome';
import type { Guide } from '../shared/types';
import { PdfDocumentPage } from '../pdf/components/PdfPage';
import { DocumentPreview } from './DocumentPreview';
import { SettingsPanel } from './SettingsPanel';
import { TemplateGallery } from './TemplateGallery';
import { createChromePdfStudioServices, type PdfStudioServices } from './services';

type LoadState = 'loading' | 'ready' | 'missing' | 'error';

interface ExportSnapshot {
  plan: PdfDocumentPlan;
  settings: PdfDesignSettings;
  direction: 'rtl' | 'ltr';
}

interface StudioAppProps {
  services?: PdfStudioServices;
  initialGuideId?: string | null;
}

const QUALITY_OPTIONS: { value: PdfImageQuality; label: string }[] = [
  { value: 'standard', label: 'قياسية' },
  { value: 'high', label: 'عالية' },
];

export function StudioApp({ services: injectedServices, initialGuideId }: StudioAppProps) {
  const services = useMemo(
    () => injectedServices ?? createChromePdfStudioServices(),
    [injectedServices],
  );
  const [guideId] = useState(() =>
    initialGuideId === undefined ? getGuideIdFromLocation() : initialGuideId,
  );

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [guide, setGuide] = useState<Guide | null>(null);
  const [assets, setAssets] = useState<Awaited<
    ReturnType<PdfStudioServices['loadAssets']>
  > | null>(null);
  const [settings, setSettings] = useState<PdfDesignSettings | null>(null);
  const [presets, setPresets] = useState<PdfPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [presetBusy, setPresetBusy] = useState(false);

  const [zoom, setZoom] = useState(0.62);
  const [currentPage, setCurrentPage] = useState(0);
  const [fileStem, setFileStem] = useState('');
  const [quality, setQuality] = useState<PdfImageQuality>('high');

  const [printStage, setPrintStage] = useState(false);
  const [snapshot, setSnapshot] = useState<ExportSnapshot | null>(null);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<{
    url: string;
    fileName: string;
    pages: number;
  } | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const runToken = useRef(0);
  const stageGuard = useRef(false);
  const exportInFlight = useRef(false);
  const lastExportRef = useRef<string | null>(null);
  const { toasts, push, dismiss } = useToasts();

  useEffect(() => {
    let cancelled = false;
    if (!guideId) {
      setLoadState('missing');
      return;
    }

    setLoadState('loading');
    services
      .loadGuide(guideId)
      .then(async (result) => {
        if (cancelled) return;
        if (!result) {
          setLoadState('missing');
          return;
        }
        const [loadedAssets, savedDesign, savedPresets] = await Promise.all([
          services.loadAssets(result),
          services.loadDesign(guideId).catch(() => null),
          services.loadPresets().catch(() => []),
        ]);
        if (cancelled) return;
        setGuide(result);
        setAssets(loadedAssets);
        setPresets(savedPresets);
        setSettings(createSettingsForGuide(result, savedDesign));
        setFileStem(sanitizeFileStem(result.title));
        setLoadState('ready');
      })
      .catch(() => {
        if (!cancelled) setLoadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [guideId, services]);

  // Persist the guide's design (export-only settings) with a debounce so
  // typing in the panel does not hammer chrome.storage.local.
  useEffect(() => {
    if (!guide || !settings) return;
    const timer = window.setTimeout(() => {
      services.saveDesign(guide.id, settings).catch(() => {
        push({ message: 'تعذّر حفظ إعدادات التصميم محليًا.', tone: 'error' });
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [guide, settings, services, push]);

  useEffect(
    () => () => {
      if (lastExportRef.current) URL.revokeObjectURL(lastExportRef.current);
    },
    [],
  );

  const direction = useMemo<'rtl' | 'ltr'>(() => {
    if (!guide || !settings) return 'rtl';
    return resolvePdfDirection(settings, guideDirectionText(guide));
  }, [guide, settings]);

  const plan = useMemo<PdfDocumentPlan | null>(() => {
    if (!guide || !settings || !assets) return null;
    const geometry = buildGeometry(settings);
    const measurer = createTextMeasurer(settings, geometry, direction);
    try {
      const sources = buildStepSources(guide, assets.screenshots, assets.imageSizes);
      return {
        geometry,
        pages: paginateDocument({
          settings,
          steps: sources,
          measureText: measurer.measure,
        }),
      };
    } finally {
      measurer.dispose();
    }
  }, [guide, settings, assets, direction]);

  useEffect(() => {
    if (!plan) return;
    setCurrentPage((page) => Math.min(page, Math.max(plan.pages.length - 1, 0)));
  }, [plan]);

  const patchSettings = useCallback((patch: Partial<PdfDesignSettings>) => {
    setSettings((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const handleTemplate = useCallback((template: PdfTemplate) => {
    setSettings((current) =>
      current ? applyTemplateDefaults(current, template.id) : current,
    );
  }, []);

  const handleResetTemplate = useCallback(() => {
    setSettings((current) =>
      current ? applyTemplateDefaults(current, current.templateId) : current,
    );
  }, []);

  const reloadPresets = useCallback(async () => {
    try {
      setPresets(await services.loadPresets());
    } catch {
      push({ message: 'تعذّر قراءة المظاهر المحفوظة.', tone: 'error' });
    }
  }, [push, services]);

  const handleSavePreset = useCallback(
    async (name: string) => {
      if (!settings) return;
      setPresetBusy(true);
      try {
        const preset = await services.createPreset(name, settings);
        await reloadPresets();
        setSelectedPresetId(preset.id);
        push({ message: `حُفظ المظهر «${preset.name}».`, tone: 'success' });
      } catch (error) {
        push({
          message: error instanceof Error ? error.message : 'تعذّر حفظ المظهر.',
          tone: 'error',
        });
      } finally {
        setPresetBusy(false);
      }
    },
    [push, reloadPresets, services, settings],
  );

  const handleUpdatePreset = useCallback(async () => {
    if (!settings || !selectedPresetId) return;
    const preset = presets.find((item) => item.id === selectedPresetId);
    if (!preset) return;
    setPresetBusy(true);
    try {
      const updated = await services.updatePreset(selectedPresetId, preset.name, settings);
      if (updated) {
        await reloadPresets();
        push({ message: 'حُدّث المظهر المحفوظ.', tone: 'success' });
      } else {
        push({ message: 'لم يعد هذا المظهر موجودًا.', tone: 'error' });
      }
    } catch (error) {
      push({
        message: error instanceof Error ? error.message : 'تعذّر تحديث المظهر.',
        tone: 'error',
      });
    } finally {
      setPresetBusy(false);
    }
  }, [presets, push, reloadPresets, selectedPresetId, services, settings]);

  const handleDeletePreset = useCallback(async () => {
    if (!selectedPresetId) return;
    setPresetBusy(true);
    try {
      await services.removePreset(selectedPresetId);
      setSelectedPresetId(null);
      await reloadPresets();
      push({ message: 'حُذف المظهر المحفوظ.', tone: 'info' });
    } catch {
      push({ message: 'تعذّر حذف المظهر.', tone: 'error' });
    } finally {
      setPresetBusy(false);
    }
  }, [push, reloadPresets, selectedPresetId, services]);

  const handleApplyPreset = useCallback(() => {
    if (!settings || !selectedPresetId) return;
    const preset = presets.find((item) => item.id === selectedPresetId);
    if (!preset) return;
    setSettings(applyPresetSettings(settings, preset.settings));
    push({ message: `طُبّق المظهر «${preset.name}».`, tone: 'success' });
  }, [presets, push, selectedPresetId, settings]);

  const beginExport = useCallback(() => {
    if (exportInFlight.current || exporting || !settings || !plan || !guide) return;
    const pages = plan.pages.length;
    if (pages > MAX_EXPORT_PAGES) {
      setExportError(
        `المستند كبير جدًا (${pages} صفحة). الحد الآمن ${MAX_EXPORT_PAGES} صفحة. قسّم الدليل إلى أجزاء أصغر.`,
      );
      return;
    }
    exportInFlight.current = true;
    setExportError(null);
    setProgress(null);
    setExporting(true);
    const fileName = pdfFileName(fileStem || settings.documentTitle);
    const token = ++runToken.current;
    services
      .exportPdf({
        plan,
        settings,
        direction,
        quality,
        onProgress: (next: ExportProgress) => setProgress(next),
      })
      .then((blob) => {
        if (token !== runToken.current) return;
        if (lastExportRef.current) URL.revokeObjectURL(lastExportRef.current);
        const url = URL.createObjectURL(blob);
        lastExportRef.current = url;
        setLastExport({ url, fileName, pages });
        push({ message: `جاهز: ${fileName} (${pages} صفحة).`, tone: 'success' });
      })
      .catch((error: unknown) => {
        if (token !== runToken.current) return;
        setExportError(exportErrorMessage(error));
        push({ message: exportErrorMessage(error), tone: 'error' });
      })
      .finally(() => {
        exportInFlight.current = false;
        if (token === runToken.current) {
          setExporting(false);
          setProgress(null);
        }
      });
  }, [direction, exporting, fileStem, guide, plan, push, quality, services, settings]);

  const beginPrint = useCallback(() => {
    if (stageGuard.current || exportInFlight.current || printStage || exporting || !settings || !plan || !guide)
      return;
    stageGuard.current = true;
    setExportError(null);
    setProgress(null);
    setSnapshot({ plan, settings, direction });
    setPrintStage(true);
  }, [direction, exporting, guide, plan, printStage, settings]);

  useEffect(() => {
    if (!printStage || !snapshot) return;
    const token = ++runToken.current;
    const root = stageRef.current;
    if (!root) {
      stageGuard.current = false;
      setPrintStage(false);
      setSnapshot(null);
      return;
    }

    const printableStyle = document.createElement('style');
    printableStyle.textContent = `@page { size: ${pageDimensions(snapshot.settings).widthMm}mm ${pageDimensions(snapshot.settings).heightMm}mm; margin: 0; }`;
    document.head.appendChild(printableStyle);

    const run = async () => {
      try {
        await waitForPageAssets(root);
        if (token !== runToken.current) return;
        await new Promise<void>((resolve) => {
          window.setTimeout(() => {
            services.print();
            resolve();
          }, 60);
        });
        if (token !== runToken.current) return;
        push({ message: 'افتح «حفظ كـ PDF» من نافذة الطباعة.', tone: 'info' });
      } catch {
        if (token !== runToken.current) return;
        setExportError('تعذّر تجهيز نافذة الطباعة. حاول مرة أخرى.');
      } finally {
        printableStyle.remove();
        stageGuard.current = false;
        if (token === runToken.current) {
          setPrintStage(false);
          setSnapshot(null);
        }
      }
    };

    void run();
    return () => {
      printableStyle.remove();
      runToken.current += 1;
    };
  }, [printStage, push, services, snapshot]);

  if (loadState === 'missing' || loadState === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
        <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-card">
          <AlertTriangle aria-hidden="true" className="mx-auto size-6 text-warning" />
          <h1 className="mt-3 text-[16px] font-semibold text-ink">
            {loadState === 'missing' ? 'لم نجد هذا الدليل' : 'تعذّر تجهيز استوديو PDF'}
          </h1>
          <p className="mt-1.5 text-[13px] leading-6 text-muted">
            تأكد من فتح الدليل من مكتبة أدلتك ثم أعد المحاولة.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => void openLibraryPage()}>
              <ArrowRight aria-hidden="true" className="size-3.5 rotate-180" />
              أدلتي
            </Button>
            <Button variant="soft" size="sm" onClick={() => window.location.reload()}>
              إعادة المحاولة
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isReady = loadState === 'ready' && Boolean(guide) && Boolean(settings) && Boolean(plan);
  const totalPages = plan?.pages.length ?? 0;
  const busy = exporting || printStage;

  return (
    <div className="flex h-screen min-h-[620px] flex-col overflow-hidden bg-canvas">
      <div className="no-print flex min-h-0 flex-1 flex-col">
        <header className="pdf-studio-chrome z-20 border-b border-line bg-surface/95 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-3">
              <Logo markSize={30} showWordmark={false} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-semibold text-ink">استوديو PDF</span>
                  <Sparkles aria-hidden="true" className="size-3.5 text-primary" />
                </div>
                <p className="truncate text-[11px] text-muted">
                  {guide?.title ?? 'جارٍ التحميل…'} · {totalPages} صفحة
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="hidden items-center gap-2 md:flex">
                <span className="sr-only">اسم الملف</span>
                <div className="flex items-center rounded-lg border border-line bg-surface">
                  <input
                    type="text"
                    value={fileStem}
                    maxLength={90}
                    onChange={(event) => setFileStem(event.target.value)}
                    aria-label="اسم الملف"
                    placeholder="اسم الملف"
                    className="h-9 w-40 rounded-lg bg-transparent px-2.5 text-[12px] text-ink outline-none"
                  />
                  <span className="border-r border-line px-2 text-[11px] text-muted">.pdf</span>
                </div>
              </label>
              <label className="hidden items-center gap-2 md:flex">
                <span className="text-[11px] text-muted">الجودة</span>
                <select
                  value={quality}
                  onChange={(event) => setQuality(event.target.value as PdfImageQuality)}
                  aria-label="جودة الصور"
                  className="h-9 rounded-lg border border-line bg-surface px-2 text-[11.5px] text-ink outline-none focus:border-primary/50"
                >
                  {QUALITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (guide) void openEditorPage(guide.id);
                }}
                disabled={!guide}
                className="hidden sm:inline-flex"
              >
                المحرر
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => beginPrint()}
                disabled={!isReady || busy}
              >
                <Printer aria-hidden="true" className="size-3.5" />
                <span className="hidden sm:inline">طباعة / PDF متجه</span>
                <span className="sm:hidden">طباعة</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => beginExport()}
                loading={exporting}
                disabled={!isReady || busy || totalPages === 0}
              >
                <FileDown aria-hidden="true" className="size-3.5" />
                تصدير PDF
              </Button>
            </div>
          </div>

          {exporting && progress ? (
            <div
              className="border-t border-line bg-primary-soft/60 px-4 py-2"
              role="status"
              aria-live="polite"
            >
              <div className="mx-auto flex max-w-3xl items-center gap-3">
                <span className="text-[11.5px] font-medium text-primary-ink">
                  {progress.phase === 'preparing'
                    ? 'تجهيز الصفحات…'
                    : progress.phase === 'finalizing'
                      ? 'تجميع ملف PDF…'
                      : `معالجة الصفحة ${progress.current} من ${progress.total}`}
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/70">
                  <span
                    className="block h-full rounded-full bg-primary transition-[width] duration-200"
                    style={{
                      width: `${Math.round((progress.current / Math.max(1, progress.total)) * 100)}%`,
                    }}
                  />
                </span>
              </div>
            </div>
          ) : null}

          {exportError ? (
            <div
              className="flex items-start gap-2 border-t border-[#F3D7DC] bg-[#FDF3F5] px-4 py-2 text-[11.5px] leading-5 text-danger"
              role="alert"
            >
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              <span className="min-w-0 flex-1">{exportError}</span>
              <button
                type="button"
                onClick={() => setExportError(null)}
                className="shrink-0 rounded px-1 text-[11px] font-medium underline"
              >
                إخفاء
              </button>
            </div>
          ) : lastExport ? (
            <div
              className="flex items-center gap-2 border-t border-[#CFE9DC] bg-[#F2FAF6] px-4 py-2 text-[11.5px] text-success"
              role="status"
            >
              <CheckCircle2 aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="min-w-0 flex-1">
                أُنشئ ملف PDF ({lastExport.pages} صفحة). الإعدادات محفوظة لهذا الدليل.
              </span>
              <a
                href={lastExport.url}
                download={lastExport.fileName}
                className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-success shadow-card"
              >
                <Download aria-hidden="true" className="size-3" />
                تنزيل الملف
              </a>
            </div>
          ) : null}
        </header>

        {!guide || !settings || !plan ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-[12px] text-muted shadow-card">
              <FileText aria-hidden="true" className="size-4 animate-pulse text-primary" />
              جارٍ تجهيز المعاينة…
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
            <aside
              className="pdf-studio-controls order-2 w-full shrink-0 overflow-y-auto border-line bg-surface xl:order-1 xl:w-[300px] xl:border-l"
              aria-label="إعدادات المستند"
            >
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <h2 className="text-[12.5px] font-semibold text-ink">تخصيص المستند</h2>
                <span className="text-[10.5px] text-muted">حفظ تلقائي</span>
              </div>
              <SettingsPanel
                settings={settings}
                direction={direction}
                presets={presets}
                selectedPresetId={selectedPresetId}
                presetBusy={presetBusy}
                onChange={patchSettings}
                onResetTemplate={handleResetTemplate}
                onSelectPreset={setSelectedPresetId}
                onApplyPreset={handleApplyPreset}
                onSavePreset={(name) => void handleSavePreset(name)}
                onUpdatePreset={() => void handleUpdatePreset()}
                onDeletePreset={() => void handleDeletePreset()}
                onError={(message) => push({ message, tone: 'error' })}
              />
              <div className="border-t border-line px-4 py-3">
                <p className="flex items-start gap-1.5 text-[10.5px] leading-5 text-muted">
                  <ShieldCheck aria-hidden="true" className="mt-0.5 size-3 shrink-0 text-success" />
                  كل المعالجة محلية: لا يُرفع أي محتوى أو شعار إلى خادم.
                </p>
              </div>
            </aside>

            <main className="order-1 flex min-h-[420px] min-w-0 flex-1 flex-col bg-[#EEECF4] xl:order-2">
              <DocumentPreview
                plan={plan}
                settings={settings}
                direction={direction}
                zoom={zoom}
                currentPage={currentPage}
                onZoomChange={setZoom}
                onPageChange={setCurrentPage}
              />
            </main>

            <aside
              className="order-3 w-full shrink-0 overflow-y-auto border-line bg-surface xl:w-[286px] xl:border-r"
              aria-label="معرض القوالب"
            >
              <div className="sticky top-0 z-10 border-b border-line bg-surface px-4 py-3">
                <h2 className="text-[12.5px] font-semibold text-ink">معرض القوالب</h2>
                <p className="mt-0.5 text-[10.5px] leading-4 text-muted">
                  ستة قوالب، لكل منها هوية وتخطيط مستقل.
                </p>
              </div>
              <div className="p-3">
                <TemplateGallery
                  selected={settings.templateId}
                  direction={direction}
                  onSelect={handleTemplate}
                />
              </div>
              <div className="mx-3 mb-4 rounded-xl border border-line bg-[#FBFAFE] p-3">
                <p className="text-[10.5px] leading-5 text-muted">
                  المعاينة مبنية من نفس صفحات ملف PDF النهائي، لذلك تعكس الهوامش
                  والخطوط وحدود الصفحات بدقة.
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>

      {printStage && snapshot ? (
        <div
          ref={stageRef}
          className="pdf-print-root"
        >
          {snapshot.plan.pages.map((page, index) => (
            <PdfDocumentPage
              key={`${page.kind}-${index}`}
              page={page}
              settings={snapshot.settings}
              geometry={snapshot.plan.geometry}
              direction={snapshot.direction}
              eagerImages
              pageIndex={index}
            />
          ))}
        </div>
      ) : null}

      <Toaster toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
