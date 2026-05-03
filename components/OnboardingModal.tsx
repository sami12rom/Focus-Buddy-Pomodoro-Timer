import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { AppTheme } from '../constants/colors';
import { DEFAULT_COMPANION_NAME } from '../constants/game';
import CompanionView from './CompanionView';

interface Props {
  onComplete: (name: string, sessionGoal: number) => void;
}

const GOAL_OPTIONS = [
  { sessions: 2, label: 'Light', desc: 'Perfect for busy days' },
  { sessions: 4, label: 'Steady', desc: 'A solid daily habit' },
  { sessions: 6, label: 'Deep', desc: 'For focused work days' },
  { sessions: 8, label: 'Intense', desc: 'Maximum productivity' },
];

export default function OnboardingModal({ onComplete }: Props) {
  const t = useTheme();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [selectedGoal, setSelectedGoal] = useState(4);

  const displayName = name.trim() || DEFAULT_COMPANION_NAME;

  function handleComplete() {
    onComplete(displayName, selectedGoal);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: t.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Step dots */}
      <View style={styles.dots}>
        {[1, 2, 3].map((s) => (
          <View
            key={s}
            style={[
              styles.dot,
              { backgroundColor: s === step ? t.focusAccent : t.border },
              s === step && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {step === 1 && <StepOne t={t} onNext={() => setStep(2)} />}
      {step === 2 && (
        <StepTwo
          t={t}
          name={name}
          displayName={displayName}
          onChangeName={setName}
          onNext={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <StepThree
          t={t}
          selectedGoal={selectedGoal}
          onSelectGoal={setSelectedGoal}
          onComplete={handleComplete}
        />
      )}
    </KeyboardAvoidingView>
  );
}

// ── Step 1: Welcome + Pomodoro explanation ────────────────────────────────

function StepOne({ t, onNext }: { t: AppTheme; onNext: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.appName, { color: t.focusAccent }]}>Focus Buddy</Text>
      <Text style={[styles.heading, { color: t.textPrimary }]}>Work smarter,{'\n'}not harder.</Text>
      <Text style={[styles.sub, { color: t.textMuted }]}>
        The Pomodoro Technique helps you stay focused and avoid burnout by working in short, intentional sprints.
      </Text>

      <View style={[styles.stepsCard, { backgroundColor: t.surface }]}>
        <FeatureRow
          icon="🍅"
          title="Focus sprint"
          desc="Work on one thing for 25 minutes — no distractions."
          t={t}
        />
        <View style={[styles.featureDivider, { backgroundColor: t.borderSubtle }]} />
        <FeatureRow
          icon="☕"
          title="Short break"
          desc="Rest for 5 minutes. Your brain needs it to consolidate."
          t={t}
        />
        <View style={[styles.featureDivider, { backgroundColor: t.borderSubtle }]} />
        <FeatureRow
          icon="🔁"
          title="Build momentum"
          desc="After 4 sprints, take a longer break. Repeat daily."
          t={t}
        />
        <View style={[styles.featureDivider, { backgroundColor: t.borderSubtle }]} />
        <FeatureRow
          icon="🐾"
          title="Grow your companion"
          desc="Your buddy levels up with every session you complete."
          t={t}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: t.focusAccent }]}
        onPress={onNext}
        activeOpacity={0.85}
        accessibilityLabel="Get started"
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Get Started →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Step 2: Name your companion ───────────────────────────────────────────

function StepTwo({
  t, name, displayName, onChangeName, onNext,
}: {
  t: AppTheme;
  name: string;
  displayName: string;
  onChangeName: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.stepContent}>
      <CompanionView evolutionStage={1} size={148} />

      <View style={styles.stepTextBlock}>
        <Text style={[styles.heading, { color: t.textPrimary }]}>Meet your companion</Text>
        <Text style={[styles.sub, { color: t.textMuted }]}>
          They'll grow alongside you — evolving as you complete sessions, day after day.
        </Text>
      </View>

      <View style={[styles.inputWrap, { borderColor: t.focusAccent + '80', backgroundColor: t.surface }]}>
        <TextInput
          style={[styles.input, { color: t.textPrimary }]}
          placeholder={DEFAULT_COMPANION_NAME}
          placeholderTextColor={t.textMuted}
          value={name}
          onChangeText={onChangeName}
          maxLength={20}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={onNext}
        />
      </View>

      <Text style={[styles.preview, { color: t.focusAccent }]}>
        "{displayName}" is ready to focus with you.
      </Text>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: t.focusAccent }]}
        onPress={onNext}
        activeOpacity={0.85}
        accessibilityLabel="Continue"
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Continue →</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Step 3: Set daily goal ────────────────────────────────────────────────

