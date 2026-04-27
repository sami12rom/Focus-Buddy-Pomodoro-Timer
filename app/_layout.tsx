import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { setupAndroidNotificationChannel } from '../utils/notifications';
import { useThemeStore } from '../store/themeStore';
import { THEMES } from '../constants/colors';

export default function RootLayout() {
  const activeThemeId = useThemeStore((s) => s.activeThemeId);
  const t = THEMES[activeThemeId];

  useEffect(() => {
    setupAndroidNotificationChannel();
  }, []);

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
      <Tabs.Screen name="focus" options={{ href: null }} />
      <Tabs.Screen name="privacy" options={{ href: null }} />
      <Tabs.Screen name="+not-found" options={{ href: null }} />
    </Tabs>
  );
}
