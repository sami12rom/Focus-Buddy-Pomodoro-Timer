import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity, ImageSourcePropType } from 'react-native';
import { useTheme } from '../hooks/useTheme';

type EvolutionStage = 1 | 2 | 3 | 4 | 5;

interface StageConfig {
  source: ImageSourcePropType;
  assetScale: number;
  animStyle: 'wobble' | 'bounce' | 'pulse' | 'spin' | 'majestic';
  studyIcon: string;
}

interface StageGifConfig {
  idle?: ImageSourcePropType;
  tap?: ImageSourcePropType;
  levelUp?: ImageSourcePropType;
  assetScale?: number;
}

const STAGE_CONFIGS: Record<EvolutionStage, StageConfig> = {
  1: { source: require('../assets/buddy/stage-1.png'), assetScale: 1.18, animStyle: 'wobble',   studyIcon: '📖' },
  2: { source: require('../assets/buddy/stage-2.png'), assetScale: 1.18, animStyle: 'bounce',   studyIcon: '✏️' },
  3: { source: require('../assets/buddy/stage-3.png'), assetScale: 1.12, animStyle: 'pulse',    studyIcon: '📖' },
  4: { source: require('../assets/buddy/stage-4.png'), assetScale: 1.08, animStyle: 'spin',     studyIcon: '🎧' },
  5: { source: require('../assets/buddy/stage-5.png'), assetScale: 1.06, animStyle: 'majestic', studyIcon: '🧘' },
};

const USE_BUDDY_GIFS = true;
const USE_TAP_GIFS = true;
const TAP_IDLE_HIDE_DELAY_MS = 140;
const TAP_GIF_MS = 900;
const LEVEL_UP_ANIMATION_MS = 2310;
const LEVEL_UP_FLASH_HOLD_MS = 300;
const LEVEL_UP_FLASH_FADE_MS = 300;

const STAGE_GIFS: Partial<Record<EvolutionStage, StageGifConfig>> = {
  1: {
    idle: require('../assets/buddy/webP/stage-1-idle.webp'),
    tap: require('../assets/buddy/webP/stage-1-tap.webp'),
    levelUp: require('../assets/buddy/webP/stage-1-level-up.webp'),
    assetScale: 0.78,
  },
  2: {
    idle: require('../assets/buddy/webP/stage-2-idle.webp'),
    assetScale: 0.78,
  },
};

interface Props {
  evolutionStage: EvolutionStage;
  size?: number;
  isFocusing?: boolean;
  isPaused?: boolean;
  evolutionTransition?: { fromStage: EvolutionStage; toStage: EvolutionStage } | null;
  onEvolutionTransitionComplete?: () => void;
  playEvolutionOnStageChange?: boolean;
  tapTrigger?: number;
  onTap?: () => void;
  onLongPress?: () => void;
}

const STAGE_RING_KEYS = ['stage1Ring', 'stage2Ring', 'stage3Ring', 'stage4Ring', 'stage5Ring'] as const;

