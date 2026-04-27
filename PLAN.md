# Loopling — Implementation Plan

> **Status as of 2026-04-27:** Updates 1–12 are fully implemented. The core Pomodoro loop, companion system, themes, session history, recovery, and settings are all live. The project name is **Loopling** throughout (public UI copy no longer uses "Tamagotchi").

## Context

Build a gamified Pomodoro timer app for Android (iOS later) where a virtual companion grows and evolves through completed focus sessions. The goal is emotional engagement: completing focus sessions is visibly rewarding because the companion gains XP, levels up, and evolves.

**Public app name:** Loopling  
**Stack:** React Native + Expo SDK 54 (TypeScript), Expo Router v6, Zustand v4 + AsyncStorage, expo-notifications, react-native-svg, expo-haptics.

---

## Phase 1 — Project Scaffold

```bash
npx create-expo-app@latest PomodoroTamagotchi --template blank-typescript
cd PomodoroTamagotchi
npx expo install expo-router expo-notifications expo-keep-awake expo-haptics
npx expo install react-native-reanimated react-native-screens react-native-safe-area-context react-native-gesture-handler
npm install lottie-react-native@7.3.6 zustand@5.0.12
npx expo install @react-native-async-storage/async-storage
npm install @expo/vector-icons
```

**`app.json` must include:**
- `"scheme": "pomodoro-tamagotchi"` (required by expo-router)
- `expo-notifications` plugin entry
- Android notification channel setup in `_layout.tsx` (without it, Android 8+ silently drops all notifications)

**`babel.config.js`:** `react-native-reanimated/plugin` must be the **last** plugin listed.

---

## Phase 2 — Folder Structure

```
PomodoroTamagotchi/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx          # Home screen
│   │   └── stats.tsx          # Stats screen
│   ├── focus.tsx              # Focus session screen
│   ├── break.tsx              # Break session screen
│   └── _layout.tsx            # Root layout with tab navigator
├── components/
│   ├── CompanionView.tsx      # Lottie companion display
│   ├── XPBar.tsx              # XP progress bar
│   ├── TimerDisplay.tsx       # MM:SS countdown
│   ├── MoodBadge.tsx          # Mood chip
│   ├── RewardModal.tsx        # Post-session reward overlay
│   └── LevelUpModal.tsx       # Evolution celebration overlay
├── store/
│   ├── companionStore.ts      # Companion state + XP/level/evolution actions
│   ├── sessionStore.ts        # Active session state (not persisted)
│   └── statsStore.ts          # Stats + streak
├── hooks/
│   └── useTimer.ts            # Background-aware countdown timer
├── utils/
│   ├── xp.ts                  # Level/XP/evolution calculations
│   ├── mood.ts                # getMood(happiness)
│   └── notifications.ts      # Schedule/cancel local notifications
├── constants/
│   └── game.ts                # All numeric constants
└── assets/
    └── lottie/                # 5 Lottie JSON files (one per evolution stage)
```

---

## Phase 3 — Constants

**`constants/game.ts`** — every magic number lives here, nothing else uses literals:

| Constant | Value |
|---|---|
| `FOCUS_DURATION_MS` | `25 * 60 * 1000` |
| `BREAK_DURATION_MS` | `5 * 60 * 1000` |
| `XP_PER_SESSION` | `50` |
| `ENERGY_PER_SESSION` | `10` |
| `HAPPINESS_PER_SESSION` | `15` |
| `HAPPINESS_PER_BREAK_INTERACTION` | `5` |
| `ENERGY_MAX` / `HAPPINESS_MAX` | `100` |
| `LEVEL_XP_THRESHOLDS` | `[0, 100, 250, 500, 900, 1400, 2000, ...]` |
| `EVOLUTION_THRESHOLDS` | `{ 1:1, 2:3, 3:6, 4:10, 5:15 }` (stage → min level) |
| `MOOD_HAPPY_THRESHOLD` | `70` |
| `MOOD_NEUTRAL_THRESHOLD` | `40` |
| `INITIAL_ENERGY` / `INITIAL_HAPPINESS` | `80` |

---

## Phase 4 — Utilities

### `utils/xp.ts`
- `getLevelForXP(xp)` — walks `LEVEL_XP_THRESHOLDS`, returns current level
- `getXPToNextLevel(xp)` — XP needed to level up
- `getXPForCurrentLevel(xp)` / `getXPForNextLevel(xp)` — used by `XPBar` for fill ratio
- `getEvolutionStage(level): 1|2|3|4|5` — reads `EVOLUTION_THRESHOLDS`

### `utils/mood.ts`
- `getMood(happiness): 'happy' | 'neutral' | 'tired'`

### `utils/notifications.ts`
- `requestNotificationPermissions()`
- `scheduleSessionEndNotification(dueInMs, type: 'focus' | 'break')` — always cancels prior notification before scheduling
- `cancelScheduledNotification()`
- Uses `Notifications.SchedulableTriggerInputTypes.DATE` (required in expo-notifications SDK 55+)

---

## Phase 5 — Zustand Stores

All stores use `persist` + `createJSONStorage(() => AsyncStorage)` from Zustand v5.

### `store/companionStore.ts`
State: `name`, `level`, `xp`, `energy`, `happiness`, `evolutionStage`, `createdAt`, `isHydrated`

Key actions:
- `applyFocusReward(xpGain, energyGain, happinessGain)` → returns `{ leveledUp, newLevel, evolved, newStage }`
- `applyBreakInteraction()` → adds happiness, capped at 100

Add `onRehydrateStorage` callback to set `isHydrated = true` — home screen shows a spinner until hydrated to prevent data flicker on startup.

