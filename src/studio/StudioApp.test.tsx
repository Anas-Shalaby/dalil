import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Guide, GuideStep } from '../shared/types';
import {
  deletePdfPreset,
  loadPdfDesign,
  loadPdfPresets,
  savePdfDesign,
  savePdfPreset,
  updatePdfPreset,
} from '../pdf/presets';
import { StudioApp } from './StudioApp';
import type { PdfStudioServices } from './services';

const LOGO_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lVf1WQAAAABJRU5ErkJggg==';

vi.mock('../pdf/logo', async () => {
  const actual = await vi.importActual<typeof import('../pdf/logo')>('../pdf/logo');
  return {
    ...actual,
    fileToLogoDataUrl: vi.fn(async () => LOGO_DATA_URL),
  };
});

const JPEG = 'data:image/jpeg;base64,QUJD';

function steps(count: number): GuideStep[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `step-${index}`,
    order: index + 1,
    actionType: 'manual' as const,
    instruction: `الخطوة ${index + 1}: اضغط على العنصر ثم تابع.`,
    elementLabel: `زر ${index + 1}`,
    screenshotId: `shot-${index}`,
    screenshotState: 'captured' as const,
    createdAt: '2026-01-01T00:00:00.000Z',
  }));
}

const guide: Guide = {
  id: 'guide-1',
  title: 'دليل نشر التطبيق',
  description: 'خطوات النشر من البداية إلى النهاية',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  source: 'browser',
  steps: steps(8),
};

const assets = {
  screenshots: new Map(
    guide.steps.map((step) => [step.screenshotId as string, { dataUrl: JPEG }]),
  ),
  imageSizes: new Map(
    guide.steps.map((step) => [step.screenshotId as string, { width: 1600, height: 900 }]),
  ),
};

const pdfBytes = new Blob(['%PDF-1.4 fake test pdf'], { type: 'application/pdf' });

function makeServices(overrides: Partial<PdfStudioServices> = {}): PdfStudioServices {
  return {
    loadGuide: vi.fn(async (id: string) => (id === 'guide-1' ? guide : null)),
    loadAssets: vi.fn(async () => assets),
    loadDesign: async (id) => loadPdfDesign(id),
    saveDesign: async (id, settings) => savePdfDesign(id, settings),
    loadPresets: async () => loadPdfPresets(),
    createPreset: async (name, settings) => savePdfPreset(name, settings),
    updatePreset: async (id, name, settings) => updatePdfPreset(id, name, settings),
    removePreset: async (id) => deletePdfPreset(id),
    exportPdf: vi.fn(async () => pdfBytes),
    print: vi.fn(),
    ...overrides,
  };
}

