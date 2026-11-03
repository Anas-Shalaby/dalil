import {
  CAPTURE_SESSION_STORAGE_KEY,
  DEFAULT_GUIDE_TITLE,
  GUIDES_STORAGE_KEY,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  NOTICE_STORAGE_KEY,
  RECORDING_STORAGE_KEY,
} from './constants';
import { sanitizeAnnotations } from './annotations';
import { createId, sortGuidesByUpdated } from './format';
import type {
  ActionType,
  CaptureSessionRecord,
  CaptureStatus,
  CaptureSurface,
  Guide,
  GuideSource,
  GuideStep,
  RecordingNotice,
  RecordingSession,
  ScreenshotState,
} from './types';

const ACTION_TYPES: ActionType[] = ['click', 'input', 'select', 'toggle', 'manual'];
const SCREENSHOT_STATES: ScreenshotState[] = [
  'captured',
  'capturing',
  'unavailable',
  'removed',
  'none',
];
const GUIDE_SOURCES: GuideSource[] = ['browser', 'desktop'];
const CAPTURE_SURFACES: CaptureSurface[] = ['window', 'screen', 'tab', 'unknown'];
const CAPTURE_STATUSES: CaptureStatus[] = [
  'idle',
  'selecting-source',
  'connecting',
  'recording',
  'capturing',
  'stopping',
  'completed',
  'error',
];

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asIso(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return fallback;
}

function sanitizeStep(value: unknown, index: number, usedIds: Set<string>): GuideStep | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  let id = asString(raw.id).trim();
  if (!id || usedIds.has(id)) id = createId();
  usedIds.add(id);

  const now = new Date().toISOString();
  const actionType = ACTION_TYPES.includes(raw.actionType as ActionType)
    ? (raw.actionType as ActionType)
    : 'manual';
  const screenshotId =
    typeof raw.screenshotId === 'string' && raw.screenshotId.trim()
      ? raw.screenshotId
      : null;
  let screenshotState = SCREENSHOT_STATES.includes(raw.screenshotState as ScreenshotState)
    ? (raw.screenshotState as ScreenshotState)
    : screenshotId
      ? 'captured'
      : 'none';

  if (screenshotState === 'capturing') {
    screenshotState = screenshotId ? 'captured' : 'unavailable';
  }
  if (screenshotId && screenshotState === 'none') screenshotState = 'captured';
  if (!screenshotId && screenshotState === 'captured') screenshotState = 'unavailable';

  return {
    id,
    order: index + 1,
    actionType,
    instruction: asString(raw.instruction).slice(0, 500),
    elementLabel: asString(raw.elementLabel).slice(0, 90),
    screenshotId,
    screenshotState,
    screenshotNote: raw.screenshotNote ? asString(raw.screenshotNote) : undefined,
    annotations: raw.annotations ? sanitizeAnnotations(raw.annotations) : undefined,
    captureSource: CAPTURE_SURFACES.includes(raw.captureSource as CaptureSurface)
      ? (raw.captureSource as CaptureSurface)
      : undefined,
    createdAt: asIso(raw.createdAt, now),
  };
}

function sanitizeGuide(value: unknown, usedIds: Set<string>): Guide | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const now = new Date().toISOString();
  let id = asString(raw.id).trim();
  if (!id || usedIds.has(id)) id = createId();
  usedIds.add(id);

  const createdAt = asIso(raw.createdAt, now);
  const updatedAt = asIso(raw.updatedAt, createdAt);
  const rawSteps = Array.isArray(raw.steps) ? raw.steps : [];
  const stepIds = new Set<string>();
  const steps = rawSteps
    .map((step, index) => sanitizeStep(step, index, stepIds))
    .filter((step): step is GuideStep => step !== null);
  const title = asString(raw.title).trim().slice(0, MAX_TITLE_LENGTH) || DEFAULT_GUIDE_TITLE;

  return {
    id,
    title,
    description: asString(raw.description).slice(0, MAX_DESCRIPTION_LENGTH),
    createdAt,
    updatedAt,
    steps,
    source: GUIDE_SOURCES.includes(raw.source as GuideSource)
      ? (raw.source as GuideSource)
      : undefined,
  };
}

export function sanitizeGuides(value: unknown): Guide[] {
  const rawGuides = Array.isArray(value)
    ? value
    : typeof value === 'object' &&
        value !== null &&
        Array.isArray((value as { guides?: unknown }).guides)
      ? (value as { guides: unknown[] }).guides
      : [];

  const usedIds = new Set<string>();
  const guides = rawGuides
    .map((guide) => sanitizeGuide(guide, usedIds))
    .filter((guide): guide is Guide => guide !== null);
  return sortGuidesByUpdated(guides);
}

