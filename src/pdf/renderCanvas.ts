/**
 * Deterministic, local-only canvas renderer for Dalil documents.
 *
 * The DOM preview is rendered by React/CSS, while the exported PDF is drawn
 * pixel-by-pixel with the 2D canvas API. Both share the same geometry, the
 * same step measurement engine and the same images/annotations, which keeps
 * the exported document faithful to the preview. Drawing on canvas also
 * gives us native Arabic shaping and ligatures for free (the browser's text
 * engine), which pure-PDF libraries cannot do.
 */
import { drawAnnotations } from '../shared/annotations';
import { PDF_FONT_STACKS } from './settings';
import type {
  PdfContentPage,
  PdfDesignSettings,
  PdfPageGeometry,
  PdfPagePlan,
  PdfScreenshotStyle,
  PdfStepBlock,
} from './types';

export const RENDER_SCALE = 2;

export interface RenderContext {
  settings: PdfDesignSettings;
  geometry: PdfPageGeometry;
  direction: 'rtl' | 'ltr';
  images: Map<string, HTMLImageElement>;
}

export interface RenderResult {
  canvas: HTMLCanvasElement;
}

function resolveFontStack(
  settings: Pick<PdfDesignSettings, 'fontId'>,
  _weight?: number,
): string {
  return PDF_FONT_STACKS[settings.fontId];
}

function createCanvas(
  width: number,
  height: number,
  scale: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('تعذّر إنشاء مساحة الرسم للتصدير.');
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return { canvas, ctx };
}

interface TextDrawOptions {
  x: number;
  y: number;
  maxWidth: number;
  font: string;
  color: string;
  align?: CanvasTextAlign;
  direction?: 'rtl' | 'ltr' | 'inherit';
  lineHeight: number;
  maxLines?: number;
}

function measureWrappedLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  font: string,
): string[] {
  ctx.font = font;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines;
}

function drawTextBlock(
  ctx: CanvasRenderingContext2D,
  text: string,
  options: TextDrawOptions,
): number {
  const { x, y, maxWidth, font, color, lineHeight, maxLines, align, direction } =
    options;
  const lines = measureWrappedLines(ctx, text, maxWidth, font);
  const limited = maxLines ? lines.slice(0, maxLines) : lines;
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
  ctx.textAlign = align ?? 'start';
  ctx.direction = direction ?? 'inherit';
  for (let index = 0; index < limited.length; index += 1) {
    ctx.fillText(limited[index], x, y + index * lineHeight, maxWidth);
  }
  ctx.restore();
  return limited.length;
}

function formatPdfDate(value: string, direction: 'rtl' | 'ltr'): string {
  if (!value) return '';
  try {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(direction === 'rtl' ? 'ar' : 'en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return value;
  }
}

function hexWithAlpha(hex: string, alpha: number): string {
  const cleaned = hex.replace('#', '');
  const full =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string,
): void {
  ctx.fillStyle = fill;
  roundRect(ctx, x, y, width, height, radius);
  ctx.fill();
}

function strokeRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  stroke: string,
  lineWidth: number,
): void {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  roundRect(ctx, x, y, width, height, radius);
  ctx.stroke();
}

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

export function loadImage(dataUrl: string): Promise<HTMLImageElement | null> {
  const cached = imageCache.get(dataUrl);
  if (cached) return cached;
  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(null);
      return;
    }
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = dataUrl;
  });
  imageCache.set(dataUrl, promise);
  return promise;
}

function imageFor(context: RenderContext, dataUrl: string | undefined) {
  if (!dataUrl) return null;
  return context.images.get(dataUrl) ?? null;
}

/* ------------------------------------------------------------------ */
/* Shared chrome (header / footer)                                     */
/* ------------------------------------------------------------------ */

function pageKicker(settings: PdfDesignSettings): string {
  return settings.company || (settings.templateId === 'technical' ? 'DOCUMENT' : 'دليل');
}