### `store/statsStore.ts`
State: `totalSessions`, `todaySessions`, `totalFocusMinutes`, `currentStreak`, `bestStreak`, `lastSessionDate` (YYYY-MM-DD), `lastActiveDate`

Key actions:
- `recordCompletedSession()` — streak logic handles 4 cases:
  1. `lastSessionDate === null` → first session ever, streak = 1
  2. `lastSessionDate === yesterday` → streak + 1
  3. `lastSessionDate === today` → streak unchanged (multi-session same day)
  4. `lastSessionDate` older than yesterday → streak resets to 1
- `resetTodayIfNewDay()` — call on every app open; zeroes `todaySessions` if date changed overnight

### `store/sessionStore.ts`
State: `status` (idle | running | paused | break_idle | break_running | break_paused), `startTime`, `pausedAt`, `totalPausedMs`, `breakInteracted`

**Not persisted** — session is intentionally transient. App killed mid-session = session lost.

---

## Phase 6 — Timer Hook

**`hooks/useTimer.ts`** — the most architecturally sensitive file.

**Key principle:** remaining time is computed from wall-clock difference, not by decrementing a counter:
```
remaining = DURATION - (Date.now() - startTime - totalPausedMs)
```

This means `setInterval` only drives UI refresh frequency. If Android suspends the JS thread while backgrounded, the next tick on foreground still shows the correct time.

- `AppState` listener: on `'active'`, immediately recalculate to sync UI after backgrounding
- Auto-completion: when `remaining <= 0`, call `onComplete()` exactly once (guarded by `completedRef`)
- Returns `{ remainingMs, isRunning, isPaused }`

**`expo-keep-awake`:** Call `activateKeepAwakeAsync()` on session start and `deactivateKeepAwake()` on complete/cancel. Keeps screen on during focus. Does NOT keep JS alive when fully backgrounded — notifications handle the background alert.

---

## Phase 7 — Components

| Component | Key Props | Notes |
|---|---|---|
| `CompanionView` | `size?`, `isFocusing?` | Reads `evolutionStage` from store; `useNativeLooping={true}` on Android |
| `XPBar` | `xp` | Derives fill ratio; animated with reanimated |
| `TimerDisplay` | `remainingMs` | `Math.ceil` for seconds, `padStart(2,'0')` for display |
| `MoodBadge` | `happiness` | Calls `getMood()`, emoji + label in a pill |
| `RewardModal` | reward values + callbacks | Shows `+XP`, `+Energy`, `+Happiness`; triggers `LevelUpModal` if evolved |
| `LevelUpModal` | `newStage`, `onDismiss` | Full overlay, shows new `CompanionView` + "evolved!" message |

**Lottie files:** Source 5 free JSON animations from lottiefiles.com. Place as:
- `assets/lottie/egg.json` (Stage 1, Level 1)
- `assets/lottie/baby.json` (Stage 2, Level 3)
- `assets/lottie/child.json` (Stage 3, Level 6)
- `assets/lottie/teen.json` (Stage 4, Level 10)
- `assets/lottie/adult.json` (Stage 5, Level 15)

Keep each file under 300KB to avoid OOM on low-end Android. For initial development, one file copied 5 times is fine as a placeholder.

---

## Phase 8 — Screens

### `app/_layout.tsx`
- Tab navigator: Home + Stats tabs
- Focus and Break registered with `href: null` (hidden from tab bar, navigated imperatively)
- Android notification channel created here on startup:
  ```typescript
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      importance: Notifications.AndroidImportance.MAX, ...
    });
  }
  ```

### `app/(tabs)/index.tsx` — Home Screen
On mount (`useFocusEffect`):
1. `statsStore.resetTodayIfNewDay()`
2. Request notification permissions if not yet granted

Layout (top → bottom): CompanionView (large) → name + stage label → MoodBadge → XPBar → energy/happiness row → today sessions + streak → "Start Focus" button

Render a loading spinner until `companionStore.isHydrated === true`.

### `app/focus.tsx` — Focus Session
On mount:
1. `sessionStore.startFocus()`
2. `activateKeepAwakeAsync()`
3. `scheduleSessionEndNotification(FOCUS_DURATION_MS, 'focus')`

On pause: `cancelScheduledNotification()` → `sessionStore.pauseFocus()`
On resume: `sessionStore.resumeFocus()` → `scheduleSessionEndNotification(remainingMs, 'focus')`

On complete (`handleComplete`):
1. `deactivateKeepAwake()` + `cancelScheduledNotification()`
2. `companionStore.applyFocusReward(...)` → capture result
3. `statsStore.recordCompletedSession()`
4. Show `RewardModal` → on dismiss → `router.replace('/break')`

On cancel: `Alert.alert` confirmation dialog. `BackHandler` intercepts Android hardware back with same dialog.

### `app/break.tsx` — Break Session
Same structure as focus. Differences:
- "Pet companion" button: calls `interactDuringBreak()` + `applyBreakInteraction()`; disabled after first tap (reads `breakInteracted` from store)
- "Skip break" requires no confirmation
- On complete/skip → `router.replace('/(tabs)/')`

### `app/(tabs)/stats.tsx` — Stats Screen
Read-only display. Cards for: total sessions, today's sessions, total focus minutes (format as Xh Ym if >60), current streak (🔥 icon), best streak.

---

## Navigation Flow

```
Tab Bar
├── Home → "Start Focus" → router.push('/focus')
└── Stats (read-only)

/focus → complete → router.replace('/break')
       → cancel   → router.back()

/break → complete/skip → router.replace('/(tabs)/')
```

