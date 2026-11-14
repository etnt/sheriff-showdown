/**
 * Static background: the Western town photo, plus soft top and bottom
 * shading so the HUD text stays readable on a busy picture.
 */

import { GAME_HEIGHT, GAME_WIDTH } from '../game/levelLayout';
import { isReady, townImage } from './assets';

export function drawScene(ctx: CanvasRenderingContext2D): void {
  if (isReady(townImage)) {
    ctx.drawImage(townImage, 0, 0, GAME_WIDTH, GAME_HEIGHT);
  } else {
    ctx.fillStyle = '#1a120b';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  const top = ctx.createLinearGradient(0, 0, 0, 70);
  top.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
  top.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, GAME_WIDTH, 70);

  const bottom = ctx.createLinearGradient(0, GAME_HEIGHT - 70, 0, GAME_HEIGHT);
  bottom.addColorStop(0, 'rgba(0, 0, 0, 0)');
  bottom.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
  ctx.fillStyle = bottom;
  ctx.fillRect(0, GAME_HEIGHT - 70, GAME_WIDTH, 70);
}
