import { buildActiveTabInfo } from '../shared/chrome';
import { createId, sortGuidesByUpdated, titleFromPage } from '../shared/format';
import {
  SCREENSHOT_NOTE_FAILED,
  SCREENSHOT_NOTE_TAB_HIDDEN,
} from '../shared/instructions';
import {
  isDalilMessage,
  type ActionResponse,
  type RuntimeMessage,
  type StartRecordingResponse,
  type StopRecordingResponse,
} from '../shared/messages';
import { putScreenshot } from '../shared/screenshotDb';
import {
  clearCaptureSessionRecord,
  clearLastNotice,
  clearRecordingSession,
  loadGuide,
  loadGuides,
  readCaptureSessionRecord,
  readLastNotice,
  readRecordingSession,
  saveGuide,
  writeLastNotice,
  writeRecordingSession,
} from '../shared/storage';

import type {
  CapturedAction,
  Guide,
  GuideStep,
  RecordingNotice,
  RecordingSession,
} from '../shared/types';

const RESTRICTED_INDICATOR_HOSTS = new Set([
  'chrome.google.com',
  'chromewebstore.google.com',
  'addons.mozilla.org',
  'microsoftedge.microsoft.com',
]);

function isRestrictedUrl(url: string | undefined): boolean {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return true;
    const host = parsed.hostname.toLowerCase();
    if (host === 'chrome.google.com' && parsed.pathname.startsWith('/webstore')) return true;
    return RESTRICTED_INDICATOR_HOSTS.has(host);
  } catch {
    return true;
  }
}

async function setNotice(notice: RecordingNotice): Promise<void> {
  try {
    await writeLastNotice(notice);
  } catch {
    // Notices are best effort.
  }
}

function notice(kind: RecordingNotice['kind'], message: string, guideId?: string) {
  return { kind, message, guideId, createdAt: new Date().toISOString() };
}

async function findSessionTab(
  session: RecordingSession,
): Promise<{ active: chrome.tabs.Tab | null; any: chrome.tabs.Tab | null }> {
  const active = await chrome.tabs
    .query({ active: true, windowId: session.windowId })
    .catch(() => [] as chrome.tabs.Tab[]);
  const foundActive = active.find((tab) => tab.id === session.tabId) ?? null;
  if (foundActive) return { active: foundActive, any: foundActive };

  const any = await chrome.tabs.get(session.tabId).catch(() => null);
  return { active: null, any: any ?? null };
}

interface InjectResult {
  ok: boolean;
  reason?: 'restricted' | 'failed';
}

async function ensureContentScript(tabId: number, url?: string): Promise<InjectResult> {
  if (isRestrictedUrl(url)) return { ok: false, reason: 'restricted' };
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      files: ['content.js'],
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

async function pushRecorderStart(session: RecordingSession): Promise<boolean> {
  try {
    await chrome.tabs.sendMessage(session.tabId, {
      type: 'DALIL_RECORDER_START',
      session,
    } satisfies RuntimeMessage);
    return true;
  } catch {
    return false;
  }
}

async function pushRecorderState(session: RecordingSession): Promise<void> {
  try {
    await chrome.tabs.sendMessage(session.tabId, {
      type: 'DALIL_RECORDER_STATE',
      status: session.status,
      stepCount: session.stepCount,
      lastScreenshotError: session.lastScreenshotError,
    } satisfies RuntimeMessage);
  } catch {
    // The tab may be closed or not injected; the recorder re-syncs later.
  }
}

async function pushRecorderStop(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'DALIL_RECORDER_STOP',
    } satisfies RuntimeMessage);
  } catch {
    // Ignore.
  }
}

function buildActionStep(action: CapturedAction): GuideStep {
  return {
    id: createId(),
    order: 0,
    actionType: action.actionType,
    instruction:
      action.instruction.trim() || 'تفاعل مع العنصر المحدد.',
    elementLabel: action.elementLabel,
    screenshotId: null,
    screenshotState: action.allowScreenshot ? 'none' : 'unavailable',
    screenshotNote: action.allowScreenshot ? undefined : action.screenshotNote,
    createdAt: new Date().toISOString(),
  };
}

function getLastStep(guide: Guide | null): GuideStep | null {
  if (!guide || guide.steps.length === 0) return null;
  return guide.steps[guide.steps.length - 1];
}

function isDuplicate(guide: Guide | null, action: CapturedAction): boolean {
  const last = getLastStep(guide);
  if (!last) return false;
  if (last.actionType !== action.actionType) return false;
  if (last.elementLabel !== action.elementLabel) return false;
  const elapsed = Date.now() - new Date(last.createdAt).getTime();
  return elapsed < 1200;
}

