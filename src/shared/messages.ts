import type {
  ActiveTabInfo,
  CapturedAction,
  Guide,
  RecordingNotice,
  RecordingSession,
} from './types';

export type RuntimeMessage =
  | { type: 'DALIL_GET_STATE' }
  | { type: 'DALIL_START_RECORDING'; tabId: number }
  | { type: 'DALIL_PAUSE_RECORDING' }
  | { type: 'DALIL_RESUME_RECORDING' }
  | { type: 'DALIL_STOP_RECORDING'; openEditor?: boolean }
  | { type: 'DALIL_DISMISS_NOTICE' }
  | { type: 'DALIL_ACTION'; action: CapturedAction; pageTitle: string }
  | { type: 'DALIL_RECORDER_START'; session: RecordingSession }
  | {
      type: 'DALIL_RECORDER_STATE';
      status: RecordingSession['status'];
      stepCount: number;
      lastScreenshotError?: string;
    }
  | { type: 'DALIL_RECORDER_STOP' }
  | { type: 'DALIL_HIDE_INDICATOR' }
  | { type: 'DALIL_SHOW_INDICATOR' };

export interface StartRecordingResponse {
  ok: boolean;
  guideId?: string;
  error?: string;
}

export interface StopRecordingResponse {
  ok: boolean;
  guideId?: string;
  error?: string;
}

export interface ActionResponse {
  ok: boolean;
  stepCount?: number;
  error?: string;
  ignored?: boolean;
}

export interface RecordingStateResponse {
  ok: boolean;
  session: RecordingSession | null;
  currentTab: ActiveTabInfo | null;
  lastNotice: RecordingNotice | null;
  recentGuides: Guide[];
}

export function isDalilMessage(value: unknown): value is RuntimeMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as { type?: unknown }).type === 'string' &&
    (value as { type: string }).type.startsWith('DALIL_')
  );
}
