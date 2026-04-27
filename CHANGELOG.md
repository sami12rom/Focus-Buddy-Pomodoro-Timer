# Changelog

All notable changes to Loopling are documented here.

This project follows a simple release-notes format:

- **Added** for new features.
- **Changed** for updates to existing behavior.
- **Fixed** for bug fixes.
- **Docs** for documentation-only updates.

## Unreleased

Use this section for changes that are in progress but not ready to publish yet.

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

### Changed

- Updated the focus setup screen to support scrolling on smaller devices.
- Hid the bottom tab bar on the focus route so timer controls stay reachable.
- Made running focus and break screens scrollable so Pause, Resume, Cancel, and Skip Break remain accessible.
- Updated session history entries to store session tags.
- Updated reset behavior to include goal preferences.
- Updated README and architecture documentation for goals, tags, achievements, monthly stats, and privacy policy.

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
