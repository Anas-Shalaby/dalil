import { createId } from '../shared/format';
import { PDF_DESIGNS_STORAGE_KEY, PDF_PRESETS_STORAGE_KEY } from '../shared/constants';
import { createDefaultSettings } from './templates';
import {
  MAX_PDF_PRESETS,
  PDF_PRESET_NAME_MAX,
  sanitizePdfSettings,
} from './settings';
import type { PdfDesignSettings, PdfPreset } from './types';

type DesignMap = Record<string, unknown>;

/**
 * Presets intentionally store design tokens only. Guide content (title,
 * description, author, date) and the uploaded logo stay with the guide so
 * presets never duplicate content and never blow the storage quota.
 */
const PRESET_DESIGN_KEYS = [
  'templateId',
  'primaryColor',
  'secondaryColor',
  'accentColor',
  'fontId',
  'baseFontSize',
  'lineHeight',
  'direction',
  'pageSize',
  'orientation',
  'marginMm',
  'stepSpacing',
  'screenshotStyle',
  'screenshotWidthPercent',
  'screenshotAlign',
  'screenshotRadius',
  'numberingStyle',
  'showHeader',
  'showHeaderTitle',
  'showHeaderLogo',
  'showFooter',
  'showPageNumber',
  'showFooterCompany',
  'footerText',
  'showCover',
  'coverLayout',
  'coverShowTitle',
  'coverShowSubtitle',
  'coverShowLogo',
  'coverShowAuthor',
  'coverShowCompany',
  'coverShowDate',
] as const;

export function toPresetDesign(settings: PdfDesignSettings): PdfDesignSettings {
  return {
    ...settings,
    documentTitle: '',
    documentSubtitle: '',
    documentDescription: '',
    author: '',
    company: '',
    documentDate: '',
    metadataNote: '',
    logoDataUrl: null,
  };
}

export function applyPresetSettings(
  current: PdfDesignSettings,
  presetSettings: PdfDesignSettings,
): PdfDesignSettings {
  const design = Object.fromEntries(
    PRESET_DESIGN_KEYS.map((key) => [key, presetSettings[key]]),
  );
  return sanitizePdfSettings({ ...current, ...design }, current);
}


function sanitizePreset(value: unknown): PdfPreset | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, PDF_PRESET_NAME_MAX) : '';
  if (!name) return null;
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : createId();
  const now = new Date().toISOString();
  const settings = sanitizePdfSettings(raw.settings, createDefaultSettings(null));
  const createdAt =
    typeof raw.createdAt === 'string' && !Number.isNaN(Date.parse(raw.createdAt))
      ? raw.createdAt
      : now;
  const updatedAt =
    typeof raw.updatedAt === 'string' && !Number.isNaN(Date.parse(raw.updatedAt))
      ? raw.updatedAt
      : createdAt;
  return { id, name, createdAt, updatedAt, settings };
}

export function sanitizePresets(value: unknown): PdfPreset[] {
  const rawList = Array.isArray(value)
    ? value
    : typeof value === 'object' &&
        value !== null &&
        Array.isArray((value as { presets?: unknown }).presets)
      ? (value as { presets: unknown[] }).presets
      : [];
  const used = new Set<string>();
  const presets: PdfPreset[] = [];
  for (const entry of rawList) {
    if (presets.length >= MAX_PDF_PRESETS) break;
    const preset = sanitizePreset(entry);
    if (!preset) continue;
    if (used.has(preset.id)) preset.id = createId();
    used.add(preset.id);
    presets.push(preset);
  }
  return presets.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function loadPdfPresets(): Promise<PdfPreset[]> {
  const result = await chrome.storage.local.get(PDF_PRESETS_STORAGE_KEY);
  return sanitizePresets(result[PDF_PRESETS_STORAGE_KEY]);
}

async function writePresets(presets: PdfPreset[]): Promise<void> {
  await chrome.storage.local.set({
    [PDF_PRESETS_STORAGE_KEY]: { version: 1, presets: presets.slice(0, MAX_PDF_PRESETS) },
  });
}

export async function savePdfPreset(name: string, settings: PdfDesignSettings): Promise<PdfPreset> {
  const cleanName = name.trim().slice(0, PDF_PRESET_NAME_MAX);
  if (!cleanName) throw new Error('اكتب اسمًا للمظهر المحفوظ.');
  const now = new Date().toISOString();
  const preset: PdfPreset = {
    id: createId(),
    name: cleanName,
    createdAt: now,
    updatedAt: now,
    settings: sanitizePdfSettings(toPresetDesign(settings)),
  };
  const presets = await loadPdfPresets();
  await writePresets([preset, ...presets]);
  return preset;
}

export async function updatePdfPreset(
  presetId: string,
  name: string,
  settings: PdfDesignSettings,
): Promise<PdfPreset | null> {
  const cleanName = name.trim().slice(0, PDF_PRESET_NAME_MAX);
  if (!cleanName) throw new Error('اكتب اسمًا للمظهر المحفوظ.');
  const presets = await loadPdfPresets();
  let updated: PdfPreset | null = null;
  const next = presets.map((preset) => {
    if (preset.id !== presetId) return preset;
    updated = {
      ...preset,
      name: cleanName,
      updatedAt: new Date().toISOString(),
      settings: sanitizePdfSettings(toPresetDesign(settings)),
    };
    return updated;
  });
  if (!updated) return null;
  await writePresets(next);
  return updated;
}

export async function deletePdfPreset(presetId: string): Promise<void> {
  const presets = await loadPdfPresets();
  await writePresets(presets.filter((preset) => preset.id !== presetId));
}

export async function loadPdfDesign(guideId: string): Promise<PdfDesignSettings | null> {
  const result = await chrome.storage.local.get(PDF_DESIGNS_STORAGE_KEY);
  const raw = result[PDF_DESIGNS_STORAGE_KEY];
  if (typeof raw !== 'object' || raw === null) return null;
  const designs = raw as { designs?: DesignMap };
  const saved = designs.designs?.[guideId];
  if (saved == null) return null;
  return sanitizePdfSettings(saved, createDefaultSettings(null));
}

export async function savePdfDesign(
  guideId: string,
  settings: PdfDesignSettings,
): Promise<void> {
  const result = await chrome.storage.local.get(PDF_DESIGNS_STORAGE_KEY);
  const raw = result[PDF_DESIGNS_STORAGE_KEY];
  const designs =
    typeof raw === 'object' &&
    raw !== null &&
    typeof (raw as { designs?: unknown }).designs === 'object' &&
    (raw as { designs?: unknown }).designs !== null
      ? ((raw as { designs: DesignMap }).designs as DesignMap)
      : {};
  const next = { ...designs, [guideId]: settings };
  const keys = Object.keys(next);
  if (keys.length > 80) {
    for (const key of keys.slice(0, keys.length - 80)) delete next[key];
  }
  await chrome.storage.local.set({
    [PDF_DESIGNS_STORAGE_KEY]: { version: 1, designs: next },
  });
}