function StepThree({
  t, selectedGoal, onSelectGoal, onComplete,
}: {
  t: AppTheme;
  selectedGoal: number;
  onSelectGoal: (v: number) => void;
  onComplete: () => void;
}) {
  const selected = GOAL_OPTIONS.find((o) => o.sessions === selectedGoal) ?? GOAL_OPTIONS[1];

  return (
    <View style={styles.stepContent}>
      <View style={styles.stepTextBlock}>
        <Text style={[styles.heading, { color: t.textPrimary }]}>Set your daily goal</Text>
        <Text style={[styles.sub, { color: t.textMuted }]}>
          How many focus sessions do you want to complete each day? You can always change this later.
        </Text>
      </View>

      <View style={styles.goalOptions}>
        {GOAL_OPTIONS.map((opt) => {
          const active = opt.sessions === selectedGoal;
          return (
            <TouchableOpacity
              key={opt.sessions}
              style={[
                styles.goalCard,
                { backgroundColor: active ? t.focusAccent : t.surface, borderColor: active ? t.focusAccent : t.border },
              ]}
              onPress={() => onSelectGoal(opt.sessions)}
              activeOpacity={0.8}
              accessibilityLabel={`${opt.sessions} sessions — ${opt.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.goalNumber, { color: active ? '#fff' : t.focusAccent }]}>
                {opt.sessions}
              </Text>
              <Text style={[styles.goalLabel, { color: active ? 'rgba(255,255,255,0.9)' : t.textPrimary }]}>
                {opt.label}
              </Text>
              <Text style={[styles.goalDesc, { color: active ? 'rgba(255,255,255,0.7)' : t.textMuted }]}>
                {opt.desc}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.goalSummary, { backgroundColor: t.surface }]}>
        <Text style={[styles.goalSummaryText, { color: t.textSecondary }]}>
          That's{' '}
          <Text style={{ color: t.focusAccent, fontWeight: '700' }}>
            ~{selected.sessions * 25} min
          </Text>
          {' '}of focused work per day.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: t.focusAccent }]}
        onPress={onComplete}
        activeOpacity={0.85}
        accessibilityLabel="Start focusing"
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Start Focusing →</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────

function FeatureRow({ icon, title, desc, t }: { icon: string; title: string; desc: string; t: AppTheme }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <View style={styles.featureText}>
        <Text style={[styles.featureTitle, { color: t.textPrimary }]}>{title}</Text>
        <Text style={[styles.featureDesc, { color: t.textMuted }]}>{desc}</Text>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 56,
    paddingBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 40,
    paddingTop: 16,
    gap: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 36,
  },
  sub: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: -8,
  },
  stepTextBlock: {
    gap: 8,
    alignItems: 'center',
  },
  stepsCard: {
    width: '100%',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  featureDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  featureIcon: {
    fontSize: 24,
    width: 36,
    textAlign: 'center',
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  inputWrap: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  input: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  preview: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: -8,
  },
  goalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
  },
  goalCard: {
    width: '47%',
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  goalNumber: {
    fontSize: 32,
    fontWeight: '700',
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  goalDesc: {
    fontSize: 11,
    textAlign: 'center',
  },
  goalSummary: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: -8,
  },
  goalSummaryText: {
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