Always use `router.replace` (not `router.push`) on focus→break and break→home to prevent back-stack accumulation.

---

## Implementation Order

| Step | What | Status |
|---|---|---|
| 1 | Scaffold + install all packages | ✅ Done |
| 2 | `app.json` + `babel.config.js` | ✅ Done |
| 3 | `constants/game.ts` | ✅ Done |
| 4 | `utils/xp.ts`, `utils/mood.ts` | ✅ Done |
| 5 | `utils/notifications.ts` | ✅ Done |
| 6 | `store/sessionStore.ts` | ✅ Done |
| 7 | `store/companionStore.ts` | ✅ Done |
| 8 | `store/statsStore.ts` | ✅ Done |
| 9 | `hooks/useTimer.ts` | ✅ Done |
| 10 | `components/TimerDisplay.tsx` | ✅ Done |
| 11 | `components/MoodBadge.tsx` | ✅ Done |
| 12 | `components/XPBar.tsx` | ✅ Done |
| 13 | Companion visuals (SVG stages, no Lottie) | ✅ Done (Update 1) |
| 14 | `components/CompanionView.tsx` | ✅ Done |
| 15 | `components/RewardModal.tsx` | ✅ Done |
| 16 | `app/_layout.tsx` | ✅ Done |
| 17 | `app/(tabs)/stats.tsx` + 7-day chart + history | ✅ Done (Update 12) |
| 18 | `app/focus.tsx` (drum picker, circular timer, full loop) | ✅ Done (Updates 2–12) |
| 19 | `app/break.tsx` | ⛔ Superseded — break runs inside `focus.tsx` |
| 20 | `app/(tabs)/index.tsx` | ✅ Done |
| 21 | End-to-end test on Android emulator (API 33+) | Pending |

---

## Verification Checklist

- [x] Home screen shows companion, XP bar, happiness, streak
- [x] Start focus → countdown runs; pause stops it; resume continues correctly
- [x] Background app → return → remaining time is correct (not stale)
- [x] Notification fires when session ends while app is backgrounded
- [x] Complete session: XP +50, happiness +15 update immediately
- [x] After first session: streak = 1, totalSessions = 1, todaySessions = 1
- [x] Stats screen shows all correct values
- [x] Force-kill + reopen: all data persists (AsyncStorage)
- [x] Level up: after 2 sessions (100 XP total), RewardModal shows "Level Up!"
- [ ] Cancel shows confirmation dialog; Android hardware back button triggers it
- [ ] Simulate streak continuation: set `lastSessionDate` to yesterday, complete session → streak increments
- [ ] End-to-end test on Android emulator API 33+

---

## Key Pitfalls to Avoid

1. **Android background timer:** Never use a decrementing counter. Always compute from `Date.now() - startTime - totalPausedMs`.
2. **Notifications on Android 8+:** Must create a notification channel in `_layout.tsx` or notifications are silently dropped.
3. **expo-router scheme:** `"scheme"` field in `app.json` is required or cold-start navigation fails.
4. **Reanimated plugin:** Must be last in `babel.config.js` plugins array.
5. **Zustand hydration flicker:** Show spinner until `isHydrated === true` on home screen.
6. **Streak edge case:** Handle all 4 states for `lastSessionDate` (null, today, yesterday, older).
7. **Lottie file size:** Keep each `.json` under 300KB for low-end Android devices.
8. **`router.replace` vs `router.push`:** Use `replace` on focus→break and break→home to avoid back-stack buildup.

---

## Update 1 — Animated Companion (implemented)

**Problem:** Lottie placeholder files were all identical, so evolution had no visual effect.

**Solution:** Replaced `CompanionView.tsx` with a pure React Native `Animated` + emoji implementation. No Lottie dependency. Each stage has a distinct emoji, colour ring, and idle animation:

| Stage | Level | Emoji | Ring colour | Animation |
|---|---|---|---|---|
| Egg | 1 | 🥚 | Purple | Slow left-right wobble |
| Baby | 3 | 🐣 | Green | Happy bounce |
| Child | 6 | 🐥 | Blue | Scale pulse + glow breathe |
| Teen | 10 | 🦊 | Orange | Quick spin + bounce |
| Adult | 15 | 🐲 | Gold | Slow majestic pulse |

**Note for Expo Go:** After this change, a full JS bundle reload is required (shake phone → Reload), not just a hot reload, because the component tree changed.

---

## Update 2 — Drum Picker Timer Setup (planned)

**Problem:** Timer auto-starts at a fixed 25 min with no way to adjust duration before starting.

**Goal:** Add a setup phase to the timer screen with a scrollable drum picker (like a slot machine wheel) so users can set the duration before they start. Inspired by reference UI screenshots.

### New screen flow

```
Home → /focus

  focus.tsx phases (controlled by sessionStore.status):

  [idle]          → Setup UI
  [running/paused] → Focus countdown
  [break_running/break_paused] → Break countdown
```

After a focus session completes and the reward modal is dismissed, the screen resets to **idle with Short Break pre-selected** — no navigation to a separate screen.

### Files to change

#### `store/sessionStore.ts`
Add persisted fields (survive app restart):
- `selectedFocusMinutes: number` — default 25, range 1–120
- `selectedBreakMinutes: number` — default 5, range 1–30

Add transient field (not persisted):
- `currentTask: string` — default `''`, stores the user's typed focus task

Add setters: `setFocusMinutes(n)`, `setBreakMinutes(n)`, `setCurrentTask(s)`

