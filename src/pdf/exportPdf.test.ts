import { describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';

const JPEG_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAAGAAgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDkaKKK/ej0z//Z';

vi.mock('./renderCanvas', () => ({
  renderPdfPageToCanvas: vi.fn(() => ({
    width: 794,
    height: 1123,
    toDataURL: () => JPEG_DATA_URL,
  })),
  loadImage: vi.fn(async () => null),
  ensurePdfFontsLoaded: vi.fn(async () => undefined),
}));

import {
  buildPdfFromImages,
  exportDocumentToPdf,
  exportErrorMessage,
  MAX_EXPORT_PAGES,
  PdfExportError,
  pdfFileName,
} from './exportPdf';
import { buildGeometry, paginateDocument, buildStepSources } from './document';
import { createDefaultSettings } from './templates';
import type { Guide, GuideStep } from '../shared/types';

function makeGuide(): Guide {
  const steps: GuideStep[] = Array.from({ length: 3 }, (_, index) => ({
    id: `step-${index}`,
    order: index + 1,
    actionType: 'manual',
    instruction: `الخطوة ${index + 1}`,
    elementLabel: '',
    screenshotId: null,
    screenshotState: 'none',
    createdAt: '2026-01-01T00:00:00.000Z',
  }));
  return {
    id: 'g1',
    title: 'دليل',
    description: 'وصف',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    steps,
  };
}

const measure = (text: string) => Math.ceil(text.length / 60) * 24;

function makePlan(guide: Guide, showCover = true) {
  const settings = { ...createDefaultSettings(guide), showCover };
  const geometry = buildGeometry(settings);
  const sources = buildStepSources(guide, new Map(), new Map());
  const pages = paginateDocument({ settings, steps: sources, measureText: measure });
  return { plan: { geometry, pages }, settings };
}

function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('تعذّر قراءة الملف.'));
    reader.readAsArrayBuffer(blob);
  });
}

async function readMagic(blob: Blob): Promise<string> {
  return Buffer.from(await blobToArrayBuffer(blob)).slice(0, 5).toString();
}

describe('PDF assembly', () => {
  it('builds a valid multi-page PDF with the requested page size', async () => {
    const blob = await buildPdfFromImages([
      { dataUrl: JPEG_DATA_URL, widthMm: 210, heightMm: 297 },
      { dataUrl: JPEG_DATA_URL, widthMm: 210, heightMm: 297 },
      { dataUrl: JPEG_DATA_URL, widthMm: 279.4, heightMm: 215.9 },
    ]);
    expect(blob.size).toBeGreaterThan(100);
    expect(await readMagic(blob)).toBe('%PDF-');

    const document = await PDFDocument.load(new Uint8Array(await blobToArrayBuffer(blob)));
    expect(document.getPageCount()).toBe(3);
    const portrait = document.getPage(0);
    expect(portrait.getWidth()).toBeCloseTo(595.28, 0);
    expect(portrait.getHeight()).toBeCloseTo(841.89, 0);
    const landscape = document.getPage(2);
    expect(landscape.getWidth()).toBeGreaterThan(landscape.getHeight());
  });

  it('refuses to build a PDF without pages', async () => {
    await expect(buildPdfFromImages([])).rejects.toThrow(PdfExportError);
    await expect(buildPdfFromImages([])).rejects.toThrow(/لا توجد صفحات/);
  });

  it('renders pages through the canvas renderer and reports progress', async () => {
    const guide = makeGuide();
    const { plan, settings } = makePlan(guide);
    const progress: Array<{ phase: string; current: number; total: number }> = [];
    const blob = await exportDocumentToPdf({
      plan,
      settings,
      direction: 'rtl',
      quality: 'standard',
      onProgress: (next: { phase: string; current: number; total: number }) =>
        progress.push(next),
    });
    expect(await readMagic(blob)).toBe('%PDF-');
    expect(progress).toContainEqual({ phase: 'preparing', current: 0, total: plan.pages.length });
    expect(progress).toContainEqual({
      phase: 'rendering',
      current: plan.pages.length,
      total: plan.pages.length,
    });
    expect(progress).toContainEqual({
      phase: 'finalizing',
      current: plan.pages.length,
      total: plan.pages.length,
    });
  });

  it('blocks oversized documents before rendering any page', async () => {
    const guide = makeGuide();
    const { plan, settings } = makePlan(guide, false);
    const pages = Array.from({ length: MAX_EXPORT_PAGES + 1 }, () => plan.pages[0]);
    const oversized = { ...plan, pages };
    await expect(
      exportDocumentToPdf({
        plan: oversized,
        settings,
        direction: 'rtl',
        quality: 'standard',
      }),
    ).rejects.toThrow(new RegExp(`${MAX_EXPORT_PAGES} صفحة`));
  });

  it('sanitizes the download file name', () => {
    expect(pdfFileName('تقرير العميل')).toBe('تقرير العميل.pdf');
    expect(pdfFileName('دليل.pdf')).toBe('دليل.pdf');
    expect(pdfFileName('  ')).toBe('دليل.pdf');
  });

  it('reports localized export errors and passes through unknown ones', () => {
    expect(exportErrorMessage(new PdfExportError('جرّب صفحة أصغر'))).toBe('جرّب صفحة أصغر');
    expect(exportErrorMessage(new Error('boom'))).toContain('تعذّر إنشاء ملف PDF');
    expect(exportErrorMessage('nope')).toContain('تعذّر إنشاء ملف PDF');
  });
});
