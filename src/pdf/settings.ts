import type { Guide } from '../shared/types';
import { createDefaultSettings, isPdfTemplateId } from './templates';
import type {
  PdfCoverLayout,
  PdfDesignSettings,
  PdfDirection,
  PdfFontId,
  PdfNumberingStyle,
  PdfOrientation,
  PdfPageSize,
  PdfScreenshotStyle,
} from './types';

export const PDF_DESIGN_TITLE_MAX = 180;
export const PDF_DESIGN_SUBTITLE_MAX = 400;
export const PDF_DESIGN_DESCRIPTION_MAX = 900;
export const PDF_DESIGN_PERSON_MAX = 120;
export const PDF_DESIGN_FOOTER_MAX = 240;
export const PDF_DESIGN_METADATA_MAX = 240;
export const PDF_PRESET_NAME_MAX = 60;
export const MAX_PDF_PRESETS = 30;
export const MAX_LOGO_FILE_BYTES = 1024 * 1024;
export const MAX_LOGO_DATA_URL_LENGTH = 2_800_000;
export const MAX_LOGO_DIMENSION = 1600;

const PAGE_SIZES: PdfPageSize[] = ['a4', 'letter'];
const ORIENTATIONS: PdfOrientation[] = ['portrait', 'landscape'];
const SCREENSHOT_STYLES: PdfScreenshotStyle[] = [
  'standard',
  'framed',
  'full',
  'compact',
  'annotated',
];
const NUMBERING_STYLES: PdfNumberingStyle[] = ['badge', 'plain', 'outline'];
const FONT_IDS: PdfFontId[] = ['plex', 'naskh', 'system'];
const DIRECTIONS: PdfDirection[] = ['auto', 'rtl', 'ltr'];
const COVER_LAYOUTS: PdfCoverLayout[] = ['template', 'centered', 'split'];

export const PDF_PAGE_DIMENSIONS_MM: Record<
  PdfPageSize,
  { width: number; height: number }
> = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
};

export const PDF_FONT_STACKS: Record<PdfFontId, string> = {
  plex: '"IBM Plex Sans Arabic", "SF Arabic", "Segoe UI", Tahoma, Arial, sans-serif',
  naskh: '"Noto Naskh Arabic", "Traditional Arabic", "IBM Plex Sans Arabic", serif',
  system: '"SF Arabic", "Segoe UI", Tahoma, Arial, sans-serif',
};

