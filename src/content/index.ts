import {
  SCREENSHOT_NOTE_RAPID,
  SCREENSHOT_NOTE_TAB_HIDDEN,
} from '../shared/instructions';
import { isDalilMessage, type RuntimeMessage } from '../shared/messages';
import type { CapturedAction, RecordingSession } from '../shared/types';
import {
  actionFromChange,
  actionFromClick,
  findInteractiveElement,
  getElementLabel,
} from './extract';

import { hideIndicator, showIndicator, updateIndicator } from './indicator';

const CLICK_DEDUPE_MS = 350;
const CHANGE_DEDUPE_MS = 500;

let session: RecordingSession | null = null;
let lastClick = { key: '', at: 0 };
let lastChange = { key: '', at: 0 };

function send(message: RuntimeMessage): void {
  try {
    chrome.runtime.sendMessage(message);
  } catch {
    // The extension context was invalidated; the recorder will be re-injected.
  }
}

function describeElement(element: Element | null): string {
  if (!element) return '';
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const name = element.getAttribute('name');
  return `${tag}${id}${name ? `[name="${name}"]` : ''}`;
}

function elementKey(element: Element): string {
  return `${describeElement(element)}::${getElementLabel(element)}`;
}

function handleInteractiveEvent(
  event: Event,
  kind: 'click' | 'change',
  dedupeMs: number,
  tracking: { key: string; at: number },
  build: (element: Element) => CapturedAction | null,
): void {
  if (!session || session.status !== 'recording') return;

  const target =
    kind === 'click'
      ? findInteractiveElement(event.target as Element | null)
      : (event.target as Element | null);
  if (!target || !target.isConnected) return;

  const now = Date.now();
  const key = elementKey(target);
  if (key === tracking.key && now - tracking.at < dedupeMs) return;

  const action = build(target);
  if (!action) return;

  const rapid = kind === 'click' && now - tracking.at < dedupeMs;
  tracking.key = key;
  tracking.at = now;
  dispatch(action, rapid);
}

function handleClick(event: Event): void {
  handleInteractiveEvent(event, 'click', CLICK_DEDUPE_MS, lastClick, actionFromClick);
}

function handleChange(event: Event): void {
  handleInteractiveEvent(event, 'change', CHANGE_DEDUPE_MS, lastChange, actionFromChange);
}

function updateScreenshotEligibility(): void {
  if (!session) return;
  if (document.hidden) {
    session.lastScreenshotError = SCREENSHOT_NOTE_TAB_HIDDEN;
  } else if (session.lastScreenshotError === SCREENSHOT_NOTE_TAB_HIDDEN) {
    session.lastScreenshotError = undefined;
  }
}

function dispatch(action: CapturedAction, rapid: boolean): void {
  if (!session) return;
  updateScreenshotEligibility();

  let allowScreenshot = action.allowScreenshot;
  let screenshotNote = action.screenshotNote;

  if (document.hidden) {
    allowScreenshot = false;
    screenshotNote = SCREENSHOT_NOTE_TAB_HIDDEN;
  } else if (allowScreenshot && rapid) {
    allowScreenshot = false;
    screenshotNote = SCREENSHOT_NOTE_RAPID;
  }

  send({
    type: 'DALIL_ACTION',
    pageTitle: document.title || '',
    action: { ...action, allowScreenshot, screenshotNote },
  });
}

function attachListeners(): void {
  document.addEventListener('click', handleClick, true);
  document.addEventListener('change', handleChange, true);
  document.addEventListener('visibilitychange', updateScreenshotEligibility, true);
}

function detachListeners(): void {
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('change', handleChange, true);
  document.removeEventListener('visibilitychange', updateScreenshotEligibility, true);
}

function startSession(next: RecordingSession): void {
  detachListeners();
  session = next;
  lastClick = { key: '', at: 0 };
  lastChange = { key: '', at: 0 };
  attachListeners();
  showIndicator(
    { status: next.status, stepCount: next.stepCount },
    {
      onPause: () => send({ type: 'DALIL_PAUSE_RECORDING' }),
      onResume: () => send({ type: 'DALIL_RESUME_RECORDING' }),
      onStop: () => send({ type: 'DALIL_STOP_RECORDING', openEditor: true }),
    },
  );
}

function stopSession(): void {
  detachListeners();
  hideIndicator();
  session = null;
}

async function syncFromBackground(): Promise<void> {
  try {
    const response = (await chrome.runtime.sendMessage({
      type: 'DALIL_GET_STATE',
    })) as { ok?: boolean; session?: RecordingSession | null } | undefined;

    if (response?.session) {
      startSession(response.session);
    } else {
      stopSession();
    }
  } catch {
    stopSession();
  }
}

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (!isDalilMessage(message)) return;
  switch (message.type) {
    case 'DALIL_RECORDER_START':
      startSession(message.session);
      break;
    case 'DALIL_RECORDER_STATE':
      if (session) {
        session.status = message.status;
        session.stepCount = message.stepCount;
        session.lastScreenshotError = message.lastScreenshotError;
        updateIndicator({ status: message.status, stepCount: message.stepCount });
      }
      break;
    case 'DALIL_RECORDER_STOP':
      stopSession();
      break;
    case 'DALIL_HIDE_INDICATOR':
      hideIndicator();
      break;
    case 'DALIL_SHOW_INDICATOR':
      if (session) {
        showIndicator(
          { status: session.status, stepCount: session.stepCount },
          {
            onPause: () => send({ type: 'DALIL_PAUSE_RECORDING' }),
            onResume: () => send({ type: 'DALIL_RESUME_RECORDING' }),
            onStop: () => send({ type: 'DALIL_STOP_RECORDING', openEditor: true }),
          },
        );
      }
      break;
    default:
      break;
  }
});

void syncFromBackground();