function sanitizeSession(value: unknown): RecordingSession | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (
    typeof raw.guideId !== 'string' ||
    typeof raw.tabId !== 'number' ||
    typeof raw.windowId !== 'number'
  ) {
    return null;
  }
  const status = raw.status === 'paused' ? 'paused' : 'recording';
  const now = new Date().toISOString();
  return {
    guideId: raw.guideId,
    tabId: raw.tabId,
    windowId: raw.windowId,
    tabTitle: asString(raw.tabTitle, 'دليل جديد'),
    siteHost: asString(raw.siteHost),
    status,
    startedAt: asIso(raw.startedAt, now),
    updatedAt: asIso(raw.updatedAt, now),
    stepCount: typeof raw.stepCount === 'number' ? Math.max(0, raw.stepCount) : 0,
    lastScreenshotError:
      typeof raw.lastScreenshotError === 'string' ? raw.lastScreenshotError : undefined,
  };
}

function sanitizeNotice(value: unknown): RecordingNotice | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const message = asString(raw.message).trim();
  if (!message) return null;
  const kind =
    raw.kind === 'error' || raw.kind === 'warning' || raw.kind === 'info' ? raw.kind : 'info';
  return {
    kind,
    message,
    guideId: typeof raw.guideId === 'string' ? raw.guideId : undefined,
    createdAt: asIso(raw.createdAt, new Date().toISOString()),
  };
}

export function sanitizeCaptureSession(value: unknown): CaptureSessionRecord | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.guideId !== 'string' || !raw.guideId.trim()) return null;
  const now = new Date().toISOString();
  return {
    id: asString(raw.id).trim() || createId(),
    guideId: raw.guideId,
    tabId: typeof raw.tabId === 'number' ? raw.tabId : null,
    status: CAPTURE_STATUSES.includes(raw.status as CaptureStatus)
      ? (raw.status as CaptureStatus)
      : 'idle',
    startedAt: asIso(raw.startedAt, now),
    updatedAt: asIso(raw.updatedAt, now),
    stepCount:
      typeof raw.stepCount === 'number' && Number.isFinite(raw.stepCount)
        ? Math.max(0, Math.floor(raw.stepCount))
        : 0,
  };
}

export async function loadGuides(): Promise<Guide[]> {
  const result = await chrome.storage.local.get(GUIDES_STORAGE_KEY);
  return sanitizeGuides(result[GUIDES_STORAGE_KEY]);
}

export async function saveGuides(guides: Guide[]): Promise<void> {
  await chrome.storage.local.set({
    [GUIDES_STORAGE_KEY]: { version: 1, guides: sortGuidesByUpdated(guides) },
  });
}

export async function loadGuide(guideId: string): Promise<Guide | null> {
  const guides = await loadGuides();
  return guides.find((guide) => guide.id === guideId) ?? null;
}

export async function saveGuide(guide: Guide): Promise<void> {
  const guides = await loadGuides();
  const next = guides.some((item) => item.id === guide.id)
    ? guides.map((item) => (item.id === guide.id ? guide : item))
    : [guide, ...guides];
  await saveGuides(next);
}

export async function deleteGuideRecord(guideId: string): Promise<void> {
  const guides = await loadGuides();
  await saveGuides(guides.filter((guide) => guide.id !== guideId));
}

export async function readRecordingSession(): Promise<RecordingSession | null> {
  const result = await chrome.storage.local.get(RECORDING_STORAGE_KEY);
  return sanitizeSession(result[RECORDING_STORAGE_KEY]);
}

export async function writeRecordingSession(session: RecordingSession): Promise<void> {
  await chrome.storage.local.set({ [RECORDING_STORAGE_KEY]: session });
}

export async function clearRecordingSession(): Promise<void> {
  await chrome.storage.local.remove(RECORDING_STORAGE_KEY);
}

export async function readLastNotice(): Promise<RecordingNotice | null> {
  const result = await chrome.storage.local.get(NOTICE_STORAGE_KEY);
  return sanitizeNotice(result[NOTICE_STORAGE_KEY]);
}

export async function writeLastNotice(notice: RecordingNotice): Promise<void> {
  await chrome.storage.local.set({ [NOTICE_STORAGE_KEY]: notice });
}

export async function clearLastNotice(): Promise<void> {
  await chrome.storage.local.remove(NOTICE_STORAGE_KEY);
}

export async function readCaptureSessionRecord(): Promise<CaptureSessionRecord | null> {
  const result = await chrome.storage.local.get(CAPTURE_SESSION_STORAGE_KEY);
  return sanitizeCaptureSession(result[CAPTURE_SESSION_STORAGE_KEY]);
}

export async function writeCaptureSessionRecord(record: CaptureSessionRecord): Promise<void> {
  await chrome.storage.local.set({ [CAPTURE_SESSION_STORAGE_KEY]: record });
}

export async function clearCaptureSessionRecord(): Promise<void> {
  await chrome.storage.local.remove(CAPTURE_SESSION_STORAGE_KEY);
}
