import { beforeEach, describe, expect, it } from 'vitest';
import {
  EMERGE_DURATION,
  FIRE_DURATION,
  LEAVE_DURATION,
  SHOT_DURATION,
  createActor,
  hiddenFeetY,
  resetActorIds,
  type Actor,
} from './entities';
import { stepActor, updateActors, type BehaviorEvent } from './behavior';
import { BOARDWALK_Y } from './levelLayout';

function villain(exposureTime = 1.0): Actor {
  const a = createActor('villain', 0);
  a.exposureTime = exposureTime;
  return a;
}

describe('stepActor transitions', () => {
  beforeEach(() => resetActorIds());

  it('starts emerging, hidden inside the door', () => {
    const a = villain();
    expect(a.state).toBe('emerging');
    expect(a.y).toBe(hiddenFeetY());
    expect(a.y).toBeLessThan(BOARDWALK_Y);
  });

  it('animates y upward during emerge, then becomes exposed', () => {
    const a = villain(1.0);
    const startY = a.y;
    stepActor(a, EMERGE_DURATION / 2);
    expect(a.state).toBe('emerging');
    expect(a.y).toBeGreaterThan(startY);
    expect(a.y).toBeLessThan(BOARDWALK_Y);

    stepActor(a, EMERGE_DURATION); // completes the emerge
    expect(a.state).toBe('exposed');
    expect(a.timer).toBeCloseTo(1.0, 6);
    expect(a.y).toBe(BOARDWALK_Y);
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

  it('citizen: exposed -> leaving -> gone, y animates back up', () => {
    const a = createActor('citizen', 1);
    a.exposureTime = 0.5;
    stepActor(a, EMERGE_DURATION);
    expect(a.state).toBe('exposed');
    stepActor(a, 0.5);
    expect(a.state).toBe('leaving');
    expect(a.timer).toBeCloseTo(LEAVE_DURATION, 6);

    const midY = (a.y = BOARDWALK_Y);
    stepActor(a, LEAVE_DURATION / 2);
    expect(a.state).toBe('leaving');
    expect(a.y).toBeLessThan(midY);

    stepActor(a, LEAVE_DURATION);
    expect(a.state).toBe('gone');
    expect(a.y).toBeLessThanOrEqual(hiddenFeetY() + 1e-9);
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
