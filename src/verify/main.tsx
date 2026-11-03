import '../styles/global.css';
import '../styles/pdf.css';
import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  buildStepSources,
  guideDirectionText,
  paginateDocument,
  resolvePdfDirection,
} from '../pdf/document';
import { exportDocumentToPdf } from '../pdf/exportPdf';
import { buildGeometry } from '../pdf/document';
import { createTextMeasurer } from '../pdf/measure';
import { createDefaultSettings } from '../pdf/templates';
import type { PdfDesignSettings, PdfTemplateId } from '../pdf/types';
import type { Guide, GuideStep } from '../shared/types';
import { DEPLOY_JPEG, SETTINGS_JPEG } from './fixtures';

type Variant = 'ar' | 'en' | 'letter-landscape' | 'no-cover' | 'annotated-large';

function steps(count: number, image: 'settings' | 'deploy'): GuideStep[] {
  return Array.from({ length: count }, (_, index) => {
    const base =
      image === 'settings'
        ? `الخطوة ${index + 1}: افتح «الإعدادات → Preferences»، فعّل الخيار المطلوب، ثم اضغط «حفظ». تأكد أن التغيير نُشر إلى كل الأعضاء.`
        : `Step ${index + 1}: Open the terminal, run ${index % 2 === 0 ? 'npx dalil deploy' : 'npm run verify'}, and wait until the progress indicator reaches 100٪ before continuing.`;
    const long =
      index === 2
        ? ' ' +
          'تفاصيل مهمة: راجع هذه الملاحظة أكثر من مرة قبل المتابعة. إذا ظهرت أي رسالة تحذير، لا تتجاهلها، وسجّل الخطأ ثم أرفقه في بلاغ الدعم. '.repeat(
            18,
          )
        : '';
    return {
      id: `step-${index}`,
      order: index + 1,
      actionType: 'manual' as const,
      instruction: base + long,
      elementLabel: image === 'settings' ? `زر الخطوة ${index + 1}` : `Terminal ${index + 1}`,
      screenshotId: `shot-${index}`,
      screenshotState: 'captured' as const,
      annotations:
        index === 0
          ? [
              {
                id: 'a-rect',
                type: 'rect' as const,
                color: '#7440E9',
                strokeWidth: 0.012,
                x: 0.62,
                y: 0.1,
                w: 0.2,
                h: 0.09,
              },
              {
                id: 'a-text',
                type: 'text' as const,
                color: '#7440E9',
                strokeWidth: 0.012,
                x: 0.6,
                y: 0.28,
                text: 'اضغط هنا',
                fontSize: 0.042,
              },
              {
                id: 'a-arrow',
                type: 'arrow' as const,
                color: '#D92D45',
                strokeWidth: 0.008,
                x1: 0.78,
                y1: 0.34,
                x2: 0.88,
                y2: 0.17,
              },
            ]
          : undefined,
      captureSource: 'window' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
  });
}

function guideFor(variant: Variant): Guide {
  if (variant === 'en') {
    return {
      id: 'verify-en',
      title: 'Deployment runbook',
      description: 'A tested checklist for releasing Dalil to production.',
      createdAt: '2026-01-10T09:00:00.000Z',
      updatedAt: '2026-01-12T09:00:00.000Z',
      source: 'desktop',
      steps: steps(7, 'deploy'),
    };
  }
  if (variant === 'annotated-large') {
    return {
      id: 'verify-annotated',
      title: 'نشر التطبيق — ملاحظات الفريق',
      description: 'دليل مع لقطات معلّمة للفريق التقني.',
      createdAt: '2026-01-10T09:00:00.000Z',
      updatedAt: '2026-01-12T09:00:00.000Z',
      source: 'desktop',
      steps: steps(5, 'deploy'),
    };
  }
  return {
    id: 'verify-ar',
    title: 'تشغيل لوحة التحكم',
    description: 'دليل داخلي لمديري النظام — العمليات والتحديثات والصيانة.',
    createdAt: '2026-01-10T09:00:00.000Z',
    updatedAt: '2026-01-12T09:00:00.000Z',
    source: 'desktop',
    steps: steps(12, 'settings'),
  };
}

function settingsFor(variant: Variant, templateId: PdfTemplateId): PdfDesignSettings {
  const guide = guideFor(variant);
  const base = createDefaultSettings(guide, templateId);
  const shared: Partial<PdfDesignSettings> = {
    author: 'سارة المهيري',
    company: 'شركة دليل',
    documentDate: '2026-01-12',
    footerText: 'سري وخاص بالفريق',
    metadataNote: 'إصدار 1.4.0',
  };
  switch (variant) {
    case 'en':
      return { ...base, ...shared, direction: 'ltr', fontId: 'plex' };
    case 'letter-landscape':
      return { ...base, ...shared, pageSize: 'letter', orientation: 'landscape' };
    case 'no-cover':
      return { ...base, ...shared, showCover: false };
    default:
      return { ...base, ...shared, direction: 'rtl' };
  }
}

function assetsFor(variant: Variant) {
  const guide = guideFor(variant);
  const data =
    variant === 'en' || variant === 'annotated-large' ? DEPLOY_JPEG : SETTINGS_JPEG;
  const screenshots = new Map(
    guide.steps.map((step) => [step.screenshotId as string, { dataUrl: data }]),
  );
  const sizes = new Map(
    guide.steps.map((step) => [
      step.screenshotId as string,
      variant === 'annotated-large'
        ? { width: 1600, height: 2400 }
        : { width: 1200, height: 750 },
    ]),
  );
  return { screenshots, sizes };
}

function buildVariant(variant: Variant, templateId: PdfTemplateId) {
  const guide = guideFor(variant);
  const settings = settingsFor(variant, templateId);
  const direction = resolvePdfDirection(settings, guideDirectionText(guide));
  const geometry = buildGeometry(settings);
  const measurer = createTextMeasurer(settings, geometry, direction);
  try {
    const { screenshots, sizes } = assetsFor(variant);
    const sources = buildStepSources(guide, screenshots, sizes);
    const pages = paginateDocument({
      settings,
      steps: sources,
      measureText: measurer.measure,
    });
    return { plan: { geometry, pages }, settings, direction };
  } finally {
    measurer.dispose();
  }
}

function VerifyApp() {
  useEffect(() => {
    const api = {
      async exportPdf(variant: string, templateId: string): Promise<string> {
        const { plan, settings, direction } = buildVariant(
          variant as Variant,
          templateId as PdfTemplateId,
        );
        const blob = await exportDocumentToPdf({
          plan,
          settings,
          direction,
          quality: 'high',
        });
        return blobToBase64(blob);
      },
    };
    (window as unknown as { __verify: typeof api }).__verify = api;
    return () => {
      delete (window as unknown as { __verify?: typeof api }).__verify;
    };
  }, []);

  useEffect(() => {
    let done = false;
    const ready = async () => {
      try {
        if (document.fonts?.ready) await document.fonts.ready;
      } catch {
        // ignore
      }
      if (done) return;
      (window as unknown as { __verifyReady: boolean }).__verifyReady = true;
    };
    void ready();
    return () => {
      done = true;
    };
  }, []);

  return (
    <main aria-label="verify harness" style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif' }}>
      <span style={{ position: 'absolute', left: -9999, top: 0, opacity: 0 }} aria-hidden="true">
        دليل نشر التطبيق · Deployment runbook
      </span>
    </main>
  );
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(reader.error ?? new Error('تعذّر قراءة الملف.'));
    reader.readAsDataURL(blob);
  });
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<VerifyApp />);
}
