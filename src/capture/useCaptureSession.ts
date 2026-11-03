import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { SaveState } from '../shared/components/SaveStatus';
import { createId } from '../shared/format';
import type { CaptureStatus, Guide, GuideStep } from '../shared/types';
import {
  canCaptureFrame,
  canChooseSource,
  canFinishSession,
  canReleaseSource,
  captureReducer,
  initialCaptureState,
} from './sessionMachine';
import {
  CaptureError,
  logCaptureError,
  toCaptureErrorState,
  type CaptureErrorState,
} from './errors';
import type { CaptureServices } from './services';

const SAVE_DEBOUNCE_MS = 700;

export type CaptureLoadState = 'loading' | 'ready' | 'missing' | 'error' | 'conflict';

export interface CaptureBusyState {
  source: boolean;
  capture: boolean;
  finish: boolean;
  deleteStepId: string | null;
}

const emptyBusy: CaptureBusyState = {
  source: false,
  capture: false,
  finish: false,
  deleteStepId: null,
};

export function useCaptureSession(initialGuideId: string | null, services: CaptureServices) {
  const [machine, dispatch] = useReducer(captureReducer, initialCaptureState);
  const machineRef = useRef(machine);
  machineRef.current = machine;

  const [guide, setGuide] = useState<Guide | null>(null);
  const [loadState, setLoadState] = useState<CaptureLoadState>('loading');
  const [loadError, setLoadError] = useState<CaptureErrorState | null>(null);
  const [actionError, setActionError] = useState<CaptureErrorState | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState<CaptureBusyState>(emptyBusy);
  const [conflictTabId, setConflictTabId] = useState<number | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const guideRef = useRef<Guide | null>(null);
  const mountedRef = useRef(true);
  const ownsSessionRef = useRef(false);
  const choosingRef = useRef(false);
  const captureRef = useRef(false);
  const finishingRef = useRef(false);
  const deletingRef = useRef(false);
  const dirtyRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const persistChainRef = useRef<Promise<unknown>>(Promise.resolve());
  const sessionIdRef = useRef(createId());
  const draftGuideIdRef = useRef<string | null>(null);
  const createdGuideRef = useRef<Promise<Guide> | null>(null);

  const enqueue = useCallback(function enqueueTask<T>(task: () => Promise<T>): Promise<T> {
    const run = persistChainRef.current.then(task, task);
    persistChainRef.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }, []);

  const performSave = useCallback(
    async (snapshot: Guide): Promise<Guide> => {
      if (mountedRef.current) {
        setSaveState('saving');
        setSaveError(null);
      }
      try {
        const saved = await services.guides.save(snapshot);
        if (mountedRef.current) setSaveState('saved');
        return saved;
      } catch (error) {
        services.logError('save guide', error);
        if (mountedRef.current) {
          setSaveState('error');
          setSaveError(toCaptureErrorState(error).message);
        }
        throw error;
      }
    },
    [services],
  );

  const flushPending = useCallback(async (): Promise<Guide | null> => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const snapshot = guideRef.current;
    if (!snapshot) return null;
    if (!dirtyRef.current) {
      await persistChainRef.current;
      return guideRef.current;
    }

    dirtyRef.current = false;
    try {
      const saved = await enqueue(() => performSave(snapshot));
      if (guideRef.current === snapshot) {
        guideRef.current = saved;
        if (mountedRef.current) setGuide(saved);
      }
      return saved;
    } catch (error) {
      dirtyRef.current = true;
      throw error;
    }
  }, [enqueue, performSave]);

  const scheduleSave = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void flushPending().catch(() => undefined);
    }, SAVE_DEBOUNCE_MS);
  }, [flushPending]);

  const updateGuide = useCallback(
    (mutator: (current: Guide) => Guide) => {
      const current = guideRef.current;
      if (!current) return;
      const next = mutator(current);
      if (next === current) return;
      guideRef.current = next;
      dirtyRef.current = true;
      if (mountedRef.current) setGuide(next);
      scheduleSave();
    },
    [scheduleSave],
  );

  const applyGuide = useCallback((next: Guide) => {
    guideRef.current = next;
    dirtyRef.current = false;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!mountedRef.current) return;
    setGuide(next);
    setSaveState('saved');
    setSaveError(null);
    dispatch({ type: 'SYNC_STEPS', count: next.steps.length });
  }, []);

  const touchLock = useCallback(
    (status: CaptureStatus, stepCount?: number) => {
      if (!ownsSessionRef.current) return;
      void services.lock
        .touch(sessionIdRef.current, { status, stepCount })
        .catch((error) => services.logError('capture lock heartbeat', error));
    },
    [services],
  );

  const handleSourceEnded = useCallback(() => {
    dispatch({ type: 'SOURCE_ENDED' });
    if (ownsSessionRef.current) {
      void services.lock
        .touch(sessionIdRef.current, {
          status: 'error',
          stepCount: guideRef.current?.steps.length ?? 0,
        })
        .catch(() => undefined);
    }
  }, [services]);

  useEffect(() => {
    let active = true;
    mountedRef.current = true;
    setLoadState('loading');
    setLoadError(null);
    setActionError(null);
    setGuide(null);
    guideRef.current = null;
    dirtyRef.current = false;
    dispatch({ type: 'RESET' });

    const load = async () => {
      let acquiredSessionId: string | null = null;
      try {
        let loaded: Guide | null = null;
        let targetGuideId = initialGuideId;

        if (targetGuideId) {
          loaded = await services.guides.load(targetGuideId);
          if (!active) return;
          if (!loaded) {
            setLoadState('missing');
            return;
          }
        } else {
          targetGuideId = draftGuideIdRef.current ??= createId();
        }

        // Acquire the lock before persisting a new guide so a rejected second
        // session does not leave an empty guide behind.
        const lock = await services.lock.acquire({ guideId: targetGuideId });
        if (!active) {
          if (lock.ok) void services.lock.release(lock.record.id);
          return;
        }
        if (!lock.ok) {
          setConflictTabId(lock.conflictTabId);
          setLoadState('conflict');
          return;
        }

        acquiredSessionId = lock.record.id;
        ownsSessionRef.current = true;
        sessionIdRef.current = lock.record.id;

        if (!loaded) {
          createdGuideRef.current ??= services.guides.create(targetGuideId);
          loaded = await createdGuideRef.current;
        }
        if (!active) return;

        guideRef.current = loaded;
        setGuide(loaded);
        dispatch({ type: 'SYNC_STEPS', count: loaded.steps.length });
        setLoadState('ready');
      } catch (error) {
        if (acquiredSessionId) {
          ownsSessionRef.current = false;
          await services.lock.release(acquiredSessionId).catch(() => undefined);
        }
        services.logError('load capture session', error);
        if (!active) return;
        setLoadError(toCaptureErrorState(error));
        setLoadState('error');
      }
    };

    void load();

    return () => {
      active = false;
      mountedRef.current = false;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      services.picker.cancel();
      services.streams.stop();
      if (ownsSessionRef.current) {
        ownsSessionRef.current = false;
        void services.lock.release(sessionIdRef.current).catch(() => undefined);
      }
      if (dirtyRef.current && guideRef.current) {
        const snapshot = guideRef.current;
        dirtyRef.current = false;
        void services.guides.save(snapshot).catch((error) => {
          logCaptureError('save on unmount', error);
        });
      }
    };
  }, [initialGuideId, reloadToken, services]);

  const chooseSource = useCallback(async () => {
    if (choosingRef.current) return;
    if (!canChooseSource(machineRef.current.status)) return;

    choosingRef.current = true;
    setActionError(null);
    setBusy((current) => ({ ...current, source: true }));
    // dispatch and chooseDesktopMedia both run synchronously from the click
    // handler so Chrome keeps the user gesture.
    dispatch({ type: 'REQUEST_SOURCE' });

    try {
      const choice = await services.picker.choose();
      if (!choice) {
        dispatch({ type: 'SOURCE_CANCELLED' });
        return;
      }

      dispatch({
        type: 'SOURCE_PICKED',
        surface: 'unknown',
        label: 'مصدر سطح المكتب',
      });
      const connection = await services.streams.connect(choice.streamId, handleSourceEnded);
      dispatch({
        type: 'STREAM_CONNECTED',
        surface: connection.surface,
        label: connection.label,
        startedAt: new Date().toISOString(),
      });
      touchLock('recording', guideRef.current?.steps.length ?? 0);
    } catch (error) {
      services.streams.stop();
      services.logError('select capture source', error);
      const state = toCaptureErrorState(error);
      dispatch({ type: 'CONNECT_FAILED', error: state });
      if (mountedRef.current) setActionError(state);
    } finally {
      choosingRef.current = false;
      if (mountedRef.current) setBusy((current) => ({ ...current, source: false }));
    }
  }, [handleSourceEnded, services, touchLock]);

  const cancelSourceChoice = useCallback(() => {
    if (machineRef.current.status !== 'selecting-source') return;
    services.picker.cancel();
  }, [services]);

  const captureStep = useCallback(async (): Promise<GuideStep | null> => {
    if (captureRef.current) return null;
    if (!canCaptureFrame(machineRef.current.status) || !services.streams.isActive()) return null;
    if (!guideRef.current) return null;

    captureRef.current = true;
    setActionError(null);
    setBusy((current) => ({ ...current, capture: true }));
    dispatch({ type: 'CAPTURE_REQUESTED' });
    const surface = machineRef.current.sourceSurface;

    try {
      const frame = await services.streams.capture();
      const current = guideRef.current;
      if (!current) throw new CaptureError('unknown', 'Guide missing during capture.');

      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      dirtyRef.current = false;

      const result = await enqueue(() =>
        services.guides.addStep(current, { dataUrl: frame.dataUrl, surface }),
      );
      applyGuide(result.guide);
      dispatch({ type: 'CAPTURE_SUCCEEDED' });
      touchLock('recording', result.guide.steps.length);
      return result.step;
    } catch (error) {
      services.logError('capture step', error);
      dirtyRef.current = true;
      scheduleSave();
      const state = toCaptureErrorState(error);
      if (mountedRef.current) setActionError(state);
      dispatch({ type: 'CAPTURE_FAILED', error: state });
      return null;
    } finally {
      captureRef.current = false;
      if (mountedRef.current) setBusy((current) => ({ ...current, capture: false }));
    }
  }, [applyGuide, enqueue, scheduleSave, services, touchLock]);

  const deleteStep = useCallback(
    async (stepId: string): Promise<boolean> => {
      if (deletingRef.current || captureRef.current || finishingRef.current) return false;
      const current = guideRef.current;
      if (!current) return false;

      deletingRef.current = true;
      setActionError(null);
      setBusy((state) => ({ ...state, deleteStepId: stepId }));
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      dirtyRef.current = false;

      try {
        const next = await enqueue(() => services.guides.removeStep(current, stepId));
        applyGuide(next);
        dispatch({ type: 'STEP_DELETED' });
        touchLock(machineRef.current.status, next.steps.length);
        return true;
      } catch (error) {
        services.logError('delete capture step', error);
        dirtyRef.current = true;
        scheduleSave();
        if (mountedRef.current) setActionError(toCaptureErrorState(error));
        return false;
      } finally {
        deletingRef.current = false;
        if (mountedRef.current) setBusy((state) => ({ ...state, deleteStepId: null }));
      }
    },
    [applyGuide, enqueue, scheduleSave, services, touchLock],
  );

  const stopCapture = useCallback(() => {
    if (!canReleaseSource(machineRef.current.status)) return;
    services.streams.stop();
    dispatch({ type: 'RELEASE_SOURCE' });
    touchLock('idle', guideRef.current?.steps.length ?? 0);
  }, [services, touchLock]);

  const finish = useCallback(async (): Promise<boolean> => {
    if (finishingRef.current || captureRef.current || deletingRef.current) return false;
    if (!canFinishSession(machineRef.current.status)) return false;
    const current = guideRef.current;
    if (!current) return false;

    finishingRef.current = true;
    setActionError(null);
    setSaveError(null);
    setBusy((state) => ({ ...state, finish: true }));
    dispatch({ type: 'STOP_REQUESTED' });
    services.streams.stop();

    try {
      await flushPending();
      const latest = guideRef.current ?? current;
      if (ownsSessionRef.current) {
        await services.lock.release(sessionIdRef.current);
        ownsSessionRef.current = false;
      }
      dispatch({ type: 'STOP_FINISHED' });
      await services.openEditor(latest.id);
      return true;
    } catch (error) {
      services.logError('finish capture session', error);
      const state = toCaptureErrorState(error);
      if (mountedRef.current) {
        setActionError(state);
        setSaveError(state.message);
      }
      dispatch({ type: 'STOP_FAILED', error: state });
      return false;
    } finally {
      finishingRef.current = false;
      if (mountedRef.current) setBusy((state) => ({ ...state, finish: false }));
    }
  }, [flushPending, services]);

  const setTitle = useCallback(
    (value: string) => updateGuide((current) => ({ ...current, title: value })),
    [updateGuide],
  );

  const setDescription = useCallback(
    (value: string) => updateGuide((current) => ({ ...current, description: value })),
    [updateGuide],
  );

  const setStepInstruction = useCallback(
    (stepId: string, value: string) =>
      updateGuide((current) => ({
        ...current,
        steps: current.steps.map((step) =>
          step.id === stepId ? { ...step, instruction: value } : step,
        ),
      })),
    [updateGuide],
  );

  const dismissErrors = useCallback(() => {
    setActionError(null);
    setSaveError(null);
    dispatch({ type: 'DISMISS_ERROR' });
  }, []);

  const reload = useCallback(() => {
    createdGuideRef.current = null;
    draftGuideIdRef.current = null;
    setReloadToken((token) => token + 1);
  }, []);

  const focusOtherSession = useCallback(async () => {
    if (conflictTabId === null) return;
    try {
      await services.focusTab(conflictTabId);
    } catch (error) {
      services.logError('focus existing capture tab', error);
    }
  }, [conflictTabId, services]);

  const openEditor = useCallback(async () => {
    if (!guideRef.current) return;
    try {
      await services.openEditor(guideRef.current.id);
    } catch (error) {
      services.logError('open editor', error);
      if (mountedRef.current) setActionError(toCaptureErrorState(error));
    }
  }, [services]);

  const openPrint = useCallback(async () => {
    if (!guideRef.current) return;
    try {
      await services.openPrint(guideRef.current.id);
    } catch (error) {
      services.logError('open print page', error);
      if (mountedRef.current) setActionError(toCaptureErrorState(error));
    }
  }, [services]);

  return {
    machine,
    guide,
    loadState,
    loadError,
    actionError,
    saveState,
    saveError,
    busy,
    conflictTabId,
    chooseSource,
    cancelSourceChoice,
    captureStep,
    deleteStep,
    stopCapture,
    finish,
    setTitle,
    setDescription,
    setStepInstruction,
    flushNow: flushPending,
    dismissErrors,
    reload,
    focusOtherSession,
    openEditor,
    openPrint,
  };
}
