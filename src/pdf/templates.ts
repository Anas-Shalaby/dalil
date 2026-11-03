import type { Guide } from '../shared/types';
import type { PdfDesignSettings, PdfTemplate, PdfTemplateId } from './types';

export const PDF_TEMPLATES: PdfTemplate[] = [
  {
    id: 'executive',
    name: 'تنفيذي احترافي',
    tagline: 'للعملاء والتسليمات الرسمية',
    description:
      'غلاف وقور، تدرّج طباعي واضح، فواصل رقيقة، وهوامش متوازنة تناسب تقارير الشركات.',
    swatches: ['#1C2B4A', '#B08A4A', '#F5F1E8'],
    defaults: {
      primaryColor: '#1C2B4A',
      secondaryColor: '#7440E9',
      accentColor: '#B08A4A',
      fontId: 'plex',
      baseFontSize: 11.5,
      lineHeight: 1.75,
      marginMm: 18,
      screenshotStyle: 'standard',
      screenshotWidthPercent: 78,
      screenshotAlign: 'center',
      screenshotRadius: 6,
      numberingStyle: 'plain',
      coverLayout: 'template',
      stepSpacing: 7,
    },
  },
  {
    id: 'minimal',
    name: 'بسيط تحريري',
    tagline: 'الوضوح أولًا',
    description:
      'مساحات بيضاء سخية، أرقام هادئة، لقطات كبيرة، وتسلسل بصري مباشر بلا زخرفة.',
    swatches: ['#141414', '#7440E9', '#EFEDE7'],
    defaults: {
      primaryColor: '#141414',
      secondaryColor: '#7440E9',
      accentColor: '#EFEDE7',
      fontId: 'plex',
      baseFontSize: 11,
      lineHeight: 1.85,
      marginMm: 20,
      screenshotStyle: 'full',
      screenshotWidthPercent: 100,
      screenshotAlign: 'center',
      screenshotRadius: 2,
      numberingStyle: 'outline',
      coverLayout: 'template',
      stepSpacing: 9,
    },
  },
  {
    id: 'tutorial',
    name: 'دليل تعليمي',
    tagline: 'خطوات واضحة للمتعلّم',
    description:
      'أرقام بارزة، لقطات كبيرة، صندوق ملاحظات مميز، وتدفّق بصري يسهّل المتابعة خطوة بخطوة.',
    swatches: ['#7440E9', '#4E229F', '#F2EDFE'],
    defaults: {
      primaryColor: '#7440E9',
      secondaryColor: '#4E229F',
      accentColor: '#F2EDFE',
      fontId: 'plex',
      baseFontSize: 11.5,
      lineHeight: 1.8,
      marginMm: 16,
      screenshotStyle: 'framed',
      screenshotWidthPercent: 85,
      screenshotAlign: 'center',
      screenshotRadius: 10,
      numberingStyle: 'badge',
      coverLayout: 'template',
      stepSpacing: 8,
    },
  },
  {
    id: 'gradient',
    name: 'تدرّج عصري',
    tagline: 'توثيق رقمي معاصر',
    description:
      'لمسات تدرّج محسوبة، غلاف تركيبي أنيق، فواصل خفيفة، وإطارات لقطات نظيفة.',
    swatches: ['#7440E9', '#2E67F8', '#F0ABFC'],
    defaults: {
      primaryColor: '#7440E9',
      secondaryColor: '#2E67F8',
      accentColor: '#F0ABFC',
      fontId: 'plex',
      baseFontSize: 11,
      lineHeight: 1.78,
      marginMm: 17,
      screenshotStyle: 'standard',
      screenshotWidthPercent: 84,
      screenshotAlign: 'center',
      screenshotRadius: 12,
      numberingStyle: 'badge',
      coverLayout: 'template',
      stepSpacing: 8,
    },
  },
  {
    id: 'technical',
    name: 'توثيق تقني',
    tagline: 'للفرق والأنظمة',
    description:
      'هرمية مضغوطة، تسميات أحادية المسافة، تعليقات على اللقطات، ومعلومات وصفية منظمة.',
    swatches: ['#0F172A', '#2563EB', '#DCE4F2'],
    defaults: {
      primaryColor: '#0F172A',
      secondaryColor: '#2563EB',
      accentColor: '#DCE4F2',
      fontId: 'plex',
      baseFontSize: 10.5,
      lineHeight: 1.7,
      marginMm: 15,
      screenshotStyle: 'framed',
      screenshotWidthPercent: 82,
      screenshotAlign: 'start',
      screenshotRadius: 5,
      numberingStyle: 'plain',
      coverLayout: 'template',
      stepSpacing: 6,
    },
  },
  {
    id: 'brand',
    name: 'هوية الشركة',
    tagline: 'بألوانك وشعارك',
    description:
      'غلاف بهوية العلامة، شعار بارز، ألوان قابلة للتخصيص، وتذييل مؤسسي متسق في كل صفحة.',
    swatches: ['#7440E9', '#191827', '#F2EDFE'],
    defaults: {
      primaryColor: '#7440E9',
      secondaryColor: '#191827',
      accentColor: '#F2EDFE',
      fontId: 'naskh',
      baseFontSize: 11.5,
      lineHeight: 1.85,
      marginMm: 17,
      screenshotStyle: 'standard',
      screenshotWidthPercent: 80,
      screenshotAlign: 'center',
      screenshotRadius: 8,
      numberingStyle: 'badge',
      coverLayout: 'template',
      stepSpacing: 8,
    },
  },
];

