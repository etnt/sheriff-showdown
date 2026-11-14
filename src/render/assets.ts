/**
 * Image assets. Vite resolves the imports to hashed URLs that respect
 * the configured `base`, so they work under a GitHub Pages sub-path.
 * Images load asynchronously; the drawing code skips an image until it
 * is `complete`, so there is no need to wait before starting the loop.
 */

import townUrl from '../assets/town.jpg';
import v1 from '../assets/v1.png';
import v2 from '../assets/v2.png';
import v3 from '../assets/v3.png';
import c1 from '../assets/c1.png';
import c2 from '../assets/c2.png';
import c3 from '../assets/c3.png';

function load(url: string): HTMLImageElement {
  const img = new Image();
  img.src = url;
  return img;
}

export const townImage = load(townUrl);
export const villainSprites: readonly HTMLImageElement[] = [v1, v2, v3].map(load);
export const citizenSprites: readonly HTMLImageElement[] = [c1, c2, c3].map(load);

export function isReady(img: HTMLImageElement): boolean {
  return img.complete && img.naturalWidth > 0;
}
