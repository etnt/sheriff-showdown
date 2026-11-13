/**
 * Coordinate conversion between browser client pixels and logical game
 * coordinates. This is the single conversion helper used everywhere;
 * it works in CSS pixels, so device pixel ratio never enters the math
 * (the backing store is sized in `main.ts`).
 */

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Convert a client-space point (e.g. MouseEvent.clientX/Y) into logical
 * game coordinates given the canvas's bounding client rect (CSS pixels).
 */
export function toGameCoords(
  clientX: number,
  clientY: number,
  rect: Rect,
  gameWidth: number = GAME_WIDTH,
  gameHeight: number = GAME_HEIGHT,
): Point {
  if (rect.width <= 0 || rect.height <= 0) {
    return { x: 0, y: 0 };
  }
  const sx = gameWidth / rect.width;
  const sy = gameHeight / rect.height;
  return {
    x: (clientX - rect.left) * sx,
    y: (clientY - rect.top) * sy,
  };
}
