import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface Props {
  color: string;
  isRunning: boolean;
}

const INHALE_MS = 4000;
const EXHALE_MS = 6000;

export default function BreathingAnimation({ color, isRunning }: Props) {
  const scale = useSharedValue(0.6);
  const [phase, setPhase] = useState<'in' | 'out'>('in');

  useEffect(() => {
    if (!isRunning) {
      cancelAnimation(scale);
      scale.value = withTiming(0.6, { duration: 600 });
      return;
    }

    let isActive = true;
    let exhaleTimeout: ReturnType<typeof setTimeout> | null = null;
    let inhaleTimeout: ReturnType<typeof setTimeout> | null = null;

    function startInhale() {
      if (!isActive) return;
      setPhase('in');
      scale.value = withTiming(1.0, { duration: INHALE_MS, easing: Easing.inOut(Easing.ease) });
      exhaleTimeout = setTimeout(startExhale, INHALE_MS);
    }

    function startExhale() {
      if (!isActive) return;
      setPhase('out');
      scale.value = withTiming(0.6, { duration: EXHALE_MS, easing: Easing.inOut(Easing.ease) });
      inhaleTimeout = setTimeout(startInhale, EXHALE_MS);
    }

    cancelAnimation(scale);
    scale.value = 0.6;
    startInhale();

    return () => {
      isActive = false;
      if (exhaleTimeout) clearTimeout(exhaleTimeout);
      if (inhaleTimeout) clearTimeout(inhaleTimeout);
      cancelAnimation(scale);
    };
  }, [isRunning]); // eslint-disable-line react-hooks/exhaustive-deps

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: 0.35 + scale.value * 0.45,
  }));

  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * 0.55 }],
    opacity: 0.5 + scale.value * 0.5,
  }));

  const label = isRunning ? (phase === 'in' ? 'breathe in...' : 'breathe out...') : 'paused';

  return (
    <View style={styles.container}>
      {/* Outer ring */}
      <Animated.View style={[styles.ring, { borderColor: color }, ringStyle]} />
      {/* Inner filled circle */}
      <Animated.View style={[styles.inner, { backgroundColor: color }, innerStyle]} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  ring: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
  },
  inner: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  label: {
    position: 'absolute',
    bottom: -24,
    fontSize: 13,
    fontWeight: '500',
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },
});
