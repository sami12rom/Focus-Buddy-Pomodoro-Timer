import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';

const ITEM_HEIGHT = 64;
const VISIBLE_ITEMS = 5;

interface Props {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  color: string;
}

export default function DrumPicker({ value, min, max, onChange, color }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const items = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  // displayValue tracks scroll position in real-time so opacity/size animate as you scroll
  const [displayValue, setDisplayValue] = useState(value);

  const isMountRef = useRef(true);

  useEffect(() => {
    const isMount = isMountRef.current;
    isMountRef.current = false;
    setDisplayValue(value);
    const index = value - min;
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: !isMount });
    }, 50);
    return () => clearTimeout(t);
  }, [value, min]);

  const offsetToValue = useCallback(
    (offsetY: number): number => {
      const rawIndex = offsetY / ITEM_HEIGHT;
      const clampedIndex = Math.max(0, Math.min(items.length - 1, Math.round(rawIndex)));
      return min + clampedIndex;
    },
    [items.length, min]
  );

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setDisplayValue(offsetToValue(e.nativeEvent.contentOffset.y));
  }

  function handleScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const newValue = offsetToValue(e.nativeEvent.contentOffset.y);
    setDisplayValue(newValue);
    onChange(newValue);
    // Correct sub-pixel offset without animation — avoids double-snap feel
    scrollRef.current?.scrollTo({ y: (newValue - min) * ITEM_HEIGHT, animated: false });
  }

  return (
    <View style={[styles.container, { height: VISIBLE_ITEMS * ITEM_HEIGHT }]}>
      <View
        style={[
          styles.selectionBand,
          { borderColor: color + '60', backgroundColor: color + '18' },
        ]}
        pointerEvents="none"
      />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        disableIntervalMomentum={true}
        bounces={false}
        overScrollMode="never"
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        contentContainerStyle={{ paddingVertical: 2 * ITEM_HEIGHT }}
        scrollEventThrottle={16}
      >
        {items.map((item) => {
          const distance = Math.abs(item - displayValue);
          const opacity = distance === 0 ? 1 : distance === 1 ? 0.45 : 0.2;
          const fontSize = distance === 0 ? 48 : distance === 1 ? 30 : 20;
          const fontWeight = distance === 0 ? '700' : '400';

          return (
            <View key={item} style={styles.item}>
              <Text
                style={[
                  styles.itemText,
                  { opacity, fontSize, fontWeight, color: distance === 0 ? color : '#e2e8f0' },
                ]}
              >
                {String(item).padStart(2, '0')}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 140,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  selectionBand: {
    position: 'absolute',
    top: 2 * ITEM_HEIGHT,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    zIndex: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontVariant: ['tabular-nums'],
  },
});
