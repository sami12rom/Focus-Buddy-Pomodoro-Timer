import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Audio } from 'expo-av';
import { useSettingsStore } from '../store/settingsStore';
import { AMBIENT_SOUNDS, BREAK_SOUNDS } from '../constants/sounds';
import { AmbientSoundManager } from './ambientSoundManager';
import { SoundUpdateScheduler } from './soundUpdateScheduler';

interface Props {
  isRunning: boolean;
  isBreak: boolean;
}

interface PlaybackSound {
  id: string;
  uri: number;
}

const FADE_IN_MS = 1200;
// Debounce window for sound selection changes. Rapid taps (e.g. white noise →
// rain → café → none in quick succession) each trigger the effect; only the
// final selection fires Audio.Sound.createAsync, preventing concurrent native
// bridge calls that saturate the audio subsystem and cause an ANR.
const SOUND_CHANGE_DEBOUNCE_MS = 200;

export function useAmbientSound({ isRunning, isBreak }: Props) {
  const ambientSounds   = useSettingsStore((s) => s.ambientSounds);
  const ambientVolume   = useSettingsStore((s) => s.ambientVolume);
  const playDuringBreak = useSettingsStore((s) => s.playAmbientDuringBreak);
  const breakSound      = useSettingsStore((s) => s.breakSound);

  // Ref for isRunning so the scheduler callback (created once) always sees
  // the current value without being recreated.
  const isRunningRef    = useRef(isRunning);
  isRunningRef.current  = isRunning;

  const playbackRunRef = useRef(0);
  const volumeRef      = useRef(ambientVolume);
  volumeRef.current    = ambientVolume;

  const selectedLayerCount = isBreak && breakSound !== 'none'
    ? 1
    : Math.max(1, ambientSounds.filter((id) => id !== 'none').length);
  const selectedCountRef = useRef(selectedLayerCount);
  selectedCountRef.current = selectedLayerCount;

  const managerRef = useRef<AmbientSoundManager<Audio.Sound> | null>(null);
  if (!managerRef.current) {
    managerRef.current = new AmbientSoundManager<Audio.Sound>(
      () => volumeRef.current,
      () => selectedCountRef.current,
    );
  }
  const manager = managerRef.current as AmbientSoundManager<Audio.Sound>;

  // Snapshot of the selected sounds, updated at the top of the sound-deps
  // effect before calling schedule(). The scheduler callback reads this
  // snapshot so it always acts on the selection that triggered the last tap.
  const selectedSoundsRef = useRef<PlaybackSound[]>([]);

  function getSelectedSounds(): PlaybackSound[] {
    if (isBreak && breakSound !== 'none') {
      const def = BREAK_SOUNDS.find((s) => s.id === breakSound);
      return def?.uri ? [{ id: `break-${def.id}`, uri: def.uri }] : [];
    }

    if (isBreak && !playDuringBreak) return [];

    return ambientSounds
      .filter((id) => id !== 'none')
      .map((id): PlaybackSound | null => {
        const def = AMBIENT_SOUNDS.find((s) => s.id === id);
        return def?.uri ? { id, uri: def.uri } : null;
      })
      .filter((sound): sound is PlaybackSound => sound !== null);
  }

  async function updateLoadedVolumes(skipIds: string[] = []) {
    await Promise.all(
      Object.entries(manager.soundRefs).map(async ([id, sound]) => {
        if (skipIds.includes(id)) return;
        manager.stopFade(id);
        try {
          const status = await sound.getStatusAsync();
          if (status.isLoaded && status.isPlaying) {
            await sound.setVolumeAsync(manager.targetVolume(1));
          }
        } catch (_e) {}
      })
    );
  }

  // The scheduler is created once. Its callback uses refs for any value that
  // changes between renders (isRunning, the selected-sounds snapshot).
  const schedulerRef = useRef<SoundUpdateScheduler | null>(null);
  if (!schedulerRef.current) {
    schedulerRef.current = new SoundUpdateScheduler(
      SOUND_CHANGE_DEBOUNCE_MS,
      async (_runId, isCurrent) => {
        const selected = selectedSoundsRef.current;
        const selectedSet = new Set<string>(selected.map((s) => s.id));
        const fadingInIds: string[] = [];

        // Snapshot and IMMEDIATELY remove sounds no longer selected.
        // Removing before any await prevents:
        //   (a) double-unload from concurrent runs on the same object
        //   (b) a re-add within the fade window being silently skipped
        const toRemove: Array<[string, Audio.Sound]> = [];
        for (const [id, sound] of Object.entries(manager.soundRefs)) {
          if (!selectedSet.has(id)) {
            delete manager.soundRefs[id];
            toRemove.push([id, sound]);
          }
        }

        await Promise.all(toRemove.map(([id, sound]) => manager.drainSound(id, sound, true)));

        if (!isCurrent()) return;

        // Load newly added sounds
        await Promise.all(
          selected.map(async ({ id, uri }) => {
            if (manager.soundRefs[id]) return;
            try {
              const { sound } = await Audio.Sound.createAsync(
                uri,
                { isLooping: true, volume: 0, shouldPlay: false }
              );
              if (!isCurrent() || !selectedSet.has(id)) {
                await sound.unloadAsync().catch(() => {});
                return;
              }
              manager.soundRefs[id] = sound;

              if (isRunningRef.current) {
                await sound.playAsync();
                fadingInIds.push(id);
                manager.rampTo(id, sound, 1, FADE_IN_MS);
              }
            } catch (_e) {}
          })
        );

        if (!isCurrent()) return;
        await updateLoadedVolumes(fadingInIds);
      }
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
      schedulerRef.current!.cancel();
      manager.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When the app returns to the foreground, stop any in-flight fades immediately
  // and snap volumes to their correct values.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next !== 'active') return;
      manager.stopAllFades();
      void updateLoadedVolumes();
    });
    return () => sub.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Snapshot the current selection and fire a debounced update. The runId
  // increments inside schedule() — before the debounce delay — so any
  // in-flight createAsync from a previous tap detects it is stale.
  useEffect(() => {
    selectedSoundsRef.current = getSelectedSounds();
    schedulerRef.current!.schedule();
    return () => schedulerRef.current!.cancel();
  }, [ambientSounds, breakSound, isBreak, playDuringBreak]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync playback whenever session state changes
  useEffect(() => {
    async function sync() {
      const runId = ++playbackRunRef.current;
      const selectedSet = new Set<string>(getSelectedSounds().map((s) => s.id));

      await Promise.all(
        Object.entries(manager.soundRefs).map(async ([id, sound]) => {
          let status;
          try { status = await sound.getStatusAsync(); } catch { return; }
          if (!status.isLoaded) return;

          const shouldPlay = isRunning && selectedSet.has(id);
          if (shouldPlay && !status.isPlaying) {
            await sound.setVolumeAsync(0).catch(() => {});
            if (runId !== playbackRunRef.current) return;
            await sound.playAsync().catch(() => {});
            if (runId !== playbackRunRef.current) return;
            manager.rampTo(id, sound, 1, FADE_IN_MS);
          } else if (!shouldPlay && status.isPlaying) {
            await manager.rampTo(id, sound, 0, 800);
            if (runId !== playbackRunRef.current) return;
            await sound.pauseAsync().catch(() => {});
          } else if (shouldPlay && status.isPlaying) {
            manager.stopFade(id);
            await sound.setVolumeAsync(manager.targetVolume(1)).catch(() => {});
          }
        })
      );
    }
    sync();
  }, [isRunning, isBreak, playDuringBreak, breakSound, ambientSounds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update volume live when the setting changes
  useEffect(() => {
    updateLoadedVolumes();
  }, [ambientVolume]); // eslint-disable-line react-hooks/exhaustive-deps
}
