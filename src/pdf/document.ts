import { isRtlText } from '../shared/annotations';
import type { Annotation, Guide, GuideStep } from '../shared/types';
import { pageDimensions, pxPerMm } from './settings';
import type {
  PdfContentBlock,
  PdfContentPage,
  PdfDesignSettings,
  PdfDocumentPlan,
  PdfPageGeometry,
  PdfPagePlan,
  PdfStepBlock,
  PdfStepImage,
  PdfStepSource,
} from './types';

export interface ScreenshotData {
  dataUrl: string;
  annotations?: Annotation[];
}

export interface ImageSize {
  width: number;
  height: number;
}

const FALLBACK_IMAGE_SIZE: ImageSize = { width: 16, height: 10 };
const MIN_TEXT_LINES = 2;

export function resolvePdfDirection(
  settings: Pick<PdfDesignSettings, 'direction'>,
  text: string,
): 'rtl' | 'ltr' {
  if (settings.direction === 'rtl' || settings.direction === 'ltr') return settings.direction;
  return isRtlText(text) ? 'rtl' : 'ltr';
}

export function guideDirectionText(guide: Guide): string {
  return [
    guide.title,
    guide.description,
    ...guide.steps.flatMap((step) => [step.instruction, step.elementLabel]),
  ].join(' ');
}

export function stepFallbackText(step: GuideStep): string {
  if (step.instruction.trim()) return step.instruction.trim();
  if (step.captureSource) return 'خطوة موثّقة من سطح المكتب. راجع الصورة أدناه.';
  return 'تفاعل مع العنصر المحدد.';
}

export function buildStepSources(
  guide: Guide,
  screenshots: Map<string, ScreenshotData | null>,
  imageSizes: Map<string, ImageSize>,
): PdfStepSource[] {
  return guide.steps.map((step, index) => {
    const screenshot = step.screenshotId ? (screenshots.get(step.screenshotId) ?? null) : null;
    const size = step.screenshotId ? (imageSizes.get(step.screenshotId) ?? null) : null;
    const resolved = size ?? FALLBACK_IMAGE_SIZE;
    return {
      step,
      stepNumber: index + 1,
      text: stepFallbackText(step),
      image: screenshot
        ? {
            dataUrl: screenshot.dataUrl,
            annotations: screenshot.annotations ?? step.annotations,
            widthPx: resolved.width,
            heightPx: resolved.height,
            caption: step.elementLabel.trim() || undefined,
          }
        : null,
    };
  });
}

export function buildGeometry(settings: PdfDesignSettings): PdfPageGeometry {
  const scale = pxPerMm();
  const { widthMm, heightMm } = pageDimensions(settings);
  const widthPx = Math.round(widthMm * scale);
  const heightPx = Math.round(heightMm * scale);
  const marginPx = Math.round(settings.marginMm * scale);
  const headerHeightPx = settings.showHeader ? Math.round(10 * scale) : 0;
  const footerHeightPx = settings.showFooter ? Math.round(11 * scale) : 0;
  const contentWidthPx = Math.max(240, widthPx - marginPx * 2);
  const contentHeightPx = Math.max(
    320,
    heightPx - marginPx * 2 - headerHeightPx - footerHeightPx,
  );
  const baseFontSizePx = settings.baseFontSize * (96 / 72);
  return {
    widthMm,
    heightMm,
    widthPx,
    heightPx,
    marginPx,
    contentWidthPx,
    contentHeightPx,
    headerHeightPx,
    footerHeightPx,
    baseFontSizePx,
    lineHeightPx: baseFontSizePx * settings.lineHeight,
  };
}

interface StepMetrics {
  headingHeight: number;
  textHeight: number;
  imageHeight: number | null;
  imageWidth: number | null;
  captionHeight: number;
  gapAfterText: number;
  gapBeforeImage: number;
  total: number;
}

function maxImageHeight(settings: PdfDesignSettings, geometry: PdfPageGeometry): number {
  const ratio =
    settings.templateId === 'minimal'
      ? 0.55
      : settings.templateId === 'technical'
        ? 0.45
        : settings.templateId === 'gradient'
          ? 0.46
          : settings.screenshotStyle === 'compact'
            ? 0.34
            : settings.screenshotStyle === 'full'
              ? 0.6
              : 0.42;
  return Math.round(geometry.contentHeightPx * ratio);
}

