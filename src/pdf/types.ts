import type { Annotation, GuideStep } from '../shared/types';

export type PdfTemplateId =
  | 'executive'
  | 'minimal'
  | 'tutorial'
  | 'gradient'
  | 'technical'
  | 'brand';

export type PdfPageSize = 'a4' | 'letter';
export type PdfOrientation = 'portrait' | 'landscape';
export type PdfScreenshotStyle = 'standard' | 'framed' | 'full' | 'compact' | 'annotated';
export type PdfNumberingStyle = 'badge' | 'plain' | 'outline';
export type PdfFontId = 'plex' | 'naskh' | 'system';
export type PdfDirection = 'auto' | 'rtl' | 'ltr';
export type PdfCoverLayout = 'template' | 'centered' | 'split';
export type PdfImageQuality = 'standard' | 'high';

export interface PdfDesignSettings {
  templateId: PdfTemplateId;

  // Document content. These values never overwrite the guide itself.
  documentTitle: string;
  documentSubtitle: string;
  documentDescription: string;
  author: string;
  company: string;
  documentDate: string;
  metadataNote: string;

  // Branding
  logoDataUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;

  // Typography and direction
  fontId: PdfFontId;
  baseFontSize: number;
  lineHeight: number;
  direction: PdfDirection;

  // Page geometry
  pageSize: PdfPageSize;
  orientation: PdfOrientation;
  marginMm: number;
  stepSpacing: number;

  // Screenshot presentation
  screenshotStyle: PdfScreenshotStyle;
  screenshotWidthPercent: number;
  screenshotAlign: 'start' | 'center' | 'end';
  screenshotRadius: number;
  numberingStyle: PdfNumberingStyle;

  // Header and footer
  showHeader: boolean;
  showHeaderTitle: boolean;
  showHeaderLogo: boolean;
  showFooter: boolean;
  showPageNumber: boolean;
  showFooterCompany: boolean;
  footerText: string;

  // Cover
  showCover: boolean;
  coverLayout: PdfCoverLayout;
  coverShowTitle: boolean;
  coverShowSubtitle: boolean;
  coverShowLogo: boolean;
  coverShowAuthor: boolean;
  coverShowCompany: boolean;
  coverShowDate: boolean;
}

export interface PdfTemplate {
  id: PdfTemplateId;
  name: string;
  tagline: string;
  description: string;
  swatches: [string, string, string];
  defaults: Partial<PdfDesignSettings>;
}

export interface PdfPreset {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  settings: PdfDesignSettings;
}

export interface PdfExportOptions {
  fileName: string;
  quality: PdfImageQuality;
}

export interface PdfPageGeometry {
  widthMm: number;
  heightMm: number;
  widthPx: number;
  heightPx: number;
  marginPx: number;
  contentWidthPx: number;
  contentHeightPx: number;
  headerHeightPx: number;
  footerHeightPx: number;
  baseFontSizePx: number;
  lineHeightPx: number;
}

export interface PdfStepImage {
  dataUrl: string;
  annotations?: Annotation[];
  widthPx: number;
  heightPx: number;
  caption?: string;
}

export interface PdfStepSource {
  step: GuideStep;
  stepNumber: number;
  text: string;
  image: PdfStepImage | null;
}

export interface PdfStepBlock {
  kind: 'step';
  stepId: string;
  stepNumber: number;
  text: string;
  continued: boolean;
  showHeading: boolean;
  image: PdfStepImage | null;
  caption: string | null;
}

export interface PdfEmptyBlock {
  kind: 'empty';
}

export type PdfContentBlock = PdfStepBlock | PdfEmptyBlock;

export interface PdfCoverPage {
  kind: 'cover';
  index: number;
  pageNumber: null;
  totalPages: number;
}

export interface PdfContentPage {
  kind: 'content';
  index: number;
  pageNumber: number;
  totalPages: number;
  blocks: PdfContentBlock[];
}

export type PdfPagePlan = PdfCoverPage | PdfContentPage;

export interface PdfDocumentPlan {
  pages: PdfPagePlan[];
  geometry: PdfPageGeometry;
}

export type PdfRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};
