/**
 * Tests for the "Gentle Restart" feature:
 *   - sessionStore: recoveredInSession flag lifecycle
 *   - sessionHistoryStore: recovered field on history entries
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { useSessionStore } from '../../store/sessionStore';
import { useSessionHistoryStore } from '../../store/sessionHistoryStore';

// ─── helpers ─────────────────────────────────────────────────────────────────

function sessionStore() {
  return useSessionStore.getState();
}

function historyStore() {
  return useSessionHistoryStore.getState();
}

// ─── sessionStore — recoveredInSession flag ───────────────────────────────────

describe('sessionStore — recoveredInSession', () => {
  beforeEach(() => {
    sessionStore().resetToDefaults();
  });

  it('starts as false on a fresh store', () => {
    expect(sessionStore().recoveredInSession).toBe(false);
  });

  it('markSessionRecovered sets it to true', () => {
    sessionStore().markSessionRecovered();
    expect(sessionStore().recoveredInSession).toBe(true);
  });

  it('reset() clears the flag back to false', () => {
    sessionStore().markSessionRecovered();
    sessionStore().reset();
    expect(sessionStore().recoveredInSession).toBe(false);
  });

  it('cancelSession() also clears the flag', () => {
    sessionStore().markSessionRecovered();
    sessionStore().cancelSession();
    expect(sessionStore().recoveredInSession).toBe(false);
  });

  it('is not persisted — survives only in memory, not in snapshot', () => {
    // The snapshot (which IS persisted) must not include recoveredInSession
    sessionStore().startFocus();
    sessionStore().markSessionRecovered();
    const snap = sessionStore().activeSessionSnapshot;
    expect(snap).not.toHaveProperty('recoveredInSession');
  });
});

// ─── sessionHistoryStore — recovered field on entries ─────────────────────────

describe('sessionHistoryStore — recovered field', () => {
  beforeEach(() => {
    historyStore().clearHistory();
  });

  it('addEntry without recovered stores the entry without the field', () => {
    historyStore().addEntry({
      date: '2026-06-06',
      task: 'Write tests',
      tag: 'Work',
      durationMinutes: 25,
      completedAt: new Date().toISOString(),
    });
    const entry = historyStore().entries[0];
    expect(entry.recovered).toBeUndefined();
  });

  it('addEntry with recovered: true stores it on the entry', () => {
    historyStore().addEntry({
      date: '2026-06-06',
      task: 'Write tests',
      tag: 'Work',
      durationMinutes: 25,
      completedAt: new Date().toISOString(),
      recovered: true,
    });
    const entry = historyStore().entries[0];
    expect(entry.recovered).toBe(true);
  });

  it('addEntry with recovered: undefined omits the field', () => {
    historyStore().addEntry({
      date: '2026-06-06',
      task: 'Write tests',
      tag: 'Work',
      durationMinutes: 25,
      completedAt: new Date().toISOString(),
      recovered: undefined,
    });
    const entry = historyStore().entries[0];
    expect(entry.recovered).toBeUndefined();
  });

  it('non-recovered entries are not affected by recovered ones in the list', () => {
    historyStore().addEntry({
      date: '2026-06-06',
      task: 'Session A',
      tag: 'Study',
      durationMinutes: 25,
      completedAt: new Date().toISOString(),
      recovered: true,
    });
    historyStore().addEntry({
      date: '2026-06-06',
      task: 'Session B',
      tag: 'Study',
      durationMinutes: 25,
      completedAt: new Date().toISOString(),
    });
    // Newest first
    const [b, a] = historyStore().entries;
    expect(b.task).toBe('Session B');
    expect(b.recovered).toBeUndefined();
    expect(a.task).toBe('Session A');
    expect(a.recovered).toBe(true);
  });
});

// ─── handleGentleRestart logic — pure unit test ───────────────────────────────
//
// The actual handler lives in focus.tsx (a React component) so we test the
// underlying store interactions that the handler performs, not the component.

describe('Gentle Restart — store interaction sequence', () => {
  beforeEach(() => {
    sessionStore().resetToDefaults();
  });

  it('tapping while running only marks recovery — does not pause', () => {
    sessionStore().startFocus();
    expect(sessionStore().status).toBe('running');

    // Simulate handleGentleRestart when timer is running:
    //   markSessionRecovered() + no resume call needed
    sessionStore().markSessionRecovered();

    expect(sessionStore().recoveredInSession).toBe(true);
    expect(sessionStore().status).toBe('running'); // still running, not paused
  });

  it('tapping while paused marks recovery AND resumes the timer', () => {
    sessionStore().startFocus();
    sessionStore().pauseFocus();
    expect(sessionStore().status).toBe('paused');

    // Simulate handleGentleRestart when timer is paused:
    //   markSessionRecovered() + resumeFocus()
    sessionStore().markSessionRecovered();
    sessionStore().resumeFocus();

    expect(sessionStore().recoveredInSession).toBe(true);
    expect(sessionStore().status).toBe('running');
  });

  it('a session flagged as recovered stores that in history when completed', () => {
    historyStore().clearHistory();
    sessionStore().startFocus();
    sessionStore().markSessionRecovered();

    // Simulate handleFocusComplete recording the entry
    const recovered = sessionStore().recoveredInSession || undefined;
    historyStore().addEntry({
      date: '2026-06-06',
      task: 'Focus session',
      tag: 'Work',
      durationMinutes: 25,
      completedAt: new Date().toISOString(),
      recovered,
    });

    expect(historyStore().entries[0].recovered).toBe(true);
  });

  it('a session that was never recovered stores undefined in history', () => {
    historyStore().clearHistory();
    sessionStore().startFocus();

    const recovered = sessionStore().recoveredInSession || undefined;
    historyStore().addEntry({
      date: '2026-06-06',
      task: 'Clean session',
      tag: 'Work',
      durationMinutes: 25,
      completedAt: new Date().toISOString(),
      recovered,
    });

    expect(historyStore().entries[0].recovered).toBeUndefined();
  });
});