#### `hooks/useTimer.ts`
Replace hardcoded constants with store values:
```typescript
// Before
const DURATION = mode === 'focus' ? FOCUS_DURATION_MS : BREAK_DURATION_MS;

// After — reads selectedFocusMinutes / selectedBreakMinutes from sessionStore
const DURATION = mode === 'focus'
  ? selectedFocusMinutes * 60_000
  : selectedBreakMinutes * 60_000;
```

#### `components/DrumPicker.tsx` (NEW)
Vertically scrollable number picker that snaps to integer values.

- Built with `ScrollView` + `snapToInterval={ITEM_HEIGHT}` + `decelerationRate="fast"`
- Shows 5 items: 2 faded above → highlighted center → 2 faded below
- Top/bottom `contentContainerStyle` padding = `2 × ITEM_HEIGHT` so first and last values can be centred
- On mount: scroll to `(value - min) × ITEM_HEIGHT` with no animation
- `onMomentumScrollEnd` + `onScrollEndDrag`: snap to nearest item, call `onChange`
- Item opacity: 1.0 / 0.45 / 0.2 for distances 0 / 1 / 2+
- Item font size: 48 / 28 / 20 for distances 0 / 1 / 2+
- Props: `value`, `min`, `max`, `onChange`, `color`

#### `app/focus.tsx` (rewrite)
**Remove** the auto-start from `useFocusEffect`. The screen starts in idle state.

New local state:
```typescript
const [selectedMode, setSelectedMode] = useState<'focus' | 'break'>('focus');
const [taskInput, setTaskInput] = useState('');
```

**Setup UI layout** (when `status === 'idle'`):
```
[ × ]                               ← top-right, router.back()
[ Focus ]  [ Short Break ]          ← tabs, controls selectedMode
      24
    [ 25 ]                          ← DrumPicker (min, selectedFocusMinutes or selectedBreakMinutes, max)
      26
# What's your focus today?  [    ]  ← TextInput
Session #3                          ← todaySessions + 1
[          Start          ]
```

Color theme per mode:
- Focus → navy `#0f172a` bg, purple `#a78bfa` accent
- Short Break → dark green `#052e16` bg, green `#34d399` accent

**Start button**:
```typescript
function handleStart() {
  setCurrentTask(taskInput);
  if (selectedMode === 'focus') {
    startFocus();
    scheduleSessionEndNotification(selectedFocusMinutes * 60_000, 'focus');
  } else {
    startBreak();
    scheduleSessionEndNotification(selectedBreakMinutes * 60_000, 'break');
  }
  activateKeepAwakeAsync();
}
```

**Cancel during running** → `reset()` → returns to setup (same screen, status goes to idle). Does NOT navigate away.

**Focus complete** (reward modal dismissed):
```typescript
reset();             // status → idle
setSelectedMode('break');  // pre-select Short Break tab
// screen stays, now shows break setup
```

**Break complete**:
```typescript
reset();
router.replace('/(tabs)');
```

#### `app/break.tsx`
No changes. File is kept but no longer used in the new flow (break is handled inside `focus.tsx`).

### Verification additions

- [ ] Drum picker scrolls and snaps to whole minutes
- [ ] Focus tab: purple theme, picker shows `selectedFocusMinutes`
- [ ] Short Break tab: green theme, picker shows `selectedBreakMinutes`
- [ ] Changed duration persists after app restart
- [ ] Task input is editable and visible
- [ ] Session counter shows today's count + 1
- [ ] Start on Focus → countdown uses chosen duration
- [ ] Start on Short Break → break countdown uses chosen duration
- [ ] Cancel during countdown → setup screen (not home)
- [ ] Focus complete → reward → setup shows Short Break pre-selected
- [ ] Break complete → home
- [ ] ⚡ Simulate Complete still works

---

## Update 3 — Drum Picker Smoothness Fix (implemented)

**Problem:** Scroll felt janky — numbers didn't animate during dragging, and `scrollTo(animated: true)` after snap caused a visible double-animation.

**Solution:** Three changes to `components/DrumPicker.tsx`:
1. Added `displayValue` local state updated via `onScroll` at 16ms throttle — item opacity/size now animate in real-time as the user drags, not just after the snap lands.
2. Changed the correction `scrollTo` call from `animated: true` → `animated: false` — eliminates double-animation jank.
3. Added `disableIntervalMomentum={true}`, `bounces={false}`, `overScrollMode="never"` — scroll stops at the nearest item on release, no rubber-band bounce at list edges.

---

## Update 4 — Completion Alarm (implemented)

**Problem:** No audio/haptic feedback when the timer finishes.

**Solution:** Added `fireCompletionAlarm(type)` to `utils/notifications.ts`. It fires an **immediate notification** (`trigger: null`) using the system notification sound. Since the notification handler already has `shouldPlaySound: true`, this plays even when the app is in the foreground. Additionally, `expo-haptics` fires a `NotificationFeedbackType.Success` pattern on focus complete and `Warning` on break complete.

Both signals are independent — muted phone still vibrates, and a phone with sound on still plays the system tone.

Called from `handleFocusComplete` and `handleBreakComplete` in `app/focus.tsx`.

---

## Update 5 — Continuous Focus/Break Loop (implemented)

**Problem:** After a break finished the app returned to the home screen, breaking the Pomodoro rhythm.

**Solution:** Modified `handleBreakComplete` and `handleSkipBreak` in `app/focus.tsx` to call `setSelectedMode('focus')` instead of `router.replace('/(tabs)')`. The session flow is now:

```
Focus → Break → Focus → Break → ...  (loops indefinitely)
```

The ✕ close button remains available on the setup screen to exit to home whenever the user wants to stop.