export default function CompanionView({
  evolutionStage,
  size = 200,
  isFocusing = false,
  isPaused = false,
  evolutionTransition = null,
  onEvolutionTransitionComplete,
  playEvolutionOnStageChange = false,
  tapTrigger = 0,
  onTap,
  onLongPress,
}: Props) {
  const t = useTheme();
  const [displayedStage, setDisplayedStage] = useState<EvolutionStage>(evolutionStage);
  const config = STAGE_CONFIGS[displayedStage];
  const ringColor = t[STAGE_RING_KEYS[displayedStage - 1]];
  const glowColor = ringColor + '30';

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const tapAnim = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const previousStageRef = useRef<EvolutionStage>(evolutionStage);
  const transitionKeyRef = useRef<string | null>(null);
  const lastTapTriggerRef = useRef(tapTrigger);
  const blinkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapGifTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapIdleHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const levelUpFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const levelUpFadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const combinedScale = useRef(Animated.multiply(scaleAnim, tapAnim)).current;
  const [isTapGifActive, setIsTapGifActive] = useState(false);
  const [isIdleHiddenForTap, setIsIdleHiddenForTap] = useState(false);
  const [tapAssetKey, setTapAssetKey] = useState(0);
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const [levelUpFromStage, setLevelUpFromStage] = useState<EvolutionStage | null>(null);
  const [levelUpAssetKey, setLevelUpAssetKey] = useState(0);
  const [gifFailed, setGifFailed] = useState(false);

  function clearTapTimers() {
    if (tapGifTimeoutRef.current) {
      clearTimeout(tapGifTimeoutRef.current);
      tapGifTimeoutRef.current = null;
    }
    if (tapIdleHideTimeoutRef.current) {
      clearTimeout(tapIdleHideTimeoutRef.current);
      tapIdleHideTimeoutRef.current = null;
    }
  }

  function clearLevelUpTimers() {
    if (levelUpFlashTimeoutRef.current) {
      clearTimeout(levelUpFlashTimeoutRef.current);
      levelUpFlashTimeoutRef.current = null;
    }
    if (levelUpFadeTimeoutRef.current) {
      clearTimeout(levelUpFadeTimeoutRef.current);
      levelUpFadeTimeoutRef.current = null;
    }
  }

  function canPlayLevelUpTransition(fromStage: EvolutionStage, toStage: EvolutionStage) {
    return (
      fromStage === 1 &&
      toStage === 2 &&
      USE_BUDDY_GIFS &&
      Boolean(STAGE_GIFS[fromStage]?.levelUp) &&
      Boolean(STAGE_GIFS[toStage]?.idle)
    );
  }

  function startLevelUpTransition(
    fromStage: EvolutionStage,
    toStage: EvolutionStage,
    onComplete?: () => void,
  ) {
    previousStageRef.current = toStage;
    clearLevelUpTimers();
    flashAnim.stopAnimation();
    flashAnim.setValue(0);
    setGifFailed(false);

    if (!canPlayLevelUpTransition(fromStage, toStage)) {
      setDisplayedStage(toStage);
      setLevelUpFromStage(null);
      setIsLevelingUp(false);
      onComplete?.();
      return;
    }

    clearTapTimers();
    setDisplayedStage(fromStage);
    setLevelUpFromStage(fromStage);
    setLevelUpAssetKey((currentKey) => currentKey + 1);
    setIsTapGifActive(false);
    setIsIdleHiddenForTap(false);
    setIsLevelingUp(true);

    levelUpFlashTimeoutRef.current = setTimeout(() => {
      flashAnim.setValue(1);
      setDisplayedStage(toStage);
      setLevelUpFromStage(null);
      levelUpFlashTimeoutRef.current = null;

      levelUpFadeTimeoutRef.current = setTimeout(() => {
        Animated.timing(flashAnim, {
          toValue: 0,
          duration: LEVEL_UP_FLASH_FADE_MS,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) {
            setIsLevelingUp(false);
            onComplete?.();
          }
        });
        levelUpFadeTimeoutRef.current = null;
      }, LEVEL_UP_FLASH_HOLD_MS);
    }, LEVEL_UP_ANIMATION_MS);
  }

  function playTapFeedback() {
    const gifConfig = USE_BUDDY_GIFS && !gifFailed ? STAGE_GIFS[displayedStage] : undefined;
    if (!isLevelingUp && USE_TAP_GIFS && gifConfig?.tap) {
      clearTapTimers();
      setTapAssetKey((currentKey) => currentKey + 1);
      setIsIdleHiddenForTap(false);
      setIsTapGifActive(true);
      tapIdleHideTimeoutRef.current = setTimeout(() => {
        setIsIdleHiddenForTap(true);
        tapIdleHideTimeoutRef.current = null;
      }, TAP_IDLE_HIDE_DELAY_MS);
      tapGifTimeoutRef.current = setTimeout(() => {
        setIsTapGifActive(false);
        setIsIdleHiddenForTap(false);
        tapGifTimeoutRef.current = null;
      }, TAP_GIF_MS);
    }
    tapAnim.stopAnimation();
    Animated.sequence([
      Animated.timing(tapAnim, { toValue: 1.16, duration: 90, useNativeDriver: true }),
      Animated.timing(tapAnim, { toValue: 0.96, duration: 90, useNativeDriver: true }),
      Animated.timing(tapAnim, { toValue: 1.0,  duration: 140, useNativeDriver: true }),
    ]).start();
  }

  function handleTap() {
    onTap?.();
    playTapFeedback();
  }

  useEffect(() => {
    if (!evolutionTransition) {
      transitionKeyRef.current = null;
      return;
    }

    const transitionKey = `${evolutionTransition.fromStage}-${evolutionTransition.toStage}`;
    if (transitionKeyRef.current === transitionKey) {
      return;
    }

    transitionKeyRef.current = transitionKey;
    startLevelUpTransition(
      evolutionTransition.fromStage,
      evolutionTransition.toStage,
      onEvolutionTransitionComplete,
    );
  }, [evolutionTransition, onEvolutionTransitionComplete]);

  useEffect(() => {
    if (tapTrigger <= 0 || tapTrigger === lastTapTriggerRef.current) return;
    lastTapTriggerRef.current = tapTrigger;
    playTapFeedback();
  }, [tapTrigger]);

  useEffect(() => {
    const previousStage = previousStageRef.current;
    if (previousStage === evolutionStage) {
      return;
    }

    previousStageRef.current = evolutionStage;

    if (playEvolutionOnStageChange) {
      startLevelUpTransition(previousStage, evolutionStage);
      return;
    }

    clearLevelUpTimers();
    flashAnim.stopAnimation();
    flashAnim.setValue(0);
    setDisplayedStage(evolutionStage);
    setLevelUpFromStage(null);
    setIsLevelingUp(false);
  }, [evolutionStage, playEvolutionOnStageChange]);

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
    setIsTapGifActive(false);
    setIsIdleHiddenForTap(false);
    setTapAssetKey(0);

    if (blinkTimeoutRef.current) {
      clearTimeout(blinkTimeoutRef.current);
      blinkTimeoutRef.current = null;
    }
    clearTapTimers();

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

    if (USE_BUDDY_GIFS && !gifFailed && STAGE_GIFS[displayedStage]?.idle) {
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
  }, [displayedStage, isFocusing, gifFailed]);

  useEffect(() => {
    return () => {
      if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
      clearTapTimers();
      clearLevelUpTimers();
      flashAnim.stopAnimation();
    };
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-12deg', '0deg', '12deg'],
  });

  const containerSize = size;
  const glowSize = containerSize * 0.82;
  const innerRingSize = containerSize * 0.7;
  const gifConfig = USE_BUDDY_GIFS && !gifFailed ? STAGE_GIFS[displayedStage] : undefined;
  const levelUpConfig = levelUpFromStage && USE_BUDDY_GIFS && !gifFailed ? STAGE_GIFS[levelUpFromStage] : undefined;
  const isGifEnabled = Boolean(gifConfig?.idle);
  const assetSize = containerSize * (isGifEnabled ? gifConfig?.assetScale ?? config.assetScale : config.assetScale);
  const imageTransform = isFocusing
    ? [{ scale: combinedScale }]
    : [{ scale: combinedScale }, { rotate }];
  const imageOpacity = isFocusing ? blinkAnim : 1;
  const isShowingLevelUp = Boolean(isLevelingUp && levelUpConfig?.levelUp);

  const pngBuddyNode = (
    <Animated.Image
      source={config.source}
      resizeMode="contain"
      style={[
        styles.buddyImage,
        {
          width: assetSize,
          height: assetSize,
          opacity: imageOpacity,
          transform: imageTransform,
        },
      ]}
    />
  );
  const buddyNode = isShowingLevelUp ? (
    <Animated.Image
      key={`level-up-${levelUpAssetKey}`}
      source={levelUpConfig!.levelUp!}
      resizeMode="contain"
      onError={() => setGifFailed(true)}
      style={[
        styles.buddyImage,
        {
          width: assetSize,
          height: assetSize,
          opacity: imageOpacity,
          transform: imageTransform,
        },
      ]}
    />
  ) : isGifEnabled ? (
    <Animated.View style={{ width: assetSize, height: assetSize, opacity: imageOpacity, transform: imageTransform }}>
      <Animated.Image
        source={gifConfig!.idle}
        resizeMode="contain"
        onError={() => setGifFailed(true)}
        style={[
          styles.buddyImage,
          styles.layeredBuddyImage,
          { opacity: USE_TAP_GIFS && gifConfig!.tap && isIdleHiddenForTap ? 0 : 1 },
        ]}
      />
      {USE_TAP_GIFS && gifConfig!.tap && (
        <Animated.Image
          key={`tap-${tapAssetKey}`}
          source={gifConfig!.tap}
          resizeMode="contain"
          onError={() => setGifFailed(true)}
          style={[
            styles.buddyImage,
            styles.layeredBuddyImage,
            { opacity: isTapGifActive ? 1 : 0 },
          ]}
        />
      )}
    </Animated.View>
  ) : (
    pngBuddyNode
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
          {buddyNode}
        </TouchableOpacity>
      ) : (
        buddyNode
      )}

      <Animated.View
        pointerEvents="none"
        style={[
          styles.levelUpFlash,
          {
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize / 2,
            backgroundColor: t.xpGold + '2e',
            borderColor: t.xpGold + 'aa',
            opacity: flashAnim,
          },
        ]}
      >
        <View style={[styles.flashSparkle, styles.flashSparkleTop, { backgroundColor: t.xpGold }]} />
        <View style={[styles.flashSparkle, styles.flashSparkleLeft, { backgroundColor: t.focusAccent }]} />
        <View style={[styles.flashSparkle, styles.flashSparkleRight, { backgroundColor: t.stage2Ring }]} />
        <View style={[styles.flashSparkle, styles.flashSparkleBottom, { backgroundColor: t.xpGold }]} />
      </Animated.View>

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
  buddyImage: {
    alignSelf: 'center',
  },
  layeredBuddyImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  levelUpFlash: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  flashSparkle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  flashSparkleTop: {
    top: '18%',
    left: '50%',
  },
  flashSparkleLeft: {
    top: '46%',
    left: '20%',
  },
  flashSparkleRight: {
    top: '36%',
    right: '18%',
  },
  flashSparkleBottom: {
    bottom: '20%',
    left: '42%',
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
