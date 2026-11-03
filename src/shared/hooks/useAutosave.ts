import { useCallback, useEffect, useRef, useState } from 'react';
import type { SaveState } from '../components/SaveStatus';

interface AutosaveOptions<T> {
  value: T | null;
  delay?: number;
  save: (value: T) => Promise<void>;
  onSaved?: (value: T) => void;
  onError?: (error: unknown) => void;
}

export function useAutosave<T>({
  value,
  delay = 650,
  save,
  onSaved,
  onError,
}: AutosaveOptions<T>) {
  const [state, setState] = useState<SaveState>('idle');
  const [error, setError] = useState<unknown>(null);
  const pendingRef = useRef<T | null>(null);
  const timerRef = useRef<number | null>(null);
  const saveRef = useRef(save);
  const onSavedRef = useRef(onSaved);
  const onErrorRef = useRef(onError);
  const savingRef = useRef(false);

  useEffect(() => {
    saveRef.current = save;
    onSavedRef.current = onSaved;
    onErrorRef.current = onError;
  });

  const flush = useCallback(async () => {
    if (savingRef.current) return;
    const pending = pendingRef.current;
    if (pending === null) return;
    savingRef.current = true;
    pendingRef.current = null;
    setState('saving');
    try {
      await saveRef.current(pending);
      setState('saved');
      setError(null);
      onSavedRef.current?.(pending);
    } catch (caught) {
      pendingRef.current = pending;
      setState('error');
      setError(caught);
      onErrorRef.current?.(caught);
    } finally {
      savingRef.current = false;
    }
  }, []);

  const schedule = useCallback(
    (next: T) => {
      pendingRef.current = next;
      setState('saving');
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        void flush();
      }, delay);
    },
    [delay, flush],
  );

  const lastQueued = useRef<T | null>(null);
  useEffect(() => {
    if (value === null) return;
    if (lastQueued.current === value) return;
    lastQueued.current = value;
    schedule(value);
  }, [value, schedule]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      const pending = pendingRef.current;
      if (pending !== null) {
        void saveRef.current(pending);
      }
    },
    [],
  );

  const retry = useCallback(() => {
    if (pendingRef.current === null) return;
    void flush();
  }, [flush]);

  return { state, error, retry, flushNow: flush };
}
