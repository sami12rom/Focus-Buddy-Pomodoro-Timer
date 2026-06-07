jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

let mockAppStateListener: ((state: string) => void) | null = null;

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn((_event: string, listener: (state: string) => void) => {
      mockAppStateListener = listener;
      return { remove: jest.fn() };
    }),
  },
}));

import React from 'react';
import { useTimer } from '../useTimer';
import { useSessionStore } from '../../store/sessionStore';

const TestRenderer = require('react-test-renderer') as {
  create: (element: React.ReactElement) => { unmount: () => void };
  act: (callback: () => void | Promise<void>) => Promise<void>;
};

const START_TIME = 1_000_000;

describe('useTimer foreground recovery', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(START_TIME);
    mockAppStateListener = null;
    useSessionStore.getState().resetToDefaults();
    useSessionStore.getState().setFocusMinutes(1);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('completes exactly once when the app returns after the timer expired', async () => {
    const onComplete = jest.fn();
    const latestTimer = {
      current: null as ReturnType<typeof useTimer> | null,
    };

    function Harness() {
      latestTimer.current = useTimer('focus', onComplete);
      return null;
    }

    useSessionStore.getState().startFocus();
    let renderer: { unmount: () => void } | null = null;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(React.createElement(Harness));
    });
    expect(latestTimer.current?.isRunning).toBe(true);
    expect(mockAppStateListener).not.toBeNull();

    jest.setSystemTime(START_TIME + 61_000);
    await TestRenderer.act(async () => {
      mockAppStateListener?.('active');
      mockAppStateListener?.('active');
      await jest.advanceTimersByTimeAsync(2_000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);

    await TestRenderer.act(async () => {
      renderer?.unmount();
    });
  });
});
