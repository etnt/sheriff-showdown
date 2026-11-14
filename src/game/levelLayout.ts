/**
 * Static level geometry in logical coordinates (960x540), matched to
 * the town photo (`src/assets/town.jpg`).
 *
 * Perspective: the horizon sits near y = 252, and a standing person's
 * size grows linearly with feet y below it (`scaleAt`). Doorways and
 * boardwalk paths are placed on the photo by eye, so every actor gets
 * a believable size for where it stands.
 */

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const HORIZON_Y = 252;
export const MIN_SCALE = 0.34;
export const MAX_SCALE = 1.1;

/** Actor size factor (1 = full sprite size) for feet at screen row `y`. */
export function scaleAt(y: number): number {
  const s = (y - HORIZON_Y) / 100;
  return s < MIN_SCALE ? MIN_SCALE : s > MAX_SCALE ? MAX_SCALE : s;
}

/** A doorway in the photo that actors step out of. */
export interface DoorRect {
  /** Center x of the doorway; the actor stands here. */
  x: number;
  /** Feet row when standing in the doorway. */
  feetY: number;
  /** Size factor for an actor standing here. */
  scale: number;
  /** Doorway footprint, used for the footprint width and tests. */
  w: number;
}

function door(x: number, feetY: number, w: number): DoorRect {
  return { x, feetY, scale: scaleAt(feetY), w };
}

export const DOORS: readonly DoorRect[] = [
  door(205, 322, 60), // saloon batwing doors (near left)
  door(382, 297, 36), // shop under the red porch
  door(452, 285, 28), // general store (far left)
  door(785, 300, 30), // shop doorway on the right
  door(918, 300, 36), // post office door (right)
];

/** A straight boardwalk route that townspeople walk along. */
export interface WalkPath {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Seconds to walk the whole path. */
  duration: number;
}

export const WALK_PATHS: readonly WalkPath[] = [
  { x0: 170, y0: 355, x1: 420, y1: 292, duration: 11 }, // left boardwalk
  { x0: 905, y0: 350, x1: 745, y1: 303, duration: 8 }, // right boardwalk
];

export interface LevelLayout {
  width: number;
  height: number;
  doors: readonly DoorRect[];
  walkPaths: readonly WalkPath[];
}

export const LEVEL: LevelLayout = {
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  doors: DOORS,
  walkPaths: WALK_PATHS,
};