function drawPageChrome(
  ctx: CanvasRenderingContext2D,
  page: PdfContentPage,
  context: RenderContext,
): void {
  const { settings, geometry: g, direction } = context;
  const margin = g.marginPx;
  const base = g.baseFontSizePx;
  const kickerFont = `${Math.round(base * 0.74)}px ${resolveFontStack(settings, 600)}`;
  const titleFont = `${Math.round(base * 0.72)}px ${resolveFontStack(settings, 500)}`;

  ctx.save();
  ctx.direction = direction;
  ctx.textBaseline = 'middle';

  const isRTL = direction === 'rtl';
  const startX = isRTL ? g.widthPx - margin : margin;
  const endX = isRTL ? margin : g.widthPx - margin;
  const alignStart: CanvasTextAlign = isRTL ? 'right' : 'left';
  const alignEnd: CanvasTextAlign = isRTL ? 'left' : 'right';

  // Header
  if (settings.showHeader && g.headerHeightPx > 0) {
    const headerY = margin;
    if (settings.showHeaderLogo && settings.logoDataUrl) {
      const logo = imageFor(context, settings.logoDataUrl);
      const maxH = g.headerHeightPx * 0.62;
      if (logo && logo.width > 0) {
        const width = Math.min(g.contentWidthPx * 0.28, (maxH / logo.height) * logo.width);
        const height = (width / logo.width) * logo.height;
        const logoX = isRTL ? startX - width : startX;
        ctx.drawImage(logo, logoX, headerY + (g.headerHeightPx - height) / 2, width, height);
      }
    }
    if (settings.showHeaderTitle && settings.documentTitle) {
      const title = settings.documentTitle;
      ctx.font = titleFont;
      ctx.fillStyle = '#43424f';
      ctx.textAlign = alignStart;
      ctx.fillText(title, startX, headerY + g.headerHeightPx / 2, g.contentWidthPx * 0.62);
    }
    ctx.font = kickerFont;
    ctx.fillStyle = settings.templateId === 'technical' ? settings.secondaryColor : '#8a8897';
    ctx.textAlign = alignEnd;
    const kicker = settings.templateId === 'technical'
      ? pageKicker(settings).toUpperCase()
      : pageKicker(settings);
    ctx.fillText(kicker, endX, headerY + g.headerHeightPx / 2, g.contentWidthPx * 0.4);

    if (settings.templateId === 'executive') {
      ctx.strokeStyle = hexWithAlpha(settings.primaryColor, 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin, headerY + g.headerHeightPx - 0.5);
      ctx.lineTo(g.widthPx - margin, headerY + g.headerHeightPx - 0.5);
      ctx.stroke();
    } else if (settings.templateId === 'gradient' || settings.templateId === 'tutorial') {
      ctx.strokeStyle = hexWithAlpha(settings.secondaryColor, 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin, headerY + g.headerHeightPx - 0.5);
      ctx.lineTo(g.widthPx - margin, headerY + g.headerHeightPx - 0.5);
      ctx.stroke();
    } else if (settings.templateId === 'technical') {
      ctx.strokeStyle = hexWithAlpha(settings.primaryColor, 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin, headerY + g.headerHeightPx - 0.5);
      ctx.lineTo(g.widthPx - margin, headerY + g.headerHeightPx - 0.5);
      ctx.stroke();
    }
  }

  // Footer
  if (settings.showFooter && g.footerHeightPx > 0) {
    const footerY = g.heightPx - margin - g.footerHeightPx;
    if (settings.templateId === 'brand') {
      ctx.fillStyle = settings.primaryColor;
      ctx.fillRect(margin, footerY, g.contentWidthPx, 3);
    } else {
      ctx.strokeStyle =
        settings.templateId === 'minimal'
          ? 'rgba(20,20,20,0)'
          : 'rgba(35,35,49,0.12)';
      if (settings.templateId !== 'minimal') {
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(margin, footerY + 0.5);
        ctx.lineTo(g.widthPx - margin, footerY + 0.5);
        ctx.stroke();
      }
    }
    const footerTextFont = `${Math.round(base * 0.62)}px ${resolveFontStack(settings, 500)}`;
    ctx.font = footerTextFont;
    ctx.fillStyle = settings.templateId === 'brand' ? settings.secondaryColor : '#5c5b68';
    ctx.textBaseline = 'middle';
    ctx.textAlign = alignStart;
    const midY = footerY + g.footerHeightPx / 2;
    let startText = '';
    if (settings.showFooterCompany && settings.company) startText += settings.company;
    if (settings.footerText) {
      startText = startText ? `${startText} · ${settings.footerText}` : settings.footerText;
    }
    if (startText) ctx.fillText(startText, startX, midY, g.contentWidthPx * 0.75);

    if (settings.showPageNumber && page.pageNumber != null) {
      ctx.textAlign = alignEnd;
      ctx.fillStyle = '#5c5b68';
      ctx.fillText(String(page.pageNumber), endX, midY);
    }
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Screenshot presentation                                               */
/* ------------------------------------------------------------------ */

function styleFactors(style: PdfScreenshotStyle): {
  widthScale: number;
  radiusScale: number;
} {
  switch (style) {
    case 'full':
      return { widthScale: 1, radiusScale: 0 };
    case 'compact':
      return { widthScale: 0.68, radiusScale: 1 };
    case 'framed':
      return { widthScale: 0.94, radiusScale: 1 };
    default:
      return { widthScale: 1, radiusScale: 1 };
  }
}

function alignImageX(
  geometry: PdfPageGeometry,
  width: number,
  align: PdfDesignSettings['screenshotAlign'],
  isRTL: boolean,
): number {
  const contentStart = geometry.marginPx;
  const contentEnd = geometry.marginPx + geometry.contentWidthPx;
  if (align === 'center') {
    return contentStart + (geometry.contentWidthPx - width) / 2;
  }
  const atStart = isRTL ? contentEnd - width : contentStart;
  const atEnd = isRTL ? contentStart : contentEnd - width;
  return align === 'start' ? atStart : atEnd;
}

function drawStepImage(
  ctx: CanvasRenderingContext2D,
  block: PdfStepBlock,
  context: RenderContext,
  y: number,
): number {
  const { settings, geometry, direction } = context;
  const image = imageFor(context, block.image?.dataUrl);
  if (!block.image || !image) return 0;
  const style = settings.screenshotStyle;
  const { radiusScale } = styleFactors(style);
  const height = block.image.heightPx;

  const x = alignImageX(geometry, block.image.widthPx, settings.screenshotAlign, direction === 'rtl');

  if (style === 'framed') {
    const chrome = 24;
    fillRoundedRect(ctx, x, y, block.image.widthPx, chrome, settings.screenshotRadius, '#f1f0f5');
    ctx.strokeStyle = 'rgba(35,35,49,0.09)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + chrome - 0.5);
    ctx.lineTo(x + block.image.widthPx, y + chrome - 0.5);
    ctx.stroke();
    const dots = ['#c9c6d4', '#c9c6d4', '#c9c6d4'];
    dots.forEach((color, index) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + 10 + index * 13, y + chrome / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    const mediaY = y + chrome;
    ctx.fillStyle = '#f6f5f9';
    ctx.fillRect(x, mediaY, block.image.widthPx, height);
    ctx.drawImage(image, x, mediaY, block.image.widthPx, height);
    if (block.image.annotations && block.image.annotations.length > 0) {
      ctx.save();
      ctx.translate(x, mediaY);
      drawAnnotations(ctx, block.image.annotations, block.image.widthPx, height);
      ctx.restore();
    }
    strokeRoundedRect(
      ctx,
      x,
      y,
      block.image.widthPx,
      chrome + height,
      settings.screenshotRadius,
      'rgba(35,35,49,0.13)',
      1,
    );
    const captionHeight = block.caption
      ? Math.round(geometry.baseFontSizePx * 1.35 + 6)
      : 0;
    drawCaption(ctx, block, context, x, y + chrome + height + 4, captionHeight);
    return chrome + height + captionHeight;
  }

  if (block.image.annotations && block.image.annotations.length > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, block.image.widthPx, height);
    ctx.clip();
    ctx.drawImage(image, x, y, block.image.widthPx, height);
    drawAnnotations(ctx, block.image.annotations, height * 0 + block.image.widthPx, height);
    ctx.restore();
  } else {
    drawContainedImage(ctx, image, x, y, block.image.widthPx, height);
  }

  strokeRoundedRect(
    ctx,
    x,
    y,
    block.image.widthPx,
    height,
    settings.screenshotRadius * radiusScale,
    'rgba(35,35,49,0.13)',
    1,
  );

  if (style === 'annotated' && block.image.annotations?.length) {
    const label = 'مع التعليقات';
    const font = `${Math.round(geometry.baseFontSizePx * 0.62)}px ${resolveFontStack(settings, 600)}`;
    ctx.font = font;
    const textWidth = ctx.measureText(label).width;
    const pillW = textWidth + 20;
    const pillH = Math.round(geometry.baseFontSizePx * 1.15 + 10);
    const pillX = x + block.image.widthPx - pillW - 8;
    fillRoundedRect(ctx, pillX, y + 8, pillW, pillH, pillH / 2, 'rgba(255,255,255,0.92)');
    ctx.strokeStyle = hexWithAlpha(settings.primaryColor, 0.35);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = settings.primaryColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, pillX + pillW / 2, y + 8 + pillH / 2);
  }

  const captionHeight = block.caption ? Math.round(geometry.baseFontSizePx * 1.35 + 6) : 0;
  drawCaption(ctx, block, context, x, y + height + 4, captionHeight);

  return height + captionHeight;
}

function drawCaption(
  ctx: CanvasRenderingContext2D,
  block: PdfStepBlock,
  context: RenderContext,
  x: number,
  y: number,
  _captionHeight: number,
): void {
  const caption = block.caption;
  if (!caption) return;
  const { settings, geometry, direction } = context;
  const captionFont = `${Math.round(geometry.baseFontSizePx * 0.72)}px ${resolveFontStack(settings, 500)}`;
  drawTextBlock(ctx, caption, {
    x: direction === 'rtl' ? x + block.image!.widthPx : x,
    y,
    maxWidth: block.image!.widthPx,
    font: captionFont,
    color: settings.templateId === 'technical' ? settings.secondaryColor : '#747387',
    align: direction === 'rtl' ? 'right' : 'left',
    direction,
    lineHeight: geometry.baseFontSizePx * 1.3,
    maxLines: 2,
  });
}

function drawContainedImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const ratio = Math.min(width / image.width, height / image.height);
  const w = image.width * ratio;
  const h = image.height * ratio;
  const dx = x + (width - w) / 2;
  const dy = y + (height - h) / 2;
  ctx.drawImage(image, dx, dy, w, h);
}

