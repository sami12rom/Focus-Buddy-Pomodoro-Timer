import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { DEFAULT_COMPANION_NAME } from '../constants/game';
import CompanionView from './CompanionView';

interface Props {
  onComplete: (name: string) => void;
}

export default function OnboardingModal({ onComplete }: Props) {
  const t = useTheme();
  const [name, setName] = useState('');

  function handleContinue() {
    onComplete(name.trim() || DEFAULT_COMPANION_NAME);
  }

  const displayName = name.trim() || DEFAULT_COMPANION_NAME;

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: t.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <CompanionView evolutionStage={1} size={160} />

        <Text style={[styles.heading, { color: t.textPrimary }]}>Meet your companion</Text>
        <Text style={[styles.sub, { color: t.textMuted }]}>
          Give them a name. They'll grow with every focus session.
        </Text>

        <View style={[styles.inputWrap, { borderColor: t.focusAccent + '80', backgroundColor: t.surface }]}>
          <TextInput
            style={[styles.input, { color: t.textPrimary }]}
            placeholder={DEFAULT_COMPANION_NAME}
            placeholderTextColor={t.textMuted}
            value={name}
            onChangeText={setName}
            maxLength={20}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleContinue}
          />
        </View>

        <Text style={[styles.preview, { color: t.focusAccent }]}>
          "{displayName}" is ready to focus with you.
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: t.focusAccent }]}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Let's go →</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  sub: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: -8,
  },
  inputWrap: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginTop: 4,
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
  button: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
