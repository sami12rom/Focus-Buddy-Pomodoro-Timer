import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

interface Props {
  remainingMs: number;
  totalMs: number;
  accent: string;
  trackColor: string;
  glowColor?: string;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}

export default function CircularTimer({
  remainingMs,
  totalMs,
  accent,
  trackColor,
  glowColor,
  size = 260,
  strokeWidth = 5,
  children,
}: Props) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  const strokeDashoffset = circumference * (1 - progress);
  const cx = size / 2;
  const cy = size / 2;

  const glowW = size * 1.25;
  const glowH = size * 1.1;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Atmospheric glow behind the ring */}
      {glowColor && (
        <View
          style={[
            styles.glow,
            {
              width: glowW,
              height: glowH,
              borderRadius: glowW / 2,
              backgroundColor: glowColor,
              marginLeft: -(glowW - size) / 2,
              marginTop: -(glowH - size) / 2,
            },
          ]}
        />
      )}

      {/* SVG progress ring */}
      <Svg
        width={size}
        height={size}
        style={StyleSheet.absoluteFill}
      >
        <G rotation="-90" origin={`${cx}, ${cy}`}>
          {/* Track */}
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress arc */}
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={accent}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>

      {/* Content inside the ring */}
      <View style={styles.inner}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
  },
  inner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