function drawStepNumber(
  ctx: CanvasRenderingContext2D,
  block: PdfStepBlock,
  context: RenderContext,
  x: number,
  y: number,
): number {
  const { settings, geometry } = context;
  const number = String(block.stepNumber);
  const size = geometry.baseFontSizePx * 0.95;
  const isRTL = context.direction === 'rtl';

  ctx.save();
  ctx.textBaseline = 'middle';

  if (settings.numberingStyle === 'badge') {
    const d = Math.round(geometry.lineHeightPx * 0.82);
    const cy = y + geometry.lineHeightPx / 2;
    const cx = isRTL ? x - d / 2 : x + d / 2;
    if (settings.templateId === 'gradient') {
      const gradient = ctx.createLinearGradient(cx - d, cy - d, cx + d, cy + d);
      gradient.addColorStop(0, settings.primaryColor);
      gradient.addColorStop(1, settings.secondaryColor);
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = settings.primaryColor;
    }
    ctx.beginPath();
    ctx.arc(cx, cy, d / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.round(size)}px ${resolveFontStack(settings, 700)}`;
    ctx.textAlign = 'center';
    ctx.fillText(number, cx, cy + 1);
    return d;
  }

  if (settings.numberingStyle === 'outline') {
    const w = Math.round(geometry.baseFontSizePx * 1.7);
    const h = Math.round(geometry.lineHeightPx * 0.82);
    const left = isRTL ? x - w : x;
    strokeRoundedRect(ctx, left, y + (geometry.lineHeightPx - h) / 2, w, h, 8, settings.primaryColor, 1.5);
    ctx.fillStyle = settings.primaryColor;
    ctx.font = `700 ${Math.round(size)}px ${resolveFontStack(settings, 700)}`;
    ctx.textAlign = 'center';
    ctx.fillText(number, left + w / 2, y + geometry.lineHeightPx / 2 + 1);
    return w;
  }

  ctx.fillStyle = settings.primaryColor;
  ctx.font = `700 ${Math.round(geometry.baseFontSizePx * 1.3)}px ${resolveFontStack(settings, 700)}`;
  ctx.textAlign = isRTL ? 'right' : 'left';
  ctx.fillText(number, x, y + geometry.lineHeightPx / 2 + 1);
  return ctx.measureText(number).width;
}

function drawContinuedMarker(
  ctx: CanvasRenderingContext2D,
  block: PdfStepBlock,
  context: RenderContext,
  x: number,
  y: number,
): void {
  const { settings, geometry, direction } = context;
  const isRTL = direction === 'rtl';
  ctx.save();
  ctx.direction = direction;
  ctx.font = `${Math.round(geometry.baseFontSizePx * 0.72)}px ${resolveFontStack(settings, 400)}`;
  ctx.fillStyle = '#747387';
  ctx.textBaseline = 'middle';
  ctx.textAlign = isRTL ? 'right' : 'left';
  const text = isRTL ? `تكملة الخطوة ${block.stepNumber}` : `Continued from step ${block.stepNumber}`;
  ctx.fillText(text, x, y + geometry.lineHeightPx / 2 + 1);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Steps                                                               */
/* ------------------------------------------------------------------ */

function eyebrowFont(context: RenderContext): string {
  const { settings } = context;
  const base = context.geometry.baseFontSizePx * 0.6;
  const family = settings.templateId === 'technical' ? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' : resolveFontStack(settings, 600);
  return `${Math.round(base)}px ${family}`;
}

function drawStepHead(
  ctx: CanvasRenderingContext2D,
  block: PdfStepBlock,
  context: RenderContext,
  y: number,
): number {
  const { settings, geometry, direction } = context;
  const isRTL = direction === 'rtl';
  const lineH = geometry.lineHeightPx;
  const startX = isRTL ? geometry.widthPx - geometry.marginPx : geometry.marginPx;
  const yMid = y + lineH / 2;
  const gap = 10;

  const numberWidth = drawStepNumber(ctx, block, context, startX, y);

  const eyebrow =
    direction === 'ltr' || settings.templateId === 'technical'
      ? `STEP ${String(block.stepNumber).padStart(2, '0')}`
      : `الخطوة ${block.stepNumber}`;
  ctx.save();
  ctx.font = eyebrowFont(context);
  ctx.textBaseline = 'middle';
  setLetterSpacing(ctx, settings.templateId === 'technical' ? '1.5px' : '1px');

  const eyebrowColors: Record<PdfDesignSettings['templateId'], string> = {
    executive: hexWithAlpha(settings.primaryColor, 0.85),
    minimal: 'transparent',
    tutorial: settings.primaryColor,
    gradient: hexWithAlpha(settings.secondaryColor, 0.8),
    technical: settings.secondaryColor,
    brand: hexWithAlpha(settings.primaryColor, 0.85),
  };
  if (settings.templateId !== 'minimal') {
    ctx.fillStyle = eyebrowColors[settings.templateId];
    const metrics = ctx.measureText(eyebrow).width;
    if (isRTL) {
      const bx = startX - numberWidth - gap - metrics;
      ctx.textAlign = 'left';
      ctx.fillText(eyebrow, bx, yMid + 1);
    } else {
      const bx = startX + numberWidth + gap;
      ctx.textAlign = 'left';
      ctx.fillText(eyebrow, bx, yMid + 1);
    }
  }
  ctx.restore();

  if (settings.templateId === 'executive') {
    ctx.strokeStyle = hexWithAlpha(settings.primaryColor, 0.16);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(geometry.marginPx, y + lineH + 6);
    ctx.lineTo(geometry.widthPx - geometry.marginPx, y + lineH + 6);
    ctx.stroke();
    return y + lineH + 6 + Math.max(6, settings.stepSpacing * 0.45);
  }

  if (settings.templateId === 'tutorial') {
    return y + lineH + Math.max(6, settings.stepSpacing * 0.35);
  }

  return y + lineH + Math.max(4, settings.stepSpacing * 0.45);
}

function drawStepBlockAt(
  ctx: CanvasRenderingContext2D,
  block: PdfStepBlock,
  context: RenderContext,
  yStart: number,
): number {
  const { settings, geometry, direction } = context;
  const isRTL = direction === 'rtl';
  const margin = geometry.marginPx;
  const startX = isRTL ? geometry.widthPx - margin : margin;
  const maxWidth = geometry.contentWidthPx;
  const align = isRTL ? 'right' : 'left';
  let cursor = yStart;

  if (block.showHeading) {
    cursor = drawStepHead(ctx, block, context, cursor);
  } else if (block.continued) {
    drawContinuedMarker(ctx, block, context, startX, cursor);
    cursor += Math.round(geometry.lineHeightPx * 1.15);
  }

  if (block.text) {
    const font = `${Math.round(geometry.baseFontSizePx * 1.02)}px ${resolveFontStack(settings, 400)}`;
    const lines = measureWrappedLines(ctx, block.text, maxWidth, font);
    drawTextBlock(ctx, block.text, {
      x: startX,
      y: cursor,
      maxWidth,
      font,
      color:
        settings.templateId === 'technical' ? '#182033' : '#232331',
      align,
      direction,
      lineHeight: geometry.lineHeightPx,
    });
    cursor += lines.length * geometry.lineHeightPx;
  }

  if (block.image) {
    cursor += Math.round(settings.stepSpacing * 0.55);
    cursor += drawStepImage(ctx, block, context, cursor);
  }

  return cursor;
}

function drawEmptyState(
  ctx: CanvasRenderingContext2D,
  context: RenderContext,
  y: number,
): void {
  const { settings, geometry, direction } = context;
  const centerX = geometry.widthPx / 2;
  ctx.save();
  ctx.fillStyle = hexWithAlpha(settings.primaryColor, 0.16);
  ctx.font = `${Math.round(geometry.baseFontSizePx * 2.6)}px ${resolveFontStack(settings, 400)}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('—', centerX, y + 40);
  ctx.font = `${Math.round(geometry.baseFontSizePx * 0.95)}px ${resolveFontStack(settings, 400)}`;
  ctx.fillStyle = '#747387';
  ctx.fillText(
    direction === 'rtl' ? 'لا توجد خطوات في هذا الدليل.' : 'This guide has no steps yet.',
    centerX,
    y + 84,
  );
  ctx.restore();
}

function drawContentPage(
  ctx: CanvasRenderingContext2D,
  page: PdfContentPage,
  context: RenderContext,
): void {
  const { settings, geometry } = context;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, geometry.widthPx, geometry.heightPx);
  if (settings.templateId === 'gradient') {
    ctx.fillStyle = settings.primaryColor;
    ctx.fillRect(0, 0, geometry.widthPx, 7);
  }
  drawPageChrome(ctx, page, context);

  if (settings.templateId === 'tutorial') {
    ctx.fillStyle = hexWithAlpha(settings.primaryColor, 0.35);
    ctx.fillRect(geometry.marginPx, geometry.marginPx + geometry.headerHeightPx, 3, geometry.contentHeightPx);
  }

  const bodyTop = geometry.marginPx + geometry.headerHeightPx + 8;
  const bodyBottom = geometry.heightPx - geometry.marginPx - geometry.footerHeightPx - 4;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, bodyTop - 6, geometry.widthPx, bodyBottom - bodyTop + 12);
  ctx.clip();

  let cursor = bodyTop;
  let first = true;
  for (const block of page.blocks) {
    if (!first) cursor += settings.stepSpacing;
    if (block.kind === 'empty') {
      drawEmptyState(ctx, context, cursor);
      break;
    }
    cursor = drawStepBlockAt(ctx, block, context, cursor);
    first = false;
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Cover pages                                                         */
/* ------------------------------------------------------------------ */

interface CoverMetaItem {
  label: string;
  value: string;
}

function coverMetaItems(settings: PdfDesignSettings, direction: 'rtl' | 'ltr'): CoverMetaItem[] {
  const items: CoverMetaItem[] = [];
  if (settings.coverShowAuthor && settings.author) {
    items.push({ label: direction === 'rtl' ? 'إعداد' : 'Prepared by', value: settings.author });
  }
  if (settings.coverShowCompany && settings.company) {
    items.push({ label: direction === 'rtl' ? 'الجهة' : 'Organization', value: settings.company });
  }
  if (settings.coverShowDate && settings.documentDate) {
    items.push({
      label: direction === 'rtl' ? 'التاريخ' : 'Date',
      value: formatPdfDate(settings.documentDate, direction),
    });
  }
  return items;
}

function coverLogoMetrics(
  context: RenderContext,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } | null {
  const image = imageFor(context, context.settings.logoDataUrl ?? undefined);
  if (!image || image.width <= 0 || image.height <= 0) return null;
  const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
  return { width: image.width * ratio, height: image.height * ratio };
}

function drawCoverLogo(
  ctx: CanvasRenderingContext2D,
  context: RenderContext,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
  align: CanvasTextAlign = 'start',
): number {
  const { settings } = context;
  const image = settings.logoDataUrl ? imageFor(context, settings.logoDataUrl) : null;
  if (!image) return 0;
  const metrics = coverLogoMetrics(context, maxWidth, maxHeight);
  if (!metrics) return 0;
  const dx =
    align === 'center' ? x - metrics.width / 2 : align === 'right' ? x - metrics.width : x;
  ctx.drawImage(image, dx, y, metrics.width, metrics.height);
  return metrics.height;
}

function drawMetaRow(
  ctx: CanvasRenderingContext2D,
  context: RenderContext,
  xStart: number,
  xEnd: number,
  y: number,
  align: 'start' | 'center',
  palette: { label: string; value: string; border: string },
): number {
  const { settings, geometry, direction } = context;
  const isRTL = direction === 'rtl';
  const labelFont = `${Math.round(geometry.baseFontSizePx * 0.6)}px ${resolveFontStack(settings, 600)}`;
  const valueFont = `${Math.round(geometry.baseFontSizePx * 0.8)}px ${resolveFontStack(settings, 500)}`;

  const items = coverMetaItems(settings, direction);
  if (items.length === 0 && !settings.metadataNote) return y;

  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(xStart, y);
  ctx.lineTo(xEnd, y);
  ctx.stroke();

  const rowHeight = 64;
  const cellY = y + 16;
  const spacing = 34;
  let cursor = isRTL ? xEnd : xStart;

  ctx.save();
  ctx.direction = direction;
  for (const item of items) {
    ctx.font = labelFont;
    ctx.fillStyle = palette.label;
    ctx.textAlign = 'left';
    const labelWidth = ctx.measureText(item.label).width;
    const cellWidth = Math.max(labelWidth, 90);
    const x = align === 'center' ? cursor : cursor;
    const anchor = align === 'center' ? x : isRTL ? x - cellWidth : x + cellWidth;
    ctx.textAlign = isRTL ? 'right' : 'left';
    ctx.fillText(item.label, anchor, cellY + 11);
    ctx.font = valueFont;
    ctx.fillStyle = palette.value;
    ctx.fillText(item.value, anchor, cellY + 34);
    cursor = isRTL ? cursor - cellWidth - spacing : cursor + cellWidth + spacing;
  }
  ctx.restore();

  if (settings.metadataNote) {
    const noteY = cellY + rowHeight + 6;
    ctx.save();
    ctx.direction = direction;
    ctx.font = `${Math.round(geometry.baseFontSizePx * 0.72)}px ${resolveFontStack(settings, 400)}`;
    ctx.fillStyle = palette.label;
    ctx.textAlign = isRTL ? 'right' : 'left';
    drawTextBlock(ctx, settings.metadataNote, {
      x: isRTL ? xEnd : xStart,
      y: noteY,
      maxWidth: xEnd - xStart,
      font: ctx.font as string,
      color: palette.label,
      align: isRTL ? 'right' : 'left',
      direction,
      lineHeight: geometry.baseFontSizePx * 1.35,
      maxLines: 3,
    });
    ctx.restore();
  }
  return y + rowHeight + 24;
}

function coverTitleBlock(
  ctx: CanvasRenderingContext2D,
  context: RenderContext,
  y: number,
  title: string,
  options: {
    maxWidth: number;
    x: number;
    align: CanvasTextAlign;
    titleColor: string;
    subtitleColor: string;
    kickerColor: string;
    descriptionColor: string;
    kicker: string;
    direction: 'rtl' | 'ltr';
    titleSize: number;
    showTitle: boolean;
    subtitle: string;
    description: string;
  },
): number {
  const { geometry, settings } = context;
  const { direction } = options;
  let cursor = y;

  if (options.kicker) {
    ctx.save();
    ctx.direction = direction;
    ctx.font = `${Math.round(geometry.baseFontSizePx * 0.66)}px ${resolveFontStack(settings, 600)}`;
    ctx.fillStyle = options.kickerColor;
    ctx.textAlign = options.align;
    ctx.textBaseline = 'top';
    setLetterSpacing(ctx, '2px');
    ctx.fillText(
      direction === 'rtl' ? options.kicker : options.kicker.toUpperCase(),
      options.direction === 'rtl' ? options.x : options.x,
      cursor,
      options.maxWidth,
    );
    ctx.restore();
    cursor += Math.round(geometry.lineHeightPx * 0.9);
  }

  if (options.showTitle && title) {
    const size = Math.min(options.titleSize, geometry.widthPx * 0.11);
    const font = `700 ${Math.round(size)}px ${resolveFontStack(settings, 700)}`;
    ctx.save();
    ctx.direction = direction;
    ctx.font = font;
    ctx.fillStyle = options.titleColor;
    ctx.textAlign = options.align;
    ctx.textBaseline = 'top';
    const lines = measureWrappedLines(ctx, title, options.maxWidth, font);
    const lineHeight = size * 1.28;
    lines.slice(0, 6).forEach((line, index) => {
      ctx.fillText(line, options.x, cursor + index * lineHeight);
    });
    ctx.restore();
    cursor += lines.slice(0, 6).length * lineHeight + 4;
  }

  if (options.subtitle) {
    const font = `400 ${Math.round(geometry.baseFontSizePx * 1.18)}px ${resolveFontStack(settings, 400)}`;
    const lineHeight = geometry.baseFontSizePx * 1.5;
    drawTextBlock(ctx, options.subtitle, {
      x: options.x,
      y: cursor + 6,
      maxWidth: options.maxWidth,
      font,
      color: options.subtitleColor,
      align: options.align,
      direction,
      lineHeight,
      maxLines: 3,
    });
    const subLines = measureWrappedLines(ctx, options.subtitle, options.maxWidth, font);
    cursor += subLines.slice(0, 3).length * lineHeight + 10;
  }

  if (options.description && options.description !== options.subtitle) {
    const font = `400 ${Math.round(geometry.baseFontSizePx * 0.88)}px ${resolveFontStack(settings, 400)}`;
    const lineHeight = geometry.baseFontSizePx * 1.6;
    drawTextBlock(ctx, options.description, {
      x: options.x,
      y: cursor + 2,
      maxWidth: Math.min(options.maxWidth, geometry.widthPx * 0.64),
      font,
      color: options.descriptionColor,
      align: options.align,
      direction,
      lineHeight,
      maxLines: 4,
    });
    const descLines = measureWrappedLines(
      ctx,
      options.description,
      Math.min(options.maxWidth, geometry.widthPx * 0.64),
      font,
    );
    cursor += descLines.slice(0, 4).length * lineHeight + 8;
  }

  return cursor;
}

function setLetterSpacing(ctx: CanvasRenderingContext2D, value: string): void {
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = value;
}

function drawExecutiveCover(ctx: CanvasRenderingContext2D, context: RenderContext): void {
  const { settings, geometry, direction } = context;
  const isRTL = direction === 'rtl';
  const margin = Math.round(geometry.marginPx * 1.2);
  const startX = isRTL ? geometry.widthPx - margin : margin;
  const innerWidth = geometry.widthPx - margin * 2;
  const align: CanvasTextAlign = isRTL ? 'right' : 'left';

  ctx.fillStyle = '#f8f6f1';
  ctx.fillRect(0, 0, geometry.widthPx, geometry.heightPx);
  ctx.fillStyle = settings.primaryColor;
  ctx.fillRect(0, 0, geometry.widthPx, 12);

  // Brand block (logo + company kicker)
  let topY = margin + 30;
  const logoBottom = drawCoverLogo(
    ctx,
    context,
    isRTL ? startX : startX,
    topY,
    200,
    58,
    isRTL ? 'right' : 'left',
  );
  if (settings.coverShowCompany && settings.company) {
    drawTextBlock(ctx, settings.company, {
      x: startX,
      y: topY + (settings.coverShowLogo ? logoBottom + 10 : 0),
      maxWidth: Math.min(innerWidth * 0.5, 360),
      font: `600 ${Math.round(geometry.baseFontSizePx * 0.78)}px ${resolveFontStack(settings, 600)}`,
      color: settings.primaryColor,
      align,
      direction,
      lineHeight: geometry.baseFontSizePx * 1.35,
      maxLines: 2,
    });
  }

  // Main composition
  const mainY = geometry.heightPx * 0.36;
  ctx.fillStyle = settings.primaryColor;
  ctx.fillRect(isRTL ? startX - 58 : startX, mainY, 58, 3);
  coverTitleBlock(ctx, context, mainY + 22, settings.documentTitle, {
    maxWidth: innerWidth * 0.9,
    x: startX,
    align,
    titleColor: settings.primaryColor,
    subtitleColor: '#555463',
    kickerColor: settings.primaryColor,
    descriptionColor: '#6d6b7a',
    kicker: '',
    direction,
    titleSize: 46,
    showTitle: settings.coverShowTitle,
    subtitle: settings.coverShowSubtitle ? settings.documentSubtitle : '',
    description: settings.documentDescription,
  });

  // Meta line
  drawMetaRow(ctx, context, margin, geometry.widthPx - margin, geometry.heightPx - margin - 110, 'start', {
    label: '#8a8897',
    value: '#343341',
    border: 'rgba(28,43,74,0.2)',
  });

  ctx.fillStyle = hexWithAlpha(settings.accentColor, 0.85);
  ctx.fillRect(0, geometry.heightPx - 6, geometry.widthPx, 6);
}

function drawMinimalCover(ctx: CanvasRenderingContext2D, context: RenderContext): void {
  const { settings, geometry, direction } = context;
  const isRTL = direction === 'rtl';
  const margin = Math.round(geometry.marginPx * 1.15);
  const startX = isRTL ? geometry.widthPx - margin : margin;
  const align: CanvasTextAlign = isRTL ? 'right' : 'left';
  const innerWidth = geometry.widthPx - margin * 2;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, geometry.widthPx, geometry.heightPx);

  const kickerY = margin + 24;
  const logoBottom = drawCoverLogo(ctx, context, startX, kickerY, 180, 52, isRTL ? 'right' : 'left');
  if (settings.coverShowCompany && settings.company) {
    ctx.save();
    ctx.direction = direction;
    ctx.font = `500 ${Math.round(geometry.baseFontSizePx * 0.72)}px ${resolveFontStack(settings, 500)}`;
    ctx.fillStyle = '#6d6b7a';
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    setLetterSpacing(ctx, '2px');
    ctx.fillText(settings.company, startX, kickerY + 22 + logoBottom, Math.min(innerWidth * 0.6, 420));
    ctx.restore();
  }

  coverTitleBlock(ctx, context, geometry.heightPx * 0.34, settings.documentTitle, {
    maxWidth: innerWidth * 0.92,
    x: startX,
    align,
    titleColor: settings.primaryColor,
    subtitleColor: '#555463',
    kickerColor: 'transparent',
    descriptionColor: '#6d6b7a',
    kicker: '',
    direction,
    titleSize: 58,
    showTitle: settings.coverShowTitle,
    subtitle: settings.coverShowSubtitle ? settings.documentSubtitle : '',
    description: settings.documentDescription,
  });

  drawMetaRow(ctx, context, margin, geometry.widthPx - margin, geometry.heightPx - margin - 96, 'start', {
    label: '#8a8897',
    value: '#343341',
    border: 'rgba(20,20,20,0.14)',
  });
}

