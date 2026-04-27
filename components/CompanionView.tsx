import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface StageConfig {
  emoji: string;
  emojiSize: number;
  animStyle: 'wobble' | 'bounce' | 'pulse' | 'spin' | 'majestic';
  studyIcon: string;
}

const STAGE_CONFIGS: Record<number, StageConfig> = {
  1: { emoji: '🥚', emojiSize: 72,  animStyle: 'wobble',   studyIcon: '📖' },
  2: { emoji: '🐣', emojiSize: 82,  animStyle: 'bounce',   studyIcon: '✏️' },
  3: { emoji: '🐥', emojiSize: 90,  animStyle: 'pulse',    studyIcon: '📖' },
  4: { emoji: '🦊', emojiSize: 100, animStyle: 'spin',     studyIcon: '🎧' },
  5: { emoji: '🐲', emojiSize: 110, animStyle: 'majestic', studyIcon: '🧘' },
};

interface Props {
  evolutionStage: 1 | 2 | 3 | 4 | 5;
  size?: number;
  isFocusing?: boolean;
  isPaused?: boolean;
  onTap?: () => void;
  onLongPress?: () => void;
}

const STAGE_RING_KEYS = ['stage1Ring', 'stage2Ring', 'stage3Ring', 'stage4Ring', 'stage5Ring'] as const;

