import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { setupAndroidNotificationChannel, requestNotificationPermissions } from '../utils/notifications';
import { useThemeStore } from '../store/themeStore';
import { useCompanionStore } from '../store/companionStore';
import { useStatsStore } from '../store/statsStore';
import { THEMES } from '../constants/colors';
import { getLocalDateKey } from '../utils/date';

export default function RootLayout() {
  const activeThemeId = useThemeStore((s) => s.activeThemeId);
  const t = THEMES[activeThemeId];
  const isHydrated = useCompanionStore((s) => s.isHydrated);
  const applyDailyCareCheck = useCompanionStore((s) => s.applyDailyCareCheck);
  const lastSessionDate = useStatsStore((s) => s.lastSessionDate);

  useEffect(() => {
    setupAndroidNotificationChannel();
    requestNotificationPermissions();
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    applyDailyCareCheck(getLocalDateKey(), lastSessionDate);
  }, [isHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    // key forces tab bar to re-render immediately when theme changes
    <Tabs
      key={activeThemeId}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: t.bg,
          borderTopColor: t.border,
        },
        tabBarActiveTintColor: t.focusAccent,
        tabBarInactiveTintColor: t.textMuted,
      }}
    >
      <Tabs.Screen
        name="(tabs)/index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="(tabs)/stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="(tabs)/settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="focus" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="privacy" options={{ href: null }} />
      <Tabs.Screen name="+not-found" options={{ href: null }} />
    </Tabs>
  );
}