function drawTechnicalCover(ctx: CanvasRenderingContext2D, context: RenderContext): void {
  const { settings, geometry, direction } = context;
  const isRTL = direction === 'rtl';
  const margin = geometry.marginPx;
  const startX = isRTL ? geometry.widthPx - margin : margin;
  const align: CanvasTextAlign = isRTL ? 'right' : 'left';

  ctx.fillStyle = '#fbfcfe';
  ctx.fillRect(0, 0, geometry.widthPx, geometry.heightPx);

  // Light grid backdrop
  ctx.strokeStyle = 'rgba(15,23,42,0.05)';
  ctx.lineWidth = 1;
  const step = 26;
  for (let x = step; x < geometry.widthPx; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, geometry.heightPx);
    ctx.stroke();
  }
  for (let y = step; y < geometry.heightPx; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(geometry.widthPx, y);
    ctx.stroke();
  }

  // Top rule
  ctx.fillStyle = settings.secondaryColor;
  ctx.fillRect(margin, margin + 10, geometry.contentWidthPx, 2);

  const topY = margin + 30;
  ctx.save();
  ctx.direction = direction;
  ctx.font = `${Math.round(geometry.baseFontSizePx * 0.68)}px ${resolveFontStack(settings, 600)}`;
  ctx.fillStyle = settings.secondaryColor;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  setLetterSpacing(ctx, '2px');
  ctx.fillText(direction === 'rtl' ? 'توثيق / دليــل' : 'DOCUMENTATION', startX, topY);
  ctx.restore();
  drawCoverLogo(ctx, context, isRTL ? geometry.widthPx - margin : margin + geometry.contentWidthPx, topY - 10, 190, 56, isRTL ? 'right' : 'left');

  const titleY = geometry.heightPx * 0.3;
  coverTitleBlock(ctx, context, titleY, settings.documentTitle, {
    maxWidth: geometry.contentWidthPx * 0.92,
    x: startX,
    align,
    titleColor: settings.primaryColor,
    subtitleColor: '#4a5268',
    kickerColor: 'transparent',
    descriptionColor: '#6d6b7a',
    kicker: '',
    direction,
    titleSize: 46,
    showTitle: settings.coverShowTitle,
    subtitle: settings.coverShowSubtitle ? settings.documentSubtitle : '',
    description: settings.documentDescription,
  });

  // Monospace metadata table
  const tableY = Math.max(geometry.heightPx * 0.62, titleY + 190);
  ctx.strokeStyle = 'rgba(15,23,42,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin, tableY);
  ctx.lineTo(geometry.widthPx - margin, tableY);
  ctx.stroke();

  const meta = coverMetaItems(settings, direction);
  const cells: Array<{ label: string; value: string }> = [
    { label: direction === 'rtl' ? 'القسم' : 'SECTION', value: 'Operations' },
    { label: direction === 'rtl' ? 'الإصدار' : 'VERSION', value: '1.4.0' },
    ...meta,
  ];
  const cellWidth = Math.min(geometry.contentWidthPx / 2, 260);
  const rowHeight = 46;
  cells.slice(0, 4).forEach((cell, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const cellX = isRTL
      ? geometry.widthPx - margin - cellWidth - column * cellWidth
      : margin + column * cellWidth;
    const cellY = tableY + 22 + row * (rowHeight + 18);
    ctx.save();
    ctx.direction = direction;
    ctx.textAlign = align;
    ctx.fillStyle = '#79839a';
    ctx.font = `${Math.round(geometry.baseFontSizePx * 0.6)}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    setLetterSpacing(ctx, '1.5px');
    ctx.fillText(cell.label, isRTL ? cellX + cellWidth : cellX, cellY);
    ctx.font = `500 ${Math.round(geometry.baseFontSizePx * 0.8)}px ${resolveFontStack(settings, 500)}`;
    ctx.fillStyle = '#162033';
    ctx.fillText(cell.value, isRTL ? cellX + cellWidth : cellX, cellY + 19, cellWidth);
    ctx.restore();
  });

  if (settings.metadataNote) {
    ctx.save();
    ctx.direction = direction;
    ctx.fillStyle = '#79839a';
    ctx.font = `${Math.round(geometry.baseFontSizePx * 0.64)}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    ctx.textAlign = align;
    ctx.fillText(`// ${settings.metadataNote}`, startX, tableY + 22 + 2 * (rowHeight + 18) + 12, geometry.contentWidthPx);
    ctx.restore();
  }
}