function imageMetrics(
  source: PdfStepSource,
  settings: PdfDesignSettings,
  geometry: PdfPageGeometry,
): { width: number; height: number } | null {
  if (!source.image) return null;
  const styleFactor =
    settings.screenshotStyle === 'full'
      ? 1
      : settings.screenshotStyle === 'compact'
        ? 0.68
        : settings.screenshotStyle === 'framed'
          ? 0.94
          : 1;
  const allowedWidth = Math.round(
    geometry.contentWidthPx * (settings.screenshotWidthPercent / 100) * styleFactor,
  );
  const ratio = Math.max(0.05, source.image.widthPx / Math.max(1, source.image.heightPx));
  const naturalHeight = allowedWidth / ratio;
  const cap = maxImageHeight(settings, geometry);
  if (naturalHeight <= cap) {
    return { width: allowedWidth, height: Math.max(1, Math.round(naturalHeight)) };
  }
  return { width: Math.max(1, Math.round(cap * ratio)), height: Math.round(cap) };
}

function measureStep(
  source: PdfStepSource,
  settings: PdfDesignSettings,
  geometry: PdfPageGeometry,
  measureText: (value: string) => number,
): StepMetrics {
  const headingHeight = Math.round(geometry.lineHeightPx * 1.35 + settings.stepSpacing);
  const textHeight = Math.round(measureText(source.text));
  const image = imageMetrics(source, settings, geometry);
  const chromeHeight = image && settings.screenshotStyle === 'framed' ? 24 : 0;
  const captionHeight =
    image && source.image?.caption ? Math.round(geometry.baseFontSizePx * 1.35 + 6) : 0;
  const gapAfterText = image && source.text ? Math.round(settings.stepSpacing * 0.9) : 0;
  const gapBeforeImage = image ? Math.round(settings.stepSpacing * 0.55) : 0;
  const total =
    headingHeight +
    textHeight +
    (image ? gapBeforeImage + chromeHeight + image.height + captionHeight : 0) +
    gapAfterText;
  return {
    headingHeight,
    textHeight,
    imageHeight: image?.height ?? null,
    imageWidth: image?.width ?? null,
    captionHeight,
    gapAfterText,
    gapBeforeImage,
    total,
  };
}

/**
 * Splits text so the first part fits within maxHeight. It splits on word
 * boundaries when possible and falls back to a character split for long
 * unbroken strings. Returns a head that is guaranteed to make progress.
 */
export function splitTextToFit(
  text: string,
  maxHeight: number,
  measureText: (value: string) => number,
): { head: string; tail: string } {
  if (!text) return { head: '', tail: '' };
  if (maxHeight <= 0) return { head: '', tail: text };
  if (measureText(text) <= maxHeight) return { head: text, tail: '' };

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    let low = 1;
    let high = words.length - 1;
    let best = 0;
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const candidate = words.slice(0, middle).join(' ');
      if (measureText(candidate) <= maxHeight) {
        best = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }
    if (best > 0) {
      return {
        head: words.slice(0, best).join(' '),
        tail: words.slice(best).join(' '),
      };
    }
  }

  // A single long word or a word too tall for the remaining space. Take at
  // least one character so pagination always terminates.
  let low = 1;
  let high = text.length;
  let best = 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (measureText(text.slice(0, middle)) <= maxHeight) {
      best = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return { head: text.slice(0, best).trimEnd(), tail: text.slice(best).trimStart() };
}

function makeBlock(
  source: PdfStepSource,
  metrics: StepMetrics,
  text: string,
  options: { continued: boolean; showHeading: boolean; includeImage: boolean },
): PdfStepBlock {
  const image: PdfStepImage | null =
    options.includeImage && source.image && metrics.imageWidth && metrics.imageHeight
      ? {
          ...source.image,
          widthPx: metrics.imageWidth,
          heightPx: metrics.imageHeight,
        }
      : null;
  return {
    kind: 'step',
    stepId: source.step.id,
    stepNumber: source.stepNumber,
    text,
    continued: options.continued,
    showHeading: options.showHeading,
    image,
    caption: image ? (source.image?.caption ?? null) : null,
  };
}

export interface PaginationInput {
  settings: PdfDesignSettings;
  steps: PdfStepSource[];
  measureText: (value: string) => number;
}

