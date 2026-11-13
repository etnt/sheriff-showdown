import { beforeEach, describe, expect, it } from 'vitest';
import { createActor, resetActorIds, updateHitboxes, type Actor } from './entities';
import { BOARDWALK_Y } from './levelLayout';
import { detectHit } from './hit';

function exposed(kind: Actor['kind'], id: number, doorIndex = 2): Actor {
  const a = createActor(kind, doorIndex);
  a.id = id;
  a.state = 'exposed';
  a.y = BOARDWALK_Y;
  updateHitboxes(a);
  return a;
}

function headCenter(a: Actor): { x: number; y: number } {
  return { x: a.hitboxHead.x + a.hitboxHead.w / 2, y: a.hitboxHead.y + a.hitboxHead.h / 2 };
}

function bodyCenter(a: Actor): { x: number; y: number } {
  return { x: a.hitboxBody.x + a.hitboxBody.w / 2, y: a.hitboxBody.y + a.hitboxBody.h / 2 };
}

describe('detectHit', () => {
  beforeEach(() => resetActorIds());

  it('detects a head hit', () => {
    const a = exposed('villain', 1);
    const r = detectHit(headCenter(a), [a]);
    expect(r).toEqual({ hit: true, actor: a, zone: 'head' });
  });

  it('detects a body hit', () => {
    const a = exposed('villain', 1);
    const r = detectHit(bodyCenter(a), [a]);
    expect(r).toEqual({ hit: true, actor: a, zone: 'body' });
  });

  it('counts points exactly on the box edges', () => {
    const a = exposed('villain', 1);
    const head = a.hitboxHead;
    expect(detectHit({ x: head.x, y: head.y }, [a]).hit).toBe(true);
    expect(detectHit({ x: head.x + head.w, y: head.y + head.h }, [a]).hit).toBe(true);
    const body = a.hitboxBody;
    expect(detectHit({ x: body.x, y: body.y + body.h }, [a]).hit).toBe(true);
    expect(detectHit({ x: body.x + body.w, y: body.y }, [a]).hit).toBe(true);
  });

  it('returns a miss for empty space', () => {
    const a = exposed('villain', 1);
    expect(detectHit({ x: a.x + 200, y: 500 }, [a])).toEqual({ hit: false });
  });

  it('prefers the head zone when boxes overlap at a point', () => {
    const a = exposed('villain', 1);
    // A point on the head/body boundary belongs to the head.
    const p = { x: a.x, y: a.hitboxBody.y };
    const r = detectHit(p, [a]);
    expect(r).toEqual({ hit: true, actor: a, zone: 'head' });
  });

  it('tests front to back: the higher-id actor wins on overlap', () => {
    const back = exposed('villain', 1, 2);
    const front = exposed('citizen', 2, 2);
    // Same door => same x; the front actor's boxes contain the point.
    const r = detectHit(bodyCenter(front), [back, front]);
    expect(r).toEqual({ hit: true, actor: front, zone: 'body' });
  });

  it('returns at most one hit', () => {
    const a = exposed('villain', 1, 1);
    const b = exposed('villain', 2, 3);
    const p = bodyCenter(a);
    const r = detectHit(p, [a, b]);
    expect(r.hit).toBe(true);
    if (r.hit) expect(r.actor.id).toBe(1);
  });

  it('ignores non-exposed actors', () => {
    const states = ['emerging', 'leaving', 'firing', 'shot', 'gone'] as const;
    for (const state of states) {
      const a = exposed('villain', 1);
      a.state = state;
      expect(detectHit(bodyCenter(a), [a])).toEqual({ hit: false });
    }
  });

  it('handles an empty actor list', () => {
    expect(detectHit({ x: 480, y: 300 }, [])).toEqual({ hit: false });
  });
});
