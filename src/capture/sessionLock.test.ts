import { describe, expect, it } from 'vitest';
import { CAPTURE_LOCK_STALE_MS } from '../shared/constants';
import { shouldRejectCaptureLock } from './sessionLock';
import type { CaptureSessionRecord } from '../shared/types';

const now = Date.parse('2026-01-01T12:00:00.000Z');

function record(patch: Partial<CaptureSessionRecord> = {}): CaptureSessionRecord {
  return {
    id: 'session-1',
    guideId: 'guide-1',
    tabId: 5,
    status: 'recording',
    startedAt: '2026-01-01T11:00:00.000Z',
    updatedAt: '2026-01-01T11:59:00.000Z',
    stepCount: 2,
    ...patch,
  };
}

describe('shouldRejectCaptureLock', () => {
  it('allows capture when no session exists', () => {
    expect(shouldRejectCaptureLock(null, 1, now, false)).toBe(false);
  });

  it('allows the same tab to reload its own session', () => {
    expect(shouldRejectCaptureLock(record({ tabId: 5 }), 5, now, true)).toBe(false);
  });

  it('rejects a fresh session owned by another existing tab', () => {
    expect(shouldRejectCaptureLock(record({ tabId: 5 }), 1, now, true)).toBe(true);
  });

  it('ignores sessions whose owning tab no longer exists', () => {
    expect(shouldRejectCaptureLock(record({ tabId: 5 }), 1, now, false)).toBe(false);
  });

  it('ignores stale sessions', () => {
    const stale = record({
      updatedAt: new Date(now - CAPTURE_LOCK_STALE_MS - 1_000).toISOString(),
    });
    expect(shouldRejectCaptureLock(stale, 1, now, true)).toBe(false);
  });

  it('treats invalid timestamps as stale', () => {
    expect(shouldRejectCaptureLock(record({ updatedAt: 'nope' }), 1, now, true)).toBe(false);
  });

  it('rejects a fresh lock that has no tab owner', () => {
    expect(shouldRejectCaptureLock(record({ tabId: null }), 1, now, false)).toBe(true);
  });
});
