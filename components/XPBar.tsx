import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { getLevelForXP, getXPForCurrentLevel, getXPForNextLevel, isMaxLevel } from '../utils/xp';
import { useTheme } from '../hooks/useTheme';

interface Props {
  xp: number;
}

export default function XPBar({ xp }: Props) {
  const t = useTheme();
  const level = getLevelForXP(xp);
  const currentLevelXP = getXPForCurrentLevel(xp);
  const nextLevelXP = getXPForNextLevel(xp);
  const maxed = isMaxLevel(xp);

  const range = nextLevelXP - currentLevelXP;
  const progress = maxed ? 1 : range > 0 ? (xp - currentLevelXP) / range : 0;

  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progress,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.levelText, { color: t.focusAccent }]}>Level {level}</Text>
        <Text style={[styles.xpText, { color: t.textSecondary }]}>
          {maxed ? 'Max level' : `${xp - currentLevelXP} / ${range} XP`}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: t.surface }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: t.focusAccent,
              width: widthAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  levelText: {
    fontWeight: '700',
    fontSize: 15,
  },
  xpText: {
    fontSize: 13,
  },
  track: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
});
