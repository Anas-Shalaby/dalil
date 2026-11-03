import { describe, expect, it } from 'vitest';
import {
  applyTemplateDefaults,
  createDefaultSettings,
  DEFAULT_TEMPLATE_ID,
  getTemplate,
  isPdfTemplateId,
  PDF_TEMPLATES,
  todayIsoDate,
} from './templates';
import { sanitizePdfSettings } from './settings';

const guide = {
  title: 'دليل الحساب',
  description: 'خطوات إنشاء حساب جديد',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('PDF template registry', () => {
  it('ships six distinct built-in templates with valid ids', () => {
    expect(PDF_TEMPLATES).toHaveLength(6);
    const ids = new Set(PDF_TEMPLATES.map((template) => template.id));
    expect(ids.size).toBe(6);
    expect(PDF_TEMPLATES.map((template) => template.id)).toEqual([
      'executive',
      'minimal',
      'tutorial',
      'gradient',
      'technical',
      'brand',
    ]);
    for (const template of PDF_TEMPLATES) {
      expect(template.name.length).toBeGreaterThan(0);
      expect(template.tagline.length).toBeGreaterThan(0);
      expect(template.swatches).toHaveLength(3);
      expect(template.defaults.primaryColor).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('exposes a default template and validates ids', () => {
    expect(isPdfTemplateId(DEFAULT_TEMPLATE_ID)).toBe(true);
    expect(isPdfTemplateId('unknown')).toBe(false);
    expect(getTemplate('unknown' as never).id).toBe(PDF_TEMPLATES[0].id);
  });

  it('creates defaults from guide content without mutating the guide', () => {
    const settings = createDefaultSettings(guide);
    expect(settings.documentTitle).toBe(guide.title);
    expect(settings.documentSubtitle).toBe(guide.description);
    expect(settings.pageSize).toBe('a4');
    expect(settings.orientation).toBe('portrait');
    expect(settings.showCover).toBe(true);
    expect(settings.documentDate).toBe(todayIsoDate());
    expect(guide.title).toBe('دليل الحساب');
  });

  it('falls back to a valid title when the guide has none', () => {
    const settings = createDefaultSettings({ ...guide, title: '   ' });
    expect(settings.documentTitle).toBe('دليل جديد');
  });

  it('applies template defaults while preserving author, logo and content', () => {
    const base = createDefaultSettings(guide);
    const branded = {
      ...base,
      author: 'سارة',
      company: 'شركة دليل',
      logoDataUrl:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lVf1WQAAAABJRU5ErkJggg==',
      documentTitle: 'عنوان مخصص',
    };
    const next = applyTemplateDefaults(branded, 'technical');
    expect(next.templateId).toBe('technical');
    expect(next.fontId).toBe('plex');
    expect(next.numberingStyle).toBe('plain');
    expect(next.author).toBe('سارة');
    expect(next.company).toBe('شركة دليل');
    expect(next.logoDataUrl).toBe(branded.logoDataUrl);
    expect(next.documentTitle).toBe('عنوان مخصص');
  });

  it('lets user settings override template defaults', () => {
    const base = createDefaultSettings(guide, 'executive');
    const custom = sanitizePdfSettings({ ...base, primaryColor: '#112233' }, base);
    expect(custom.primaryColor).toBe('#112233');
    expect(custom.secondaryColor).toBe('#7440e9');
  });

  it('switching templates updates visual settings but keeps custom content', () => {
    const base = createDefaultSettings(guide);
    const tutorial = applyTemplateDefaults(base, 'tutorial');
    const minimal = applyTemplateDefaults(tutorial, 'minimal');
    expect(tutorial.screenshotStyle).toBe('framed');
    expect(minimal.screenshotStyle).toBe('full');
    expect(minimal.documentTitle).toBe(base.documentTitle);
    expect(minimal.documentSubtitle).toBe(base.documentSubtitle);
  });
});
