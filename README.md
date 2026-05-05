# Focus Buddy

**Focus with a companion that grows with you.**

A gamified Pomodoro timer for iOS and Android where a virtual companion evolves through completed focus sessions. Every session earns XP, raises happiness, and pushes your companion toward the next evolution stage — turning a productivity habit into an emotional ritual.

---

## Features

- **Pomodoro timer** — configurable focus and break durations via preset chips and stepper controls
- **Evolving companion** — 5 custom PNG evolution stages (Egg → Hatchling → Baby → Teen → Adult) driven by XP and level
- **Automatic Pomodoro loop** — break starts automatically after focus completes; long break triggers after every 4th session
- **Session history** — last 100 completed sessions stored; 7-day bar chart and recent list in Stats
- **Daily focus goals** — configurable session and minute targets with progress on Home and Stats
- **Session tags** — categorize sessions as Work, Study, Reading, Chores, or Deep Work
- **Achievements** — milestones for first session, streaks, total sessions, focus time, long breaks, and care
- **Monthly heatmap** — current-month focus calendar for consistency tracking
- **Companion care** — daily pet interaction, happiness decay if you miss a day, onboarding naming screen
- **Session recovery** — app-kill mid-session is detected on relaunch with resume / mark-complete options
- **Session banner** — live countdown visible on Home and Stats while a session runs in the background
- **4 themes** — Cosmic Night, Kawaii Dusk, Ember Dark, Retro Pixel; persisted per user
- **Behavior toggles** — Sound, Haptics, Keep Awake; individually toggleable in Settings
- **Circular SVG timer** — progress ring with companion inside during focus running phase
- **Final-minute focus extension** — optional +5 / +10 minute prompt appears near the end of focus while the timer keeps running
- **Guided break breathing** — animated expand/contract circle with synced "breathe in", hold, "breathe out", and rest cues plus companion guidance
- **Ambient sound mixing** — layer up to 2 ambient sounds at once (rain, coffee, white noise, forest, brown noise) with fade in/out, volume balancing, and optional play-during-breaks toggle
- **Landscape focus layout** — compact active-session landscape view with smaller timer, denser controls, and a modal sound picker
- **Autocorrected focus intention** — task input enables native autocorrect, spellcheck, and sentence capitalization where supported
- **Focus insights** — most productive day, peak focus time, 14-day consistency %, average session length, weekday vs weekend comparison
- **Share stats card** — shareable PNG card with companion stage, streak, sessions, level, and focus time
- **Daily companion dialogue** — context-aware speech bubble messages (absence, happiness, streak milestones, goal progress, time-of-day greetings)
- **20 achievements** — across Easy / Medium / Hard / Legendary tiers; permanently unlocked even if streak resets
- **App review prompt** — native review sheet triggered after the 5th completed session

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
| Audio | expo-av |
| Sharing | expo-sharing + react-native-view-shot |
| Store review | expo-store-review |
| Testing | Jest 29 + jest-expo (112 tests) |

---

## Project Structure

