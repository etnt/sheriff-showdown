/**
 * Hit detection. Pure function over actor data, no canvas/DOM.
 *
 * - Only `exposed` actors are testable.
 * - Actors are tested front to back (higher id = spawned later = in front).
 * - The head box is tested before the body box.
 * - At most one hit is returned.
 */

import type { Actor, Hitbox } from './entities';

export type HitResult =
  | { hit: true; actor: Actor; zone: 'head' | 'body' }
  | { hit: false };

export function containsPoint(box: Hitbox, x: number, y: number): boolean {
  return x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
}

export function detectHit(point: { x: number; y: number }, actors: readonly Actor[]): HitResult {
  const candidates = actors
    .filter((a) => a.state === 'exposed')
    .sort((a, b) => b.id - a.id);
  for (const actor of candidates) {
    if (containsPoint(actor.hitboxHead, point.x, point.y)) {
      return { hit: true, actor, zone: 'head' };
    }
    if (containsPoint(actor.hitboxBody, point.x, point.y)) {
      return { hit: true, actor, zone: 'body' };
    }
  }
  return { hit: false };
}
