import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { useSettingsStore } from '../store/settingsStore';
import { AMBIENT_SOUNDS } from '../constants/sounds';

interface Props {
  isRunning: boolean;
  isBreak: boolean;
}

const FADE_IN_MS  = 1200;
const FADE_OUT_MS = 800;

export function useAmbientSound({ isRunning, isBreak }: Props) {
  const ambientSound       = useSettingsStore((s) => s.ambientSound);
  const ambientVolume      = useSettingsStore((s) => s.ambientVolume);
  const playDuringBreak    = useSettingsStore((s) => s.playAmbientDuringBreak);

  const soundRef      = useRef<Audio.Sound | null>(null);
  const loadedIdRef   = useRef<string>('none');
  const fadeTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  // Keep a ref so fade callbacks always use the latest value without stale closures
  const volumeRef     = useRef(ambientVolume);
  volumeRef.current   = ambientVolume;

  function stopFade() {
    if (fadeTimerRef.current) {
      clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }

  // Ramp sound volume from 0→target or target→0 over durationMs
  function rampTo(sound: Audio.Sound, toRatio: number, durationMs: number): Promise<void> {
    stopFade();
    const fromRatio = toRatio > 0 ? 0 : 1;
    const steps = Math.max(1, Math.round(durationMs / 50));
    let step = 0;
    return new Promise((resolve) => {
      fadeTimerRef.current = setInterval(async () => {
        step++;
        const progress = Math.min(step / steps, 1);
        const ratio = fromRatio + (toRatio - fromRatio) * progress;
        try {
          await sound.setVolumeAsync(Math.max(0, Math.min(1, ratio * volumeRef.current)));
        } catch (_e) {}
        if (step >= steps) {
          stopFade();
          resolve();
        }
      }, 50);
    });
  }

  // Configure audio session once on mount — critical for silent mode + background
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    }).catch(() => {});

    return () => {
      stopFade();
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, []);

  // Load / unload when the selected sound changes
  useEffect(() => {
    async function updateSound() {
      if (loadedIdRef.current === ambientSound) return;

      stopFade();
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch (_e) {}
        soundRef.current = null;
      }
      loadedIdRef.current = ambientSound;

      if (ambientSound === 'none') return;

      const def = AMBIENT_SOUNDS.find((s) => s.id === ambientSound);
      if (!def?.uri) return; // sound not yet sourced — silently skip

      try {
        const { sound } = await Audio.Sound.createAsync(
          def.uri,
          { isLooping: true, volume: 0, shouldPlay: false }
        );
        soundRef.current = sound;

        // Auto-play if session already running when sound is changed
        const shouldPlay = isRunning && (!isBreak || playDuringBreak);
        if (shouldPlay) {
          await sound.playAsync();
          rampTo(sound, 1, FADE_IN_MS);
        }
      } catch (_e) {}
    }
    updateSound();
  }, [ambientSound]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync playback whenever session state changes
  useEffect(() => {
    async function sync() {
      const sound = soundRef.current;
      if (!sound) return;

      const shouldPlay = isRunning && (!isBreak || playDuringBreak);

      let status;
      try { status = await sound.getStatusAsync(); } catch { return; }
      if (!status.isLoaded) return;

      if (shouldPlay && !status.isPlaying) {
        await sound.setVolumeAsync(0).catch(() => {});
        await sound.playAsync().catch(() => {});
        rampTo(sound, 1, FADE_IN_MS);
      } else if (!shouldPlay && status.isPlaying) {
        await rampTo(sound, 0, FADE_OUT_MS);
        await sound.pauseAsync().catch(() => {});
      }
    }
    sync();
  }, [isRunning, isBreak, playDuringBreak]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update volume live when the setting changes
  useEffect(() => {
    async function updateVol() {
      const sound = soundRef.current;
      if (!sound) return;
      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await sound.setVolumeAsync(ambientVolume);
        }
      } catch (_e) {}
    }
    updateVol();
  }, [ambientVolume]);
}
