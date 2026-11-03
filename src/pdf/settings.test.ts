import { describe, expect, it } from 'vitest';
import {
  createDefaultSettings,
  PDF_TEMPLATES,
} from './templates';
import {
  createSettingsForGuide,
  isValidLogoDataUrl,
  normalizeHexColor,
  pageDimensions,
  PDF_FONT_STACKS,
  pxPerMm,
  sanitizeFileStem,
  sanitizePdfSettings,
} from './settings';

const guide = {
  title: 'دليل',
  description: 'وصف',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('PDF settings', () => {
  it('returns the fallback for non-object input', () => {
    const fallback = createDefaultSettings(guide);
    expect(sanitizePdfSettings(null, fallback)).toEqual(fallback);
    expect(sanitizePdfSettings('nope', fallback)).toEqual(fallback);
    expect(sanitizePdfSettings([], fallback)).toEqual(fallback);
  });

  it('normalizes colours and rejects unsafe values', () => {
    expect(normalizeHexColor('#ABC', '#000000')).toBe('#aabbcc');
    expect(normalizeHexColor('#112233', '#000000')).toBe('#112233');
    expect(normalizeHexColor('red', '#000000')).toBe('#000000');
    expect(normalizeHexColor(42, '#000000')).toBe('#000000');

    const fallback = createDefaultSettings(guide);
    const sanitized = sanitizePdfSettings(
      { ...fallback, primaryColor: 'url(javascript:alert(1))' },
      fallback,
    );
    expect(sanitized.primaryColor).toBe(fallback.primaryColor);
  });

  it('clamps numeric ranges and enforces enums', () => {
    const fallback = createDefaultSettings(guide);
    const sanitized = sanitizePdfSettings(
      {
        ...fallback,
        baseFontSize: 999,
        lineHeight: -4,
        marginMm: 1,
        screenshotWidthPercent: 5000,
        screenshotRadius: -10,
        stepSpacing: 1000,
        pageSize: 'a3',
        orientation: 'sideways',
        fontId: 'comic',
        templateId: 'nope',
        screenshotStyle: 'hologram',
      },
      fallback,
    );
    expect(sanitized.baseFontSize).toBe(16);
    expect(sanitized.lineHeight).toBe(1.35);
    expect(sanitized.marginMm).toBe(10);
    expect(sanitized.screenshotWidthPercent).toBe(100);
    expect(sanitized.screenshotRadius).toBe(0);
    expect(sanitized.stepSpacing).toBe(16);
    expect(sanitized.pageSize).toBe(fallback.pageSize);
    expect(sanitized.orientation).toBe(fallback.orientation);
    expect(sanitized.fontId).toBe(fallback.fontId);
    expect(sanitized.templateId).toBe(fallback.templateId);
    expect(sanitized.screenshotStyle).toBe(fallback.screenshotStyle);
  });

  it('accepts boolean toggles only', () => {
    const fallback = createDefaultSettings(guide);
    const sanitized = sanitizePdfSettings(
      { ...fallback, showCover: false, showHeader: 'yes', showFooter: 0 },
      fallback,
    );
    expect(sanitized.showCover).toBe(false);
    expect(sanitized.showHeader).toBe(fallback.showHeader);
    expect(sanitized.showFooter).toBe(fallback.showFooter);
  });

  it('validates A4 and Letter dimensions in both orientations', () => {
    expect(pageDimensions({ pageSize: 'a4', orientation: 'portrait' })).toEqual({
      widthMm: 210,
      heightMm: 297,
    });
    expect(pageDimensions({ pageSize: 'a4', orientation: 'landscape' })).toEqual({
      widthMm: 297,
      heightMm: 210,
    });
    const letter = pageDimensions({ pageSize: 'letter', orientation: 'portrait' });
    expect(letter.widthMm).toBeCloseTo(215.9, 1);
    expect(letter.heightMm).toBeCloseTo(279.4, 1);
  });

  it('produces a safe file stem', () => {
    expect(sanitizeFileStem('تقرير: العميل / 2026?')) .toBe('تقرير- العميل - 2026-');
    expect(sanitizeFileStem('   ')).toBe('دليل');
    expect(sanitizeFileStem('a'.repeat(200)).length).toBe(90);
  });

  it('only accepts raster image data URLs for logos', () => {
    expect(isValidLogoDataUrl('data:image/png;base64,AAAA')).toBe(true);
    expect(isValidLogoDataUrl('data:image/jpeg;base64,AAAA')).toBe(true);
    expect(isValidLogoDataUrl('data:image/webp;base64,AAAA')).toBe(true);
    expect(isValidLogoDataUrl('data:image/svg+xml;base64,AAAA')).toBe(false);
    expect(isValidLogoDataUrl('https://example.com/logo.png')).toBe(false);
    expect(isValidLogoDataUrl(null)).toBe(false);
  });

  it('loads saved settings but applies an explicit template override', () => {
    const saved = { ...createDefaultSettings(guide), primaryColor: '#123456' };
    const merged = createSettingsForGuide(guide, saved, 'brand');
    expect(merged.templateId).toBe('brand');
    expect(merged.primaryColor).toBe('#123456');
    const plain = createSettingsForGuide(guide, null);
    expect(plain.templateId).toBe(PDF_TEMPLATES[0].id);
  });

  it('exposes font stacks for every bundled font', () => {
    expect(Object.keys(PDF_FONT_STACKS)).toEqual(['plex', 'naskh', 'system']);
    expect(pxPerMm()).toBeCloseTo(3.7795, 3);
  });
});
