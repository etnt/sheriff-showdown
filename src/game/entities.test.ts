import { describe, expect, it } from 'vitest';
import { scaleAt, DOORS, MIN_SCALE, MAX_SCALE } from './levelLayout';
import { createActor, updateHitboxes, TOTAL_H } from './entities';

describe('perspective', () => {
  it('scale grows with feet y and is clamped', () => {
    expect(scaleAt(300)).toBeLessThan(scaleAt(350));
    expect(scaleAt(0)).toBe(MIN_SCALE);
    expect(scaleAt(10000)).toBe(MAX_SCALE);
  });

  it('every door actor is sized by its doorway depth', () => {
    DOORS.forEach((d, i) => {
      const a = createActor('villain', i);
      a.y = a.feetY;
      updateHitboxes(a);
      expect(a.scale).toBe(scaleAt(d.feetY));
      const total = a.hitboxBody.h + a.hitboxHead.h;
      expect(total).toBeCloseTo(TOTAL_H * a.scale, 6);
      expect(a.hitboxBody.y + a.hitboxBody.h).toBeCloseTo(a.feetY, 6);
    });
  });
});