```
app/
  _layout.tsx          — Root layout: tabs, theme-aware tab bar, Android notification channel
  focus.tsx            — Full-screen timer: setup, focus running, final-minute extension prompt, break running phases
  (tabs)/
    index.tsx          — Home: companion, speech bubble, XP bar, daily goals, recovery modal
    stats.tsx          — Stats: summary, insights, goals, 7-day chart, heatmap, achievements, history, share
    settings.tsx       — Settings: themes, behavior toggles, ambient sound, daily goals, long break
  privacy.tsx          — In-app privacy policy

components/
  CompanionView.tsx      — Animated PNG companion (5 evolution stages, bounce/tap animations)
  CircularTimer.tsx      — SVG ring progress timer with companion inside
  DrumPicker.tsx         — Legacy scrollable drum-roll number picker
  TimerDisplay.tsx       — MM:SS text display
  XPBar.tsx              — XP progress bar with level labels
  MoodBadge.tsx          — Happiness emoji badge (happy / neutral / tired)
  SessionBanner.tsx      — Live countdown banner shown on Home/Stats during active session
  BreathingAnimation.tsx — Four-phase expand/hold/contract/rest breathing cue during breaks
  ShareStatsCard.tsx     — Fixed-style PNG card used for the share feature
  RewardModal.tsx        — Post-focus reward sheet (XP gained, level-up, evolution)
  BreakEndModal.tsx      — Post-break choice: start next focus or finish for now
  RecoveryModal.tsx      — Recovery prompt on relaunch after app killed mid-session
  OnboardingModal.tsx    — First-launch 3-step flow: intro, name companion, set daily goal

store/
  companionStore.ts      — Name, level, XP, happiness, evolution stage, pet history, onboarding flag
  statsStore.ts          — Total sessions, streak, best streak, focus minutes, unlocked achievements
  sessionStore.ts        — Timer status, durations, cycle counter, active session snapshot
  sessionHistoryStore.ts — Last 100 completed sessions (date, task, tag, duration)
  settingsStore.ts       — Sound, haptics, keep-awake, auto-start break, ambient sound layers + volume
  themeStore.ts          — Active theme ID
  goalStore.ts           — Daily session goal and daily minute goal

constants/
  app.ts         — APP_NAME, APP_TAGLINE
  colors.ts      — 4 themes + AppTheme type
  game.ts        — All numeric game constants (XP, happiness, thresholds, decay)
  sounds.ts      — 6 ambient sound definitions (id, label, icon, uri)
  sessionTags.ts — 5 session tag values + default

hooks/
  useTheme.ts        — Returns active AppTheme from themeStore
  useTimer.ts        — Wall-clock timer (Date.now() − startedAt − pausedMs); AppState sync
  useAmbientSound.ts — Loads, mixes, fades, and unloads ambient audio layers via expo-av; guards against pause/resume audio races

assets/
  buddy/        — 5 transparent PNG companion evolution stage assets
  sounds/       — Ambient sound MP3 files
  images/       — App icon and splash/adaptive image assets
  store/        — Store listing artwork

utils/
  achievements.ts    — 20 achievement definitions with permanence via unlockedIds
  companionDialogue.ts — 8-priority-tier dialogue messages with 5 stage voices each
  color.ts           — withAlpha(hex, alpha) helper
  date.ts            — getLocalDateKey, addDaysToLocalDateKey, getDaysInMonth
  gameLogic.ts       — Streak, decay, pet limit, 7-day chart, month grid, tag totals
  insights.ts        — 5 focus insights computed from session history
  mood.ts            — Happiness → Mood type + emoji/label maps
  notifications.ts   — Schedule, cancel, and fire local notifications
  resetAppData.ts    — Calls resetToDefaults() on all stores
  sessionStats.ts    — getTodayFocusMinutes, goalProgress (shared between Home + Stats)
  xp.ts              — getLevelForXP, getEvolutionStage, isMaxLevel
  __tests__/         — 112 unit tests across 7 suites
```

---

## Running Locally

```bash
npm install
npx expo start --android
```

---

## Testing

```bash
npm test
```

112 tests across 7 suites covering: XP/level progression, evolution stage thresholds, date arithmetic, mood boundaries, streak logic, happiness decay, pet limits, elapsed time, tag totals, achievement unlocking and permanence, focus insights edge cases, and all 8 companion dialogue priority tiers.

---

## Key Design Decisions

**Wall-clock timer** — remaining time is always computed as `DURATION − (Date.now() − startedAt − totalPausedMs)`, not by decrementing a stored counter. This keeps the timer accurate across pause/resume, backgrounding, and app kills.

**Session recovery** — `activeSessionSnapshot` is written to AsyncStorage on every timer state change. On relaunch, the app detects a stale snapshot and offers recovery options.

**Pomodoro cycle** — the cycle counter is transient (resets on each launch). Only the snapshot survives a kill.

**No external backend** — all data lives in AsyncStorage on device.

**Achievement permanence** — once an achievement is unlocked its ID is stored in `unlockedAchievements`. The `getAchievements` helper checks this array first, so achievements stay unlocked even when the underlying metric resets (e.g. streak breaks back to 0).

**Focus extension** — the active focus screen shows a non-blocking final-minute prompt with +5 / +10 minute actions. Ignoring it lets the session finish normally; extending updates the active duration and notification schedule, and completed stats use the extended duration.

**Ambient audio** — `useAmbientSound` sets `playsInSilentModeIOS: true` and `staysActiveInBackground: true` on mount. It can run up to 2 ambient sound layers at once, balances combined volume with a simple mix gain, and uses 50ms fade ramps to avoid abrupt cuts. Playback sync uses a run guard so quick pause/resume taps cannot let a stale fade-out pause the sound after resume.

**Companion dialogue** — `getCompanionMessage` evaluates 8 priority tiers in order on every home screen focus. The fallback pool uses a day-seeded index so the message is stable throughout the day but changes daily without any server call.

---

## Roadmap

Prioritised by impact and implementation effort. Each phase builds on the previous.

### Field Test Fixes — 2026-05-05
*Notes captured from real focus-session use. These are polish fixes before the next broad release.*