---

## Update 6 — Interactive Rive Companion (implemented)

**Problem:** Companion visual is limited to emoji + React Native Animated.

**Solution:** Added `components/InteractiveRiveCompanion.tsx` using the official `rive-react-native` runtime (v9.8.3).

### Key details
- **Asset:** `assets/rive/focus_buddy.riv` — place the `.riv` file here
- **State machine:** `CompanionStateMachine`
- **Stage mapping:** egg→0, baby→1, young→2, guardian→3
- **Inputs:** `stage` (number), `focusMode`/`sleepMode`/`tiredMode` (boolean), `tap`/`pet`/`levelUp`/`happy` (triggers)
- **Touch:** `onPress` → fires `tap`; `onLongPress` (400ms) → fires `pet`
- **Level up detection:** `useRef` tracks previous level; fires `levelUp` trigger when level increases
- **Initialization:** `onPlay` callback sets all inputs once Rive state machine is ready
- **Fallback:** `onError` shows emoji placeholder — app never crashes on missing/corrupt `.riv` file
- **Asset loading:** `expo-asset` copies the bundled `.riv` to a `file://` URI; passed to `<Rive url={...} />`

### New files
- `assets/rive/focus_buddy.riv` — must be added manually
- `metro.config.js` — adds `'riv'` to `assetExts` so metro bundles it

### ⚠️ Requires development build
`rive-react-native` contains native code. It does **not** work with Expo Go. Run:
```bash
npx expo run:android
```

---

## Update 7 — Multi-Theme System (implemented)

**Problem:** All colors were hardcoded as hex literals scattered across every file. No way for users to change the app's appearance.

**Solution:** Introduced a centralized theme system with 4 themes and a new Settings tab.

### Architecture

| File | Role |
|---|---|
| `constants/colors.ts` | `AppTheme` interface + all 4 theme objects + `THEMES` map + `getSessionTheme()` helper |
| `store/themeStore.ts` | Zustand persist store — saves active `ThemeId` to AsyncStorage |
| `hooks/useTheme.ts` | `useTheme()` — returns current `AppTheme` object from the active theme ID |
| `app/(tabs)/settings.tsx` | Theme picker UI — 2×2 grid of cards with colour swatches |

### The 4 themes

| Theme | ID | Focus accent | Break accent | Background |
|---|---|---|---|---|
| Cosmic Night | `cosmic` | `#7C6FF1` violet | `#2DD4A6` teal | `#080D1A` deep navy |
| Kawaii Dusk | `kawaii` | `#E879F9` fuchsia | `#34D399` mint | `#0D0B14` purple-black |
| Ember Dark | `ember` | `#F97316` orange | `#4ADE80` lime | `#0C0A07` warm black |
| Retro Pixel | `retro` | `#00D4FF` cyan | `#39FF14` neon green | `#050508` true black |

### How components consume the theme

Every component and screen calls `const t = useTheme()` and applies colors inline or via dynamic style props. Static layout properties (padding, margin, borderRadius, flex) remain in `StyleSheet.create()`. The `MOOD_COLOR` static export was removed from `utils/mood.ts` — `MoodBadge` now derives colors directly from `t.moodHappy / t.moodNeutral / t.moodTired`.

`app/_layout.tsx` uses a `key={activeThemeId}` prop on `<Tabs>` to force the tab bar to re-render immediately when the theme changes.

### Verification additions

- [ ] Default theme is Cosmic Night on first install
- [ ] Settings tab visible in bottom nav
- [ ] 4 theme cards shown with correct colour swatches
- [ ] Active theme has accent-coloured border + checkmark
- [ ] Tapping a theme updates all screens instantly
- [ ] Kill and reopen — selected theme persists
- [ ] All 4 themes: focus screen, break screen, reward modal, stats, home all update correctly
- [ ] Tab bar active icon colour matches theme's focus accent

---

## Update 8 — Lo-Fi Circular Timer (Focus Screen Redesign)

### Motivation

User shared a reference screenshot of a lo-fi Pomodoro app with a full-screen illustrated study scene, a large circular progress ring as the timer, and a minimal compact controls panel. The goal is to bring that same cozy, immersive energy to the focus running screen using a circular SVG ring instead of a plain text timer.

### What changed

**New package:** `react-native-svg` (bundled in Expo managed workflow — no dev build required)

**New file: `components/CircularTimer.tsx`**
- SVG progress ring: track circle + progress arc with `strokeDashoffset` derived from `remainingMs / totalMs`
- `G rotation="-90"` starts the arc at 12 o'clock
- `strokeLinecap="round"` for a smooth arc tip
- Optional `glowColor` prop renders a large soft ellipse behind the ring
- `children` are rendered in an absolute-fill inner View (companion lives inside)

**Modified: `app/focus.tsx` — focus running phase only**
- `const totalMs = selectedFocusMinutes * 60_000` computed at render time
- `CircularTimer` wraps `CompanionView` (size 180) — companion is inside the ring
- `TimerDisplay` stays below the ring (large MM:SS text)
- Task name subtitle shown below "Focus Session" label if the user entered one
- Lo-fi decor (📚 ☕ 🪴) kept at 0.3 opacity as ambient detail
- All other behaviour (pause, cancel, dev button, reward modal) unchanged

### Layout

```
Focus Session
"task name…"

   ╭── progress ring ──╮
  │    [companion 180]  │
   ╰────────────────────╯

        MM:SS

  [ Pause/Resume ]  [ Cancel ]
```

### Verification additions

