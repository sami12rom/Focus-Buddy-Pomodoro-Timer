# Loopling

**Focus with a companion that grows with you.**

A gamified Pomodoro timer for Android (iOS later) where a virtual companion evolves through completed focus sessions. Every session earns XP, raises happiness, and pushes your companion toward the next evolution stage — turning a productivity habit into an emotional ritual.

---

## Features

- **Pomodoro timer** — configurable focus and break durations via a scrollable drum picker
- **Evolving companion** — 5 evolution stages (Egg → Baby → Child → Teen → Adult) driven by XP and level
- **Automatic Pomodoro loop** — break starts automatically after focus completes; long break triggers after every 4th session
- **Session history** — last 100 completed sessions stored; 7-day bar chart and recent list in Stats
- **Companion care** — daily pet interaction, happiness decay if you miss a day, onboarding naming screen
- **Session recovery** — app-kill mid-session is detected on relaunch with resume / mark-complete options
- **Session banner** — live countdown visible on Home and Stats while a session runs in the background
- **4 themes** — Cosmic Night, Kawaii Dusk, Ember Dark, Retro Pixel; persisted per user
- **Behavior toggles** — Sound, Haptics, Keep Awake; individually toggleable in Settings
- **Circular SVG timer** — progress ring with companion inside during focus running phase

---

## Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Navigation | Expo Router v6 (file-based, typed routes) |
| Language | TypeScript 5.9 |
| State | Zustand v4 with `persist` middleware + AsyncStorage |
| Animations | react-native-reanimated |
| SVG | react-native-svg |
| Notifications | expo-notifications |
| Haptics | expo-haptics |
| Keep Awake | expo-keep-awake |
| Testing | Jest 29 + jest-expo |

---

## Project Structure

```
app/
  _layout.tsx          — Root layout: tabs, theme-aware tab bar, Android notification channel
  focus.tsx            — Full-screen timer covering all session phases (setup, focus, break)
  (tabs)/
    index.tsx          — Home: companion, XP bar, stats, recovery modal
    stats.tsx          — Stats: summary cards, 7-day bar chart, recent sessions
    settings.tsx       — Settings: themes, toggles, long break duration, reset

components/
  CompanionView.tsx    — Animated companion (5 evolution stages, SVG)
  CircularTimer.tsx    — SVG ring progress timer
  DrumPicker.tsx       — Scrollable drum-roll number picker
  TimerDisplay.tsx     — MM:SS text display
  XPBar.tsx            — XP progress bar
  MoodBadge.tsx        — Happiness emoji badge
  SessionBanner.tsx    — Live session banner on Home/Stats when session is active
  RewardModal.tsx      — Post-focus reward overlay (XP, level-up, evolution)
  BreakEndModal.tsx    — Post-break choice: continue or finish
  RecoveryModal.tsx    — Recovery prompt after app kill mid-session
  OnboardingModal.tsx  — First-launch companion naming screen

store/
  companionStore.ts      — Name, level, XP, happiness, evolution stage, onboarding flag
  statsStore.ts          — Session count, streak, total focus minutes
  sessionStore.ts        — Timer state, durations, cycle counter, recovery snapshot
  sessionHistoryStore.ts — Last 100 completed focus sessions
  settingsStore.ts       — Sound, haptics, keep-awake toggles
  themeStore.ts          — Active theme ID

constants/
  app.ts    — APP_NAME, APP_TAGLINE
  colors.ts — 4 themes + AppTheme type
  game.ts   — All numeric game constants

hooks/
  useTheme.ts — Returns active AppTheme from themeStore
  useTimer.ts — Wall-clock timer (computes from Date.now() − startedAt − pausedMs)

utils/
  gameLogic.ts      — Pure functions: streak, decay, 7-day chart data
  xp.ts             — XP → level, evolution stage
  mood.ts           — Happiness → mood string
  notifications.ts  — Schedule/cancel/fire local notifications
  resetAppData.ts   — Calls resetToDefaults() on all stores
  __tests__/
    gameLogic.test.ts — 23 unit tests
```

---

## Running Locally

```bash
npm install
npx expo start --android
```

> **Note:** `rive-react-native` is a listed dependency but the `.riv` asset is not yet included. The app falls back gracefully to the SVG companion if the Rive file is missing. To use Rive, run `npx expo run:android` (development build required — Expo Go is not supported for native modules).

---

## Testing

```bash
npm test
```

Runs 23 unit tests covering streak logic, XP/level calculations, happiness decay, and 7-day chart generation.

---

## Key Design Decisions

**Wall-clock timer** — remaining time is always computed as `DURATION − (Date.now() − startedAt − totalPausedMs)`, not by decrementing a stored counter. This keeps the timer accurate across pause/resume, backgrounding, and app kills.

**Session recovery** — `activeSessionSnapshot` is written to AsyncStorage on every timer state change. On relaunch, the app detects a stale snapshot and offers recovery options.

**Pomodoro cycle** — the cycle counter is transient (resets on each launch). Only the snapshot survives a kill.

**No external backend** — all data lives in AsyncStorage on device.
