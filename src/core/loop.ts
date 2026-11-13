/**
 * Fixed-timestep game loop with a separate render callback.
 *
 * - Logic steps at a fixed `step` (default 1/60 s) via an accumulator.
 * - Per-frame wall-clock delta is clamped to `maxFrame` (default 50 ms)
 *   so a hiccup never triggers a burst of updates.
 * - When the tab becomes visible again after being hidden, the last
 *   timestamp and the accumulator are reset so the pause does not
 *   replay as a burst of updates.
 */

export interface LoopCallbacks {
  update(dt: number): void;
  render(): void;
}

export interface LoopOptions {
  step?: number;
  maxFrame?: number;
  requestFrame?: (cb: (time: number) => void) => number;
  now?: () => number;
}

export class GameLoop {
  private readonly cb: LoopCallbacks;
  private readonly step: number;
  private readonly maxFrame: number;
  private readonly requestFrame: (cb: (time: number) => void) => number;
  private readonly now: () => number;
  private running = false;
  private last: number | null = null;
  private accumulator = 0;

  constructor(cb: LoopCallbacks, opts: LoopOptions = {}) {
    this.cb = cb;
    this.step = opts.step ?? 1 / 60;
    this.maxFrame = opts.maxFrame ?? 0.05;
    this.requestFrame = opts.requestFrame ?? ((frame) => requestAnimationFrame(frame));
    this.now = opts.now ?? (() => performance.now());

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', () => {
        // Both directions: drop accumulated time so resuming never
        // replays the paused period as a burst of updates.
        this.resetTiming();
      });
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.resetTiming();
    this.schedule();
  }

  stop(): void {
    // The pending rAF callback checks `running` and does not reschedule.
    this.running = false;
  }

  /** Drop accumulated wall-clock time; called on tab visibility changes. */
  resetTiming(): void {
    this.last = null;
    this.accumulator = 0;
  }

  private schedule(): void {
    this.requestFrame(this.frame);
  }

  private frame = (): void => {
    if (!this.running) return;
    const now = this.now();
    if (this.last === null) this.last = now;
    let delta = (now - this.last) / 1000;
    this.last = now;
    if (delta > this.maxFrame) delta = this.maxFrame;
    if (delta < 0) delta = 0;

    this.accumulator += delta;
    while (this.accumulator >= this.step) {
      this.cb.update(this.step);
      this.accumulator -= this.step;
    }
    this.cb.render();
    this.schedule();
  };
}
