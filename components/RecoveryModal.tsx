import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ActiveSessionSnapshot } from '../store/sessionStore';
import { useTheme } from '../hooks/useTheme';

export type RecoveryState =
  | { type: 'offer-resume'; snapshot: ActiveSessionSnapshot }
  | { type: 'ended-focus'; snapshot: ActiveSessionSnapshot }
  | { type: 'ended-break'; snapshot: ActiveSessionSnapshot }
  | null;

interface Props {
  state: RecoveryState;
  onResume: () => void;
  onMarkCompleted: () => void;
  onDiscard: () => void;
  onContinue: () => void;
  onFinishForNow: () => void;
}

export default function RecoveryModal({
  state,
  onResume,
  onMarkCompleted,
  onDiscard,
  onContinue,
  onFinishForNow,
}: Props) {
  const t = useTheme();
  if (!state) return null;

  const isBreakType = state.snapshot.type === 'break';

  let title = '';
  let subtitle = '';
  if (state.type === 'offer-resume') {
    title = isBreakType ? 'Break still running' : 'Session still running';
    subtitle = isBreakType
      ? 'Your break was active when the app closed.'
      : 'Your focus session was active when the app closed.';
  } else if (state.type === 'ended-focus') {
    title = 'Session ended';
    subtitle = 'Your focus session finished while the app was closed.';
  } else {
    title = 'Break ended';
    subtitle = 'Your break finished while the app was closed.';
  }

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: t.surface }]}>
          <Text style={[styles.title, { color: t.textPrimary }]}>{title}</Text>
          <Text style={[styles.sub, { color: t.textMuted }]}>{subtitle}</Text>

          {state.snapshot.task ? (
            <Text style={[styles.task, { color: t.textSecondary }]}>
              "{state.snapshot.task}"
            </Text>
          ) : null}

          {state.type === 'offer-resume' && (
            <>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: t.focusAccent }]}
                onPress={onResume}
                activeOpacity={0.85}
                accessibilityLabel="Resume session"
                accessibilityRole="button"
              >
                <Text style={styles.btnText}>Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.outlineBtn, { borderColor: t.border }]}
                onPress={onDiscard}
                activeOpacity={0.85}
                accessibilityLabel="Discard session"
                accessibilityRole="button"
              >
                <Text style={[styles.btnText, { color: t.textSecondary }]}>Discard</Text>
              </TouchableOpacity>
            </>
          )}

          {state.type === 'ended-focus' && (
            <>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: t.focusAccent }]}
                onPress={onMarkCompleted}
                activeOpacity={0.85}
                accessibilityLabel="Mark session as completed"
                accessibilityRole="button"
              >
                <Text style={styles.btnText}>Mark completed</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.outlineBtn, { borderColor: t.border }]}
                onPress={onDiscard}
                activeOpacity={0.85}
                accessibilityLabel="Discard session"
                accessibilityRole="button"
              >
                <Text style={[styles.btnText, { color: t.textSecondary }]}>Discard</Text>
              </TouchableOpacity>
            </>
          )}

          {state.type === 'ended-break' && (
            <>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: t.breakAccent }]}
                onPress={onContinue}
                activeOpacity={0.85}
                accessibilityLabel="Start a new focus session"
                accessibilityRole="button"
              >
                <Text style={styles.btnText}>Continue</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.outlineBtn, { borderColor: t.border }]}
                onPress={onFinishForNow}
                activeOpacity={0.85}
                accessibilityLabel="Finish for now and go home"
                accessibilityRole="button"
              >
                <Text style={[styles.btnText, { color: t.textSecondary }]}>Finish for now</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
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
    gap: 14,
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
  },
  task: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  btn: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
  },
  outlineBtn: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
