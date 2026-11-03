import { describe, expect, it } from 'vitest';
import {
  canCaptureFrame,
  canChooseSource,
  canFinishSession,
  canReleaseSource,
  captureReducer,
  initialCaptureState,
  isCaptureSessionActive,
  type CaptureMachineState,
} from './sessionMachine';

function state(patch: Partial<CaptureMachineState> = {}): CaptureMachineState {
  return { ...initialCaptureState, ...patch };
}

const captureError = { code: 'frame-failed' as const, message: 'تعذّر الالتقاط.' };

describe('captureReducer', () => {
  it('moves from idle to selecting-source and clears old errors', () => {
    const next = captureReducer(
      state({ error: captureError, notice: captureError }),
      { type: 'REQUEST_SOURCE' },
    );
    expect(next.status).toBe('selecting-source');
    expect(next.error).toBeNull();
    expect(next.notice).toBeNull();
  });

  it('moves selecting-source to connecting when a source is picked', () => {
    const next = captureReducer(state({ status: 'selecting-source' }), {
      type: 'SOURCE_PICKED',
      surface: 'window',
      label: 'نافذة محددة',
    });
    expect(next.status).toBe('connecting');
    expect(next.sourceSurface).toBe('window');
  });

  it('returns to idle with an Arabic cancellation message', () => {
    const next = captureReducer(state({ status: 'selecting-source' }), {
      type: 'SOURCE_CANCELLED',
    });
    expect(next.status).toBe('idle');
    expect(next.error?.code).toBe('source-cancelled');
    expect(next.error?.message).toContain('لم يتم اختيار');
  });

  it('connects a stream and starts recording', () => {
    const next = captureReducer(state({ status: 'connecting' }), {
      type: 'STREAM_CONNECTED',
      surface: 'window',
      label: 'نافذة محددة',
      startedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(next.status).toBe('recording');
    expect(next.startedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('marks connect failures as error and clears the source label', () => {
    const next = captureReducer(
      state({ status: 'connecting', sourceLabel: 'نافذة محددة' }),
      { type: 'CONNECT_FAILED', error: captureError },
    );
    expect(next.status).toBe('error');
    expect(next.sourceLabel).toBeNull();
    expect(next.error).toEqual(captureError);
  });

  it('supports the capture request/success cycle without touching step count', () => {
    const capturing = captureReducer(state({ status: 'recording', stepCount: 2 }), {
      type: 'CAPTURE_REQUESTED',
    });
    expect(capturing.status).toBe('capturing');
    expect(capturing.stepCount).toBe(2);

    const done = captureReducer(capturing, { type: 'CAPTURE_SUCCEEDED' });
    expect(done.status).toBe('recording');
    expect(done.stepCount).toBe(2);
  });

  it('keeps the session recording when a capture fails and surfaces a notice', () => {
    const next = captureReducer(state({ status: 'capturing' }), {
      type: 'CAPTURE_FAILED',
      error: captureError,
    });
    expect(next.status).toBe('recording');
    expect(next.notice).toEqual(captureError);
  });

  it('moves an active session to error when the source ends', () => {
    const next = captureReducer(state({ status: 'recording' }), { type: 'SOURCE_ENDED' });
    expect(next.status).toBe('error');
    expect(next.error?.code).toBe('source-ended');
  });

  it('stops releasing a source while stopping', () => {
    const current = state({ status: 'stopping' });
    expect(captureReducer(current, { type: 'SOURCE_ENDED' })).toBe(current);
    expect(captureReducer(current, { type: 'RELEASE_SOURCE' })).toBe(current);
  });

  it('releases the source back to idle', () => {
    const next = captureReducer(
      state({ status: 'recording', sourceLabel: 'نافذة محددة' }),
      { type: 'RELEASE_SOURCE' },
    );
    expect(next.status).toBe('idle');
    expect(next.sourceLabel).toBeNull();
  });

  it('only completes after stopping started', () => {
    const current = state({ status: 'recording' });
    expect(captureReducer(current, { type: 'STOP_FINISHED' })).toBe(current);

    const stopping = captureReducer(current, { type: 'STOP_REQUESTED' });
    expect(stopping.status).toBe('stopping');
    expect(captureReducer(stopping, { type: 'STOP_FINISHED' }).status).toBe('completed');
  });

  it('ignores invalid transitions by returning the same object', () => {
    const current = state({ status: 'idle' });
    expect(captureReducer(current, { type: 'STREAM_CONNECTED', surface: 'window', label: 'x', startedAt: '' })).toBe(current);
    expect(captureReducer(current, { type: 'CAPTURE_REQUESTED' })).toBe(current);
    expect(captureReducer(current, { type: 'CAPTURE_SUCCEEDED' })).toBe(current);
    expect(captureReducer(current, { type: 'STOP_FINISHED' })).toBe(current);
  });

  it('syncs the step count without change when counts match', () => {
    const current = state({ stepCount: 3 });
    expect(captureReducer(current, { type: 'SYNC_STEPS', count: 3 })).toBe(current);
    expect(captureReducer(current, { type: 'SYNC_STEPS', count: 5 }).stepCount).toBe(5);
  });

  it('resets to the initial state', () => {
    const next = captureReducer(state({ status: 'error', stepCount: 4 }), { type: 'RESET' });
    expect(next).toEqual(initialCaptureState);
  });
});

describe('capture status helpers', () => {
  it('exposes only valid user actions per status', () => {
    expect(canChooseSource('idle')).toBe(true);
    expect(canChooseSource('error')).toBe(true);
    expect(canChooseSource('recording')).toBe(false);
    expect(canCaptureFrame('recording')).toBe(true);
    expect(canCaptureFrame('capturing')).toBe(false);
    expect(canFinishSession('recording')).toBe(true);
    expect(canFinishSession('stopping')).toBe(false);
    expect(canReleaseSource('recording')).toBe(true);
    expect(canReleaseSource('idle')).toBe(false);
    expect(isCaptureSessionActive('connecting')).toBe(true);
    expect(isCaptureSessionActive('completed')).toBe(false);
  });
});