function drawGradientCover(ctx: CanvasRenderingContext2D, context: RenderContext): void {
  const { settings, geometry, direction } = context;
  const isRTL = direction === 'rtl';
  const margin = geometry.marginPx;
  const startX = isRTL ? geometry.widthPx - margin : margin;
  const align: CanvasTextAlign = isRTL ? 'right' : 'left';

  const gradient = ctx.createLinearGradient(0, 0, geometry.widthPx, geometry.heightPx);
  gradient.addColorStop(0, settings.primaryColor);
  gradient.addColorStop(1, settings.secondaryColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, geometry.widthPx, geometry.heightPx);

  // Soft decorative orbs
  const orb = (cx: number, cy: number, r: number, alpha: number) => {
    const rad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    rad.addColorStop(0, `rgba(255,255,255,${alpha})`);
    rad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  };
  orb(isRTL ? geometry.widthPx * 0.12 : geometry.widthPx * 0.88, -60, 260, 0.25);
  orb(isRTL ? geometry.widthPx * 0.9 : geometry.widthPx * 0.1, geometry.heightPx * 0.9, 300, 0.18);

  const topY = margin + 8;
  if (settings.coverShowCompany && settings.company) {
    ctx.save();
    ctx.direction = direction;
    ctx.font = `600 ${Math.round(geometry.baseFontSizePx * 0.74)}px ${resolveFontStack(settings, 600)}`;
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    setLetterSpacing(ctx, '2px');
    ctx.fillText(settings.company, startX, topY + 12, geometry.contentWidthPx * 0.6);
    ctx.restore();
  }
  drawCoverLogo(ctx, context, isRTL ? geometry.widthPx - margin : geometry.widthPx - margin, topY - 4, 170, 52, align);

  const mainY = geometry.heightPx * 0.33;
  coverTitleBlock(ctx, context, mainY, settings.documentTitle, {
    maxWidth: geometry.contentWidthPx * 0.88,
    x: startX,
    align,
    titleColor: '#ffffff',
    subtitleColor: 'rgba(255,255,255,0.85)',
    kickerColor: 'rgba(255,255,255,0.7)',
    descriptionColor: 'rgba(255,255,255,0.7)',
    kicker: isRTL ? 'دليل عمليات' : '',
    direction,
    titleSize: 52,
    showTitle: settings.coverShowTitle,
    subtitle: settings.coverShowSubtitle ? settings.documentSubtitle : '',
    description: settings.documentDescription,
  });

  drawMetaRow(ctx, context, margin, geometry.widthPx - margin, geometry.heightPx - margin - 96, 'start', {
    label: 'rgba(255,255,255,0.6)',
    value: '#ffffff',
    border: 'rgba(255,255,255,0.28)',
  });
}

