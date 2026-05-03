# Changelog

All notable changes to Focus Buddy are documented here.

This project follows a simple release-notes format:

- **Added** for new features.
- **Changed** for updates to existing behavior.
- **Fixed** for bug fixes.
- **Docs** for documentation-only updates.

## Unreleased

Use this section for changes that are in progress but not ready to publish yet.

### Future Updates

- Consider adding a Rive-powered interactive companion after a production `.riv` asset and animation state machine are ready.

---

## 2026-05-03

### Added

- **Guided break breathing animation** — animated expand/contract circle with "breathe in / breathe out" phase cues shown during break countdown. Replaces the static "Rest and recharge" label. Pauses cleanly when the break is paused.
- **Ambient sounds** — 6 ambient sound options (none, rain, coffee shop, white noise, forest, brown noise) with fade in/out (1.2s / 0.8s), per-sound volume control (25/50/75/100%), play-during-breaks toggle, and silent-mode + background audio support via `expo-av`.
- **Focus insights** — 5 computed insights from session history: most productive day of week, peak time of day, 14-day consistency %, average session length, weekday vs weekend comparison. Shown in Stats when ≥3 sessions exist.
- **Daily companion dialogue** — context-aware speech bubble on the home screen. 8 priority tiers: absence (3+ days / 2 days), low happiness, streak milestones, daily goal hit, one session away from goal, momentum, time-of-day greeting, seeded fallback. 5 stage-specific voices per tier.
- **Share stats card** — "Share" button on Stats opens a modal preview of a styled PNG card (companion stage, streak, sessions, level, focus time) and shares it via the native share sheet using `expo-sharing` + `react-native-view-shot`.
- **20 achievements** — expanded from 6 to 20 across Easy / Medium / Hard / Legendary tiers. Achievements are permanent: once unlocked they stay unlocked even if the underlying metric resets (e.g. streak break).
- **App review prompt** — native `StoreReview.requestReview()` triggered after the 5th completed session.
- **Floating start button** — "Start Focus Session" fixed above the tab bar on the home screen so it is always visible without scrolling.
- **Transition animations** — all timer phases fade in via `FadeIn` / `FadeInDown.springify()` from `react-native-reanimated`.
- **Background timer reliability** — AppState listener stabilised with a `tickRef` so it never re-registers across ticks.

### Changed

- Settings screen updated with Ambient Sound section (sound chips, volume chips, play-during-breaks toggle).
- `settingsStore` bumped to version 3 — adds `ambientSound`, `ambientVolume`, `playAmbientDuringBreak` fields with migration.
- `app.json` updated with `UIBackgroundModes: ['audio']` under iOS and `expo-av` plugin.
- Break screen companion reduced from size 160 → 140 to accommodate breathing animation.
- Floating bar background uses `withAlpha(t.bg, 0.8)` helper instead of raw hex string concat.
- Long break check in recovery handlers extracted into `maybeRecordLongBreak` to remove duplication.
- `OnboardingModal` sub-component theme params typed as `AppTheme` instead of `any`.

### Fixed

- Duplicate `todayFocusMinutes` calculation extracted to `utils/sessionStats.ts` → `getTodayFocusMinutes`.
- Duplicate goal progress calculation extracted to `utils/sessionStats.ts` → `goalProgress`.
- Empty `catch {}` blocks in `useAmbientSound` changed to `catch (_e) {}` to avoid lint noise.
- `withAlpha` color utility added at `utils/color.ts` to replace raw hex opacity concatenation.

### Tests

- Added 112 unit tests across 7 suites: `xp`, `date`, `mood`, `gameLogic`, `achievements`, `insights`, `companionDialogue`.
- Tests cover all utility functions, achievement permanence/thresholds, insight edge cases, and all 8 companion dialogue priority tiers.

## 2026-04-27

### Added

- Added an in-app Privacy Policy screen and a Settings link for publishing readiness.
- Added daily focus goals for target sessions and target focus minutes.
- Added daily goal progress on Home and Stats.
- Added session tags: Work, Study, Reading, Chores, and Deep Work.
- Added tag selection to the focus setup screen.
- Added tag breakdowns in Stats to show where focus time is spent.
- Added achievements for:
  - First completed focus session.
  - 3-day streak.
  - 10 completed sessions.
  - 100 focus minutes.
  - First completed long break.
  - 7 companion pet days.
- Added current-month focus heatmap in Stats.
- Added local date helpers for local-calendar streaks, stats, and session history.
- Added active session duration tracking so timers, recovery, banners, and notifications use one source of truth.
- Added production app icon, splash, and Play Store listing image assets.

### Changed

- Updated Android package and iOS bundle identifier to `com.techbytestudio.focusbuddy`.
- Updated the focus setup screen to support scrolling on smaller devices.
- Hid the bottom tab bar on the focus route so timer controls stay reachable.
- Made running focus and break screens scrollable so Pause, Resume, Cancel, and Skip Break remain accessible.
- Updated session history entries to store session tags.
- Updated reset behavior to include goal preferences.
- Updated README and architecture documentation for goals, tags, achievements, monthly stats, and privacy policy.
- Removed the unfinished Rive dependency from the release build until the companion animation asset is ready.

### Fixed

- Fixed focus completion recovery double-counting by clearing completed focus snapshots after reward/stat recording.
- Fixed long-break banner and notification duration by using the active session duration.
- Fixed paused timer display so paused recovered timers do not keep shrinking.
- Fixed daily stats, streaks, decay, pet limits, and charts to use local calendar dates instead of UTC date slices.
- Fixed recovery reward modal task display after recovery state is cleared.

### Tests

- Added tests for local date helpers.
- Added tests for monthly stats aggregation.
- Added tests for session tag aggregation.

## Release Notes Template

Use this shorter format for Google Play release notes:

```text
What's new:
- Added daily focus goals and progress tracking.
- Added session tags and tag-based stats.
- Added achievements for focus milestones and companion care.
- Added a monthly focus heatmap.
- Improved focus screen layout on smaller phones.
- Added an in-app privacy policy.
- Fixed timer recovery and local-date tracking issues.
```

## Release Process

1. Add new work under `Unreleased` while developing.
2. Move finished work into a dated section, for example `## 2026-04-27`.
3. When publishing, optionally rename the dated section to include the app version, for example `## 1.1.0 - 2026-04-27`.
4. Keep Google Play notes short and user-facing.
5. Keep technical implementation details in this file.
6. Update `app.json` version and Android `versionCode` for store releases.
7. Tag the release in Git after publishing.
