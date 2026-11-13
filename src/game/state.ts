/**
 * Round state and rules. Pure logic: storage and (indirectly) time are
 * injected, so everything runs in Node for tests.
 *
 * Rules (v1 decisions):
 * - 60 s round, 3 lives. Round ends when either runs out.
 * - Villain body +100 x multiplier, head +150 x multiplier.
 * - Citizen hit: -200 points and -1 life.
 * - Miss: streak resets. Streak multiplier = 1 + floor(streak/5), cap 4.
 * - 6-shot magazine, 150 ms cooldown between shots. Reload (1.0 s)
 *   starts automatically when the magazine empties; shots during a
 *   reload are ignored.
 * - A villain that finishes firing costs 1 life.
 */

import { SHOT_DURATION, type Actor, type ActorKind } from './entities';
import { detectHit } from './hit';

export interface Storage {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export const HIGH_SCORE_KEY = 'cross-hair-high-score';

export type Phase = 'title' | 'playing' | 'gameover';

export interface GameState {
  phase: Phase;
  score: number;
  lives: number;
  streak: number;
  ammo: number;
  reloadTimer: number;
  cooldown: number;
  timeLeft: number;
  highScore: number;
}

export type ShotOutcome =
  | { type: 'ignored'; reason: 'not-playing' | 'cooldown' | 'reloading' | 'no-ammo' }
  | { type: 'miss' }
  | { type: 'hit'; actor: Actor; zone: 'head' | 'body'; kind: ActorKind; points: number };

export interface GameOptions {
  roundTime?: number;
  lives?: number;
  magSize?: number;
  reloadTime?: number;
  shotCooldown?: number;
}

export const DEFAULTS = {
  roundTime: 60,
  lives: 3,
  magSize: 6,
  reloadTime: 1.0,
  shotCooldown: 0.15,
};

/** Streak multiplier: 1 + floor(streak/5), capped at 4. */
export function multiplierFor(streak: number): number {
  return Math.min(1 + Math.floor(streak / 5), 4);
}

export class Game {
  readonly state: GameState;
  private readonly storage: Storage;
  private readonly roundTime: number;
  private readonly livesMax: number;
  private readonly magSize: number;
  private readonly reloadTime: number;
  private readonly shotCooldown: number;

  constructor(storage: Storage, opts: GameOptions = {}) {
    this.storage = storage;
    this.roundTime = opts.roundTime ?? DEFAULTS.roundTime;
    this.livesMax = opts.lives ?? DEFAULTS.lives;
    this.magSize = opts.magSize ?? DEFAULTS.magSize;
    this.reloadTime = opts.reloadTime ?? DEFAULTS.reloadTime;
    this.shotCooldown = opts.shotCooldown ?? DEFAULTS.shotCooldown;
    this.state = {
      phase: 'title',
      score: 0,
      lives: this.livesMax,
      streak: 0,
      ammo: this.magSize,
      reloadTimer: 0,
      cooldown: 0,
      timeLeft: this.roundTime,
      highScore: this.loadHighScore(),
    };
  }

  /** Start (or restart) a round: everything resets, phase becomes playing. */
  startRound(): void {
    const s = this.state;
    s.phase = 'playing';
    s.score = 0;
    s.lives = this.livesMax;
    s.streak = 0;
    s.ammo = this.magSize;
    s.reloadTimer = 0;
    s.cooldown = 0;
    s.timeLeft = this.roundTime;
  }

  /**
   * Handle a shot at `point` against the given actors (the state from
   * before this frame's behavior update). Applies scoring, ammo and
   * reload rules; marks a hit actor as `shot`.
   */
  handleShot(
    point: { x: number; y: number },
    actors: readonly Actor[],
  ): ShotOutcome {
    const s = this.state;
    if (s.phase !== 'playing') return { type: 'ignored', reason: 'not-playing' };
    if (s.reloadTimer > 0) return { type: 'ignored', reason: 'reloading' };
    if (s.ammo <= 0) return { type: 'ignored', reason: 'no-ammo' };
    if (s.cooldown > 0) return { type: 'ignored', reason: 'cooldown' };

    s.ammo -= 1;
    s.cooldown = this.shotCooldown;
    if (s.ammo === 0) {
      // Auto-reload starts as soon as the magazine empties.
      s.reloadTimer = this.reloadTime;
    }

    const result = detectHit(point, actors);
    if (!result.hit) {
      s.streak = 0;
      return { type: 'miss' };
    }

    const { actor, zone } = result;
    actor.state = 'shot';
    actor.timer = SHOT_DURATION;

    if (actor.kind === 'citizen') {
      s.score -= 200;
      s.lives -= 1;
      s.streak = 0;
      this.checkGameOver();
      return { type: 'hit', actor, zone, kind: 'citizen', points: -200 };
    }

    const points = (zone === 'head' ? 150 : 100) * multiplierFor(s.streak);
    s.score += points;
    s.streak += 1;
    return { type: 'hit', actor, zone, kind: 'villain', points };
  }

  /** A villain finished exposing and fired: the player loses a life. */
  onVillainFired(): void {
    const s = this.state;
    if (s.phase !== 'playing') return;
    s.lives -= 1;
    s.streak = 0;
    this.checkGameOver();
  }

  /** Advance round timers (time left, cooldown, reload). */
  update(dt: number): void {
    const s = this.state;
    if (s.phase !== 'playing') return;
    if (s.cooldown > 0) s.cooldown = Math.max(0, s.cooldown - dt);
    if (s.reloadTimer > 0) {
      s.reloadTimer -= dt;
      if (s.reloadTimer <= 0) {
        s.reloadTimer = 0;
        s.ammo = this.magSize;
      }
    }
    s.timeLeft -= dt;
    if (s.timeLeft <= 0) {
      s.timeLeft = 0;
      this.endRound();
    }
  }

  private checkGameOver(): void {
    if (this.state.lives <= 0) this.endRound();
  }

  private endRound(): void {
    const s = this.state;
    s.phase = 'gameover';
    if (s.score > s.highScore) {
      s.highScore = s.score;
      this.saveHighScore(s.score);
    }
  }

  private loadHighScore(): number {
    let raw: string | null = null;
    try {
      raw = this.storage.get(HIGH_SCORE_KEY);
    } catch {
      return 0;
    }
    const n = raw === null ? NaN : Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }

  private saveHighScore(value: number): void {
    try {
      this.storage.set(HIGH_SCORE_KEY, String(value));
    } catch {
      // Storage may be unavailable (private mode); ignore.
    }
  }
}