| Area | Issue / Request | Notes |
|------|-----------------|-------|
| Audio | Coffee shop loop ends abruptly, then restarts quietly | Edit or replace the source loop; add a seamless loop point and test the fade so the restart is invisible |
| Audio | Ambient sounds are not matched in loudness | Normalize perceived loudness across all bundled MP3s; keep per-sound gain overrides if needed |
| Break UX | ✅ Breathe in / breathe out feels too quick | Done — breathing now uses four synced phases: breathe in, hold, breathe out, rest |
| Break UX | Add relaxing audio for break time | Consider a separate break-only sound option: breathing guide, soft chime bed, or licensed relaxing music |
| Text input | ✅ Today-focus task input does not autocorrect typos | Done — intention input now enables autocorrect, spellcheck, and sentence capitalization |
| Landscape | ✅ Focus screen requires scrolling | Done — active focus landscape uses a tighter two-column layout with smaller timer text and compact spacing |
| Landscape | ✅ Focus setup screen needs to fit without scrolling | Done — landscape setup uses compact two-column controls with actions inside the right column instead of a bottom bar |
| Landscape | ✅ Sound options look like a horizontal scroll during focus | Done — landscape focus now shows a compact sound summary that opens a modal picker |
| Focus completion | ✅ Focus ends and moves toward break too quickly | Done — final-minute prompt offers +5 min / +10 min while the timer continues normally if ignored |

### Phase 1 — Ship Ready
*Must be done before the first public release. No new features.*

| # | Task | Notes |
|---|------|-------|
| ✅ | ~~Add ambient sound files~~ | Done — 6 MP3s in `assets/sounds/`, wired in `constants/sounds.ts` |
| ✅ | ~~Fix `focusTime` showing blank~~ | Done — `stats.tsx` shows `0m` explicitly |
| 2 | App Store screenshots + description | Include ADHD keywords: "ADHD", "focus", "neurodivergent", "body doubling". No code change needed |
| 3 | First manual Play Store submit | Unlocks the CI/CD API so automated publishing works going forward |

---

### Phase 2 — Quick Wins
*All doable inside the existing codebase. No new native modules. 2–3 days each.*

| # | Feature | Why |
|---|---------|-----|
| ✅ | ~~Pre-session intention UX~~ | Done — companion asks "What are you working on?", task input is primary, tag-specific examples guide the placeholder |
| 6 | **Post-session reflection** | One-line "What did you accomplish?" input in `RewardModal`. Store alongside session history. Low build cost, high perceived value |
| 7 | **CSV data export** | Button in Settings → generate CSV from `sessionHistoryStore` → share via `expo-sharing` (already installed) |
| ✅ | ~~Ambient sound mixing~~ | Done — up to 2 selected sound layers, `None` clears selection, `useAmbientSound` manages multiple `Audio.Sound` instances |

---

### Phase 3 — Medium Features
*New systems but no new platforms or native modules. 1–2 weeks each.*

| # | Feature | Why |
|---|---------|-----|
| 9  | **Home screen widget + Live Activity** | Timer countdown visible without opening the app. Dynamic Island support. Most requested feature across all competing apps |
| 10 | **Task list with Pomodoro estimates** | Create tasks, set estimated session count, link a task to each focus session. Time accumulates against the task. Your session tags are already halfway there |
| 11 | **Lofi / relaxing music** | Add licensed local lofi loops or relaxing break music as sound options. Prefer bundled licensed tracks over an internet stream for reliability and licensing clarity |
| 12 | **Monetization / premium tier** | Define free vs. paid. Recommended: timer + companion free; ambient sounds + app blocking + widgets as Pro. Set up RevenueCat before building Phase 4 features |

---

### Phase 4 — Big Bets
*New platforms, native APIs, or backend infrastructure. 2–4 weeks each.*

| # | Feature | Why |
|---|---------|-----|
| 13 | **App blocking (Screen Time API)** | Lock out distracting apps during focus via iOS `FamilyControls`. The #1 premium feature that makes users pay. Requires a native module — no Expo package exists yet |
| 14 | **iCloud sync + iPad layout** | Sync session history and companion state via CloudKit. Prevents the "I got a new phone and lost everything" 1-star review. Add responsive iPad layout alongside |
| 15 | **Apple Watch app** | Start/stop timer and see countdown on wrist. Multiple apps lose reviews specifically for not having this. Requires a watchOS extension target |
| 16 | **Social / body doubling** | Lightweight anonymous backend (Supabase or Firebase) showing "X people focusing right now". Optionally: friend codes for shared sessions. The fastest-growing focus apps in 2025–26 all have a social layer |

---

### Strategic Notes

- **The pet system is an underexploited moat.** Study Bunny has the highest user sentiment in academic research on gamified focus apps purely because of pet emotional attachment. Focus Buddy's evolution system is more sophisticated, and the pet now appears in the pre-session and break rituals. Bringing the pet further into widgets and stats remains higher leverage than adding generic productivity features.
- **App blocking is the clearest path to monetization.** Without it, the premium offering relies entirely on cosmetic unlocks. Every successfully monetised timer app has app blocking behind the paywall.
- **ADHD positioning costs nothing.** Tiimo won Apple's iPhone App of the Year 2025 on ADHD positioning alone. Focus Buddy's soft gamification and companion are inherently ADHD-friendly. A few App Store keyword and screenshot changes could meaningfully move downloads with zero engineering.
