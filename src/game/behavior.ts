/**
 * Actor state machine, stepped with a fixed dt.
 *
 * emerging -> exposed -> leaving (citizen) | firing (villain) -> gone
 *                       \-> shot (on hit) -> gone
 * walking (citizen on a boardwalk path) -> gone, or shot on hit.
 * `y` animates the emerge/leave (the actor steps forward out of the
 * doorway to its home row and back).
 */

import {
  EMERGE_DURATION,
  FIRE_DURATION,
  LEAVE_DURATION,
  hiddenFeetY,
  updateHitboxes,
  type Actor,
} from './entities';
import { scaleAt } from './levelLayout';

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
      actor.y = lerp(hiddenFeetY(actor), actor.feetY, easeOut(p));
      if (actor.timer <= 0) {
        actor.state = 'exposed';
        actor.timer = actor.exposureTime;
        actor.y = actor.feetY;
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
      actor.y = lerp(actor.feetY, hiddenFeetY(actor), p);
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
    case 'walking': {
      const w = actor.walk;
      if (!w || actor.timer <= 0) {
        actor.state = 'gone';
        break;
      }
      const p = clamp01(1 - actor.timer / w.duration);
      actor.x = lerp(w.x0, w.x1, p);
      actor.y = lerp(w.y0, w.y1, p);
      actor.feetY = actor.y;
      actor.scale = scaleAt(actor.y);
      break;
    }
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