async function handleAction(message: {
  action: CapturedAction;
  pageTitle: string;
}): Promise<ActionResponse> {
  const session = await readRecordingSession();
  if (!session) return { ok: true, ignored: true };
  if (session.status !== 'recording') return { ok: true, ignored: true };

  const guide = await loadGuide(session.guideId);
  if (!guide) {
    await clearRecordingSession();
    return { ok: false, error: 'تعذّر العثور على الدليل المرتبط بالتسجيل.' };
  }

  if (isDuplicate(guide, message.action)) {
    return { ok: true, stepCount: guide.steps.length, ignored: true };
  }

  let step = buildActionStep(message.action);
  let workingGuide: Guide = {
    ...guide,
    steps: [...guide.steps, step].map((item, index) => ({ ...item, order: index + 1 })),
  };

  if (!workingGuide.title || workingGuide.title === 'دليل جديد') {
    workingGuide.title = titleFromPage(message.pageTitle, session.siteHost);
  }

  let screenshotError = session.lastScreenshotError;

  if (message.action.allowScreenshot) {
    const { active } = await findSessionTab(session);
    if (!active) {
      screenshotError = SCREENSHOT_NOTE_TAB_HIDDEN;
      step = { ...step, screenshotState: 'unavailable', screenshotNote: screenshotError };
    } else {
      try {
        const dataUrl = await chrome.tabs.captureVisibleTab(session.windowId, {
          format: 'jpeg',
          quality: 72,
        });
        const screenshotId = createId();
        await putScreenshot({
          id: screenshotId,
          guideId: workingGuide.id,
          stepId: step.id,
          dataUrl,
          createdAt: new Date().toISOString(),
        });
        step = { ...step, screenshotId, screenshotState: 'captured', screenshotNote: undefined };
        screenshotError = undefined;
      } catch {
        screenshotError = SCREENSHOT_NOTE_FAILED;
        step = { ...step, screenshotState: 'unavailable', screenshotNote: screenshotError };
      }
    }
  } else {
    step = { ...step, screenshotState: 'unavailable', screenshotNote: message.action.screenshotNote };
  }

  workingGuide = {
    ...workingGuide,
    updatedAt: new Date().toISOString(),
    steps: workingGuide.steps.map((item) => (item.id === step.id ? step : item)),
  };

  await saveGuide(workingGuide);

  const nextSession: RecordingSession = {
    ...session,
    stepCount: workingGuide.steps.length,
    updatedAt: new Date().toISOString(),
    tabTitle: message.pageTitle || session.tabTitle,
    lastScreenshotError: screenshotError,
  };
  await writeRecordingSession(nextSession);
  await pushRecorderState(nextSession);
  await updateBadge(nextSession);

  return { ok: true, stepCount: nextSession.stepCount };
}

async function startRecording(tabId: number): Promise<StartRecordingResponse> {
  const existing = await readRecordingSession();
  if (existing) {
    if (existing.tabId === tabId) {
      return { ok: true, guideId: existing.guideId };
    }
    return {
      ok: false,
      error: 'هناك تسجيل جارٍ بالفعل في تبويب آخر. أنهِ التسجيل الحالي أولًا.',
    };
  }

  let tab: chrome.tabs.Tab | undefined;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch {
    return { ok: false, error: 'تعذّر الوصول إلى التبويب المحدد.' };
  }

  const info = buildActiveTabInfo(tab);
  if (!info) return { ok: false, error: 'تعذّر قراءة معلومات التبويب.' };
  if (!info.supported) {
    return { ok: false, error: info.unsupportedReason ?? 'هذه الصفحة غير مدعومة للتسجيل.' };
  }

  const injection = await ensureContentScript(tabId, tab.url);
  if (!injection.ok) {
    return {
      ok: false,
      error:
        injection.reason === 'restricted'
          ? 'لا يعمل دليل على صفحات المتصفح الداخلية أو متجر Chrome.'
          : 'تعذّر تفعيل التسجيل في هذه الصفحة. حدّث الصفحة ثم حاول مجددًا.',
    };
  }

  const now = new Date().toISOString();
  const guide: Guide = {
    id: createId(),
    title: titleFromPage(tab.title ?? '', info.host),
    description: '',
    createdAt: now,
    updatedAt: now,
    steps: [],
  };
  await saveGuide(guide);

  const session: RecordingSession = {
    guideId: guide.id,
    tabId,
    windowId: tab.windowId ?? chrome.windows.WINDOW_ID_CURRENT,
    tabTitle: tab.title?.trim() || 'صفحة بدون عنوان',
    siteHost: info.host ?? '',
    status: 'recording',
    startedAt: now,
    updatedAt: now,
    stepCount: 0,
  };
  await writeRecordingSession(session);
  await clearLastNotice();

  const started = await pushRecorderStart(session);
  if (!started) {
    const retry = await ensureContentScript(tabId, tab.url);
    if (retry.ok) await pushRecorderStart(session);
  }

  return { ok: true, guideId: guide.id };
}

async function pauseRecording(): Promise<{ ok: boolean }> {
  const session = await readRecordingSession();
  if (!session || session.status === 'paused') return { ok: true };
  const next: RecordingSession = {
    ...session,
    status: 'paused',
    updatedAt: new Date().toISOString(),
  };
  await writeRecordingSession(next);
  await pushRecorderState(next);
  return { ok: true };
}

