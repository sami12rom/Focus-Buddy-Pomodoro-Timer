import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSessionStore } from '../store/sessionStore';

interface UseTimerReturn {
  remainingMs: number;
  isRunning: boolean;
  isPaused: boolean;
}

export function useTimer(mode: 'focus' | 'break', onComplete: () => void): UseTimerReturn {
  const status = useSessionStore((s) => s.status);
  const startTime = useSessionStore((s) => s.startTime);
  const totalPausedMs = useSessionStore((s) => s.totalPausedMs);
  const selectedFocusMinutes = useSessionStore((s) => s.selectedFocusMinutes);
  const selectedBreakMinutes = useSessionStore((s) => s.selectedBreakMinutes);
  const selectedLongBreakMinutes = useSessionStore((s) => s.selectedLongBreakMinutes);
  const isCurrentBreakLong = useSessionStore((s) => s.isCurrentBreakLong);

  const DURATION =
    mode === 'focus'
      ? selectedFocusMinutes * 60_000
      : (isCurrentBreakLong ? selectedLongBreakMinutes : selectedBreakMinutes) * 60_000;

  const [remainingMs, setRemainingMs] = useState(DURATION);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const compute = useCallback((): number => {
    if (!startTime) return DURATION;
    const elapsed = Date.now() - startTime - totalPausedMs;
    return Math.max(0, DURATION - elapsed);
  }, [startTime, totalPausedMs, DURATION]);

  const tick = useCallback(() => {
    const remaining = compute();
    setRemainingMs(remaining);
    if (remaining <= 0 && !completedRef.current) {
      completedRef.current = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      onCompleteRef.current();
    }
  }, [compute]);

  const isRunning =
    (mode === 'focus' && status === 'running') ||
    (mode === 'break' && status === 'break_running');

  const isPaused =
    (mode === 'focus' && status === 'paused') ||
    (mode === 'break' && status === 'break_paused');

  useEffect(() => {
    if (isRunning) {
      completedRef.current = false;
      tick();
      intervalRef.current = setInterval(tick, 500);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setRemainingMs(compute());
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, startTime, totalPausedMs, DURATION]);

  // Re-sync when app comes back to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') tick();
    });
    return () => sub.remove();
  }, [tick]);

  return { remainingMs, isRunning, isPaused };
}
