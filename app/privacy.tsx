import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

const LAST_UPDATED = 'April 27, 2026';

export default function PrivacyScreen() {
  const router = useRouter();
  const t = useTheme();

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: t.bg }]}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" backgroundColor={t.bg} />

      <TouchableOpacity
        style={[styles.backButton, { backgroundColor: t.surface }]}
        onPress={() => router.back()}
        activeOpacity={0.8}
        accessibilityLabel="Back to settings"
        accessibilityRole="button"
      >
        <Ionicons name="chevron-back" size={22} color={t.textPrimary} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: t.textPrimary }]}>Privacy Policy</Text>
      <Text style={[styles.updated, { color: t.textMuted }]}>Last updated: {LAST_UPDATED}</Text>

      <PolicySection title="Overview">
        Loopling is designed as a local-first focus timer. Your companion, settings, session
        history, streaks, and focus progress are stored on your device.
      </PolicySection>

      <PolicySection title="Data Stored On Your Device">
        The app stores your companion name, level, XP, happiness, selected theme, timer settings,
        completed session history, task labels, and recovery data for active timers.
      </PolicySection>

      <PolicySection title="Data We Do Not Collect">
        Loopling does not require an account, does not collect analytics, does not use advertising
        trackers, and does not send your focus data to an external server.
      </PolicySection>

      <PolicySection title="Notifications">
        If you allow notifications, Loopling uses them only to alert you when a focus session or
        break ends. You can disable notifications from your device settings.
      </PolicySection>

      <PolicySection title="Data Sharing">
        Loopling does not sell, rent, or share your personal data. Because the app is local-only,
        your data stays on your device unless you choose to remove or transfer it yourself.
      </PolicySection>

      <PolicySection title="Deleting Data">
        You can delete app data from the Settings screen with Reset App Data. You can also remove
        the app from your device to delete locally stored data.
      </PolicySection>

      <PolicySection title="Changes">
        This policy may be updated when Loopling adds new features. Material changes should be
        reflected in the app and store listing before release.
      </PolicySection>
    </ScrollView>
  );
}

function PolicySection({ title, children }: { title: string; children: string }) {
  const t = useTheme();
  return (
    <View style={[styles.section, { backgroundColor: t.surface }]}>
      <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>{title}</Text>
      <Text style={[styles.body, { color: t.textSecondary }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 40,
    gap: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 4,
  },
  updated: {
    fontSize: 13,
    marginTop: -8,
  },
  section: {
    borderRadius: 20,
    padding: 18,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
});
