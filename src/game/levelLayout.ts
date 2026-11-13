/**
 * Static level geometry in logical coordinates (960x540).
 * Five saloon facades line the street; each has one door that actors
 * emerge from. Actors stand on the boardwalk in front of the doors.
 */

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

/** Height of the sky band; facades start at or above this line. */
export const SKY_HEIGHT = 210;

/** Top of the boardwalk, where actor feet rest when fully exposed. */
export const BOARDWALK_Y = 380;
export const BOARDWALK_HEIGHT = 34;

export interface DoorRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One door per facade, bottoms flush with the boardwalk. */
export const DOORS: readonly DoorRect[] = [
  { x: 78, y: 268, w: 62, h: 112 },
  { x: 258, y: 268, w: 62, h: 112 },
  { x: 449, y: 268, w: 62, h: 112 },
  { x: 640, y: 268, w: 62, h: 112 },
  { x: 820, y: 268, w: 62, h: 112 },
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