export const DEFAULT_TEMPLATE_ID: PdfTemplateId = 'executive';

export function getTemplate(id: PdfTemplateId): PdfTemplate {
  return PDF_TEMPLATES.find((template) => template.id === id) ?? PDF_TEMPLATES[0];
}

export function isPdfTemplateId(value: unknown): value is PdfTemplateId {
  return PDF_TEMPLATES.some((template) => template.id === value);
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function createDefaultSettings(
  guide: Pick<Guide, 'title' | 'description' | 'createdAt'> | null,
  templateId: PdfTemplateId = DEFAULT_TEMPLATE_ID,
): PdfDesignSettings {
  const template = getTemplate(templateId);
  return {
    templateId,
    documentTitle: guide?.title?.trim() || 'دليل جديد',
    documentSubtitle: guide?.description ?? '',
    documentDescription: guide?.description ?? '',
    author: '',
    company: '',
    documentDate: todayIsoDate(),
    metadataNote: '',
    logoDataUrl: null,
    primaryColor: '#7440E9',
    secondaryColor: '#191827',
    accentColor: '#F2EDFE',
    fontId: 'plex',
    baseFontSize: 11.5,
    lineHeight: 1.75,
    direction: 'auto',
    pageSize: 'a4',
    orientation: 'portrait',
    marginMm: 17,
    stepSpacing: 8,
    screenshotStyle: 'standard',
    screenshotWidthPercent: 80,
    screenshotAlign: 'center',
    screenshotRadius: 8,
    numberingStyle: 'badge',
    showHeader: true,
    showHeaderTitle: true,
    showHeaderLogo: true,
    showFooter: true,
    showPageNumber: true,
    showFooterCompany: true,
    footerText: '',
    showCover: true,
    coverLayout: 'template',
    coverShowTitle: true,
    coverShowSubtitle: true,
    coverShowLogo: true,
    coverShowAuthor: true,
    coverShowCompany: true,
    coverShowDate: true,
    ...template.defaults,
  };
}

/**
 * Applies a template's visual identity while keeping user-entered content,
 * logo, date and metadata intact.
 */
export function applyTemplateDefaults(
  settings: PdfDesignSettings,
  templateId: PdfTemplateId,
): PdfDesignSettings {
  const template = getTemplate(templateId);
  return {
    ...settings,
    templateId,
    ...template.defaults,
  };
}

