import { PDF_FONT_STACKS } from './settings';
import type { PdfDesignSettings, PdfPageGeometry } from './types';

export type TextMeasurer = (text: string) => number;

/**
 * Rough but deterministic height estimation used when the DOM is unavailable
 * (unit tests, service workers) or a probe reports no box. It mirrors the
 * wrapping rules of `.pdf-step-text` closely enough to avoid clipping.
 */
export function estimateTextHeight(
  text: string,
  geometry: PdfPageGeometry,
  settings: Pick<PdfDesignSettings, 'lineHeight'>,
): number {
  if (!text) return 0;
  const averageGlyph = Math.max(4, geometry.baseFontSizePx * 0.52);
  const charsPerLine = Math.max(12, Math.floor(geometry.contentWidthPx / averageGlyph));
  const paragraphs = text.split('\n');
  let lines = 0;
  for (const paragraph of paragraphs) {
    lines += Math.max(1, Math.ceil(paragraph.length / charsPerLine));
  }
  return Math.max(
    Math.round(lines * geometry.lineHeightPx),
    Math.round(geometry.lineHeightPx * settings.lineHeight * 0.9),
  );
}

export interface TextMeasurerHandle {
  measure: TextMeasurer;
  dispose: () => void;
}

/**
 * Measures wrapped text using a hidden probe with exactly the same width,
 * font and line-height as the rendered page. This keeps pagination and the
 * rendered document in agreement.
 */
export function createTextMeasurer(
  settings: PdfDesignSettings,
  geometry: PdfPageGeometry,
  direction: 'rtl' | 'ltr',
): TextMeasurerHandle {
  const fallback: TextMeasurer = (text) => estimateTextHeight(text, geometry, settings);

  if (typeof document === 'undefined' || !document.body) {
    return { measure: fallback, dispose: () => undefined };
  }

  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.dir = direction;
  Object.assign(probe.style, {
    position: 'fixed',
    top: '-10000px',
    left: '-10000px',
    width: `${geometry.contentWidthPx}px`,
    padding: '0',
    border: '0',
    margin: '0',
    boxSizing: 'content-box',
    visibility: 'hidden',
    pointerEvents: 'none',
    fontFamily: PDF_FONT_STACKS[settings.fontId],
    fontSize: `${geometry.baseFontSizePx}px`,
    lineHeight: `${geometry.lineHeightPx}px`,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
    tabSize: '4',
  });

  let attached = false;

  const ensureAttached = () => {
    if (attached) return;
    document.body.appendChild(probe);
    attached = true;
  };

  const measure: TextMeasurer = (text) => {
    if (!text) return 0;
    ensureAttached();
    probe.textContent = text;
    const height = probe.scrollHeight;
    if (!Number.isFinite(height) || height <= 0) return fallback(text);
    return Math.ceil(height);
  };

  return {
    measure,
    dispose: () => {
      probe.remove();
      attached = false;
    },
  };
}