function drawTutorialCover(ctx: CanvasRenderingContext2D, context: RenderContext): void {
  const { settings, geometry, direction } = context;
  const isRTL = direction === 'rtl';
  const margin = geometry.marginPx;
  const startX = isRTL ? geometry.widthPx - margin : margin;
  const align: CanvasTextAlign = isRTL ? 'right' : 'left';
  const innerWidth = geometry.widthPx - margin * 2;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, geometry.widthPx, geometry.heightPx);

  // Band
  const bandH = Math.round(geometry.heightPx * 0.3);
  ctx.fillStyle = settings.primaryColor;
  ctx.fillRect(0, 0, geometry.widthPx, bandH);

  ctx.save();
  ctx.direction = direction;
  ctx.font = `600 ${Math.round(geometry.baseFontSizePx * 0.78)}px ${resolveFontStack(settings, 600)}`;
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  setLetterSpacing(ctx, '2px');
  ctx.fillText(isRTL ? 'دليل تعليمي' : 'TUTORIAL', startX, margin + 26);
  ctx.restore();
  drawCoverLogo(ctx, context, isRTL ? geometry.widthPx - margin : geometry.widthPx - margin, margin + 8, 170, 52, align);

  ctx.save();
  ctx.direction = direction;
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.beginPath();
  ctx.arc(isRTL ? geometry.widthPx * 0.15 : geometry.widthPx * 0.85, bandH - 60, 74, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Body
  const titleY = bandH + 46;
  coverTitleBlock(ctx, context, titleY, settings.documentTitle, {
    maxWidth: innerWidth * 0.92,
    x: startX,
    align,
    titleColor: settings.secondaryColor,
    subtitleColor: '#5d5b6c',
    kickerColor: 'transparent',
    descriptionColor: '#5d5b6c',
    kicker: '',
    direction,
    titleSize: 44,
    showTitle: settings.coverShowTitle,
    subtitle: settings.coverShowSubtitle ? settings.documentSubtitle : '',
    description: settings.documentDescription,
  });

  // Goal box
  const goal = isRTL
    ? settings.metadataNote || 'اتبع الخطوات بالترتيب للوصول إلى النتيجة.'
    : settings.metadataNote || 'Follow the steps in order to reach the result.';
  const boxY = geometry.heightPx * 0.68;
  const boxH = 68;
  fillRoundedRect(ctx, margin, boxY, innerWidth, boxH, 10, settings.accentColor);
  ctx.fillStyle = hexWithAlpha(settings.primaryColor, 0.16);
  ctx.fillRect(margin, boxY, 4, boxH);
  ctx.fillStyle = settings.primaryColor;
  ctx.beginPath();
  ctx.arc(isRTL ? margin + innerWidth - 26 : margin + 26, boxY + boxH / 2, 9, 0, Math.PI * 2);
  ctx.fill();
  drawTextBlock(ctx, goal, {
    x: isRTL ? margin + innerWidth - 48 : margin + 48,
    y: boxY + 13,
    maxWidth: innerWidth - 96,
    font: `400 ${Math.round(geometry.baseFontSizePx * 0.86)}px ${resolveFontStack(settings, 400)}`,
    color: settings.secondaryColor,
    align,
    direction,
    lineHeight: geometry.baseFontSizePx * 1.5,
    maxLines: 2,
  });

  drawMetaRow(ctx, context, margin, geometry.widthPx - margin, geometry.heightPx - margin - 60, 'start', {
    label: '#8a8897',
    value: '#343341',
    border: 'rgba(78,34,159,0.16)',
  });
}

