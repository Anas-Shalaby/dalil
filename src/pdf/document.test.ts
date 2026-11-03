import { describe, expect, it } from 'vitest';
import type { Annotation, Guide, GuideStep } from '../shared/types';
import {
  buildGeometry,
  buildStepSources,
  guideDirectionText,
  paginateDocument,
  resolvePdfDirection,
  splitTextToFit,
  buildDocumentPlan,
} from './document';
import { createDefaultSettings } from './templates';
import type { PdfContentPage, PdfDesignSettings, PdfPagePlan } from './types';

const measureText = (text: string) => Math.ceil(text.length / 60) * 24 || 0;

function makeStep(index: number, overrides: Partial<GuideStep> = {}): GuideStep {
  return {
    id: `step-${index}`,
    order: index + 1,
    actionType: 'manual',
    instruction: `الخطوة رقم ${index + 1}: اضغط على الزر ثم أكمل النموذج.`,
    elementLabel: `زر ${index + 1}`,
    screenshotId: `shot-${index}`,
    screenshotState: 'captured',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeGuide(count: number, overrides: Partial<GuideStep> = {}): Guide {
  return {
    id: 'guide-1',
    title: 'دليل تجريبي',
    description: 'وصف الدليل',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    steps: Array.from({ length: count }, (_, index) => makeStep(index, overrides)),
  };
}

function settingsFor(guide: Guide, patch: Partial<PdfDesignSettings> = {}): PdfDesignSettings {
  return { ...createDefaultSettings(guide), ...patch };
}

function sourcesFor(guide: Guide) {
  const stepsWithShots = guide.steps.filter(
    (step): step is GuideStep & { screenshotId: string } => Boolean(step.screenshotId),
  );
  const screenshots = new Map(
    stepsWithShots.map((step) => [step.screenshotId, { dataUrl: 'data:image/jpeg;base64,AAAA' }]),
  );
  const sizes = new Map(
    stepsWithShots.map((step) => [step.screenshotId, { width: 1600, height: 900 }]),
  );
  return buildStepSources(guide, screenshots, sizes);
}

function contentPages(pages: PdfPagePlan[]): PdfContentPage[] {
  return pages.filter((page): page is PdfContentPage => page.kind === 'content');
}

function textForStep(pages: PdfPagePlan[], stepId: string): string {
  return contentPages(pages)
    .flatMap((page) => page.blocks)
    .filter((block) => block.kind === 'step' && block.stepId === stepId)
    .map((block) => (block.kind === 'step' ? block.text : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('document pagination', () => {
  it('keeps a short document on one page with a cover', () => {
    const guide = makeGuide(1);
    const settings = settingsFor(guide);
    const plan = paginateDocument({
      settings,
      steps: sourcesFor(guide),
      measureText,
    });
    expect(plan).toHaveLength(2);
    expect(plan[0].kind).toBe('cover');
    const content = contentPages(plan);
    expect(content).toHaveLength(1);
    expect(content[0].pageNumber).toBe(2);
    expect(content[0].totalPages).toBe(2);
    expect(content[0].blocks.filter((block) => block.kind === 'step')).toHaveLength(1);
  });

  it('never creates an empty page for a normal document', () => {
    const guide = makeGuide(18);
    const plan = paginateDocument({
      settings: settingsFor(guide),
      steps: sourcesFor(guide),
      measureText,
    });
    const pages = contentPages(plan);
    expect(pages.length).toBeGreaterThan(1);
    for (const page of pages) {
      expect(page.blocks.length).toBeGreaterThan(0);
      expect(page.blocks.every((block) => block.kind === 'step')).toBe(true);
    }
  });

  it('handles very long descriptions without losing text', () => {
    const longText = 'كلمة '.repeat(400).trim();
    const guide = makeGuide(2, { instruction: longText });
    const plan = paginateDocument({
      settings: settingsFor(guide),
      steps: sourcesFor(guide),
      measureText,
    });
    expect(contentPages(plan).length).toBeGreaterThan(2);
    for (const step of guide.steps) {
      const text = textForStep(plan, step.id);
      expect(text.length).toBeGreaterThan(1000);
      expect(text.startsWith('كلمة')).toBe(true);
      expect(text.endsWith('كلمة')).toBe(true);
    }
  });

  it('shows a step heading exactly once even when the step spans pages', () => {
    const guide = makeGuide(1, { instruction: 'تفاصيل '.repeat(600) });
    const plan = paginateDocument({
      settings: settingsFor(guide),
      steps: sourcesFor(guide),
      measureText,
    });
    const blocks = contentPages(plan)
      .flatMap((page) => page.blocks)
      .filter((block) => block.kind === 'step');
    expect(blocks.filter((block) => block.kind === 'step' && block.showHeading)).toHaveLength(1);
    expect(blocks.filter((block) => block.kind === 'step' && block.continued).length).toBeGreaterThan(0);
  });

  it('caps very tall screenshots so they cannot overflow a page', () => {
    const guide = makeGuide(1);
    const settings = settingsFor(guide);
    const geometry = buildGeometry(settings);
    const screenshots = new Map([['shot-0', { dataUrl: 'data:image/jpeg;base64,AAAA' }]]);
    const sizes = new Map([['shot-0', { width: 800, height: 6000 }]]);
    const steps = buildStepSources(guide, screenshots, sizes);
    const plan = paginateDocument({ settings, steps, measureText });
    const images = contentPages(plan)
      .flatMap((page) => page.blocks)
      .flatMap((block) => (block.kind === 'step' && block.image ? [block.image] : []));
    expect(images).toHaveLength(1);
    expect(images[0].heightPx).toBeLessThanOrEqual(Math.round(geometry.contentHeightPx * 0.66));
  });

  it('preserves step annotations in the export pipeline', () => {
    const annotations: Annotation[] = [
      { id: 'a1', type: 'rect', color: '#7440E9', strokeWidth: 2, x: 1, y: 2, w: 3, h: 4 },
    ];
    const guide = makeGuide(1, { annotations });
    const steps = sourcesFor(guide);
    expect(steps[0].image?.annotations).toEqual(annotations);
    const plan = paginateDocument({
      settings: settingsFor(guide),
      steps,
      measureText,
    });
    const block = contentPages(plan)
      .flatMap((page) => page.blocks)
      .find((item) => item.kind === 'step' && item.image);
    expect(block && block.kind === 'step' ? block.image?.annotations : undefined).toEqual(
      annotations,
    );
  });

  it('supports steps without screenshots', () => {
    const guide = makeGuide(2, {
      screenshotId: null,
      screenshotState: 'none',
      captureSource: 'window',
    });
    const plan = paginateDocument({
      settings: settingsFor(guide),
      steps: sourcesFor(guide),
      measureText,
    });
    const steps = contentPages(plan)
      .flatMap((page) => page.blocks)
      .filter((block) => block.kind === 'step');
    expect(steps).toHaveLength(2);
    for (const step of steps) {
      expect(step.kind === 'step' ? step.image : null).toBeNull();
    }
  });

  it('renders a friendly empty page for a guide with no steps', () => {
    const guide = makeGuide(0);
    const pages = paginateDocument({
      settings: settingsFor(guide),
      steps: [],
      measureText,
    });
    expect(pages).toHaveLength(2);
    const content = pages[1];
    expect(content.kind).toBe('content');
    expect(content.kind === 'content' ? content.blocks : []).toEqual([{ kind: 'empty' }]);
  });

  it('omits the cover page when disabled', () => {
    const guide = makeGuide(2);
    const pages = paginateDocument({
      settings: settingsFor(guide, { showCover: false }),
      steps: sourcesFor(guide),
      measureText,
    });
    expect(pages[0].kind).toBe('content');
    expect(pages[0].pageNumber).toBe(1);
    expect(pages[0].totalPages).toBe(pages.length);
  });

  it('reports correct page numbers for every page', () => {
    const guide = makeGuide(24);
    const pages = paginateDocument({
      settings: settingsFor(guide),
      steps: sourcesFor(guide),
      measureText,
    });
    pages.forEach((page, index) => {
      expect(page.index).toBe(index);
      expect(page.totalPages).toBe(pages.length);
      if (page.kind === 'content') {
        expect(page.pageNumber).toBe(index + 1);
      } else {
        expect(page.pageNumber).toBeNull();
      }
    });
  });

  it('switches geometry for landscape and Letter', () => {
    const guide = makeGuide(1);
    const landscape = buildGeometry(
      settingsFor(guide, { orientation: 'landscape', pageSize: 'letter' }),
    );
    expect(landscape.widthPx).toBeGreaterThan(landscape.heightPx);
    expect(landscape.widthMm).toBeCloseTo(279.4, 1);
  });

  it('identifies image blocks without a duplicate heading', () => {
    const guide = makeGuide(1, { instruction: 'نص طويل '.repeat(500) });
    const plan = paginateDocument({
      settings: settingsFor(guide),
      steps: sourcesFor(guide),
      measureText,
    });
    const imageBlocks = contentPages(plan)
      .flatMap((page) => page.blocks)
      .filter((block) => block.kind === 'step' && block.image);
    expect(imageBlocks.length).toBe(1);
    expect(imageBlocks[0]).toMatchObject({ showHeading: false, continued: false });
  });

  it('resolves document direction from content, settings and mixed text', () => {
    expect(resolvePdfDirection({ direction: 'rtl' }, 'Hello')).toBe('rtl');
    expect(resolvePdfDirection({ direction: 'ltr' }, 'مرحبا')).toBe('ltr');
    expect(resolvePdfDirection({ direction: 'auto' }, 'مرحبا بالعالم')).toBe('rtl');
    expect(resolvePdfDirection({ direction: 'auto' }, 'Hello world')).toBe('ltr');
    const mixed = makeGuide(1, { instruction: 'افتح Settings ثم اختر Account' });
    expect(guideDirectionText(mixed)).toContain('Settings');
    expect(resolvePdfDirection({ direction: 'auto' }, guideDirectionText(mixed))).toBe('rtl');
  });

  it('splits text at word boundaries and always makes progress', () => {
    const measure = (value: string) => value.length * 2;
    const split = splitTextToFit('one two three four five', 20, measure);
    expect(split.head.endsWith(' ')).toBe(false);
    expect(split.head.length).toBeGreaterThan(0);
    expect(`${split.head} ${split.tail}`.replace(/\s+/g, ' ')).toBe(
      'one two three four five',
    );
    const single = splitTextToFit('abcdefghij', 6, measure);
    expect(single.head.length).toBeGreaterThan(0);
    expect(single.head + single.tail).toBe('abcdefghij');
  });

  it('builds the same plan through the public helper', () => {
    const guide = makeGuide(2);
    const plan = buildDocumentPlan({
      stepSources: sourcesFor(guide),
      settings: settingsFor(guide),
      measureText,
    });
    expect(plan.pages).toHaveLength(2);
    expect(plan.geometry.widthPx).toBeGreaterThan(0);
  });
});
