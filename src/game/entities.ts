/**
 * Actor data model and hitbox computation. Pure data + math, no canvas.
 */

import { LEVEL, type LevelLayout } from './levelLayout';

export type ActorKind = 'villain' | 'citizen';
export type ActorState = 'emerging' | 'exposed' | 'leaving' | 'firing' | 'shot' | 'gone';

export interface Hitbox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Actor {
  id: number;
  kind: ActorKind;
  doorIndex: number;
  state: ActorState;
  /** Center x of the actor. */
  x: number;
  /** Feet y (boardwalk line when fully out). */
  y: number;
  /** Seconds the actor stays exposed; set by the spawner. */
  exposureTime: number;
  /** Time left in the current state, seconds. */
  timer: number;
  hitboxBody: Hitbox;
  hitboxHead: Hitbox;
}

export const BODY_W = 40;
export const BODY_H = 62;
export const HEAD_W = 26;
export const HEAD_H = 26;
export const TOTAL_H = BODY_H + HEAD_H; // 88

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

/** Feet y while still hidden inside the door (body above the door top). */
export function hiddenFeetY(layout: LevelLayout = LEVEL): number {
  return layout.boardwalkY - TOTAL_H;
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
    x: door.x + door.w / 2,
    y: hiddenFeetY(layout),
    exposureTime: 1.5,
    timer: EMERGE_DURATION,
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
  actor.hitboxBody = {
    x: actor.x - BODY_W / 2,
    y: actor.y - BODY_H,
    w: BODY_W,
    h: BODY_H,
  };
  actor.hitboxHead = {
    x: actor.x - HEAD_W / 2,
    y: actor.y - TOTAL_H,
    w: HEAD_W,
    h: HEAD_H,
  };
}

/** Rough visual center of the actor, for effects. */
export function actorCenter(actor: Actor): { x: number; y: number } {
  return { x: actor.x, y: actor.y - TOTAL_H / 2 };
}

export function isAlive(actor: Actor): boolean {
  return actor.state !== 'gone';
}