function drawBrandCover(ctx: CanvasRenderingContext2D, context: RenderContext): void {
  const { settings, geometry, direction } = context;
  const isRTL = direction === 'rtl';
  const margin = Math.round(geometry.marginPx * 1.15);
  const bandWidth = Math.round(geometry.widthPx * 0.34);
  const bandX = isRTL ? 0 : geometry.widthPx - bandWidth;
  const mainWidth = geometry.widthPx - bandWidth;
  const innerPadding = Math.round(margin * 1.15);
  const columnLeft = isRTL ? bandWidth + innerPadding : innerPadding;
  const innerWidth = mainWidth - innerPadding * 2;
  const startX = isRTL ? columnLeft + innerWidth : columnLeft;
  const align: CanvasTextAlign = isRTL ? 'right' : 'left';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, geometry.widthPx, geometry.heightPx);

  const band = ctx.createLinearGradient(
    isRTL ? bandX + bandWidth : bandX,
    0,
    isRTL ? bandX : bandX + bandWidth,
    geometry.heightPx,
  );
  band.addColorStop(0, settings.primaryColor);
  band.addColorStop(1, settings.secondaryColor);
  ctx.fillStyle = band;
  ctx.fillRect(bandX, 0, bandWidth, geometry.heightPx);
  ctx.fillStyle = settings.accentColor;
  const accentX = isRTL ? bandX + bandWidth - 8 : bandX;
  ctx.fillRect(accentX, geometry.heightPx * 0.22, 8, geometry.heightPx * 0.42);

  // Logo inside the band (white)
  if (settings.logoDataUrl) {
    const image = imageFor(context, settings.logoDataUrl);
    if (image) {
      const maxW = bandWidth * 0.62;
      const ratio = Math.min(maxW / image.width, 54 / image.height);
      const w = image.width * ratio;
      const h = image.height * ratio;
      const logoX = isRTL ? bandX + bandWidth / 2 - w / 2 : bandX + bandWidth / 2 - w / 2;
      ctx.drawImage(image, logoX, geometry.heightPx * 0.28, w, h);
    }
  }

  ctx.save();
  ctx.direction = direction;
  ctx.font = `600 ${Math.round(geometry.baseFontSizePx * 0.66)}px ${resolveFontStack(settings, 600)}`;
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  setLetterSpacing(ctx, '2px');
  const kicker = settings.company || (isRTL ? 'هوية العلامة' : 'BRAND');
  ctx.fillText(kicker, bandX + bandWidth / 2, geometry.heightPx * 0.52, bandWidth - 24);
  ctx.restore();

  const mainY = geometry.heightPx * 0.3;
  coverTitleBlock(ctx, context, mainY, settings.documentTitle, {
    maxWidth: innerWidth,
    x: startX,
    align,
    titleColor: settings.secondaryColor,
    subtitleColor: '#555463',
    kickerColor: settings.primaryColor,
    descriptionColor: '#6d6b7a',
    kicker: isRTL ? 'دليل عمليات' : 'OPERATIONS',
    direction,
    titleSize: 44,
    showTitle: settings.coverShowTitle,
    subtitle: settings.coverShowSubtitle ? settings.documentSubtitle : '',
    description: settings.documentDescription,
  });

  drawMetaRow(ctx, context, columnLeft, columnLeft + innerWidth, geometry.heightPx - margin - 70, 'start', {
    label: '#8a8897',
    value: '#343341',
    border: 'rgba(35,35,49,0.16)',
  });
}

