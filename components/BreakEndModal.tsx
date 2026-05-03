import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../hooks/useTheme';

interface Props {
  visible: boolean;
  wasSkipped: boolean;
  onStartNextFocus: () => void;
  onFinishForNow: () => void;
}

export default function BreakEndModal({ visible, wasSkipped, onStartNextFocus, onFinishForNow }: Props) {
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View entering={FadeInDown.duration(400).springify()} style={[styles.card, { backgroundColor: t.surface }]}>
          <Text style={[styles.title, { color: t.textPrimary }]}>
            {wasSkipped ? 'Break skipped' : 'Break complete'}
          </Text>
          <Text style={[styles.sub, { color: t.textMuted }]}>
            Ready to keep going, or done for now?
          </Text>

          <TouchableOpacity
            style={[styles.btn, styles.primaryBtn, { backgroundColor: t.focusAccent }]}
            onPress={onStartNextFocus}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Start next focus</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.secondaryBtn, { borderColor: t.border }]}
            onPress={onFinishForNow}
            activeOpacity={0.85}
          >
            <Text style={[styles.secondaryBtnText, { color: t.textSecondary }]}>Finish for now</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 24,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: -4,
    marginBottom: 4,
  },
  btn: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryBtn: {},
  secondaryBtn: {
    borderWidth: 1.5,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryBtnText: {
    fontWeight: '600',
    fontSize: 16,
  },
});
