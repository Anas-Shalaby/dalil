import type { CaptureStatus, CaptureSurface } from '../shared/types';
import type { CaptureErrorState } from './errors';

export interface CaptureMachineState {
  status: CaptureStatus;
  sourceSurface: CaptureSurface;
  sourceLabel: string | null;
  error: CaptureErrorState | null;
  notice: CaptureErrorState | null;
  stepCount: number;
  startedAt: string | null;
}

export type CaptureEvent =
  | { type: 'REQUEST_SOURCE' }
  | { type: 'SOURCE_PICKED'; surface: CaptureSurface; label: string }
  | { type: 'SOURCE_CANCELLED' }
  | { type: 'STREAM_CONNECTED'; surface: CaptureSurface; label: string; startedAt: string }
  | { type: 'CONNECT_FAILED'; error: CaptureErrorState }
  | { type: 'CAPTURE_REQUESTED' }
  | { type: 'CAPTURE_SUCCEEDED' }
  | { type: 'CAPTURE_FAILED'; error: CaptureErrorState }
  | { type: 'SOURCE_ENDED' }
  | { type: 'RELEASE_SOURCE' }
  | { type: 'STOP_REQUESTED' }
  | { type: 'STOP_FAILED'; error: CaptureErrorState }
  | { type: 'STOP_FINISHED' }
  | { type: 'STEP_DELETED' }
  | { type: 'SYNC_STEPS'; count: number }
  | { type: 'DISMISS_ERROR' }
  | { type: 'RESET' };

export const initialCaptureState: CaptureMachineState = {
  status: 'idle',
  sourceSurface: 'unknown',
  sourceLabel: null,
  error: null,
  notice: null,
  stepCount: 0,
  startedAt: null,
};

const ACTIVE_STATUSES: CaptureStatus[] = [
  'selecting-source',
  'connecting',
  'recording',
  'capturing',
  'stopping',
];

export function isCaptureSessionActive(status: CaptureStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

export function canChooseSource(status: CaptureStatus): boolean {
  return status === 'idle' || status === 'error';
}

export function canCaptureFrame(status: CaptureStatus): boolean {
  return status === 'recording';
}

export function canFinishSession(status: CaptureStatus): boolean {
  return status === 'idle' || status === 'error' || status === 'recording' || status === 'capturing';
}

export function canReleaseSource(status: CaptureStatus): boolean {
  return status === 'recording' || status === 'error';
}

/**
 * Pure state machine. Invalid transitions return the exact same object so
 * callers/tests can detect that nothing changed.
 */
export function captureReducer(
  state: CaptureMachineState,
  event: CaptureEvent,
): CaptureMachineState {
  switch (event.type) {
    case 'REQUEST_SOURCE':
      if (!canChooseSource(state.status)) return state;
      return {
        ...state,
        status: 'selecting-source',
        error: null,
        notice: null,
        sourceLabel: null,
        sourceSurface: 'unknown',
      };

    case 'SOURCE_PICKED':
      if (state.status !== 'selecting-source') return state;
      return {
        ...state,
        status: 'connecting',
        sourceSurface: event.surface,
        sourceLabel: event.label,
      };

    case 'SOURCE_CANCELLED':
      if (state.status !== 'selecting-source') return state;
      return {
        ...state,
        status: 'idle',
        sourceLabel: null,
        sourceSurface: 'unknown',
        error: {
          code: 'source-cancelled',
          message: 'لم يتم اختيار نافذة أو شاشة. يمكنك المحاولة مرة أخرى.',
        },
      };

    case 'STREAM_CONNECTED':
      if (state.status !== 'connecting') return state;
      return {
        ...state,
        status: 'recording',
        sourceSurface: event.surface,
        sourceLabel: event.label,
        startedAt: event.startedAt,
        error: null,
        notice: null,
      };

    case 'CONNECT_FAILED':
      if (state.status !== 'selecting-source' && state.status !== 'connecting') return state;
      return {
        ...state,
        status: 'error',
        sourceLabel: null,
        sourceSurface: 'unknown',
        error: event.error,
      };

    case 'CAPTURE_REQUESTED':
      if (state.status !== 'recording') return state;
      return { ...state, status: 'capturing', notice: null };

    case 'CAPTURE_SUCCEEDED':
      if (state.status !== 'capturing') return state;
      return {
        ...state,
        status: 'recording',
        notice: null,
      };

    case 'CAPTURE_FAILED':
      if (state.status !== 'capturing') return state;
      return { ...state, status: 'recording', notice: event.error };

    case 'SOURCE_ENDED':
      if (!isCaptureSessionActive(state.status) || state.status === 'stopping') return state;
      return {
        ...state,
        status: 'error',
        sourceLabel: null,
        sourceSurface: 'unknown',
        error: {
          code: 'source-ended',
          message: 'انتهى مصدر الالتقاط. اختر نافذة أو شاشة من جديد لمتابعة التوثيق.',
        },
      };

    case 'RELEASE_SOURCE':
      if (!canReleaseSource(state.status)) return state;
      return {
        ...state,
        status: 'idle',
        sourceLabel: null,
        sourceSurface: 'unknown',
        error: null,
        notice: null,
      };

    case 'STOP_REQUESTED':
      if (!canFinishSession(state.status)) return state;
      return { ...state, status: 'stopping', error: null, notice: null };

    case 'STOP_FAILED':
      if (state.status !== 'stopping') return state;
      return { ...state, status: 'error', error: event.error };

    case 'STOP_FINISHED':
      if (state.status !== 'stopping') return state;
      return { ...state, status: 'completed', error: null, notice: null };

    case 'STEP_DELETED':
      if (
        state.status !== 'idle' &&
        state.status !== 'error' &&
        state.status !== 'recording' &&
        state.status !== 'capturing'
      ) {
        return state;
      }
      return { ...state, notice: null };

    case 'SYNC_STEPS':
      if (state.stepCount === event.count) return state;
      return { ...state, stepCount: Math.max(0, event.count) };

    case 'DISMISS_ERROR':
      if (!state.error && !state.notice) return state;
      return { ...state, error: null, notice: null };

    case 'RESET':
      return initialCaptureState;

    default:
      return state;
  }
}


