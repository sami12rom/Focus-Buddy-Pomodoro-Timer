jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    Sound: {
      createAsync: jest.fn(),
    },
  },
}));

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

jest.mock('../../constants/sounds', () => ({
  AMBIENT_SOUNDS: [],
  BREAK_SOUNDS: [],
}));

import React from 'react';
import { Audio } from 'expo-av';
import { useAmbientSound } from '../useAmbientSound';
import { useSettingsStore } from '../../store/settingsStore';

const TestRenderer = require('react-test-renderer') as {
  create: (element: React.ReactElement) => { unmount: () => void };
  act: (callback: () => void | Promise<void>) => Promise<void>;
};
const mockCreateAsync = Audio.Sound.createAsync as jest.Mock;
const mockSetAudioModeAsync = Audio.setAudioModeAsync as jest.Mock;

describe('useAmbientSound quiet path', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockCreateAsync.mockClear();
    mockSetAudioModeAsync.mockClear();
    useSettingsStore.getState().resetToDefaults();
    useSettingsStore.getState().setAmbientSounds([]);
    useSettingsStore.getState().setBreakSound('none');
    useSettingsStore.getState().setPlayAmbientDuringBreak(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does no native sound work during a long focus session with no sounds selected', async () => {
    function Harness() {
      useAmbientSound({ isRunning: true, isBreak: false });
      return null;
    }

    let renderer: { unmount: () => void } | null = null;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(React.createElement(Harness));
      await jest.advanceTimersByTimeAsync(2 * 60 * 60_000);
    });

    expect(mockSetAudioModeAsync).toHaveBeenCalledTimes(1);
    expect(mockCreateAsync).not.toHaveBeenCalled();

    await TestRenderer.act(async () => {
      renderer?.unmount();
    });
  });
});
