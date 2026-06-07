jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { useSessionStore, type ActiveSessionSnapshot } from '../../store/sessionStore';

const START_TIME = 1_000_000;

function store() {
  return useSessionStore.getState();
}

function restoreSnapshot(snapshot: ActiveSessionSnapshot) {
  useSessionStore.setState({
    activeSessionSnapshot: snapshot,
  });
  store().resumeFromSnapshot();
}

function snapshot(
  type: 'focus' | 'break',
  status: 'running' | 'paused',
): ActiveSessionSnapshot {
  return {
    type,
    status,
    startedAt: START_TIME,
    durationMs: type === 'focus' ? 25 * 60_000 : 5 * 60_000,
    totalPausedMs: 30_000,
    pausedAt: status === 'paused' ? START_TIME + 60_000 : null,
    task: 'Prepare presentation',
    tag: 'Deep Work',
    createdAt: new Date(START_TIME).toISOString(),
    isLongBreak: type === 'break',
  };
}

describe('sessionStore central lifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(START_TIME);
    store().resetToDefaults();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts focus with the selected duration and a complete recovery snapshot', () => {
    store().setFocusMinutes(45);
    store().setCurrentTask('Write proposal');
    store().setCurrentTag('Work');

    store().startFocus();

    expect(store()).toMatchObject({
      status: 'running',
      startTime: START_TIME,
      pausedAt: null,
      totalPausedMs: 0,
      activeDurationMs: 45 * 60_000,
      currentTask: 'Write proposal',
      currentTag: 'Work',
    });
    expect(store().activeSessionSnapshot).toMatchObject({
      type: 'focus',
      status: 'running',
      startedAt: START_TIME,
      durationMs: 45 * 60_000,
      totalPausedMs: 0,
      pausedAt: null,
      task: 'Write proposal',
      tag: 'Work',
      isLongBreak: false,
    });
  });

  it('pauses and resumes focus while preserving elapsed paused time in the snapshot', () => {
    store().startFocus();
    jest.setSystemTime(START_TIME + 60_000);
    store().pauseFocus();

    expect(store().status).toBe('paused');
    expect(store().pausedAt).toBe(START_TIME + 60_000);
    expect(store().activeSessionSnapshot).toMatchObject({
      status: 'paused',
      pausedAt: START_TIME + 60_000,
    });

    jest.setSystemTime(START_TIME + 90_000);
    store().resumeFocus();

    expect(store()).toMatchObject({
      status: 'running',
      pausedAt: null,
      totalPausedMs: 30_000,
    });
    expect(store().activeSessionSnapshot).toMatchObject({
      status: 'running',
      pausedAt: null,
      totalPausedMs: 30_000,
    });
  });

  it('extends active focus duration in both transient state and the persisted snapshot', () => {
    store().startFocus();
    store().extendFocusByMinutes(10);

    expect(store().activeDurationMs).toBe(35 * 60_000);
    expect(store().activeSessionSnapshot?.durationMs).toBe(35 * 60_000);

    store().pauseFocus();
    store().extendFocusByMinutes(5);

    expect(store().activeDurationMs).toBe(40 * 60_000);
    expect(store().activeSessionSnapshot?.durationMs).toBe(40 * 60_000);
  });

  it('starts, pauses, and resumes a break with snapshot state kept in sync', () => {
    store().setBreakMinutes(7);
    const durationMs = store().startBreak(true);

    expect(durationMs).toBe(7 * 60_000);
    expect(store()).toMatchObject({
      status: 'break_running',
      activeDurationMs: 7 * 60_000,
      isCurrentBreakLong: false,
    });

    jest.setSystemTime(START_TIME + 60_000);
    store().pauseBreak();
    expect(store().activeSessionSnapshot).toMatchObject({
      type: 'break',
      status: 'paused',
      pausedAt: START_TIME + 60_000,
    });

    jest.setSystemTime(START_TIME + 90_000);
    store().resumeBreak();
    expect(store()).toMatchObject({
      status: 'break_running',
      pausedAt: null,
      totalPausedMs: 30_000,
    });
    expect(store().activeSessionSnapshot).toMatchObject({
      status: 'running',
      pausedAt: null,
      totalPausedMs: 30_000,
    });
  });

  it('reset clears all transient session state and the recovery snapshot', () => {
    store().setFocusMinutes(45);
    store().startFocus();
    store().markSessionRecovered();

    store().reset();

    expect(store()).toMatchObject({
      status: 'idle',
      startTime: null,
      pausedAt: null,
      totalPausedMs: 0,
      activeDurationMs: null,
      breakInteracted: false,
      recoveredInSession: false,
      currentTask: '',
      completedFocusesInCycle: 0,
      isCurrentBreakLong: false,
      activeSessionSnapshot: null,
      selectedFocusMinutes: 45,
    });
  });

  it.each([
    ['running focus', snapshot('focus', 'running'), 'running'],
    ['paused focus', snapshot('focus', 'paused'), 'paused'],
    ['running break', snapshot('break', 'running'), 'break_running'],
    ['paused break', snapshot('break', 'paused'), 'break_paused'],
  ] as const)('recovers a %s snapshot faithfully', (_label, saved, expectedStatus) => {
    restoreSnapshot(saved);

    expect(store()).toMatchObject({
      status: expectedStatus,
      startTime: saved.startedAt,
      pausedAt: saved.pausedAt,
      totalPausedMs: saved.totalPausedMs,
      activeDurationMs: saved.durationMs,
      currentTask: saved.task,
      currentTag: saved.tag,
    });
    if (saved.type === 'break') {
      expect(store().isCurrentBreakLong).toBe(saved.isLongBreak);
      expect(store().breakInteracted).toBe(false);
    }
  });
});