describe('PDF Studio', () => {
  beforeEach(() => {
    let sequence = 0;
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => `blob:mock-${++sequence}`),
      writable: true,
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      writable: true,
      configurable: true,
    });
  });

  it('shows a helpful state when the guide does not exist', async () => {
    const services = makeServices({ loadGuide: vi.fn(async () => null) });
    render(<StudioApp services={services} initialGuideId="missing" />);
    expect(await screen.findByText('لم نجد هذا الدليل')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /أدلتي/ })).toBeInTheDocument();
  });

  it('opens the studio with six templates, multi-page preview and Arabic chrome', async () => {
    const services = makeServices();
    const { container } = render(<StudioApp services={services} initialGuideId="guide-1" />);
    expect(await screen.findByText('استوديو PDF')).toBeInTheDocument();
    expect((await screen.findAllByText('دليل نشر التطبيق')).length).toBeGreaterThan(0);

    expect(screen.getAllByRole('button', { name: /استخدام قالب/ })).toHaveLength(6);
    const preview = container.querySelector('.pdf-preview-scroll');
    expect(preview?.querySelectorAll('[data-pdf-page]').length).toBeGreaterThan(1);
    expect(preview?.querySelector('[data-page-kind="cover"]')).not.toBeNull();
  });

  it('applies template switching, colour changes, toggles and screenshot styles', async () => {
    const services = makeServices();
    const { container } = render(<StudioApp services={services} initialGuideId="guide-1" />);
    await screen.findByText('استوديو PDF');

    const tutorial = screen.getByRole('button', { name: /استخدام قالب دليل تعليمي/ });
    fireEvent.click(tutorial);
    expect(tutorial).toHaveAttribute('aria-pressed', 'true');

    const colorHex = screen.getByLabelText('أساسي — قيمة HEX');
    fireEvent.change(colorHex, { target: { value: '#112233' } });
    await waitFor(() => {
      const page = container.querySelector(
        '.pdf-preview-scroll [data-pdf-page]',
      ) as HTMLElement;
      expect(page.getAttribute('style')).toContain('#112233');
    });

    fireEvent.click(screen.getByRole('checkbox', { name: 'إظهار صفحة الغلاف' }));
    await waitFor(() => {
      const preview = container.querySelector('.pdf-preview-scroll');
      expect(preview?.querySelector('[data-page-kind="cover"]')).toBeNull();
    });

    fireEvent.change(screen.getByLabelText('نمط عرض اللقطات'), {
      target: { value: 'full' },
    });
    await waitFor(() => {
      expect(container.querySelector('.pdf-shot-wrap--full')).not.toBeNull();
    });

    fireEvent.change(screen.getByLabelText('نمط عرض اللقطات'), {
      target: { value: 'framed' },
    });
    await waitFor(() => {
      expect(container.querySelector('.pdf-shot-wrap--framed')).not.toBeNull();
    });
  });

  it('exports a PDF once for a double click, reports progress and keeps guide data untouched', async () => {
    const services = makeServices();
    render(<StudioApp services={services} initialGuideId="guide-1" />);
    await screen.findByText('استوديو PDF');

    const titleBefore = guide.title;
    const stepsBefore = guide.steps.length;

    const exportButton = screen.getByRole('button', { name: /تصدير PDF/ });
    fireEvent.click(exportButton);
    fireEvent.click(exportButton);

    await screen.findByText(/أُنشئ ملف PDF/, undefined, { timeout: 4000 });
    expect(services.exportPdf).toHaveBeenCalledTimes(1);

    const input = (services.exportPdf as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      plan: { pages: unknown[]; geometry: { widthMm: number; heightMm: number } };
      direction: string;
      quality: string;
    };
    expect(input.plan.pages.length).toBeGreaterThan(1);
    expect(input.plan.geometry.widthMm).toBe(210);
    expect(input.plan.geometry.heightMm).toBe(297);
    expect(input.direction).toBe('rtl');
    expect(input.quality).toBe('high');

    expect(guide.title).toBe(titleBefore);
    expect(guide.steps.length).toBe(stepsBefore);
  });

  it('saves a design preset through chrome.storage.local and applies it over changed settings', async () => {
    const services = makeServices();
    render(<StudioApp services={services} initialGuideId="guide-1" />);
    await screen.findByText('استوديو PDF');

    const colorHex = screen.getByLabelText('أساسي — قيمة HEX');
    fireEvent.change(colorHex, { target: { value: '#123456' } });

    fireEvent.change(screen.getByLabelText('اسم المظهر الجديد'), {
      target: { value: 'هوية زرقاء' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^حفظ$/ }));

    const presetSelect = (await screen.findByLabelText('مظهر محفوظ')) as HTMLSelectElement;
    await waitFor(() => {
      expect(presetSelect.textContent).toContain('هوية زرقاء');
    });

    fireEvent.change(colorHex, { target: { value: '#ff0000' } });

    const presetValue = Array.from(presetSelect.options).find(
      (option) => option.value !== '',
    )?.value;
    expect(presetValue).toBeTruthy();
    fireEvent.change(presetSelect, { target: { value: presetValue } });
    fireEvent.click(screen.getByRole('button', { name: /^تحميل$/ }));

    await waitFor(() => {
      expect((colorHex as HTMLInputElement).value).toBe('#123456');
    });
  });

  it('uploads a logo locally and shows it in the document chrome', async () => {
    const services = makeServices();
    const { container } = render(
      <StudioApp services={services} initialGuideId="guide-1" />,
    );
    await screen.findByText('استوديو PDF');

    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="رفع شعار الجهة"]',
    );
    expect(input).not.toBeNull();
    const file = new File([new Uint8Array([1, 2, 3])], 'logo.png', {
      type: 'image/png',
    });
    fireEvent.change(input!, { target: { files: [file] } });

    await waitFor(() => {
      expect(container.querySelectorAll('img[alt="شعار الجهة"]').length).toBeGreaterThan(0);
    });
  });
});
