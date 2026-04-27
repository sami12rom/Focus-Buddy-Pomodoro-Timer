# Loopling – Release Checklist

## Before Every Release

### Code Quality
- [ ] `npx tsc --noEmit` — zero TypeScript errors
- [ ] `npm test` — all 23 unit tests pass
- [ ] No `console.log` / `console.warn` left in production paths

### Functionality (manual smoke test)
- [ ] Onboarding: name a companion, tap "Let's go →", verify home screen shows correct name
- [ ] Home: level, XP bar, happiness, streak all render correctly
- [ ] Start Focus Session — timer counts down, companion animates
- [ ] Pause and Resume focus — timer holds correctly across pause/resume
- [ ] Complete focus session — reward modal shows XP gained; break starts automatically
- [ ] Skip break — BreakEndModal appears with "Start next focus" and "Finish for now"
- [ ] After 4 focus sessions — Long Break is triggered (15 min default)
- [ ] Take a Break from setup screen — starts short break, not long break
- [ ] Cancel focus session — returns to idle setup screen
- [ ] Stats screen — today count, streak, 7-day bar chart, recent sessions list all correct
- [ ] Settings: Sound / Haptics / Keep Awake toggles persist across app restart
- [ ] Settings: Long break duration stepper (−/+) persists
- [ ] Settings: Theme switcher — all 4 themes apply everywhere
- [ ] Settings: Reset App Data — confirmation dialog appears; after confirming, companion resets
- [ ] Session recovery — kill app mid-focus, relaunch → recovery modal offered

### Android-Specific
- [ ] Status bar colour matches screen background on all tabs
- [ ] Notifications fire when session ends in background
- [ ] Haptics disabled gracefully on devices that don't support it
- [ ] `adb logcat` shows no crash or unhandled promise rejection

### Build
- [ ] `expo prebuild --clean` completes without errors
- [ ] Release APK / AAB builds successfully
- [ ] Splash screen and icon render correctly on target devices

### App Store / Play Store Metadata
- [ ] App name: "Loopling"
- [ ] Short description updated
- [ ] Screenshots captured from current build
- [ ] Privacy policy URL set (required for Play Store)
- [ ] Content rating questionnaire filled

## Store Version Bump
- [ ] Increment `version` in `app.json`
- [ ] Increment `versionCode` (Android) / `buildNumber` (iOS) in `app.json`
- [ ] Tag the commit: `git tag vX.Y.Z`
