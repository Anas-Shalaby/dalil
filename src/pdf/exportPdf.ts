import { ensurePdfFontsLoaded, loadImage, renderPdfPageToCanvas } from './renderCanvas';
import type { PdfImageQuality } from './types';
import type {
  PdfDesignSettings,
  PdfDocumentPlan,
} from './types';

export interface PdfPageSizeMm {
  widthMm: number;
  heightMm: number;
}

export interface ExportProgress {
  phase: 'preparing' | 'rendering' | 'finalizing';
  current: number;
  total: number;
}

export interface PdfImagePage {
  dataUrl: string;
  widthMm: number;
  heightMm: number;
}

const JPEG_QUALITY: Record<PdfImageQuality, number> = {
  standard: 0.88,
  high: 0.94,
};

// A single-page A4 raster at high quality is roughly 2–4 MB of canvas data.
// Beyond this limit the tab risks running out of memory, so we stop early
// with a helpful message instead of crashing.
export const MAX_EXPORT_PAGES = 80;

export function exportErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.startsWith('DALIL_PDF:')) {
    return error.message.slice('DALIL_PDF:'.length).trim();
  }
  return 'تعذّر إنشاء ملف PDF. حاول مرة أخرى، أو استخدم «طباعة / PDF متجه» من نافذة Chrome.';
}

export class PdfExportError extends Error {
  constructor(message: string) {
    super(`DALIL_PDF:${message}`);
    this.name = 'PdfExportError';
  }
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      return;
    }
    setTimeout(resolve, 16);
  });
}

/**
 * Waits for the DOM preview to finish loading fonts and images. Used by the
 * vector print path so the browser has everything before showing the print
 * dialog. It is intentionally generic.
 */
export async function waitForPageAssets(root: HTMLElement): Promise<void> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready.catch(() => undefined);
  }

  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    images.map(async (image) => {
      if (typeof image.decode === 'function' && image.complete) {
        await image.decode().catch(() => undefined);
        return;
      }
      if (image.complete) return;
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        image.addEventListener('load', done, { once: true });
        image.addEventListener('error', done, { once: true });
        setTimeout(done, 1_200);
      });
    }),
  );

  const canvases = Array.from(root.querySelectorAll('canvas'));
  if (canvases.length > 0) {
    const started = Date.now();
    while (canvases.some((canvas) => canvas.width === 0) && Date.now() - started < 2_000) {
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
  }

  await nextFrame();
}

/**
 * Collects every image the canvas renderer will need and resolves them to
 * <img> elements. Image load failures are non-fatal — pages render without
 * the missing image instead of crashing the export.
 */
async function preloadImages(
  plan: PdfDocumentPlan,
  settings: PdfDesignSettings,
): Promise<Map<string, HTMLImageElement>> {
  const dataUrls = new Set<string>();
  for (const page of plan.pages) {
    if (page.kind !== 'content') continue;
    for (const block of page.blocks) {
      if (block.kind === 'step' && block.image?.dataUrl) {
        dataUrls.add(block.image.dataUrl);
      }
    }
  }
  if (settings.logoDataUrl) dataUrls.add(settings.logoDataUrl);

  const images = new Map<string, HTMLImageElement>();
  await Promise.all(
    Array.from(dataUrls).map(async (dataUrl) => {
      const image = await loadImage(dataUrl);
      if (image) images.set(dataUrl, image);
    }),
  );
  return images;
}

export interface ExportDocumentInput {
  plan: PdfDocumentPlan;
  settings: PdfDesignSettings;
  direction: 'rtl' | 'ltr';
  quality: PdfImageQuality;
  onProgress?: (progress: ExportProgress) => void;
}

export async function exportDocumentToPdf(input: ExportDocumentInput): Promise<Blob> {
  const { plan, settings, direction, quality, onProgress } = input;
  const { pages, geometry } = plan;

  if (pages.length === 0) throw new PdfExportError('لا توجد صفحات لتصديرها.');
  if (pages.length > MAX_EXPORT_PAGES) {
    throw new PdfExportError(
      `المستند كبير جدًا (${pages.length} صفحة). الحد الآمن ${MAX_EXPORT_PAGES} صفحة. قسّم الدليل إلى أجزاء أصغر ثم أعد المحاولة.`,
    );
  }

  onProgress?.({ phase: 'preparing', current: 0, total: pages.length });

  // Make sure fonts are available before drawing text; the canvas renderer
  // uses the same font stacks as the preview.
  await ensurePdfFontsLoaded();

  const images = await preloadImages(plan, settings);
  const imagePages: PdfImagePage[] = [];

  for (let index = 0; index < pages.length; index += 1) {
    let canvas: HTMLCanvasElement;
    try {
      canvas = renderPdfPageToCanvas({
        page: pages[index],
        settings,
        geometry,
        direction,
        images,
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message === 'تعذّر إنشاء مساحة الرسم للتصدير.'
          ? 'تعذّر تجهيز مساحة الرسم المحلية للتصدير.'
          : 'تعذّر رسم إحدى الصفحات.';
      throw new PdfExportError(message);
    }

    try {
      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY[quality]);
      if (!dataUrl || dataUrl.length < 100) {
        throw new PdfExportError('تعذّر تجهيز صورة إحدى الصفحات.');
      }
      imagePages.push({
        dataUrl,
        widthMm: geometry.widthMm,
        heightMm: geometry.heightMm,
      });
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
    onProgress?.({ phase: 'rendering', current: index + 1, total: pages.length });
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  onProgress?.({ phase: 'finalizing', current: pages.length, total: pages.length });
  return buildPdfFromImages(imagePages, settings.documentTitle || 'دليل');
}

/**
 * Builds a PDF from already-rendered page images. Kept separate from the
 * renderer so page assembly can be tested without a canvas implementation.
 */
function base64ToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',');
  const payload = comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
  if (typeof atob === 'function') {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }
  throw new PdfExportError('تعذّر فك ترميز صورة صفحة.');
}

export async function buildPdfFromImages(
  pages: PdfImagePage[],
  title = 'دليل',
): Promise<Blob> {
  if (pages.length === 0) throw new PdfExportError('لا توجد صفحات لتصديرها.');

  let PDFDocument: typeof import('pdf-lib').PDFDocument | undefined;
  try {
    ({ PDFDocument } = await import('pdf-lib'));
  } catch {
    throw new PdfExportError('تعذّر تحميل محرك PDF المحلي.');
  }

  const pdf = await PDFDocument.create();
  pdf.setTitle(title);

  for (const page of pages) {
    if (!page.dataUrl.startsWith('data:image/jpeg')) {
      throw new PdfExportError('صيغة صورة صفحة غير مدعومة في التصدير.');
    }
    let image;
    try {
      image = await pdf.embedJpg(base64ToBytes(page.dataUrl));
    } catch {
      throw new PdfExportError('تعذّر تجهيز صورة إحدى الصفحات للإدراج.');
    }
    const width = page.widthMm * (72 / 25.4);
    const height = page.heightMm * (72 / 25.4);
    const added = pdf.addPage([width, height]);
    added.drawImage(image, { x: 0, y: 0, width, height });
  }

  const bytes = await pdf.save();
  return new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
}

export function pdfFileName(input: string): string {
  const stem = input.trim().replace(/\.pdf$/i, '').trim() || 'دليل';
  return `${stem}.pdf`;
}