- [ ] Focus ring starts full and empties clockwise as the session progresses
- [ ] Ring colour matches theme's `focusAccent` (changes when theme changes)
- [ ] Task subtitle appears only when a task was entered; hidden otherwise
- [ ] Paused state: ring freezes, "Paused" label appears
- [ ] Companion breathing + blink animations visible inside the ring
- [ ] Tapping companion triggers subtle scale pulse
- [ ] Session complete → reward modal fires as before

---

## Update 9 — Session Banner + Navigation Fix

### Problem

Two issues when the user taps the Home or Stats tab mid-session:

1. **Bug:** `useFocusEffect` in `focus.tsx` called `reset()` whenever the screen re-gained focus and `status !== 'idle'`. Navigating away and back silently killed the running session.
2. **UX gap:** No indicator on other screens that a session was still running. No path back to the focus screen.

### Changes

**`app/focus.tsx`** — `useFocusEffect` condition changed from `status !== 'idle'` to `isBreakRunning`. A running or paused focus session now survives tab navigation; only an unexpected break state is cleared when the focus screen regains focus.

**New `components/SessionBanner.tsx`**
- Reads `status`, `startTime`, `pausedAt`, `totalPausedMs`, `selectedFocusMinutes`, `selectedBreakMinutes`, `currentTask` from `useSessionStore`
- Renders `null` when `status === 'idle'`
- Ticks every 500ms via `setInterval` using the same wall-clock formula as the main timer
- Shows mode label, live `MM:SS`, task name (if set), and "paused" tag when paused
- Left accent bar uses `focusAccent` or `breakAccent` depending on mode
- Tapping navigates to `/focus` via `router.push`

**`app/(tabs)/index.tsx`** and **`app/(tabs)/stats.tsx`** — `<SessionBanner />` added just below `<StatusBar />` in each screen's content flow.

### Banner anatomy

```
┌──────────────────────────────────────────┐
│▌ FOCUS  •  18:32  •  "Write docs"      › │
└──────────────────────────────────────────┘
```

### Verification additions

- [ ] Start session → tap Home → banner appears with live countdown
- [ ] Tap banner → returns to focus screen, session still running, time is correct
- [ ] Navigate to Stats → banner appears there too
- [ ] Navigate back to focus screen without tapping banner → session still intact
- [ ] Pause session → banner shows static time + "paused" tag
- [ ] Resume → banner ticks again
- [ ] Cancel or complete session → banner disappears from all screens
- [ ] Break session active → banner shows "Break" with `breakAccent` colour

---

## Update 10 — Smooth Pomodoro Loop (Dual Picker + Auto-Start Break)

### Problem

After a focus session completed, the user was dropped back to the setup screen in "Break" mode and had to manually set the break duration and tap Start. This broke the Pomodoro flow and required repeated configuration.

Additionally, focus and break durations were set on separate tabs — the user had to switch modes to configure both, and could not see them at the same time.

### Changes

**`app/focus.tsx` — setup screen (idle phase)**
- Removed the Focus / Break tab selector entirely
- Replaced single drum picker with a **dual side-by-side layout**: Focus duration on the left (focusAccent colour), Break duration on the right (breakAccent colour), separated by a thin divider
- Both durations are visible and configurable at the same time before starting
- Start button always launches a focus session ("Start Focus Session")
- Removed `selectedMode` state and `Mode` type — no longer needed

**`app/focus.tsx` — `handleRewardDismiss`**
- Previously: `reset()` + `setSelectedMode('break')` → user returned to setup screen
- Now: `startBreak()` + `activateKeepAwakeAsync()` + `scheduleSessionEndNotification()` — break starts **automatically** the moment the reward modal is dismissed

**`app/focus.tsx` — `handleBreakComplete` / `handleSkipBreak`**
- Removed `setSelectedMode('focus')` calls (state no longer exists)
- Both still call `reset()` → returns user to the idle setup screen for the next round

### New Pomodoro loop

```
Setup (set focus + break time once, enter task)
  ↓ Start Focus Session
Focus running
  ↓ Complete
Reward modal
  ↓ Dismiss
Break running  ← auto-started, no user action needed
  ↓ Complete or Skip
Setup (ready for next round)
```

### Verification additions

- [ ] Setup screen shows both Focus and Break drum pickers simultaneously
- [ ] Setting focus to 25min and break to 5min persists across sessions
- [ ] Tapping "Start Focus Session" starts focus (never break)
- [ ] Reward modal dismissed → break starts immediately, no setup screen shown
- [ ] Break completes → user returns to setup screen for next session
- [ ] Skip Break → same as above
- [ ] SessionBanner on Home/Stats shows "Break" with live countdown during auto-started break

---

## Update 11 — Emotional Loop Strengthening

### Product direction
The app's goal is a focus ritual with a companion, not a feature-heavy timer. This update strengthens the emotional habit loop and removes friction.

**Public-facing text:** "Tamagotchi" removed from all UI copy. The header now reads "Pomodoro".

### Changes

**`constants/game.ts`** — added `HAPPINESS_PER_PET = 5`, `DAILY_HAPPINESS_DECAY = 5`, `HAPPINESS_MIN = 30`

**`store/companionStore.ts`**
- Added `hasCompletedOnboarding: boolean` — false on first install
- Added `lastPetDate: string | null` — tracks daily pet limit
- Added `lastDecayDate: string | null` — prevents double-decay on same day
- `completeOnboarding(name)` — sets name + marks onboarding done
- `petCompanion()` → `{ happinessIncreased }` — first pet of day +5 happiness; subsequent pets return false without changing stats
- `applyDailyCareCheck(today, lastSessionDate)` — gentle −5 happiness if user missed yesterday; no decay if played yesterday or today; idempotent (runs once per calendar day)

