/**
 * Actor spawner. Injected RNG for choices and injected time (elapsed
 * round seconds) for the difficulty curve. Pure logic, no canvas/DOM.
 */

import { Rng } from '../core/rng';
import { createActor, isAlive, type Actor } from './entities';
import { DOORS } from './levelLayout';

export const MAX_CONCURRENT = 3;
export const VILLAIN_PROBABILITY = 0.65;
export const SPAWN_INTERVAL_START = 1.5;
export const SPAWN_INTERVAL_END = 0.6;
export const EXPOSURE_START = 2.0;
export const EXPOSURE_END = 0.9;

const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export interface SpawnerOptions {
  rng: Rng;
  /** Elapsed round time in seconds. */
  getTime: () => number;
  /** Round duration used to normalize the difficulty curve. */
  roundDuration?: number;
  /** Initial delay before the first spawn. */
  initialDelay?: number;
}

export class Spawner {
  private readonly rng: Rng;
  private readonly getTime: () => number;
  private readonly roundDuration: number;
  private timer: number;

  constructor(opts: SpawnerOptions) {
    this.rng = opts.rng;
    this.getTime = opts.getTime;
    this.roundDuration = opts.roundDuration ?? 60;
    this.timer = opts.initialDelay ?? 0.9;
  }

  /** Difficulty progress: 0 at round start, 1 at round end. */
  progress(): number {
    return clamp01(this.getTime() / this.roundDuration);
  }

  /** Seconds between spawns; shrinks 1.5 -> 0.6 over the round. */
  currentInterval(): number {
    return lerp(SPAWN_INTERVAL_START, SPAWN_INTERVAL_END, this.progress());
  }

  /** Seconds an actor stays exposed; shrinks 2.0 -> 0.9 over the round. */
  currentExposure(): number {
    return lerp(EXPOSURE_START, EXPOSURE_END, this.progress());
  }

  /**
   * Advance the spawn timer. Returns a new actor to add to the world,
   * or null (cap reached, no free door, or timer not expired).
   */
  update(dt: number, actors: readonly Actor[]): Actor | null {
    this.timer -= dt;
    if (this.timer > 0) return null;
    this.timer += this.currentInterval();
    return this.trySpawn(actors);
  }

  /** Attempt one spawn; returns null if the cap is hit or no door is free. */
  trySpawn(actors: readonly Actor[]): Actor | null {
    const active = actors.filter(isAlive);
    if (active.length >= MAX_CONCURRENT) return null;

    const occupied = new Set(active.map((a) => a.doorIndex));
    const free: number[] = [];
    for (let i = 0; i < DOORS.length; i++) {
      if (!occupied.has(i)) free.push(i);
    }
    if (free.length === 0) return null;

    const doorIndex = this.rng.pick(free);
    const kind = this.rng.next() < VILLAIN_PROBABILITY ? 'villain' : 'citizen';
    const actor = createActor(kind, doorIndex);
    actor.exposureTime = this.currentExposure();
    return actor;
  }

  /** Reset the timer (round restart). */
  reset(initialDelay = 0.9): void {
    this.timer = initialDelay;
  }
}
