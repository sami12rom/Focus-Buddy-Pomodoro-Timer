# Focus Buddy – Current Architecture

## Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Navigation | Expo Router v6 (file-based, typed routes) |
| Language | TypeScript 5.9 |
| State | Zustand v4 with `persist` middleware |
| Storage | AsyncStorage (via `@react-native-async-storage/async-storage`) |
| Companion | SVG-based art rendered with `react-native-svg` |
| Notifications | `expo-notifications` |
| Haptics | `expo-haptics` |
| Keep Awake | `expo-keep-awake` |
| Animations | `react-native-reanimated` |
| Testing | Jest 29 + jest-expo preset |

---

## Directory Structure

```
app/
  _layout.tsx          — Root layout: Tabs, theme-aware tab bar, Android notification channel setup
  focus.tsx            — Full-screen timer (focus + break), all session phases
  (tabs)/
    index.tsx          — Home: companion, XP bar, stats row, recovery modal
    stats.tsx          — Stats: summary, goals, 7-day chart, month heatmap, tags, achievements
    settings.tsx       — Settings: themes, toggles, long break, privacy, reset
  privacy.tsx          — In-app privacy policy

components/
  CompanionView.tsx    — SVG companion renderer (5 evolution stages)
  CircularTimer.tsx    — SVG ring progress timer
  DrumPicker.tsx       — Scrollable drum-roll number picker
  TimerDisplay.tsx     — MM:SS text display
  XPBar.tsx            — XP progress bar
  MoodBadge.tsx        — Happiness emoji badge
  SessionBanner.tsx    — Persistent "session in progress" banner on Home/Stats
  RewardModal.tsx      — Post-focus reward overlay (XP, level-up, evolution)
  BreakEndModal.tsx    — Post-break choice: "Start next focus" or "Finish for now"
  RecoveryModal.tsx    — Recovery prompt after app kill mid-session
  OnboardingModal.tsx  — First-launch companion naming screen

store/
  companionStore.ts    — Companion name, level, XP, happiness, evolution stage, onboarding flag
  statsStore.ts        — Session count, streak, total focus minutes, today counter, long breaks
  sessionStore.ts      — Timer state, session durations, cycle counter, active snapshot
  sessionHistoryStore.ts — Last 100 completed focus sessions (date, task, tag, duration)
  settingsStore.ts     — Sound, haptics, keep-awake toggles
  themeStore.ts        — Active theme ID
  goalStore.ts         — Daily session/minute goals

constants/
  app.ts               — APP_NAME ("Focus Buddy"), APP_TAGLINE
  colors.ts            — 4 themes (cosmic, kawaii, ember, retro), AppTheme type
  game.ts              — All numeric game constants (XP, happiness, cycles, limits)

hooks/
  useTheme.ts          — Returns active AppTheme object from themeStore
  useTimer.ts          — Wall-clock timer hook (focus or break, fires onComplete callback)

utils/
  gameLogic.ts         — Pure game logic functions (streak, decay, 7-day chart, etc.)
  notifications.ts     — Expo notification helpers (schedule, cancel, fire alarm)
  resetAppData.ts      — Calls resetToDefaults() on all stores
  achievements.ts      — Derived achievement milestones
  date.ts              — Local YYYY-MM-DD helpers
  mood.ts              — Happiness → mood string helper
  xp.ts                — XP → level and evolution stage calculations
  __tests__/
    gameLogic.test.ts  — 23 unit tests for pure game logic

docs/
  release-checklist.md — Pre-release QA and store submission steps
  current-architecture.md — This file
```

---

## State Architecture

All 6 Zustand stores persist to AsyncStorage. Every store has `version: 1` with a `migrate` function that fills in defaults when upgrading from an unversioned build (version 0).

### What is persisted vs transient

| Store | Persisted | Transient |
|---|---|---|
| companionStore | All fields except `isHydrated` | `isHydrated` (set by `onRehydrateStorage`) |
| statsStore | All fields | — |
| sessionStore | `selectedFocusMinutes`, `selectedBreakMinutes`, `selectedLongBreakMinutes`, `activeSessionSnapshot` | Timer state (`status`, `startTime`, etc.), `activeDurationMs`, `currentTask`, `currentTag`, `completedFocusesInCycle`, `isCurrentBreakLong` |
| sessionHistoryStore | `entries[]` with task/tag/duration (max 100) | — |
| settingsStore | All fields | — |
| themeStore | `activeThemeId` | — |
| goalStore | `dailySessionGoal`, `dailyMinuteGoal` | — |

### Session recovery flow

`activeSessionSnapshot` is written on every meaningful timer action (start, pause, resume). On app launch, `index.tsx` reads the snapshot once after `isHydrated = true`. If a snapshot exists, a `RecoveryModal` is shown offering resume, mark-complete, or discard.

---

## Timer Model

The timer does not use `setInterval` to count down a stored value. Instead, `useTimer.ts` computes remaining time on every frame using:

```
remaining = DURATION - (Date.now() - startedAt - totalPausedMs)
```

This means pausing/resuming and killing the app mid-session do not drift the timer. The snapshot stores `startedAt` and `totalPausedMs` so the same formula works after recovery.

---

## Pomodoro Cycle

1. Focus session completes → `incrementCycle()` → reward modal shown
2. Reward dismissed → `startBreak()` reads `completedFocusesInCycle`
   - If ≥ 4 → long break (`selectedLongBreakMinutes`, default 15 min)
   - If < 4 → short break (`selectedBreakMinutes`, default 5 min)
3. Break ends or is skipped → `BreakEndModal` shown
   - "Start next focus" → stay on focus screen in idle state
   - "Finish for now" → navigate back to Home tab
4. Long break: on completion/skip → `resetCycle()` → cycle restarts from 0

Manual "Take a Break" (from setup screen) always uses short break and does not affect the cycle counter.
