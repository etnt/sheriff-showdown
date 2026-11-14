import { describe, expect, it } from 'vitest';
import { Rng } from '../core/rng';
import {
  EXPOSURE_END,
  EXPOSURE_START,
  MAX_CONCURRENT,
  MAX_WALKERS,
  SPAWN_INTERVAL_END,
  SPAWN_INTERVAL_START,
  VILLAIN_PROBABILITY,
  Spawner,
} from './spawner';
import { createActor, createWalker, isAlive, type Actor } from './entities';
import { DOORS } from './levelLayout';

function fillActors(count: number): Actor[] {
  const out: Actor[] = [];
  for (let i = 0; i < count; i++) {
    out.push(createActor('villain', i));
  }
  return out;
}

describe('Spawner', () => {
  it('spawns into a free door', () => {
    const spawner = new Spawner({ rng: new Rng(1), getTime: () => 0 });
    const a = spawner.trySpawn([]);
    expect(a).not.toBeNull();
    const doorIndex = a!.doorIndex;
    expect(doorIndex).toBeGreaterThanOrEqual(0);
    expect(doorIndex).toBeLessThan(DOORS.length);
    const door = DOORS[doorIndex]!;
    expect(a!.x).toBe(door.x);
    expect(a!.feetY).toBe(door.feetY);
    expect(a!.scale).toBe(door.scale);
  });

  it('never spawns into an occupied door', () => {
    // Occupy doors 0..3, leaving only door 4 free.
    const actors = fillActors(DOORS.length - 1);
    const spawner = new Spawner({ rng: new Rng(7), getTime: () => 0 });
    for (let i = 0; i < 50; i++) {
      const a = spawner.update(1, actors);
      if (a) {
        expect(a.doorIndex).toBe(DOORS.length - 1);
        actors.push(a);
      }
    }
    // Once all doors are occupied, nothing more can spawn.
    const before = actors.length;
    for (let i = 0; i < 50; i++) spawner.update(1, actors);
    expect(actors.length).toBe(before);
  });

  it('returns null when every door is occupied', () => {
    const actors = fillActors(DOORS.length);
    const spawner = new Spawner({ rng: new Rng(2), getTime: () => 0 });
    for (let i = 0; i < 20; i++) {
      expect(spawner.update(1, actors)).toBeNull();
    }
  });

  it('respects the concurrent-actor cap', () => {
    const actors = fillActors(MAX_CONCURRENT); // 3 active, doors free
    const spawner = new Spawner({ rng: new Rng(3), getTime: () => 0 });
    for (let i = 0; i < 20; i++) {
      expect(spawner.update(1, actors)).toBeNull();
    }
    expect(actors.filter(isAlive).length).toBe(MAX_CONCURRENT);
  });

  it('does not count gone actors against the cap or doors', () => {
    const actors = fillActors(MAX_CONCURRENT);
    for (const a of actors) a.state = 'gone';
    const spawner = new Spawner({ rng: new Rng(4), getTime: () => 0 });
    const a = spawner.update(1, actors);
    expect(a).not.toBeNull();
  });

  it('spawns roughly 65% villains under a seeded RNG', () => {
    const spawner = new Spawner({ rng: new Rng(12345), getTime: () => 0 });
    let villains = 0;
    let total = 0;
    for (let i = 0; i < 6000; i++) {
      const a = spawner.update(0.5, []);
      if (a) {
        total++;
        if (a.kind === 'villain') villains++;
      }
    }
    expect(total).toBeGreaterThan(1000);
    const fraction = villains / total;
    expect(fraction).toBeGreaterThan(VILLAIN_PROBABILITY - 0.05);
    expect(fraction).toBeLessThan(VILLAIN_PROBABILITY + 0.05);
  });

  it('shrinks the spawn interval and exposure over the round', () => {
    let t = 0;
    const spawner = new Spawner({ rng: new Rng(5), getTime: () => t, roundDuration: 60 });
    expect(spawner.currentInterval()).toBeCloseTo(SPAWN_INTERVAL_START, 6);
    expect(spawner.currentExposure()).toBeCloseTo(EXPOSURE_START, 6);

    t = 30;
    expect(spawner.currentInterval()).toBeCloseTo((SPAWN_INTERVAL_START + SPAWN_INTERVAL_END) / 2, 6);
    expect(spawner.currentExposure()).toBeCloseTo((EXPOSURE_START + EXPOSURE_END) / 2, 6);

    t = 120; // past the end: clamped
    expect(spawner.currentInterval()).toBeCloseTo(SPAWN_INTERVAL_END, 6);
    expect(spawner.currentExposure()).toBeCloseTo(EXPOSURE_END, 6);
  });

  it('applies the current exposure to spawned actors', () => {
    let t = 0;
    const spawner = new Spawner({ rng: new Rng(6), getTime: () => t, roundDuration: 60 });
    const early = spawner.update(2, []);
    t = 60;
    const late = spawner.update(1, []); // timer expires again, now at t=60
    expect(early).not.toBeNull();
    expect(late).not.toBeNull();
    expect(late!.exposureTime).toBeLessThan(early!.exposureTime);
    expect(late!.exposureTime).toBeCloseTo(EXPOSURE_END, 6);
  });
});

describe('Spawner walkers', () => {
  it('spawns a citizen walker once the timer expires', () => {
    const spawner = new Spawner({ rng: new Rng(3), getTime: () => 0 });
    expect(spawner.updateWalkers(0.1, [])).toBeNull();
    const w = spawner.updateWalkers(5, []);
    expect(w).not.toBeNull();
    expect(w!.state).toBe('walking');
    expect(w!.kind).toBe('citizen');
  });

  it('respects the walker cap', () => {
    const spawner = new Spawner({ rng: new Rng(3), getTime: () => 0 });
    const walkers = Array.from({ length: MAX_WALKERS }, () => createWalker(0, false));
    expect(spawner.updateWalkers(10, walkers)).toBeNull();
  });

  it('walkers do not count against door actors or the concurrency cap', () => {
    const spawner = new Spawner({ rng: new Rng(5), getTime: () => 0 });
    const walkers = Array.from({ length: MAX_WALKERS }, () => createWalker(1, true));
    const a = spawner.trySpawn(walkers);
    expect(a).not.toBeNull();
    expect(a!.doorIndex).toBeGreaterThanOrEqual(0);
  });
});
