# Focus Buddy – Release Checklist

## Before Every Release

### Code Quality
- [ ] `npx tsc --noEmit` — zero TypeScript errors
- [ ] `npm test -- --runInBand` — all 112 unit tests pass
- [ ] `npx expo-doctor` — all checks pass
- [ ] No `console.log` / `console.warn` left in production paths

### Functionality (manual smoke test)
- [ ] Onboarding: name a companion, tap "Let's go →", verify home screen shows correct name
- [ ] Home: level, XP bar, happiness, streak all render correctly
- [ ] Home: daily focus goal progress renders correctly for session and minute goals
- [ ] Start Focus Session — timer counts down, companion animates
- [ ] Session setup: task text and session tags (Work, Study, Reading, Chores, Deep Work) can be selected
- [ ] Pause and Resume focus — timer holds correctly across pause/resume
- [ ] Complete focus session — reward modal shows XP gained; task/tag are saved; break starts automatically
- [ ] Skip break — BreakEndModal appears with "Start next focus" and "Finish for now"
- [ ] After 4 focus sessions — Long Break is triggered (15 min default)
- [ ] Take a Break from setup screen — starts short break, not long break
- [ ] Cancel focus session — returns to idle setup screen
- [ ] Stats screen — today count, streak, 7-day bar chart, recent sessions list all correct
- [ ] Stats screen — daily goal progress, tag totals, achievements, and monthly heatmap all render correctly
- [ ] Achievements unlock after completing the matching milestones
- [ ] Privacy Policy screen opens from Settings and matches `docs/privacy-policy.md`
- [ ] Settings: Sound / Haptics / Keep Awake toggles persist across app restart
- [ ] Ambient audio: coffee loop restart is invisible; all bundled sounds feel matched at the same volume
- [ ] Settings: Long break duration stepper (−/+) persists
- [ ] Settings: Theme switcher — all 4 themes apply everywhere
- [ ] Settings: Reset App Data — confirmation dialog appears; after confirming, companion resets
- [ ] Session recovery — kill app mid-focus, relaunch → recovery modal offered

### Android-Specific
- [ ] Status bar colour matches screen background on all tabs
- [ ] Android notification smoke test: focus-end notification fires while app is backgrounded
- [ ] Android notification smoke test: break-end notification fires while app is backgrounded
- [ ] Haptics disabled gracefully on devices that don't support it
- [ ] `adb logcat` shows no crash or unhandled promise rejection

### Build
- [ ] Production Android AAB builds successfully with `eas build --platform android --profile production`
- [ ] Splash screen and icon render correctly on target devices

### App Store / Play Store Metadata
- [ ] App name: "Focus Buddy"
- [ ] Short description updated
- [ ] Screenshots captured from current build
- [ ] Public privacy policy URL points to `docs/privacy-policy.md` in the public GitHub repository
- [ ] Privacy policy URL set in Play Console
- [ ] Content rating questionnaire filled
- [ ] Data Safety form filled consistently with the local-only privacy policy

## Store Version Bump
- [ ] Increment `version` in `app.json`
- [ ] Increment `versionCode` (Android) / `buildNumber` (iOS) in `app.json`
- [ ] Confirm `eas.json` uses local versioning so the AAB reads `versionCode` from `app.json`
- [ ] Tag the commit: `git tag vX.Y.Z`