export function paginateDocument({ settings, steps, measureText }: PaginationInput): PdfPagePlan[] {
  const geometry = buildGeometry(settings);
  const contentPages: PdfContentPage[] = [];
  let blocks: PdfContentBlock[] = [];
  let remaining = geometry.contentHeightPx;

  const flush = () => {
    contentPages.push({
      kind: 'content',
      index: contentPages.length + (settings.showCover ? 1 : 0),
      pageNumber: contentPages.length + (settings.showCover ? 1 : 0) + 1,
      totalPages: 0,
      blocks,
    });
    blocks = [];
    remaining = geometry.contentHeightPx;
  };

  const ensurePage = () => {
    if (blocks.length === 0) return;
    flush();
  };

  const pushBlock = (block: PdfContentBlock, height: number) => {
    blocks.push(block);
    remaining -= height + settings.stepSpacing;
  };


  for (const source of steps) {
    const metrics = measureStep(source, settings, geometry, measureText);
    const minTextHeight = geometry.lineHeightPx * MIN_TEXT_LINES;

    if (metrics.total <= geometry.contentHeightPx) {
      if (metrics.total > remaining) ensurePage();
      pushBlock(
        makeBlock(source, metrics, source.text, {
          continued: false,
          showHeading: true,
          includeImage: true,
        }),
        metrics.total,
      );
      continue;
    }

    // Oversized step: keep the heading and as much text as possible together,
    // then continue on following pages without clipping anything.
    let text = source.text;
    let first = true;

    while (text) {
      if (blocks.length > 0 && remaining < metrics.headingHeight + minTextHeight) {
        flush();
      }
      const heading = first ? metrics.headingHeight : Math.round(geometry.lineHeightPx * 1.15);
      let textSpace = remaining - heading - settings.stepSpacing;
      if (textSpace < geometry.lineHeightPx) {
        if (blocks.length > 0) {
          flush();
          continue;
        }
        // An empty page should always accept at least one line, otherwise
        // pagination would loop forever.
        textSpace = Math.max(
          geometry.lineHeightPx,
          geometry.contentHeightPx - heading - settings.stepSpacing,
        );
      }
      const { head, tail } = splitTextToFit(text, textSpace, measureText);
      if (!head) {
        if (blocks.length > 0) {
          flush();
          continue;
        }
        // Unmeasurable text: force a character so progress is guaranteed.
        text = '';
        pushBlock(
          makeBlock(source, metrics, source.text, {
            continued: !first,
            showHeading: first,
            includeImage: false,
          }),
          heading + Math.round(measureText(source.text)),
        );
        break;
      }
      text = tail;
      const block = makeBlock(source, metrics, head, {
        continued: !first,
        showHeading: first,
        includeImage: false,
      });
      pushBlock(block, heading + Math.round(measureText(head)));
      first = false;
    }

    if (source.image && metrics.imageHeight && metrics.imageWidth) {
      const chromeHeight = settings.screenshotStyle === 'framed' ? 24 : 0;
      const needed = chromeHeight + metrics.imageHeight + metrics.captionHeight;
      if (needed > remaining) ensurePage();
      const block = makeBlock(source, metrics, '', {
        continued: false,
        showHeading: false,
        includeImage: true,
      });
      if (block.image) {
        block.image = {
          ...source.image,
          widthPx: metrics.imageWidth,
          heightPx: metrics.imageHeight,
        };
        block.caption = source.image.caption ?? null;
      }
      pushBlock(block, needed);
    }
  }

  if (blocks.length > 0 || contentPages.length === 0) {
    if (blocks.length === 0 && steps.length === 0) {
      blocks = [{ kind: 'empty' }];
    }
    flush();
  }

  const coverOffset = settings.showCover ? 1 : 0;
  const totalPages = contentPages.length + coverOffset;
  const pages: PdfPagePlan[] = [];
  if (settings.showCover) {
    pages.push({ kind: 'cover', index: 0, pageNumber: null, totalPages });
  }
  contentPages.forEach((page, index) => {
    pages.push({
      ...page,
      index: coverOffset + index,
      pageNumber: coverOffset + index + 1,
      totalPages,
    });
  });
  return pages;
}

export interface BuildPlanInput {
  stepSources: PdfStepSource[];
  settings: PdfDesignSettings;
  measureText: (value: string) => number;
}

export function buildDocumentPlan({
  stepSources,
  settings,
  measureText,
}: BuildPlanInput): PdfDocumentPlan {
  return {
    geometry: buildGeometry(settings),
    pages: paginateDocument({ settings, steps: stepSources, measureText }),
  };
}

export function totalContentSteps(pages: PdfPagePlan[]): number {
  const ids = new Set<string>();
  for (const page of pages) {
    if (page.kind !== 'content') continue;
    for (const block of page.blocks) {
      if (block.kind === 'step') ids.add(block.stepId);
    }
  }
  return ids.size;
}
