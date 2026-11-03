import { describe, expect, it } from 'vitest';
import { PDF_PRESETS_STORAGE_KEY } from '../shared/constants';
import {
  applyPresetSettings,
  deletePdfPreset,
  loadPdfPresets,
  sanitizePresets,
  savePdfPreset,
  toPresetDesign,
  updatePdfPreset,
} from './presets';
import { createDefaultSettings } from './templates';
import { MAX_PDF_PRESETS } from './settings';

const guide = {
  title: 'دليل الشركة',
  description: 'وصف الدليل',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const logo =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lVf1WQAAAABJRU5ErkJggg==';

describe('PDF presets', () => {
  it('sanitizes invalid, duplicate and oversized preset collections', () => {
    const valid = {
      id: 'p1',
      name: 'مظهر',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      settings: createDefaultSettings(guide),
    };
    const presets = sanitizePresets({
      presets: [
        valid,
        valid,
        { ...valid, id: 'p2', name: '' },
        null,
        42,
        ...Array.from({ length: MAX_PDF_PRESETS + 5 }, (_, index) => ({
          ...valid,
          id: `extra-${index}`,
          name: `مظهر ${index}`,
        })),
      ],
    });
    expect(presets.length).toBe(MAX_PDF_PRESETS);
    expect(new Set(presets.map((preset) => preset.id)).size).toBe(presets.length);
  });

  it('reads legacy raw arrays and ignores broken JSON shapes', () => {
    const raw = [
      {
        id: 'p1',
        name: 'قديم',
        settings: { ...createDefaultSettings(guide), primaryColor: 'invalid' },
      },
    ];
    expect(sanitizePresets(raw)).toHaveLength(1);
    expect(sanitizePresets('nope')).toEqual([]);
    expect(sanitizePresets({ presets: 'nope' })).toEqual([]);
  });

  it('persists design-only presets and strips guide content and logo', async () => {
    const settings = {
      ...createDefaultSettings(guide),
      primaryColor: '#123456',
      logoDataUrl: logo,
      author: 'سارة',
      company: 'شركة',
      documentDescription: 'محتوى الدليل',
    };
    const preset = await savePdfPreset('هوية زرقاء', settings);
    expect(preset.name).toBe('هوية زرقاء');
    expect(preset.settings.primaryColor).toBe('#123456');
    expect(preset.settings.logoDataUrl).toBeNull();
    expect(preset.settings.documentTitle).toBe('');
    expect(preset.settings.author).toBe('');

    const stored = await loadPdfPresets();
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(preset.id);
    expect(stored[0].settings.primaryColor).toBe('#123456');
  });

  it('rejects an empty preset name', async () => {
    await expect(savePdfPreset('   ', createDefaultSettings(guide))).rejects.toThrow(
      'اكتب اسمًا للمظهر المحفوظ.',
    );
  });

  it('updates a preset in place and keeps its creation date', async () => {
    const preset = await savePdfPreset('أول', createDefaultSettings(guide));
    const updated = await updatePdfPreset(preset.id, 'ثانٍ', {
      ...createDefaultSettings(guide),
      primaryColor: '#00aa77',
    });
    expect(updated?.name).toBe('ثانٍ');
    expect(updated?.createdAt).toBe(preset.createdAt);
    expect(updated?.settings.primaryColor).toBe('#00aa77');
    const stored = await loadPdfPresets();
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('ثانٍ');
  });

  it('returns null when updating a missing preset', async () => {
    const updated = await updatePdfPreset('missing', 'اسم', createDefaultSettings(guide));
    expect(updated).toBeNull();
  });

  it('deletes a preset without touching the others', async () => {
    const first = await savePdfPreset('أول', createDefaultSettings(guide));
    const second = await savePdfPreset('ثانٍ', createDefaultSettings(guide));
    await deletePdfPreset(first.id);
    const stored = await loadPdfPresets();
    expect(stored.map((preset) => preset.id)).toEqual([second.id]);
  });

  it('filters corrupted preset records from storage', async () => {
    await chrome.storage.local.set({
      [PDF_PRESETS_STORAGE_KEY]: {
        version: 1,
        presets: [
          { id: 'broken' },
          {
            id: 'ok',
            name: 'صالح',
            settings: { ...createDefaultSettings(guide), pageSize: 'letter' },
          },
        ],
      },
    });
    const presets = await loadPdfPresets();
    expect(presets).toHaveLength(1);
    expect(presets[0].id).toBe('ok');
  });

  it('applies design tokens while preserving guide content and logo', () => {
    const current = {
      ...createDefaultSettings(guide),
      documentTitle: 'عنوان الدليل',
      author: 'أحمد',
      logoDataUrl: logo,
      primaryColor: '#111111',
    };
    const presetSettings = {
      ...toPresetDesign(current),
      primaryColor: '#aa22cc',
      pageSize: 'letter' as const,
      showCover: false,
    };
    const applied = applyPresetSettings(current, presetSettings);
    expect(applied.primaryColor).toBe('#aa22cc');
    expect(applied.pageSize).toBe('letter');
    expect(applied.showCover).toBe(false);
    expect(applied.documentTitle).toBe('عنوان الدليل');
    expect(applied.author).toBe('أحمد');
    expect(applied.logoDataUrl).toBe(logo);
  });
});