**New `components/OnboardingModal.tsx`**
- Full-screen naming screen shown on first launch only
- Companion (stage 1 egg) displayed for emotional connection
- Name input with `DEFAULT_COMPANION_NAME` as placeholder
- Empty name falls back to default
- Calls `completeOnboarding(name)` → never shown again

**`app/(tabs)/index.tsx`**
- Shows `OnboardingModal` when `!hasCompletedOnboarding`
- Calls `applyDailyCareCheck` in `useFocusEffect` after `resetTodayIfNewDay`
- Tap companion → light haptic (visual reaction handled by tapAnim in CompanionView)
- Long press companion → `petCompanion()` + success haptic + 2s feedback message ("💛 +Happiness!" or "Already petted today 😊")
- Removed **Energy** stat card; replaced with **Level** card
- Header text changed from "Pomodoro Tamagotchi" → "Pomodoro"

**`components/CompanionView.tsx`**
- Added `isPaused?: boolean` prop — study badge shows ⏸ instead of study icon when paused
- Added `onLongPress?: () => void` prop
- Companion is now wrapped in `TouchableOpacity` whenever `onTap` or `onLongPress` is provided (not only during focus) — enables home screen interaction
- `isFocusing` in focus.tsx now set to `focusTimer.isRunning || focusTimer.isPaused` so breathing animation continues while paused

**`components/RewardModal.tsx`**
- Removed Energy row from rewards display
- Added `task?: string` prop — shows "You completed: {task}" when non-empty
- Button label changed to "Continue →"

**`app/focus.tsx`**
- Passes `task={taskInput}` to `RewardModal`
- `handleBreakComplete` and `handleSkipBreak` now call `setTaskInput('')` — task clears after the full focus/break cycle
- `isPaused={focusTimer.isPaused}` passed to `CompanionView`

**`utils/notifications.ts`**
- All notification functions wrapped in try/catch — no crash if permissions denied
- `requestNotificationPermissions` returns `false` without prompting if already denied
- `scheduleSessionEndNotification` and `fireCompletionAlarm` silently skip if permission not granted — timer and in-app reward modal still work fully

**`app/break.tsx`** — marked as unused with comment; no navigation points here

### Verification additions

- [ ] First launch: onboarding naming screen appears before home
- [ ] Empty name input uses default "Pomo"
- [ ] Onboarding never shown again after completion
- [ ] Companion name appears on Home screen
- [ ] Tap companion on Home → light haptic fires
- [ ] Long press companion on Home → "💛 +Happiness!" message, happiness increases
- [ ] Long press again same day → "Already petted today 😊", no stat change
- [ ] Miss a day → happiness decreases by 5 on next open (not below 30)
- [ ] Decay only applies once per calendar day
- [ ] Energy stat card no longer visible on Home; Level card shown instead
- [ ] Task entered before focus appears in RewardModal as "You completed: …"
- [ ] Task clears after break completes or is skipped
- [ ] SessionBanner shows task when set
- [ ] Focus running + paused → companion badge shows ⏸
- [ ] Deny notification permission → session still runs, reward modal fires, no crash
- [ ] "Pomodoro Tamagotchi" text no longer visible in UI

---

## Update 12 — Usefulness, Recovery, Control, and Retention

### Product direction
Strengthen the focus loop with session history, long breaks, break completion choice, session recovery after kill, deferred notification permission, behavior toggles, and a strict mode placeholder. No shops, social, or cloud sync added.

### Changes

**`constants/game.ts`**
- Added `FOCUS_SESSIONS_BEFORE_LONG_BREAK = 4`, `DEFAULT_LONG_BREAK_MINUTES = 15`, `LONG_BREAK_MINUTES_MIN = 5`, `LONG_BREAK_MINUTES_MAX = 60`
- Added `SESSION_HISTORY_MAX = 100`

**New `store/sessionHistoryStore.ts`**
- Persists up to 100 completed focus session entries (id, date, task, durationMinutes, completedAt)
- `addEntry` prepends newest entry and slices to cap — AsyncStorage never grows unbounded
- Only completed focus sessions are stored; cancelled sessions and breaks are never stored

**New `store/settingsStore.ts`**
- Persisted booleans: `soundEnabled`, `hapticsEnabled`, `keepAwakeEnabled` — all default true

**`store/sessionStore.ts`** (major rewrite)
- Added `selectedLongBreakMinutes` (persisted, default 15)
- Added `completedFocusesInCycle` (transient — resets each app launch)
- Added `isCurrentBreakLong` (transient — set when break starts)
- Added `activeSessionSnapshot` (persisted) — written on every timer state change for recovery
- `startFocus()` / `pauseFocus()` / `resumeFocus()` — each keeps snapshot in sync
- `startBreak(isManual?)` — when `isManual=false` checks cycle count to decide long vs short; sets `isCurrentBreakLong`; `isManual=true` always uses short break (for manual "Take a Break")
- `pauseBreak()` / `resumeBreak()` — keep snapshot in sync
- `reset()` / `cancelSession()` — clear snapshot
- New actions: `incrementCycle`, `resetCycle`, `clearSnapshot`, `resumeFromSnapshot`

**`store/statsStore.ts`**
- `recordCompletedSession` now accepts `durationMinutes: number` instead of hardcoding 25

**`hooks/useTimer.ts`**
- Break DURATION now uses `selectedLongBreakMinutes` when `isCurrentBreakLong`, otherwise `selectedBreakMinutes`

