import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT, GAME_WIDTH, toGameCoords } from './coords';

describe('toGameCoords', () => {
  it('maps 1:1 at the native logical size', () => {
    const rect = { left: 0, top: 0, width: GAME_WIDTH, height: GAME_HEIGHT };
    expect(toGameCoords(480, 270, rect)).toEqual({ x: 480, y: 270 });
    expect(toGameCoords(0, 0, rect)).toEqual({ x: 0, y: 0 });
    expect(toGameCoords(960, 540, rect)).toEqual({ x: 960, y: 540 });
  });

  it('scales up from a smaller CSS canvas', () => {
    const rect = { left: 0, top: 0, width: 480, height: 270 };
    expect(toGameCoords(240, 135, rect)).toEqual({ x: 480, y: 270 });
    expect(toGameCoords(60, 33.75, rect)).toEqual({ x: 120, y: 67.5 });
  });

  it('scales down from a larger CSS canvas', () => {
    const rect = { left: 0, top: 0, width: 1920, height: 1080 };
    expect(toGameCoords(960, 540, rect)).toEqual({ x: 480, y: 270 });
  });

  it('accounts for the rect offset within the page', () => {
    const rect = { left: 100, top: 50, width: 960, height: 540 };
    expect(toGameCoords(150, 75, rect)).toEqual({ x: 50, y: 25 });
    expect(toGameCoords(100, 50, rect)).toEqual({ x: 0, y: 0 });
  });

  it('maps a quarter/half fractions of the canvas proportionally', () => {
    const rect = { left: 0, top: 0, width: 800, height: 450 };
    expect(toGameCoords(200, 112.5, rect)).toEqual({ x: 240, y: 135 });
    expect(toGameCoords(400, 225, rect)).toEqual({ x: 480, y: 270 });
  });

  it('handles non-integer rect sizes (zoomed browsers)', () => {
    const rect = { left: 0.5, top: 0.25, width: 962.5, height: 541.4 };
    const p = toGameCoords(481.75, 270.95, rect);
    expect(p.x).toBeCloseTo(480, 5);
    expect(p.y).toBeCloseTo(270, 5);
  });

  it('is independent of device pixel ratio (rect is already in CSS px)', () => {
    // The function takes the CSS rect; DPR scaling happens on the
    // backing store only, so the same rect always yields the same point.
    const rect = { left: 0, top: 0, width: 640, height: 360 };
    expect(toGameCoords(320, 180, rect)).toEqual({ x: 480, y: 270 });
  });

  it('degrades safely on a zero-sized rect', () => {
    const rect = { left: 0, top: 0, width: 0, height: 0 };
    expect(toGameCoords(10, 10, rect)).toEqual({ x: 0, y: 0 });
  });
});