export default function CompanionView({ evolutionStage, size = 200, isFocusing = false, isPaused = false, onTap, onLongPress }: Props) {
  const config = STAGE_CONFIGS[evolutionStage];
  const t = useTheme();
  const ringColor = t[STAGE_RING_KEYS[evolutionStage - 1]];
  const glowColor = ringColor + '30';

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const tapAnim = useRef(new Animated.Value(1)).current;
  const blinkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const combinedScale = useRef(Animated.multiply(scaleAnim, tapAnim)).current;

  function handleTap() {
    onTap?.();
    tapAnim.stopAnimation();
    Animated.sequence([
      Animated.timing(tapAnim, { toValue: 1.08, duration: 120, useNativeDriver: true }),
      Animated.timing(tapAnim, { toValue: 1.0,  duration: 200, useNativeDriver: true }),
    ]).start();
  }

  useEffect(() => {
    scaleAnim.stopAnimation();
    rotateAnim.stopAnimation();
    glowAnim.stopAnimation();
    blinkAnim.stopAnimation();
    scaleAnim.setValue(1);
    rotateAnim.setValue(0);
    glowAnim.setValue(0.6);
    blinkAnim.setValue(1);
    tapAnim.setValue(1);

    if (blinkTimeoutRef.current) {
      clearTimeout(blinkTimeoutRef.current);
      blinkTimeoutRef.current = null;
    }

    if (isFocusing) {
      // Slow breathing — companion is studying alongside you
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.03, duration: 3400, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 0.97, duration: 3400, useNativeDriver: true }),
        ])
      ).start();

      // Periodic blink — random 4-9s intervals
      function scheduleBlink() {
        blinkAnim.stopAnimation();
        Animated.sequence([
          Animated.timing(blinkAnim, { toValue: 0.15, duration: 80, useNativeDriver: true }),
          Animated.timing(blinkAnim, { toValue: 1,    duration: 90, useNativeDriver: true }),
        ]).start(() => {
          blinkTimeoutRef.current = setTimeout(scheduleBlink, 4000 + Math.random() * 5000);
        });
      }
      blinkTimeoutRef.current = setTimeout(scheduleBlink, 3000 + Math.random() * 3000);
      return;
    }

    // Idle animations — each stage has its own personality
    switch (config.animStyle) {
      case 'wobble':
        Animated.loop(
          Animated.sequence([
            Animated.timing(rotateAnim, { toValue: 1,  duration: 900, useNativeDriver: true }),
            Animated.timing(rotateAnim, { toValue: -1, duration: 900, useNativeDriver: true }),
            Animated.timing(rotateAnim, { toValue: 0,  duration: 600, useNativeDriver: true }),
            Animated.delay(800),
          ])
        ).start();
        break;

      case 'bounce':
        Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 1.12, duration: 400, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 0.92, duration: 300, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1.0,  duration: 250, useNativeDriver: true }),
            Animated.delay(900),
          ])
        ).start();
        break;

      case 'pulse':
        Animated.loop(
          Animated.parallel([
            Animated.sequence([
              Animated.timing(scaleAnim, { toValue: 1.1, duration: 600, useNativeDriver: true }),
              Animated.timing(scaleAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
            ]),
            Animated.sequence([
              Animated.timing(glowAnim, { toValue: 1,   duration: 600, useNativeDriver: true }),
              Animated.timing(glowAnim, { toValue: 0.5, duration: 600, useNativeDriver: true }),
            ]),
          ])
        ).start();
        break;

      case 'spin':
        Animated.loop(
          Animated.sequence([
            Animated.parallel([
              Animated.timing(rotateAnim, { toValue: 1,    duration: 500, useNativeDriver: true }),
              Animated.timing(scaleAnim,  { toValue: 1.15, duration: 250, useNativeDriver: true }),
            ]),
            Animated.timing(scaleAnim,  { toValue: 1.0, duration: 250, useNativeDriver: true }),
            Animated.timing(rotateAnim, { toValue: 0,   duration: 300, useNativeDriver: true }),
            Animated.delay(1200),
          ])
        ).start();
        break;

      case 'majestic':
        Animated.loop(
          Animated.parallel([
            Animated.sequence([
              Animated.timing(scaleAnim, { toValue: 1.08, duration: 1400, useNativeDriver: true }),
              Animated.timing(scaleAnim, { toValue: 0.95, duration: 1400, useNativeDriver: true }),
            ]),
            Animated.sequence([
              Animated.timing(glowAnim, { toValue: 1,   duration: 1400, useNativeDriver: true }),
              Animated.timing(glowAnim, { toValue: 0.3, duration: 1400, useNativeDriver: true }),
            ]),
          ])
        ).start();
        break;
    }
  }, [evolutionStage, isFocusing]);

  useEffect(() => {
    return () => {
      if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
    };
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-12deg', '0deg', '12deg'],
  });

  const containerSize = size;
  const glowSize = containerSize * 0.82;
  const innerRingSize = containerSize * 0.7;

  const emojiNode = (
    <Animated.Text
      style={[
        styles.emoji,
        {
          fontSize: config.emojiSize * (size / 200),
          opacity: isFocusing ? blinkAnim : 1,
          transform: isFocusing
            ? [{ scale: combinedScale }]
            : [{ scale: scaleAnim }, { rotate }],
        },
      ]}
    >
      {config.emoji}
    </Animated.Text>
  );

  return (
    <View style={[styles.root, { width: containerSize, height: containerSize }]}>
      {/* Outer glow */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            backgroundColor: glowColor,
            opacity: glowAnim,
          },
        ]}
      />

      {/* Ring border */}
      <View
        style={[
          styles.ring,
          {
            width: innerRingSize,
            height: innerRingSize,
            borderRadius: innerRingSize / 2,
            borderColor: ringColor,
          },
        ]}
      />

      {(isFocusing || onTap || onLongPress) ? (
        <TouchableOpacity
          onPress={handleTap}
          onLongPress={onLongPress}
          delayLongPress={400}
          activeOpacity={1}
        >
          {emojiNode}
        </TouchableOpacity>
      ) : (
        emojiNode
      )}

      {isFocusing && (
        <View style={[styles.studyBadge, { backgroundColor: t.surface + 'cc' }]}>
          <Text style={styles.studyIcon}>{isPaused ? '⏸' : config.studyIcon}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  emoji: {
    textAlign: 'center',
  },
  studyBadge: {
    position: 'absolute',
    bottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  studyIcon: {
    fontSize: 16,
  },
});
