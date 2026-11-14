import { beforeEach, describe, expect, it } from 'vitest';
import { createActor, resetActorIds, updateHitboxes, type Actor } from './entities';
import { Game, HIGH_SCORE_KEY, multiplierFor, type Storage } from './state';

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  set(key: string, value: string): void {
    this.map.set(key, value);
  }
}

function makeGame(storage: Storage = new MemoryStorage()): Game {
  return new Game(storage);
}

function exposedVillain(): Actor {
  const a = createActor('villain', 2);
  a.exposureTime = 2;
  a.state = 'exposed';
  a.y = a.feetY;
  updateHitboxes(a);
  return a;
}

function exposedCitizen(): Actor {
  const a = createActor('citizen', 2);
  a.exposureTime = 2;
  a.state = 'exposed';
  a.y = a.feetY;
  updateHitboxes(a);
  return a;
}

function headPoint(a: Actor): { x: number; y: number } {
  return { x: a.hitboxHead.x + a.hitboxHead.w / 2, y: a.hitboxHead.y + a.hitboxHead.h / 2 };
}
function bodyPoint(a: Actor): { x: number; y: number } {
  return { x: a.hitboxBody.x + a.hitboxBody.w / 2, y: a.hitboxBody.y + a.hitboxBody.h / 2 };
}

describe('multiplierFor', () => {
  it('is 1 + floor(streak/5), capped at 4', () => {
    expect(multiplierFor(0)).toBe(1);
    expect(multiplierFor(4)).toBe(1);
    expect(multiplierFor(5)).toBe(2);
    expect(multiplierFor(14)).toBe(3);
    expect(multiplierFor(15)).toBe(4);
    expect(multiplierFor(100)).toBe(4);
  });
});

describe('Game scoring', () => {
  beforeEach(() => resetActorIds());

  it('scores a villain body hit +100 and starts the streak', () => {
    const g = makeGame();
    g.startRound();
    const a = exposedVillain();
    const r = g.handleShot(bodyPoint(a), [a]);
    expect(r).toMatchObject({ type: 'hit', zone: 'body', kind: 'villain', points: 100 });
    expect(g.state.score).toBe(100);
    expect(g.state.streak).toBe(1);
    expect(a.state).toBe('shot');
  });

  it('scores a villain headshot +150', () => {
    const g = makeGame();
    g.startRound();
    const a = exposedVillain();
    const r = g.handleShot(headPoint(a), [a]);
    expect(r).toMatchObject({ type: 'hit', zone: 'head', points: 150 });
    expect(g.state.score).toBe(150);
  });

  it('applies the streak multiplier to later hits', () => {
    const g = makeGame();
    g.startRound();
    for (let i = 0; i < 5; i++) {
      const a = exposedVillain();
      g.handleShot(bodyPoint(a), [a]);
      g.update(0.2); // clear cooldown
    }
    expect(g.state.streak).toBe(5);
    const a = exposedVillain();
    const r = g.handleShot(bodyPoint(a), [a]);
    expect(r).toMatchObject({ type: 'hit', points: 200 }); // 100 x2
    expect(g.state.score).toBe(500 + 200);
  });

  it('penalizes a citizen hit: -200 and -1 life, streak reset', () => {
    const g = makeGame();
    g.startRound();
    // Build a streak first.
    const v = exposedVillain();
    g.handleShot(bodyPoint(v), [v]);
    expect(g.state.streak).toBe(1);
    g.update(0.2); // clear cooldown

    const c = exposedCitizen();
    const r = g.handleShot(bodyPoint(c), [c]);
    expect(r).toMatchObject({ type: 'hit', kind: 'citizen', points: -200 });
    expect(g.state.score).toBe(100 - 200);
    expect(g.state.lives).toBe(2);
    expect(g.state.streak).toBe(0);
  });

  it('resets the streak on a miss', () => {
    const g = makeGame();
    g.startRound();
    const v = exposedVillain();
    g.handleShot(bodyPoint(v), [v]);
    g.update(0.2);
    g.handleShot({ x: 5, y: 520 }, []); // empty street: miss
    expect(g.state.streak).toBe(0);
    expect(g.state.score).toBe(100);
  });

  it('marks the hit actor as shot with the shot timer', () => {
    const g = makeGame();
    g.startRound();
    const a = exposedVillain();
    g.handleShot(headPoint(a), [a]);
    expect(a.state).toBe('shot');
    expect(a.timer).toBeGreaterThan(0);
    expect(a.timer).toBeLessThanOrEqual(0.35);
  });
});

