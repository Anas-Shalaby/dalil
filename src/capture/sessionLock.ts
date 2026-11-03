import { CAPTURE_LOCK_STALE_MS } from '../shared/constants';
import { createId } from '../shared/format';
import {
  clearCaptureSessionRecord,
  readCaptureSessionRecord,
  writeCaptureSessionRecord,
} from '../shared/storage';
import type { CaptureSessionRecord, CaptureStatus } from '../shared/types';

export interface AcquireLockInput {
  guideId: string;
  status?: CaptureStatus;
}

export type AcquireLockResult =
  | { ok: true; record: CaptureSessionRecord; selfTabId: number | null }
  | { ok: false; conflictTabId: number | null };

export interface CaptureLock {
  acquire(input: AcquireLockInput): Promise<AcquireLockResult>;
  touch(
    sessionId: string,
    patch: { status?: CaptureStatus; stepCount?: number },
  ): Promise<void>;
  release(sessionId: string): Promise<void>;
}

export function shouldRejectCaptureLock(
  record: CaptureSessionRecord | null,
  selfTabId: number | null,
  nowMs: number,
  otherTabExists: boolean,
): boolean {
  if (!record) return false;
  if (record.tabId !== null && record.tabId === selfTabId) return false;

  const updatedMs = Date.parse(record.updatedAt);
  if (Number.isNaN(updatedMs) || nowMs - updatedMs > CAPTURE_LOCK_STALE_MS) {
    return false;
  }

  if (record.tabId !== null && !otherTabExists) return false;
  return true;
}

async function getSelfTabId(): Promise<number | null> {
  try {
    const tab = await chrome.tabs.getCurrent();
    return typeof tab?.id === 'number' ? tab.id : null;
  } catch {
    return null;
  }
}

async function otherTabExists(tabId: number | null): Promise<boolean> {
  if (tabId === null) return false;
  try {
    const tab = await chrome.tabs.get(tabId);
    return Boolean(tab);
  } catch {
    return false;
  }
}

async function withOriginLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (!locks || typeof locks.request !== 'function') return task();
  return locks.request('dalil-capture-session', task) as Promise<T>;
}

/**
 * Cross-tab lock kept in chrome.storage.local. The Web Locks API (when
 * available) serializes acquisition so two extension pages cannot both pass
 * the check at the same time.
 */
export class ChromeCaptureLock implements CaptureLock {
  async acquire(input: AcquireLockInput): Promise<AcquireLockResult> {
    return withOriginLock(async () => {
      const selfTabId = await getSelfTabId();
      const existing = await readCaptureSessionRecord();
      if (existing) {
        const exists = await otherTabExists(existing.tabId);
        if (shouldRejectCaptureLock(existing, selfTabId, Date.now(), exists)) {
          return { ok: false, conflictTabId: existing.tabId };
        }
      }

      const now = new Date().toISOString();
      const record: CaptureSessionRecord = {
        id: createId(),
        guideId: input.guideId,
        tabId: selfTabId,
        status: input.status ?? 'idle',
        startedAt: now,
        updatedAt: now,
        stepCount: 0,
      };
      await writeCaptureSessionRecord(record);
      return { ok: true, record, selfTabId };
    });
  }

  async touch(
    sessionId: string,
    patch: { status?: CaptureStatus; stepCount?: number },
  ): Promise<void> {
    const record = await readCaptureSessionRecord();
    if (!record || record.id !== sessionId) return;
    await writeCaptureSessionRecord({
      ...record,
      status: patch.status ?? record.status,
      stepCount: patch.stepCount ?? record.stepCount,
      updatedAt: new Date().toISOString(),
    });
  }

  async release(sessionId: string): Promise<void> {
    const record = await readCaptureSessionRecord();
    if (!record || record.id !== sessionId) return;
    await clearCaptureSessionRecord();
  }
}

export async function focusBrowserTab(tabId: number): Promise<void> {
  const tab = await chrome.tabs.get(tabId);
  await chrome.tabs.update(tabId, { active: true });
  if (typeof tab.windowId === 'number') {
    await chrome.windows.update(tab.windowId, { focused: true });
  }
}
