import { beforeEach, describe, expect, it } from 'vitest';
import {
  EMERGE_DURATION,
  FIRE_DURATION,
  LEAVE_DURATION,
  SHOT_DURATION,
  createActor,
  createWalker,
  hiddenFeetY,
  resetActorIds,
  type Actor,
} from './entities';
import { stepActor, updateActors, type BehaviorEvent } from './behavior';

function villain(exposureTime = 1.0): Actor {
  const a = createActor('villain', 0);
  a.exposureTime = exposureTime;
  return a;
}

describe('stepActor transitions', () => {
  beforeEach(() => resetActorIds());

  it('starts emerging, a little further back inside the doorway', () => {
    const a = villain();
    expect(a.state).toBe('emerging');
    expect(a.y).toBe(hiddenFeetY(a));
    expect(a.y).toBeLessThan(a.feetY);
  });

  it('animates y up to the feet line during emerge, then becomes exposed', () => {
    const a = villain(1.0);
    const startY = a.y;
    stepActor(a, EMERGE_DURATION / 2);
    expect(a.state).toBe('emerging');
    expect(a.y).toBeGreaterThan(startY);
    expect(a.y).toBeLessThan(a.feetY);

    stepActor(a, EMERGE_DURATION); // completes the emerge
    expect(a.state).toBe('exposed');
    expect(a.timer).toBeCloseTo(1.0, 6);
    expect(a.y).toBe(a.feetY);
  });

  it('villain: exposed -> firing, and reports the villainFired event once', () => {
    const a = villain(0.8);
    stepActor(a, EMERGE_DURATION);
    expect(a.state).toBe('exposed');

    const events: BehaviorEvent[] = [];
    stepActor(a, 0.4, events);
    expect(a.state).toBe('exposed');
    expect(events).toHaveLength(0);

    stepActor(a, 0.4, events); // exposure elapsed -> firing begins
    expect(a.state).toBe('firing');
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('villainFired');
    expect(events[0]?.actor).toBe(a);

    // The event is not repeated while firing continues.
    stepActor(a, 0.1, events);
    expect(events).toHaveLength(1);
  });

  it('updateActors collects events from several actors', () => {
    const a = villain(0.0);
    const b = villain(0.0);
    stepActor(a, EMERGE_DURATION);
    stepActor(b, EMERGE_DURATION);
    const events = updateActors([a, b], 0.001);
    expect(events).toHaveLength(2);
  });

  it('villain: firing -> gone after the fire duration', () => {
    const a = villain(0.0);
    stepActor(a, EMERGE_DURATION);
    stepActor(a, 0.001); // -> firing
    stepActor(a, FIRE_DURATION);
    expect(a.state).toBe('gone');
  });

  it('citizen: exposed -> leaving -> gone, y animates back inside', () => {
    const a = createActor('citizen', 1);
    a.exposureTime = 0.5;
    stepActor(a, EMERGE_DURATION);
    expect(a.state).toBe('exposed');
    stepActor(a, 0.5);
    expect(a.state).toBe('leaving');
    expect(a.timer).toBeCloseTo(LEAVE_DURATION, 6);

    const midY = (a.y = a.feetY);
    stepActor(a, LEAVE_DURATION / 2);
    expect(a.state).toBe('leaving');
    expect(a.y).toBeLessThan(midY);

    stepActor(a, LEAVE_DURATION);
    expect(a.state).toBe('gone');
    expect(a.y).toBeLessThanOrEqual(hiddenFeetY(a) + 1e-9);
  });

  it('shot -> gone after the shot animation', () => {
    const a = villain(5);
    stepActor(a, EMERGE_DURATION);
    a.state = 'shot';
    a.timer = SHOT_DURATION;
    stepActor(a, SHOT_DURATION / 2);
    expect(a.state).toBe('shot');
    stepActor(a, SHOT_DURATION);
    expect(a.state).toBe('gone');
  });

  it('gone actors stay gone and ignore dt', () => {
    const a = villain();
    a.state = 'gone';
    stepActor(a, 10);
    expect(a.state).toBe('gone');
  });

  it('keeps hitboxes in sync with the animated y', () => {
    const a = villain(1);
    stepActor(a, EMERGE_DURATION / 2);
    expect(a.hitboxBody.y + a.hitboxBody.h).toBeCloseTo(a.y, 6);
    expect(a.hitboxHead.y + a.hitboxHead.h).toBeCloseTo(a.hitboxBody.y, 6);
  });
});

describe('walkers', () => {
  beforeEach(() => resetActorIds());

  it('walk along the path, change size with depth, then are gone', () => {
    const a = createWalker(0, false); // left boardwalk: near -> far
    expect(a.state).toBe('walking');
    expect(a.kind).toBe('citizen');
    const startScale = a.scale;
    const startX = a.x;

    stepActor(a, a.walk!.duration / 2);
    expect(a.state).toBe('walking');
    expect(a.x).toBeGreaterThan(startX);
    expect(a.scale).toBeLessThan(startScale);

    stepActor(a, a.walk!.duration);
    expect(a.state).toBe('gone');
  });

  it('a reversed walker starts at the far end and grows', () => {
    const fwd = createWalker(0, false);
    const rev = createWalker(0, true);
    expect(rev.scale).toBeLessThan(fwd.scale);
    stepActor(rev, rev.walk!.duration / 2);
    expect(rev.scale).toBeGreaterThan(createWalker(0, true).scale);
  });

  it('never fire events', () => {
    const a = createWalker(1, false);
    const events: BehaviorEvent[] = [];
    stepActor(a, a.walk!.duration + 1, events);
    expect(events).toEqual([]);
  });
});
