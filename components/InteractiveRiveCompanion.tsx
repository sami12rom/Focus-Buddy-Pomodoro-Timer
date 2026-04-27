import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Rive, { RiveRef } from 'rive-react-native';
import { Asset } from 'expo-asset';
import { useTheme } from '../hooks/useTheme';

const STATE_MACHINE = 'CompanionStateMachine';

const STAGE_NUMBER: Record<Stage, number> = {
  egg: 0,
  baby: 1,
  young: 2,
  guardian: 3,
};

const STAGE_FALLBACK_EMOJI: Record<Stage, string> = {
  egg: '🥚',
  baby: '🐣',
  young: '🐥',
  guardian: '🐲',
};

type Stage = 'egg' | 'baby' | 'young' | 'guardian';
type Mood = 'idle' | 'happy' | 'focus' | 'tired' | 'sleeping';

interface Props {
  stage: Stage;
  mood: Mood;
  level: number;
  onTap?: () => void;
  onPet?: () => void;
}

export default function InteractiveRiveCompanion({
  stage,
  mood,
  level,
  onTap,
  onPet,
}: Props) {
  const t = useTheme();
  const riveRef = useRef<RiveRef>(null);
  const [riveUri, setRiveUri] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  const isReadyRef = useRef(false);
  const prevLevelRef = useRef(level);

  useEffect(() => {
    let cancelled = false;
    Asset.fromModule(require('../assets/rive/focus_buddy.riv'))
      .downloadAsync()
      .then((asset) => {
        if (!cancelled) {
          if (asset.localUri) setRiveUri(asset.localUri);
          else setHasError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const syncAllInputs = useCallback(() => {
    const rive = riveRef.current;
    if (!rive) return;
    rive.setInputState(STATE_MACHINE, 'stage', STAGE_NUMBER[stage]);
    rive.setInputState(STATE_MACHINE, 'focusMode', mood === 'focus');
    rive.setInputState(STATE_MACHINE, 'sleepMode', mood === 'sleeping');
    rive.setInputState(STATE_MACHINE, 'tiredMode', mood === 'tired');
    if (mood === 'happy') rive.fireState(STATE_MACHINE, 'happy');
  }, [stage, mood]);

  const handlePlay = useCallback(() => {
    isReadyRef.current = true;
    syncAllInputs();
  }, [syncAllInputs]);

  useEffect(() => {
    if (!isReadyRef.current) return;
    riveRef.current?.setInputState(STATE_MACHINE, 'stage', STAGE_NUMBER[stage]);
  }, [stage]);

  useEffect(() => {
    if (!isReadyRef.current) return;
    riveRef.current?.setInputState(STATE_MACHINE, 'focusMode', mood === 'focus');
    riveRef.current?.setInputState(STATE_MACHINE, 'sleepMode', mood === 'sleeping');
    riveRef.current?.setInputState(STATE_MACHINE, 'tiredMode', mood === 'tired');
    if (mood === 'happy') riveRef.current?.fireState(STATE_MACHINE, 'happy');
  }, [mood]);

  useEffect(() => {
    if (!isReadyRef.current) return;
    if (level > prevLevelRef.current) {
      riveRef.current?.fireState(STATE_MACHINE, 'levelUp');
    }
    prevLevelRef.current = level;
  }, [level]);

  const handleTap = useCallback(() => {
    riveRef.current?.fireState(STATE_MACHINE, 'tap');
    onTap?.();
  }, [onTap]);

  const handleLongPress = useCallback(() => {
    riveRef.current?.fireState(STATE_MACHINE, 'pet');
    onPet?.();
  }, [onPet]);

  if (hasError) {
    return <Fallback stage={stage} surface={t.surface} border={t.border} muted={t.textMuted} />;
  }

  if (!riveUri) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={t.focusAccent} size="large" />
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={handleTap}
      onLongPress={handleLongPress}
      delayLongPress={400}
      activeOpacity={0.85}
      style={styles.touchable}
    >
      <Rive
        ref={riveRef}
        url={riveUri}
        stateMachineName={STATE_MACHINE}
        autoplay
        style={styles.rive}
        onPlay={handlePlay}
        onError={() => setHasError(true)}
      />
    </TouchableOpacity>
  );
}

function Fallback({
  stage, surface, border, muted,
}: {
  stage: Stage; surface: string; border: string; muted: string;
}) {
  return (
    <View style={[styles.container, styles.fallbackContainer, { backgroundColor: surface, borderColor: border }]}>
      <Text style={styles.fallbackEmoji}>{STAGE_FALLBACK_EMOJI[stage]}</Text>
      <Text style={[styles.fallbackLabel, { color: muted }]}>companion</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  touchable: {
    alignSelf: 'center',
  },
  rive: {
    width: 200,
    height: 200,
  },
  container: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackContainer: {
    borderRadius: 100,
    borderWidth: 1,
  },
  fallbackEmoji: {
    fontSize: 72,
  },
  fallbackLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});