export const PDF_FONT_LABELS: Record<PdfFontId, string> = {
  plex: 'IBM Plex Sans Arabic',
  naskh: 'Noto Naskh Arabic',
  system: 'خط النظام',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finite(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function text(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== 'string') return fallback;
  return value.slice(0, maxLength);
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function oneOf<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function normalizeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed
      .slice(1)
      .split('')
      .map((part) => `${part}${part}`)
      .join('')}`.toLowerCase();
  }
  return fallback;
}

export function isValidLogoDataUrl(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= MAX_LOGO_DATA_URL_LENGTH &&
    /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=\s]+$/i.test(value)
  );
}

export function sanitizePdfSettings(
  value: unknown,
  fallback: PdfDesignSettings = createDefaultSettings(null),
): PdfDesignSettings {
  if (typeof value !== 'object' || value === null) return fallback;
  const raw = value as Record<string, unknown>;
  const templateId = isPdfTemplateId(raw.templateId) ? raw.templateId : fallback.templateId;
  const logo = raw.logoDataUrl === null ? null : isValidLogoDataUrl(raw.logoDataUrl)
    ? raw.logoDataUrl
    : fallback.logoDataUrl;

  return {
    templateId,
    documentTitle: text(raw.documentTitle, fallback.documentTitle, PDF_DESIGN_TITLE_MAX),
    documentSubtitle: text(
      raw.documentSubtitle,
      fallback.documentSubtitle,
      PDF_DESIGN_SUBTITLE_MAX,
    ),
    documentDescription: text(
      raw.documentDescription,
      fallback.documentDescription,
      PDF_DESIGN_DESCRIPTION_MAX,
    ),
    author: text(raw.author, fallback.author, PDF_DESIGN_PERSON_MAX),
    company: text(raw.company, fallback.company, PDF_DESIGN_PERSON_MAX),
    documentDate:
      typeof raw.documentDate === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(raw.documentDate)
        ? raw.documentDate
        : fallback.documentDate,
    metadataNote: text(raw.metadataNote, fallback.metadataNote, PDF_DESIGN_METADATA_MAX),
    logoDataUrl: logo,
    primaryColor: normalizeHexColor(raw.primaryColor, fallback.primaryColor),
    secondaryColor: normalizeHexColor(raw.secondaryColor, fallback.secondaryColor),
    accentColor: normalizeHexColor(raw.accentColor, fallback.accentColor),
    fontId: oneOf(raw.fontId, FONT_IDS, fallback.fontId),
    baseFontSize: clamp(finite(raw.baseFontSize, fallback.baseFontSize), 9, 16),
    lineHeight: clamp(finite(raw.lineHeight, fallback.lineHeight), 1.35, 2.2),
    direction: oneOf(raw.direction, DIRECTIONS, fallback.direction),
    pageSize: oneOf(raw.pageSize, PAGE_SIZES, fallback.pageSize),
    orientation: oneOf(raw.orientation, ORIENTATIONS, fallback.orientation),
    marginMm: clamp(finite(raw.marginMm, fallback.marginMm), 10, 30),
    stepSpacing: clamp(finite(raw.stepSpacing, fallback.stepSpacing), 0, 16),
    screenshotStyle: oneOf(raw.screenshotStyle, SCREENSHOT_STYLES, fallback.screenshotStyle),
    screenshotWidthPercent: clamp(
      finite(raw.screenshotWidthPercent, fallback.screenshotWidthPercent),
      35,
      100,
    ),
    screenshotAlign: oneOf(
      raw.screenshotAlign,
      ['start', 'center', 'end'] as const,
      fallback.screenshotAlign,
    ),
    screenshotRadius: clamp(finite(raw.screenshotRadius, fallback.screenshotRadius), 0, 20),
    numberingStyle: oneOf(raw.numberingStyle, NUMBERING_STYLES, fallback.numberingStyle),
    showHeader: bool(raw.showHeader, fallback.showHeader),
    showHeaderTitle: bool(raw.showHeaderTitle, fallback.showHeaderTitle),
    showHeaderLogo: bool(raw.showHeaderLogo, fallback.showHeaderLogo),
    showFooter: bool(raw.showFooter, fallback.showFooter),
    showPageNumber: bool(raw.showPageNumber, fallback.showPageNumber),
    showFooterCompany: bool(raw.showFooterCompany, fallback.showFooterCompany),
    footerText: text(raw.footerText, fallback.footerText, PDF_DESIGN_FOOTER_MAX),
    showCover: bool(raw.showCover, fallback.showCover),
    coverLayout: oneOf(raw.coverLayout, COVER_LAYOUTS, fallback.coverLayout),
    coverShowTitle: bool(raw.coverShowTitle, fallback.coverShowTitle),
    coverShowSubtitle: bool(raw.coverShowSubtitle, fallback.coverShowSubtitle),
    coverShowLogo: bool(raw.coverShowLogo, fallback.coverShowLogo),
    coverShowAuthor: bool(raw.coverShowAuthor, fallback.coverShowAuthor),
    coverShowCompany: bool(raw.coverShowCompany, fallback.coverShowCompany),
    coverShowDate: bool(raw.coverShowDate, fallback.coverShowDate),
  };
}

export function createSettingsForGuide(
  guide: Pick<Guide, 'title' | 'description' | 'createdAt'> | null,
  saved: unknown,
  templateId?: PdfDesignSettings['templateId'],
): PdfDesignSettings {
  const fallback = createDefaultSettings(guide, templateId);
  if (saved == null) return fallback;
  const sanitized = sanitizePdfSettings(saved, fallback);
  if (!templateId) return sanitized;
  return { ...sanitized, templateId };
}

export function pageDimensions(
  settings: Pick<PdfDesignSettings, 'pageSize' | 'orientation'>,
): { widthMm: number; heightMm: number } {
  const base = PDF_PAGE_DIMENSIONS_MM[settings.pageSize];
  return settings.orientation === 'landscape'
    ? { widthMm: base.height, heightMm: base.width }
    : { widthMm: base.width, heightMm: base.height };
}

export function pxPerMm(): number {
  return 96 / 25.4;
}

export function sanitizeFileStem(value: string): string {
  const cleaned = value
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90);
  return cleaned || 'دليل';
}
