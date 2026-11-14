/**
 * Static level geometry in logical coordinates (960x540).
 * Actors stand on one shared feet line in the street, at five spawn
 * spots spread across the width of the background photo.
 */

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

/** Height of the sky band; facades start at or above this line. */
export const SKY_HEIGHT = 210;

/** Feet line: where actor feet rest when fully exposed. */
export const BOARDWALK_Y = 455;
export const BOARDWALK_HEIGHT = 0;

export interface DoorRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Spawn spots (x/w give the footprint; y/h span a standing actor). */
export const DOORS: readonly DoorRect[] = [
  { x: 100, y: 273, w: 60, h: 182 },
  { x: 290, y: 273, w: 60, h: 182 },
  { x: 450, y: 273, w: 60, h: 182 },
  { x: 610, y: 273, w: 60, h: 182 },
  { x: 800, y: 273, w: 60, h: 182 },
];

export interface LevelLayout {
  width: number;
  height: number;
  boardwalkY: number;
  boardwalkHeight: number;
  doors: readonly DoorRect[];
}

export const LEVEL: LevelLayout = {
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  boardwalkY: BOARDWALK_Y,
  boardwalkHeight: BOARDWALK_HEIGHT,
  doors: DOORS,
};
