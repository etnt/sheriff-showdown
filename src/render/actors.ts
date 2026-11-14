/**
 * Actor rendering with photo sprites. Villains and citizens each have
 * three looks, picked from the actor id so a given actor never changes
 * its appearance. Sprites are drawn with their feet on `actor.y` and
 * scaled to the full hitbox height.
 *
 * Emerging and leaving are drawn as a fade plus a small rise or sink,
 * driven by how far `actor.y` is between the hidden and exposed lines.
 */

import { FIRE_DURATION, SHOT_DURATION, TOTAL_H, hiddenFeetY, type Actor } from '../game/entities';
import { BOARDWALK_Y } from '../game/levelLayout';
import { citizenSprites, isReady, villainSprites } from './assets';

const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);

export function drawActors(
  ctx: CanvasRenderingContext2D,
  actors: readonly Actor[],
  playing: boolean,
): void {
  for (const actor of actors) {
    if (actor.state !== 'gone') drawActor(ctx, actor, playing);
  }
}

function drawActor(ctx: CanvasRenderingContext2D, actor: Actor, playing: boolean): void {
  const hidden = hiddenFeetY();
  // 0 when fully hidden, 1 when fully exposed.
  const visible = clamp01((hidden - actor.y) / (hidden - BOARDWALK_Y));

  ctx.save();

  // Contact shadow stays on the feet line while the actor rises.
  ctx.globalAlpha = 0.4 * visible;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(actor.x, BOARDWALK_Y - 1, 36, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = visible;

  // Flinch/fall animation for shot actors: rotate around the feet.
  if (actor.state === 'shot') {
    const p = 1 - Math.max(actor.timer, 0) / SHOT_DURATION;
    const dir = actor.id % 2 === 0 ? 1 : -1;
    ctx.globalAlpha = 1 - p * 0.55;
    ctx.translate(actor.x, actor.y);
    ctx.rotate(dir * p * p * 1.35);
    ctx.translate(-actor.x, -actor.y);
  }

  drawSprite(ctx, actor);

  // Muzzle flash during the first moments of firing. Skipped on the
  // game-over screen: the firing timer is frozen there, so the flash
  // would otherwise never fade.
  if (playing && actor.state === 'firing' && actor.timer > FIRE_DURATION - 0.12) {
    const fx = actor.x + 24;
    const fy = actor.y - TOTAL_H * 0.5;
    const glow = ctx.createRadialGradient(fx, fy, 1, fx, fy, 22);
    glow.addColorStop(0, 'rgba(255, 248, 208, 1)');
    glow.addColorStop(0.4, 'rgba(255, 190, 70, 0.8)');
    glow.addColorStop(1, 'rgba(255, 120, 20, 0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(fx, fy, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawSprite(ctx: CanvasRenderingContext2D, actor: Actor): void {
  const set = actor.kind === 'villain' ? villainSprites : citizenSprites;
  const img = set[actor.id % set.length];
  if (!img || !isReady(img)) return;

  const h = TOTAL_H;
  const w = (img.naturalWidth / img.naturalHeight) * h;

  // A villain leans in slightly while firing.
  const lunge = actor.state === 'firing' ? 1.05 : 1;
  ctx.translate(actor.x, actor.y);
  ctx.scale(lunge, lunge);
  ctx.drawImage(img, -w / 2, -h, w, h);
}
