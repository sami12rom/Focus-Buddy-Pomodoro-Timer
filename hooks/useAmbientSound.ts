import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { useSettingsStore } from '../store/settingsStore';
import { AMBIENT_SOUNDS, BREAK_SOUNDS } from '../constants/sounds';
import { AmbientSoundManager } from './ambientSoundManager';

interface Props {
  isRunning: boolean;
  isBreak: boolean;
}

interface PlaybackSound {
  id: string;
  uri: number;
}

const FADE_IN_MS = 1200;

export function useAmbientSound({ isRunning, isBreak }: Props) {
  const ambientSounds   = useSettingsStore((s) => s.ambientSounds);
  const ambientVolume   = useSettingsStore((s) => s.ambientVolume);
  const playDuringBreak = useSettingsStore((s) => s.playAmbientDuringBreak);
  const breakSound      = useSettingsStore((s) => s.breakSound);

  const updateRunRef   = useRef(0);
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

  // Configure audio session once on mount — critical for silent mode + background
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    }).catch(() => {});

    return () => {
      manager.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load / unload when selected sounds change
  useEffect(() => {
    async function updateSounds() {
      const runId = ++updateRunRef.current;
      const selected = getSelectedSounds();
      const selectedSet = new Set<string>(selected.map((s) => s.id));
      const fadingInIds: string[] = [];

      // Snapshot and IMMEDIATELY remove sounds that are no longer selected.
      // Removing before any async work prevents:
      //   (a) double-unload from concurrent runs operating on the same object
      //   (b) a re-add within the fade window being silently skipped because
      //       the sound was still in refs
      const toRemove: Array<[string, Audio.Sound]> = [];
      for (const [id, sound] of Object.entries(manager.soundRefs)) {
        if (!selectedSet.has(id)) {
          delete manager.soundRefs[id];
          toRemove.push([id, sound]);
        }
      }

      await Promise.all(toRemove.map(([id, sound]) => manager.drainSound(id, sound, true)));

      if (runId !== updateRunRef.current) return;

      // Load newly added sounds
      await Promise.all(
        selected.map(async ({ id, uri }) => {
          if (manager.soundRefs[id]) return;
          try {
            const { sound } = await Audio.Sound.createAsync(
              uri,
              { isLooping: true, volume: 0, shouldPlay: false }
            );
            if (runId !== updateRunRef.current || !selectedSet.has(id)) {
              await sound.unloadAsync().catch(() => {});
              return;
            }
            manager.soundRefs[id] = sound;

            if (isRunning) {
              await sound.playAsync();
              fadingInIds.push(id);
              manager.rampTo(id, sound, 1, FADE_IN_MS);
            }
          } catch (_e) {}
        })
      );

      if (runId !== updateRunRef.current) return;
      await updateLoadedVolumes(fadingInIds);
    }
    updateSounds();
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
