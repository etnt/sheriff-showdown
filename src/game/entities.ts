/**
 * Actor data model and hitbox computation. Pure data + math, no canvas.
 */

import { LEVEL, scaleAt, type LevelLayout } from './levelLayout';

export type ActorKind = 'villain' | 'citizen';
export type ActorState =
  | 'emerging'
  | 'exposed'
  | 'leaving'
  | 'firing'
  | 'shot'
  | 'walking'
  | 'gone';

export interface Hitbox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Actor {
  id: number;
  kind: ActorKind;
  /** Doorway index, or -1 for a boardwalk walker. */
  doorIndex: number;
  state: ActorState;
  /** Center x of the actor. */
  x: number;
  /** Current feet y. */
  y: number;
  /** Feet y when fully out of the doorway (the actor's home row). */
  feetY: number;
  /** Size factor from perspective (1 = full sprite size). */
  scale: number;
  /** Route and start data for walkers; null for doorway actors. */
  walk: { x0: number; y0: number; x1: number; y1: number; duration: number } | null;
  /** Seconds the actor stays exposed; set by the spawner. */
  exposureTime: number;
  /** Time left in the current state, seconds. */
  timer: number;
  hitboxBody: Hitbox;
  hitboxHead: Hitbox;
}

export const BODY_W = 68;
export const BODY_H = 142;
export const HEAD_W = 48;
export const HEAD_H = 40;
export const TOTAL_H = BODY_H + HEAD_H; // 182

// State durations (seconds).
export const EMERGE_DURATION = 0.4;
export const LEAVE_DURATION = 0.4;
export const FIRE_DURATION = 0.6;
export const SHOT_DURATION = 0.35;

let nextId = 1;

/** Reset the id counter; used by tests so ids are deterministic. */
export function resetActorIds(): void {
  nextId = 1;
}

/** Feet y while still inside the doorway: a little further back. */
export function hiddenFeetY(actor: Pick<Actor, 'feetY' | 'scale'>): number {
  return actor.feetY - 14 * actor.scale;
}

export function createActor(
  kind: ActorKind,
  doorIndex: number,
  layout: LevelLayout = LEVEL,
): Actor {
  const door = layout.doors[doorIndex];
  if (!door) {
    throw new Error(`createActor: bad doorIndex ${doorIndex}`);
  }
  const actor: Actor = {
    id: nextId++,
    kind,
    doorIndex,
    state: 'emerging',
    x: door.x,
    y: 0,
    feetY: door.feetY,
    scale: door.scale,
    walk: null,
    exposureTime: 1.5,
    timer: EMERGE_DURATION,
    hitboxBody: { x: 0, y: 0, w: 0, h: 0 },
    hitboxHead: { x: 0, y: 0, w: 0, h: 0 },
  };
  actor.y = hiddenFeetY(actor);
  updateHitboxes(actor);
  return actor;
}

/** A townsperson who walks a boardwalk path; `reverse` walks it backwards. */
export function createWalker(
  pathIndex: number,
  reverse: boolean,
  layout: LevelLayout = LEVEL,
): Actor {
  const path = layout.walkPaths[pathIndex];
  if (!path) {
    throw new Error(`createWalker: bad pathIndex ${pathIndex}`);
  }
  const walk = reverse
    ? { x0: path.x1, y0: path.y1, x1: path.x0, y1: path.y0, duration: path.duration }
    : { x0: path.x0, y0: path.y0, x1: path.x1, y1: path.y1, duration: path.duration };
  const actor: Actor = {
    id: nextId++,
    kind: 'citizen',
    doorIndex: -1,
    state: 'walking',
    x: walk.x0,
    y: walk.y0,
    feetY: walk.y0,
    scale: scaleAt(walk.y0),
    walk,
    exposureTime: 0,
    timer: walk.duration,
    hitboxBody: { x: 0, y: 0, w: 0, h: 0 },
    hitboxHead: { x: 0, y: 0, w: 0, h: 0 },
  };
  updateHitboxes(actor);
  return actor;
}

/**
 * Recompute hitboxes from the actor's current position.
 * Head: small box on top. Body: larger box below it.
 */
export function updateHitboxes(actor: Actor): void {
  const k = actor.scale;
  actor.hitboxBody = {
    x: actor.x - (BODY_W * k) / 2,
    y: actor.y - BODY_H * k,
    w: BODY_W * k,
    h: BODY_H * k,
  };
  actor.hitboxHead = {
    x: actor.x - (HEAD_W * k) / 2,
    y: actor.y - TOTAL_H * k,
    w: HEAD_W * k,
    h: HEAD_H * k,
  };
}

/** Rough visual center of the actor, for effects. */
export function actorCenter(actor: Actor): { x: number; y: number } {
  return { x: actor.x, y: actor.y - (TOTAL_H * actor.scale) / 2 };
}

export function isAlive(actor: Actor): boolean {
  return actor.state !== 'gone';
}