**New `components/BreakEndModal.tsx`**
- Shown after break completes or is skipped — replaces silent auto-loop
- "Start next focus" → stays on focus screen in idle state (task cleared)
- "Finish for now" → navigates to Home

**New `components/RecoveryModal.tsx`**
- Three recovery cases:
  - `offer-resume`: session paused or still running — Resume / Discard
  - `ended-focus`: focus timer expired while app was killed — Mark completed (applies reward once) / Discard
  - `ended-break`: break expired while app was killed — Continue / Finish for now

**`app/focus.tsx`**
- `handleStart` / `handleStartBreak` now call `requestNotificationPermissions()` — permission asked at first session start, not on Home mount
- `handleFocusComplete` calls `incrementCycle()`, `recordCompletedSession(selectedFocusMinutes)`, `addEntry(...)` — wires history and long-break cycle
- `handleRewardDismiss` computes `isLong` from cycle count and schedules correct break duration
- `handleBreakComplete` / `handleSkipBreak` defer `reset()` to `BreakEndModal` choice
- All `Haptics.*` calls gated on `hapticsEnabled`; `fireCompletionAlarm` gated on `soundEnabled`; `activateKeepAwakeAsync` gated on `keepAwakeEnabled`
- Break running label shows "Long Break" vs "Short Break" based on `isCurrentBreakLong`
- `resetCycle()` called after long break ends

**`app/(tabs)/index.tsx`**
- Removed `requestNotificationPermissions()` from `useFocusEffect` (moved to focus.tsx)
- Added one-time recovery check via `useEffect` that fires after store hydration
- `RecoveryModal` rendered; "Mark completed" applies reward, records stats, adds history entry, shows `RewardModal` inline on Home

**`app/(tabs)/stats.tsx`**
- Added 7-day bar chart — plain `View` elements with proportional heights, no library
- Added recent sessions list (latest 10 entries) from `sessionHistoryStore`
- Today's bar highlighted with full `focusAccent` colour; past days at 55% opacity
- Empty state shown when no sessions exist in the last 7 days

**`app/(tabs)/settings.tsx`**
- Added **Behavior** section: Sound, Haptics, Keep screen awake toggle rows (custom pill toggle, theme-aware)
- Added **Long Break** section: +/− stepper for `selectedLongBreakMinutes`, clamped to min/max constants
- Added **Coming Later** section: Strict Focus Mode row — dimmed, "Soon" badge, no behavior

### Verification additions

**Session history:**
- [ ] Completed focus creates one history entry with correct date, task, duration
- [ ] Cancelled focus creates no entry
- [ ] Break creates no entry
- [ ] Stats screen shows last 7 days bar chart (bars fill proportionally)
- [ ] Today's bar is fully accented; past days are dimmed
- [ ] Empty state shown when no sessions in last 7 days
- [ ] Recent sessions list shows task, date, duration — newest first
- [ ] History persists after app restart
- [ ] History caps at 100 — oldest entries are dropped

**Long break:**
- [ ] After 1–3 focus sessions, auto-started break uses `selectedBreakMinutes` (short)
- [ ] After 4th focus session, auto-started break uses `selectedLongBreakMinutes` (long)
- [ ] Break running label shows "Long Break" during long break, "Short Break" otherwise
- [ ] Long break duration set in Settings persists after app restart
- [ ] Cycle resets to 0 after long break completes or is skipped
- [ ] Manual "Take a Break" always uses short break duration regardless of cycle count

**Break completion choice:**
- [ ] Break complete → `BreakEndModal` appears
- [ ] Skip break → same modal
- [ ] "Start next focus" → returns to idle setup screen, task cleared
- [ ] "Finish for now" → navigates to Home

**Session recovery:**
- [ ] Start focus, kill app, reopen before timer ends → `RecoveryModal` offers Resume
- [ ] Resume → navigates to focus screen, timer continues from correct position
- [ ] Start focus, kill app, reopen after focus timer should have ended → "Mark completed" option shown
- [ ] Mark completed → reward applied once, stats updated, history entry added
- [ ] Discard → no reward, no stats, no history
- [ ] No duplicate reward if "Mark completed" tapped then app killed again
- [ ] Break snapshot recovery: "Continue" or "Finish for now" both clear snapshot

**Notification permission:**
- [ ] Fresh install: no notification prompt on Home mount
- [ ] Starting first focus session → permission prompt fires
- [ ] Starting break manually → permission prompt fires if not yet granted
- [ ] Denying permission → timer still works, in-app reward fires, no crash
- [ ] Permission not re-prompted once denied

**Settings toggles:**
- [ ] Sound off → `fireCompletionAlarm` not called
- [ ] Haptics off → no `Haptics.*` calls on session events
- [ ] Keep awake off → `activateKeepAwakeAsync` not called
- [ ] All three toggles persist after app restart
- [ ] Toggling mid-session does not crash
- [ ] Strict Focus Mode row is visible, dimmed, has "Soon" badge, no behavior

---

## What's Next (post-Update 12)

These are not yet planned in detail — candidate ideas only.

| Candidate | Notes |
|---|---|
| Rive companion `.riv` file | The `InteractiveRiveCompanion` component is ready; just needs a `.riv` asset and a dev build |
| Strict Focus Mode | Placeholder in Settings; blocks screen switching during focus sessions |
| iOS support | Managed Expo workflow is already cross-platform; needs splash/icon assets and TestFlight pipeline |
| iCloud / cloud sync | Optional future — not required for v1 |
| Widget (Android) | Shows live timer on home screen; requires Kotlin module or Expo module |
| Play Store submission | See `docs/release-checklist.md` |
