// Extracted from useAmbientSound so the debounce + runId logic can be tested
// without React. The hook creates one instance and calls schedule() on every
// sound-selection change; the actual load/unload work runs in the callback.

export class SoundUpdateScheduler {
  private runId = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs: number;
  private readonly onUpdate: (runId: number, isCurrent: () => boolean) => Promise<void>;

  constructor(
    debounceMs: number,
    onUpdate: (runId: number, isCurrent: () => boolean) => Promise<void>,
  ) {
    this.debounceMs = debounceMs;
    this.onUpdate = onUpdate;
  }

  // Call this every time the sound selection changes (e.g. from a useEffect).
  // Increments runId immediately so any in-flight load from the previous call
  // detects it is stale; the actual work runs only after the debounce window.
  schedule(): void {
    const runId = ++this.runId;
    if (this.timer !== null) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      this.onUpdate(runId, () => this.runId === runId);
    }, this.debounceMs);
  }

  // Cancel any pending update (call from useEffect cleanup).
  cancel(): void {
    this.runId += 1;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  // Exposed for tests only — current runId value.
  get currentRunId(): number {
    return this.runId;
  }
}