async function resumeRecording(): Promise<{ ok: boolean }> {
  const session = await readRecordingSession();
  if (!session || session.status === 'recording') return { ok: true };
  const next: RecordingSession = {
    ...session,
    status: 'recording',
    updatedAt: new Date().toISOString(),
    lastScreenshotError: undefined,
  };
  await writeRecordingSession(next);
  await pushRecorderState(next);
  return { ok: true };
}

async function stopRecording(
  tabId: number,
  openEditor: boolean,
): Promise<StopRecordingResponse> {
  const session = await readRecordingSession();
  if (!session) return { ok: false, error: 'لا يوجد تسجيل جارٍ.' };

  const targetTabId = session.tabId || tabId;
  await pushRecorderStop(targetTabId).catch(() => undefined);
  await clearRecordingSession();
  try {
    await chrome.action.setBadgeText({ tabId: targetTabId, text: '' });
  } catch {
    // Badge is optional.
  }

  if (openEditor) {
    await chrome.tabs.create({
      url: chrome.runtime.getURL(`editor.html?id=${encodeURIComponent(session.guideId)}`),
    });
  }
  return { ok: true, guideId: session.guideId };
}

async function reconcileIfTabGone(): Promise<void> {
  const session = await readRecordingSession();
  if (!session) return;
  const tab = await chrome.tabs.get(session.tabId).catch(() => null);
  if (tab) return;
  await clearRecordingSession();
  await setNotice(
    notice('warning', 'توقف التسجيل لأن التبويب أُغلق. حُفظ الدليل حتى الآن.'),
  );
}

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (!isDalilMessage(message)) return;

  const run = async (): Promise<unknown> => {
    switch (message.type) {
      case 'DALIL_GET_STATE': {
        await reconcileIfTabGone();
        const session = await readRecordingSession();
        const guides = await loadGuides();
        const [tab] = await chrome.tabs
          .query({ active: true, currentWindow: true })
          .catch(() => [] as chrome.tabs.Tab[]);
        return {
          ok: true,
          session,
          currentTab: buildActiveTabInfo(tab),
          lastNotice: await readLastNotice(),
          recentGuides: sortGuidesByUpdated(guides).slice(0, 5),
        };
      }
      case 'DALIL_START_RECORDING':
        return startRecording(message.tabId);
      case 'DALIL_PAUSE_RECORDING':
        return pauseRecording();
      case 'DALIL_RESUME_RECORDING':
        return resumeRecording();
      case 'DALIL_STOP_RECORDING':
        return stopRecording(sender.tab?.id ?? -1, message.openEditor ?? false);
      case 'DALIL_DISMISS_NOTICE':
        await clearLastNotice();
        return { ok: true };
      case 'DALIL_ACTION':
        return handleAction({ action: message.action, pageTitle: message.pageTitle });
      default:
        return { ok: false, error: 'رسالة غير معروفة.' };
    }
  };

  run()
    .then(sendResponse)
    .catch(() => sendResponse({ ok: false, error: 'حدث خطأ أثناء تنفيذ الطلب.' }));
  return true;
});

async function updateBadge(session: RecordingSession): Promise<void> {
  const text = session.stepCount > 0 ? String(Math.min(session.stepCount, 99)) : '';
  try {
    await chrome.action.setBadgeBackgroundColor({ color: '#7440E9' });
    await chrome.action.setBadgeTextColor({ color: '#FFFFFF' });
  } catch {
    // Badge colors are cosmetic.
  }
  try {
    await chrome.action.setBadgeText({ tabId: session.tabId, text });
  } catch {
    // Tab may be gone.
  }
}

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const session = await readRecordingSession();
  if (session && session.tabId === tabId) {
    await clearRecordingSession();
    await setNotice(
      notice('warning', 'توقف التسجيل لأن التبويب أُغلق. حُفظ الدليل حتى الآن.'),
    );
  }

  // Release a desktop capture lock if its owning tab was closed so the user
  // is not blocked by a stale session.
  const captureSession = await readCaptureSessionRecord();
  if (captureSession && captureSession.tabId === tabId) {
    await clearCaptureSessionRecord();
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const session = await readRecordingSession();
  if (!session || session.tabId !== tabId) return;
  if (changeInfo.status !== 'complete' && !changeInfo.url) return;

  if (isRestrictedUrl(tab.url)) {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'DALIL_RECORDER_STOP',
      } satisfies RuntimeMessage);
    } catch {
      // Ignore.
    }
    return;
  }

  const injection = await ensureContentScript(tabId, tab.url);
  if (injection.ok) await pushRecorderStart(session);
});

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await chrome.tabs
      .create({ url: chrome.runtime.getURL('privacy.html') })
      .catch(() => undefined);
  }
});

void reconcileIfTabGone();