function drawCenteredCover(ctx: CanvasRenderingContext2D, context: RenderContext): void {
  const { settings, geometry, direction } = context;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, geometry.widthPx, geometry.heightPx);

  ctx.fillStyle = hexWithAlpha(settings.primaryColor, 0.14);
  ctx.beginPath();
  ctx.arc(geometry.widthPx * 0.92, -40, 150, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(geometry.widthPx * 0.08, geometry.heightPx + 60, 170, 0, Math.PI * 2);
  ctx.fill();

  const centerX = geometry.widthPx / 2;
  const kickerY = geometry.heightPx * 0.24;
  drawCoverLogo(ctx, context, centerX, kickerY, 220, 64, 'center');

  if (settings.coverShowCompany && settings.company) {
    ctx.save();
    ctx.direction = direction;
    ctx.font = `600 ${Math.round(geometry.baseFontSizePx * 0.68)}px ${resolveFontStack(settings, 600)}`;
    ctx.fillStyle = settings.primaryColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    setLetterSpacing(ctx, '2px');
    ctx.fillText(settings.company, centerX, kickerY + 86, geometry.widthPx * 0.7);
    ctx.restore();
  }

  coverTitleBlock(ctx, context, kickerY + 116, settings.documentTitle, {
    maxWidth: geometry.widthPx * 0.76,
    x: centerX,
    align: 'center',
    titleColor: settings.secondaryColor,
    subtitleColor: '#555463',
    kickerColor: 'transparent',
    descriptionColor: '#6d6b7a',
    kicker: '',
    direction,
    titleSize: 46,
    showTitle: settings.coverShowTitle,
    subtitle: settings.coverShowSubtitle ? settings.documentSubtitle : '',
    description: settings.documentDescription,
  });

  const metaWidth = geometry.widthPx * 0.6;
  const metaLeft = (geometry.widthPx - metaWidth) / 2;
  drawMetaRow(ctx, context, metaLeft, metaLeft + metaWidth, geometry.heightPx - geometry.marginPx - 46, 'center', {
    label: '#8a8897',
    value: '#343341',
    border: 'rgba(35,35,49,0.16)',
  });
}

function drawSplitCover(ctx: CanvasRenderingContext2D, context: RenderContext): void {
  const { settings, geometry, direction } = context;
  const isRTL = direction === 'rtl';
  const asideWidth = Math.round(geometry.widthPx * 0.36);
  const margin = Math.round(geometry.marginPx * 1.05);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, geometry.widthPx, geometry.heightPx);

  const asideX = isRTL ? geometry.widthPx - asideWidth : 0;
  const aside = ctx.createLinearGradient(
    asideX,
    0,
    asideX + asideWidth,
    geometry.heightPx,
  );
  aside.addColorStop(0, settings.primaryColor);
  aside.addColorStop(1, settings.secondaryColor);
  ctx.fillStyle = aside;
  ctx.fillRect(asideX, 0, asideWidth, geometry.heightPx);

  const asideAlign: CanvasTextAlign = isRTL ? 'right' : 'left';

  if (settings.coverShowCompany && settings.company) {
    ctx.save();
    ctx.direction = direction;
    ctx.font = `600 ${Math.round(geometry.baseFontSizePx * 0.72)}px ${resolveFontStack(settings, 600)}`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textAlign = asideAlign;
    ctx.textBaseline = 'middle';
    setLetterSpacing(ctx, '2px');
    ctx.fillText(settings.company, isRTL ? asideX + asideWidth - margin : asideX + margin, margin + 30, asideWidth - margin * 2);
    ctx.restore();
  }

  drawCoverLogo(
    ctx,
    context,
    isRTL ? asideX + asideWidth - margin : asideX + margin,
    margin + 64,
    asideWidth - margin * 2,
    56,
    asideAlign,
  );

  const asideBottom = geometry.heightPx - margin - 24;
  ctx.save();
  ctx.direction = direction;
  ctx.font = `400 ${Math.round(geometry.baseFontSizePx * 0.68)}px ${resolveFontStack(settings, 400)}`;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.textAlign = asideAlign;
  if (settings.coverShowDate && settings.documentDate) {
    ctx.fillText(formatPdfDate(settings.documentDate, direction), isRTL ? asideX + asideWidth - margin : asideX + margin, asideBottom - 22);
  }
  if (settings.coverShowAuthor && settings.author) {
    ctx.fillText(settings.author, isRTL ? asideX + asideWidth - margin : asideX + margin, asideBottom);
  }
  ctx.restore();

  const mainX = isRTL ? margin : asideWidth + margin;
  const mainWidth = geometry.widthPx - asideWidth - margin * 2;
  const mainY = geometry.heightPx * 0.28;
  coverTitleBlock(ctx, context, mainY, settings.documentTitle, {
    maxWidth: mainWidth,
    x: isRTL ? mainX + mainWidth : mainX,
    align: asideAlign,
    titleColor: settings.secondaryColor,
    subtitleColor: '#555463',
    kickerColor: settings.primaryColor,
    descriptionColor: '#6d6b7a',
    kicker: isRTL ? 'دليل عمليات' : 'OPERATIONAL GUIDE',
    direction,
    titleSize: 40,
    showTitle: settings.coverShowTitle,
    subtitle: settings.coverShowSubtitle ? settings.documentSubtitle : '',
    description: settings.documentDescription,
  });
}

function drawCoverPage(ctx: CanvasRenderingContext2D, context: RenderContext): void {
  const { settings } = context;
  if (settings.coverLayout === 'centered') return drawCenteredCover(ctx, context);
  if (settings.coverLayout === 'split') return drawSplitCover(ctx, context);
  switch (settings.templateId) {
    case 'minimal':
      return drawMinimalCover(ctx, context);
    case 'tutorial':
      return drawTutorialCover(ctx, context);
    case 'gradient':
      return drawGradientCover(ctx, context);
    case 'technical':
      return drawTechnicalCover(ctx, context);
    case 'brand':
      return drawBrandCover(ctx, context);
    default:
      return drawExecutiveCover(ctx, context);
  }
}

/* ------------------------------------------------------------------ */
/* Entry points                                                        */
/* ------------------------------------------------------------------ */

export function renderPdfPageToCanvas(input: {
  page: PdfPagePlan;
  settings: PdfDesignSettings;
  geometry: PdfPageGeometry;
  direction: 'rtl' | 'ltr';
  images: Map<string, HTMLImageElement>;
}): HTMLCanvasElement {
  const { page, settings, geometry, direction, images } = input;
  const { canvas, ctx } = createCanvas(geometry.widthPx, geometry.heightPx, RENDER_SCALE);
  const context: RenderContext = { settings, geometry, direction, images };

  try {
    if (page.kind === 'cover') {
      drawCoverPage(ctx, context);
    } else {
      drawContentPage(ctx, page, context);
    }
  } catch (error) {
    // Never let one page kill the whole export; fall back to a plain page.
    console.error('Failed to render PDF page', error);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, geometry.widthPx, geometry.heightPx);
    if (page.kind === 'content') {
      drawPageChrome(ctx, page, context);
    }
  }
  return canvas;
}

/**
 * Asks the browser to download every font weight the renderer uses so canvas
 * text does not fall back to a system font when it runs before the preview
 * has loaded anything.
 */
export async function ensurePdfFontsLoaded(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts?.load) return;
  const families = ['"IBM Plex Sans Arabic"', '"Noto Naskh Arabic"'];
  const weights = [400, 500, 600, 700];
  try {
    await Promise.all(
      families.flatMap((family) =>
        weights.map((weight) => document.fonts.load(`${weight} 16px ${family}`)),
      ),
    );
  } catch {
    // Font loading is best-effort; drawing falls back gracefully.
  }
  try {
    await document.fonts.ready;
  } catch {
    // ignore
  }
}
