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
  const ambientSounds      = useSettingsStore((s) => s.ambientSounds);
  const ambientVolume      = useSettingsStore((s) => s.ambientVolume);
  const playDuringBreak    = useSettingsStore((s) => s.playAmbientDuringBreak);

  const soundRefs     = useRef<Record<string, Audio.Sound>>({});
  const fadeTimerRefs = useRef<Record<string, ReturnType<typeof setInterval> | null>>({});
  const updateRunRef  = useRef(0);
  const playbackRunRef = useRef(0);
  // Keep a ref so fade callbacks always use the latest value without stale closures
  const volumeRef     = useRef(ambientVolume);
  volumeRef.current   = ambientVolume;
  const selectedCountRef = useRef(Math.max(1, ambientSounds.length));
  selectedCountRef.current = Math.max(1, ambientSounds.length);

  function targetVolume(ratio: number) {
    const mixGain = 1 / Math.sqrt(selectedCountRef.current);
    return Math.max(0, Math.min(1, ratio * volumeRef.current * mixGain));
  }

  function stopFade(id: string) {
    if (fadeTimerRefs.current[id]) {
      clearInterval(fadeTimerRefs.current[id]!);
      fadeTimerRefs.current[id] = null;
    }
  }

  // Ramp sound volume from 0→target or target→0 over durationMs
  function rampTo(id: string, sound: Audio.Sound, toRatio: number, durationMs: number): Promise<void> {
    stopFade(id);
    const fromRatio = toRatio > 0 ? 0 : 1;
    const steps = Math.max(1, Math.round(durationMs / 50));
    let step = 0;
    return new Promise((resolve) => {
      fadeTimerRefs.current[id] = setInterval(async () => {
        step++;
        const progress = Math.min(step / steps, 1);
        const ratio = fromRatio + (toRatio - fromRatio) * progress;
        try {
          await sound.setVolumeAsync(targetVolume(ratio));
        } catch (_e) {}
        if (step >= steps) {
          stopFade(id);
          resolve();
        }
      }, 50);
    });
  }

  function stopAllFades() {
    Object.keys(fadeTimerRefs.current).forEach(stopFade);
  }

  async function unloadSound(id: string) {
    stopFade(id);
    const sound = soundRefs.current[id];
    if (!sound) return;
    try {
      await sound.stopAsync();
      await sound.unloadAsync();
    } catch (_e) {}
    delete soundRefs.current[id];
    delete fadeTimerRefs.current[id];
  }

  async function updateLoadedVolumes(skipIds: string[] = []) {
    await Promise.all(
      Object.entries(soundRefs.current).map(async ([id, sound]) => {
        if (skipIds.includes(id)) return;
        stopFade(id);
        try {
          const status = await sound.getStatusAsync();
          if (status.isLoaded && status.isPlaying) {
            await sound.setVolumeAsync(targetVolume(1));
          }
        } catch (_e) {}
      })
    );
  }

  // Configure audio session once on mount — critical for silent mode + background
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    }).catch(() => {});

    return () => {
      stopAllFades();
      Object.values(soundRefs.current).forEach((sound) => {
        sound.unloadAsync().catch(() => {});
      });
      soundRefs.current = {};
      fadeTimerRefs.current = {};
    };
  }, []);

  // Load / unload when selected sounds change
  useEffect(() => {
    async function updateSounds() {
      const runId = ++updateRunRef.current;
      const selected = ambientSounds.filter((id) => id !== 'none');
      const selectedSet = new Set<string>(selected);
      const fadingInIds: string[] = [];

      await Promise.all(
        Object.keys(soundRefs.current)
          .filter((id) => !selectedSet.has(id))
          .map(unloadSound)
      );

      await Promise.all(
        selected.map(async (id) => {
          if (soundRefs.current[id]) return;
          const def = AMBIENT_SOUNDS.find((s) => s.id === id);
          if (!def?.uri) return; // sound not yet sourced — silently skip

          try {
            const { sound } = await Audio.Sound.createAsync(
              def.uri,
              { isLooping: true, volume: 0, shouldPlay: false }
            );
            if (runId !== updateRunRef.current || !selectedSet.has(id)) {
              await sound.unloadAsync().catch(() => {});
              return;
            }
            soundRefs.current[id] = sound;

            // Auto-play if session already running when sound is changed
            const shouldPlay = isRunning && (!isBreak || playDuringBreak);
            if (shouldPlay) {
              await sound.playAsync();
              fadingInIds.push(id);
              rampTo(id, sound, 1, FADE_IN_MS);
            }
          } catch (_e) {}
        })
      );

      if (runId !== updateRunRef.current) return;
      await updateLoadedVolumes(fadingInIds);
    }
    updateSounds();
  }, [ambientSounds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync playback whenever session state changes
  useEffect(() => {
    async function sync() {
      const runId = ++playbackRunRef.current;
      const shouldPlay = isRunning && (!isBreak || playDuringBreak);

      await Promise.all(
        Object.entries(soundRefs.current).map(async ([id, sound]) => {
          let status;
          try { status = await sound.getStatusAsync(); } catch { return; }
          if (!status.isLoaded) return;

          if (shouldPlay && !status.isPlaying) {
            await sound.setVolumeAsync(0).catch(() => {});
            if (runId !== playbackRunRef.current) return;
            await sound.playAsync().catch(() => {});
            if (runId !== playbackRunRef.current) return;
            rampTo(id, sound, 1, FADE_IN_MS);
          } else if (!shouldPlay && status.isPlaying) {
            await rampTo(id, sound, 0, FADE_OUT_MS);
            if (runId !== playbackRunRef.current) return;
            await sound.pauseAsync().catch(() => {});
          } else if (shouldPlay && status.isPlaying) {
            stopFade(id);
            await sound.setVolumeAsync(targetVolume(1)).catch(() => {});
          }
        })
      );
    }
    sync();
  }, [isRunning, isBreak, playDuringBreak]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update volume live when the setting changes
  useEffect(() => {
    updateLoadedVolumes();
  }, [ambientVolume]); // eslint-disable-line react-hooks/exhaustive-deps
}
