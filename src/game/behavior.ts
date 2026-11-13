/**
 * Actor state machine, stepped with a fixed dt.
 *
 * emerging -> exposed -> leaving (citizen) | firing (villain) -> gone
 *                       \-> shot (on hit) -> gone
 * `y` animates the emerge/leave (feet rise from inside the door to the
 * boardwalk line and back).
 */

import {
  EMERGE_DURATION,
  FIRE_DURATION,
  LEAVE_DURATION,
  hiddenFeetY,
  updateHitboxes,
  type Actor,
} from './entities';
import { LEVEL } from './levelLayout';

export interface BehaviorEvent {
  type: 'villainFired';
  actor: Actor;
}

const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);
const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Advance one actor by dt; append transitions to `events`. */
export function stepActor(actor: Actor, dt: number, events: BehaviorEvent[] = []): void {
  if (actor.state === 'gone') return;
  actor.timer -= dt;

  switch (actor.state) {
    case 'emerging': {
      const p = clamp01(1 - Math.max(actor.timer, 0) / EMERGE_DURATION);
      actor.y = lerp(hiddenFeetY(), LEVEL.boardwalkY, easeOut(p));
      if (actor.timer <= 0) {
        actor.state = 'exposed';
        actor.timer = actor.exposureTime;
        actor.y = LEVEL.boardwalkY;
      }
      break;
    }
    case 'exposed':
      if (actor.timer <= 0) {
        if (actor.kind === 'villain') {
          actor.state = 'firing';
          actor.timer = FIRE_DURATION;
          events.push({ type: 'villainFired', actor });
        } else {
          actor.state = 'leaving';
          actor.timer = LEAVE_DURATION;
        }
      }
      break;
    case 'firing':
      if (actor.timer <= 0) {
        actor.state = 'gone';
      }
      break;
    case 'leaving': {
      const p = clamp01(1 - Math.max(actor.timer, 0) / LEAVE_DURATION);
      actor.y = lerp(LEVEL.boardwalkY, hiddenFeetY(), p);
      if (actor.timer <= 0) {
        actor.state = 'gone';
      }
      break;
    }
    case 'shot':
      if (actor.timer <= 0) {
        actor.state = 'gone';
      }
      break;
  }

  updateHitboxes(actor);
}

/** Advance all actors by dt; returns events (e.g. "villain fired"). */
export function updateActors(actors: readonly Actor[], dt: number): BehaviorEvent[] {
  const events: BehaviorEvent[] = [];
  for (const actor of actors) {
    stepActor(actor, dt, events);
  }
  return events;
}
