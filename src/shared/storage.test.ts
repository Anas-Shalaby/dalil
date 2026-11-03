import { describe, expect, it } from 'vitest';
import { CAPTURE_SESSION_STORAGE_KEY, GUIDES_STORAGE_KEY } from './constants';
import {
  clearCaptureSessionRecord,
  loadGuides,
  readCaptureSessionRecord,
  sanitizeCaptureSession,
  sanitizeGuides,
  writeCaptureSessionRecord,
} from './storage';
import type { CaptureSessionRecord } from './types';

describe('storage: desktop capture model compatibility', () => {
  it('loads legacy guides that have no source or captureSource fields', async () => {
    await chrome.storage.local.set({
      [GUIDES_STORAGE_KEY]: {
        version: 1,
        guides: [
          {
            id: 'legacy-guide',
            title: 'دليل قديم',
            description: '',
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-02T00:00:00.000Z',
            steps: [
              {
                id: 'legacy-step',
                order: 1,
                actionType: 'click',
                instruction: 'اضغط الزر',
                elementLabel: 'زر',
                screenshotId: null,
                screenshotState: 'none',
                createdAt: '2025-01-01T00:00:00.000Z',
              },
            ],
          },
        ],
      },
    });

    const [guide] = await loadGuides();
    expect(guide.id).toBe('legacy-guide');
    expect(guide.source).toBeUndefined();
    expect(guide.steps[0].captureSource).toBeUndefined();
  });

  it('preserves valid desktop capture metadata', async () => {
    await chrome.storage.local.set({
      [GUIDES_STORAGE_KEY]: {
        version: 1,
        guides: [
          {
            id: 'desktop-guide',
            title: 'دليل سطح المكتب',
            description: '',
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-02T00:00:00.000Z',
            source: 'desktop',
            steps: [
              {
                id: 'desktop-step',
                order: 1,
                actionType: 'manual',
                instruction: 'افتح النافذة',
                elementLabel: '',
                screenshotId: 'shot-1',
                screenshotState: 'captured',
                captureSource: 'screen',
                createdAt: '2025-01-01T00:00:00.000Z',
              },
            ],
          },
        ],
      },
    });

    const [guide] = await loadGuides();
    expect(guide.source).toBe('desktop');
    expect(guide.steps[0].captureSource).toBe('screen');
  });

  it('drops unknown source values instead of corrupting the guide', () => {
    const [guide] = sanitizeGuides([
      {
        id: 'bad-source',
        title: 'دليل',
        source: 'mars',
        steps: [
          {
            id: 'step',
            actionType: 'manual',
            screenshotId: null,
            screenshotState: 'none',
            captureSource: 'vr',
          },
        ],
      },
    ]);
    expect(guide.source).toBeUndefined();
    expect(guide.steps[0].captureSource).toBeUndefined();
  });
});

describe('storage: capture session lock', () => {
  it('rejects a capture session without a guide id', () => {
    expect(sanitizeCaptureSession(null)).toBeNull();
    expect(sanitizeCaptureSession({ id: 'x' })).toBeNull();
    expect(sanitizeCaptureSession({ guideId: '   ' })).toBeNull();
  });

  it('normalizes capture session fields', () => {
    const record = sanitizeCaptureSession({
      guideId: 'guide-1',
      tabId: 'not-a-number',
      status: 'recording',
      stepCount: 3.8,
      startedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: 'bad-date',
    });
    expect(record).not.toBeNull();
    expect(record?.tabId).toBeNull();
    expect(record?.status).toBe('recording');
    expect(record?.stepCount).toBe(3);
    expect(record?.startedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(record?.updatedAt).toBeTruthy();
  });

  it('falls back to idle for unknown statuses', () => {
    const record = sanitizeCaptureSession({ guideId: 'g', status: 'flying' });
    expect(record?.status).toBe('idle');
  });

  it('writes, reads and clears the persisted lock', async () => {
    const record: CaptureSessionRecord = {
      id: 'session-1',
      guideId: 'guide-1',
      tabId: 9,
      status: 'recording',
      startedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:01.000Z',
      stepCount: 2,
    };

    await writeCaptureSessionRecord(record);
    expect((await chrome.storage.local.get(CAPTURE_SESSION_STORAGE_KEY))[CAPTURE_SESSION_STORAGE_KEY]).toEqual(record);
    await expect(readCaptureSessionRecord()).resolves.toEqual(record);

    await clearCaptureSessionRecord();
    await expect(readCaptureSessionRecord()).resolves.toBeNull();
  });
});