describe('Game ammo and reload', () => {
  beforeEach(() => resetActorIds());

  it('spends one round per shot', () => {
    const g = makeGame();
    g.startRound();
    g.handleShot({ x: 5, y: 520 }, []);
    expect(g.state.ammo).toBe(5);
  });

  it('ignores shots during the cooldown', () => {
    const g = makeGame();
    g.startRound();
    const first = g.handleShot({ x: 5, y: 520 }, []);
    const second = g.handleShot({ x: 5, y: 520 }, []);
    expect(first.type).toBe('miss');
    expect(second).toEqual({ type: 'ignored', reason: 'cooldown' });
    expect(g.state.ammo).toBe(5);
  });

  it('auto-reloads when the magazine empties and ignores shots meanwhile', () => {
    const g = makeGame();
    g.startRound();
    for (let i = 0; i < 6; i++) {
      const r = g.handleShot({ x: 5, y: 520 }, []);
      expect(r.type === 'miss' || r.type === 'ignored').toBe(true);
      if (i < 5) g.update(0.2); // clear cooldown between shots
    }
    expect(g.state.ammo).toBe(0);
    expect(g.state.reloadTimer).toBeCloseTo(1.0, 6);

    const during = g.handleShot({ x: 5, y: 520 }, []);
    expect(during).toEqual({ type: 'ignored', reason: 'reloading' });

    g.update(1.0);
    expect(g.state.reloadTimer).toBe(0);
    expect(g.state.ammo).toBe(6);
  });

  it('ignores shots on the title and game-over screens', () => {
    const g = makeGame();
    expect(g.handleShot({ x: 5, y: 520 }, [])).toEqual({
      type: 'ignored',
      reason: 'not-playing',
    });
  });
});

describe('Game over and restart', () => {
  beforeEach(() => resetActorIds());

  it('ends the round when lives run out via citizen hits', () => {
    const g = makeGame();
    g.startRound();
    for (let i = 0; i < 3; i++) {
      const c = exposedCitizen();
      g.handleShot(bodyPoint(c), [c]);
      g.update(0.2);
    }
    expect(g.state.lives).toBe(0);
    expect(g.state.phase).toBe('gameover');
  });

  it('ends the round when villains fire three times', () => {
    const g = makeGame();
    g.startRound();
    g.onVillainFired();
    g.onVillainFired();
    g.onVillainFired();
    expect(g.state.lives).toBe(0);
    expect(g.state.phase).toBe('gameover');
  });

  it('ends the round when the timer expires', () => {
    const g = makeGame();
    g.startRound();
    g.update(60);
    expect(g.state.timeLeft).toBe(0);
    expect(g.state.phase).toBe('gameover');
  });

  it('ignores villain-fired events after the round ends', () => {
    const g = makeGame();
    g.startRound();
    g.onVillainFired();
    g.onVillainFired();
    g.onVillainFired(); // lives 0 -> gameover
    g.onVillainFired(); // must not go negative / must be ignored
    expect(g.state.lives).toBe(0);
    expect(g.state.phase).toBe('gameover');
  });

  it('restart resets score, lives, ammo, streak and timer', () => {
    const g = makeGame();
    g.startRound();
    const v = exposedVillain();
    g.handleShot(bodyPoint(v), [v]);
    g.onVillainFired();
    g.onVillainFired();
    g.onVillainFired();
    expect(g.state.phase).toBe('gameover');

    g.startRound();
    expect(g.state.phase).toBe('playing');
    expect(g.state.score).toBe(0);
    expect(g.state.lives).toBe(3);
    expect(g.state.streak).toBe(0);
    expect(g.state.ammo).toBe(6);
    expect(g.state.reloadTimer).toBe(0);
    expect(g.state.timeLeft).toBe(60);
  });
});

describe('High score persistence', () => {
  beforeEach(() => resetActorIds());

  it('saves a new high score at game over', () => {
    const storage = new MemoryStorage();
    const g = makeGame(storage);
    g.startRound();
    const v = exposedVillain();
    g.handleShot(bodyPoint(v), [v]);
    g.update(60);
    expect(g.state.phase).toBe('gameover');
    expect(storage.get(HIGH_SCORE_KEY)).toBe('100');
    expect(g.state.highScore).toBe(100);
  });

  it('does not overwrite the high score with a lower result', () => {
    const storage = new MemoryStorage();
    storage.set(HIGH_SCORE_KEY, '500');
    const g = makeGame(storage);
    expect(g.state.highScore).toBe(500);
    g.startRound();
    g.update(60);
    expect(storage.get(HIGH_SCORE_KEY)).toBe('500');
    expect(g.state.highScore).toBe(500);
  });

  it('carries the high score into a new Game instance', () => {
    const storage = new MemoryStorage();
    storage.set(HIGH_SCORE_KEY, '420');
    const g = makeGame(storage);
    expect(g.state.highScore).toBe(420);
  });

  it('treats corrupt storage values as no high score', () => {
    const storage = new MemoryStorage();
    storage.set(HIGH_SCORE_KEY, 'not-a-number');
    const g = makeGame(storage);
    expect(g.state.highScore).toBe(0);
  });
});
