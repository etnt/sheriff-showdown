/**
 * Actor rendering with photo sprites. Villains and citizens each have
 * three looks, picked from the actor id so a given actor never changes
 * its appearance. Sprites are drawn with their feet on `actor.y`, scaled
 * by the actor's perspective `scale`, and sorted back to front.
 *
 * Emerging and leaving: the actor steps out of the doorway shadow, so
 * it fades in from dark. Walkers bob gently as they stroll.
 */

import { FIRE_DURATION, SHOT_DURATION, TOTAL_H, hiddenFeetY, type Actor } from '../game/entities';
import { citizenSprites, isReady, villainSprites } from './assets';

const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);

export function drawActors(
  ctx: CanvasRenderingContext2D,
  actors: readonly Actor[],
  playing: boolean,
): void {
  // Back to front: smaller feet y is further away.
  const order = actors.filter((a) => a.state !== 'gone').sort((a, b) => a.feetY - b.feetY || a.id - b.id);
  for (const actor of order) drawActor(ctx, actor, playing);
}

/** 0 when fully inside the doorway, 1 when fully out. */
function visibility(actor: Actor): number {
  if (actor.state !== 'emerging' && actor.state !== 'leaving') return 1;
  const hidden = hiddenFeetY(actor);
  return clamp01((actor.y - hidden) / (actor.feetY - hidden));
}

function drawActor(ctx: CanvasRenderingContext2D, actor: Actor, playing: boolean): void {
  const k = actor.scale;
  const visible = visibility(actor);
  const fade = clamp01((visible - 0.15) / 0.85);

  ctx.save();

  // Contact shadow stays on the home row while the actor steps out.
  ctx.globalAlpha = 0.4 * fade;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(actor.x, actor.feetY - 1, 36 * k, 8 * k, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = fade;

  // Flinch/fall animation for shot actors: rotate around the feet.
  if (actor.state === 'shot') {
    const p = 1 - Math.max(actor.timer, 0) / SHOT_DURATION;
    const dir = actor.id % 2 === 0 ? 1 : -1;
    ctx.globalAlpha = 1 - p * 0.55;
    ctx.translate(actor.x, actor.y);
    ctx.rotate(dir * p * p * 1.35);
    ctx.translate(-actor.x, -actor.y);
  }

  // Gentle walking bob: a hop and a sway, scaled with distance.
  let bob = 0;
  if (actor.state === 'walking') {
    const phase = actor.timer * 9;
    bob = -Math.abs(Math.sin(phase)) * 2.5 * k;
    ctx.translate(actor.x, actor.y);
    ctx.rotate(Math.sin(phase) * 0.03);
    ctx.translate(-actor.x, -actor.y);
  }

  drawSprite(ctx, actor, 1 - visible, bob);

  // Muzzle flash during the first moments of firing. Skipped on the
  // game-over screen: the firing timer is frozen there, so the flash
  // would otherwise never fade.
  if (playing && actor.state === 'firing' && actor.timer > FIRE_DURATION - 0.12) {
    const r = 6 + 18 * k;
    const fx = actor.x + 24 * k;
    const fy = actor.y - TOTAL_H * k * 0.5;
    const glow = ctx.createRadialGradient(fx, fy, 1, fx, fy, r);
    glow.addColorStop(0, 'rgba(255, 248, 208, 1)');
    glow.addColorStop(0.4, 'rgba(255, 190, 70, 0.8)');
    glow.addColorStop(1, 'rgba(255, 120, 20, 0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(fx, fy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  drawCountdown(ctx, actor);
}

/**
 * Villains show how long until they fire: a bar above the head that
 * drains and turns from yellow to red. Citizens never show one.
 */
function drawCountdown(ctx: CanvasRenderingContext2D, actor: Actor): void {
  if (actor.kind !== 'villain' || actor.state !== 'exposed' || actor.exposureTime <= 0) return;
  const left = clamp01(actor.timer / actor.exposureTime);
  const k = actor.scale;
  const w = Math.max(24, 44 * k);
  const h = Math.max(4, 6 * k);
  const x = actor.x - w / 2;
  const y = actor.y - TOTAL_H * k - h - 6;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = left > 0.5 ? '#f2c230' : left > 0.25 ? '#f07a20' : '#e0301e';
  ctx.fillRect(x, y, w * left, h);
  ctx.restore();
}

let tintCanvas: HTMLCanvasElement | null = null;

/** Sprite darkened toward black by `shade` (0..1), keeping its alpha. */
function shadedSprite(img: HTMLImageElement, shade: number): CanvasImageSource {
  if (shade < 0.02) return img;
  tintCanvas ??= document.createElement('canvas');
  tintCanvas.width = img.naturalWidth;
  tintCanvas.height = img.naturalHeight;
  const t = tintCanvas.getContext('2d');
  if (!t) return img;
  t.drawImage(img, 0, 0);
  t.globalCompositeOperation = 'source-atop';
  t.fillStyle = `rgba(12, 7, 3, ${shade * 0.8})`;
  t.fillRect(0, 0, tintCanvas.width, tintCanvas.height);
  return tintCanvas;
}

function drawSprite(ctx: CanvasRenderingContext2D, actor: Actor, shade: number, bob: number): void {
  const set = actor.kind === 'villain' ? villainSprites : citizenSprites;
  const img = set[actor.id % set.length];
  if (!img || !isReady(img)) return;

  const h = TOTAL_H * actor.scale;
  const w = (img.naturalWidth / img.naturalHeight) * h;

  // A villain leans in slightly while firing.
  const lunge = actor.state === 'firing' ? 1.05 : 1;
  ctx.save();
  ctx.translate(actor.x, actor.y + bob);
  ctx.scale(lunge, lunge);
  ctx.drawImage(shadedSprite(img, shade), -w / 2, -h, w, h);
  ctx.restore();
}
