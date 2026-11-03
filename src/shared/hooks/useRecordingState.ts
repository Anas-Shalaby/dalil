import { useCallback, useEffect, useRef, useState } from 'react';
import { humanizeBrowserError, sendRuntimeMessage } from '../chrome';
import type { RecordingStateResponse } from '../messages';
import type {
  ActiveTabInfo,
  Guide,
  RecordingNotice,
  RecordingSession,
} from '../types';

interface RecordingState {
  ready: boolean;
  session: RecordingSession | null;
  currentTab: ActiveTabInfo | null;
  lastNotice: RecordingNotice | null;
  recentGuides: Guide[];
  error: string | null;
}

function isStateResponse(value: unknown): value is RecordingStateResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ok' in value &&
    (value as { ok?: unknown }).ok === true
  );
}

export function useRecordingState(pollMs = 4000) {
  const [state, setState] = useState<RecordingState>({
    ready: false,
    session: null,
    currentTab: null,
    lastNotice: null,
    recentGuides: [],
    error: null,
  });
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const response = await sendRuntimeMessage<RecordingStateResponse>({
        type: 'DALIL_GET_STATE',
      });
      if (!mountedRef.current) return;
      if (!isStateResponse(response)) {
        setState((prev) => ({ ...prev, ready: true, error: 'تعذّر تحميل حالة التسجيل.' }));
        return;
      }
      setState({
        ready: true,
        session: response.session,
        currentTab: response.currentTab,
        lastNotice: response.lastNotice,
        recentGuides: response.recentGuides ?? [],
        error: null,
      });
    } catch (error) {
      if (!mountedRef.current) return;
      setState((prev) => ({
        ...prev,
        ready: true,
        error: humanizeBrowserError(error),
      }));
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();

    const onStorageChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== 'local') return;
      const relevant = Object.keys(changes).some((key) => key.startsWith('dalil:'));
      if (relevant) void refresh();
    };

    chrome.storage.onChanged.addListener(onStorageChanged);
    const timer = window.setInterval(() => void refresh(), pollMs);

    return () => {
      mountedRef.current = false;
      chrome.storage.onChanged.removeListener(onStorageChanged);
      window.clearInterval(timer);
    };
  }, [refresh, pollMs]);

  const dismissNotice = useCallback(async () => {
    try {
      await sendRuntimeMessage({ type: 'DALIL_DISMISS_NOTICE' });
    } catch {
      // Ignore.
    }
    setState((prev) => ({ ...prev, lastNotice: null }));
  }, []);

  return { ...state, refresh, dismissNotice };
}
