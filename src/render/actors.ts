/**
 * Actor rendering with placeholder shapes. Villains: dark coat, black
 * hat, red bandana. Citizens: blue or green outfit, light hat. Kept
 * visually distinct so misfires are the player's fault, not the art's.
 */

import { FIRE_DURATION, SHOT_DURATION, type Actor } from '../game/entities';
import { DOORS } from '../game/levelLayout';

export function drawActors(
  ctx: CanvasRenderingContext2D,
  actors: readonly Actor[],
  playing: boolean,
): void {
  for (const actor of actors) {
    if (actor.state !== 'gone') drawActor(ctx, actor, playing);
  }
}

function drawActor(
  ctx: CanvasRenderingContext2D,
  actor: Actor,
  playing: boolean,
): void {
  const door = DOORS[actor.doorIndex];
  ctx.save();

  // While emerging/leaving, clip to the doorway so the actor appears to
  // rise out of / sink back into the door.
  if (actor.state === 'emerging' || actor.state === 'leaving') {
    if (door) {
      ctx.beginPath();
      ctx.rect(door.x, door.y, door.w, door.h);
      ctx.clip();
    }
  }

  // Flinch/fall animation for shot actors: rotate around the feet.
  if (actor.state === 'shot') {
    const p = 1 - Math.max(actor.timer, 0) / SHOT_DURATION;
    const dir = actor.id % 2 === 0 ? 1 : -1;
    ctx.globalAlpha = 1 - p * 0.55;
    ctx.translate(actor.x, actor.y);
    ctx.rotate(dir * p * p * 1.35);
    ctx.translate(-actor.x, -actor.y);
  }

  drawBody(ctx, actor);

  // Muzzle flash during the first moments of firing. Skipped on the
  // game-over screen: the firing timer is frozen there, so the flash
  // would otherwise never fade.
  if (playing && actor.state === 'firing' && actor.timer > FIRE_DURATION - 0.12) {
    ctx.fillStyle = '#fff8d0';
    ctx.beginPath();
    ctx.arc(actor.x + 18, actor.y - 52, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawBody(ctx: CanvasRenderingContext2D, actor: Actor): void {
  const body = actor.hitboxBody;
  const head = actor.hitboxHead;

  const isVillain = actor.kind === 'villain';
  const outfit = isVillain ? '#3d3d3d' : actor.id % 2 === 0 ? '#3f7fbf' : '#3f8f5f';
  const hatColor = isVillain ? '#151515' : '#e8dcc0';
  const skin = '#d9a066';

  // Legs
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(body.x + 4, body.y + body.h * 0.6, 12, body.h * 0.4);
  ctx.fillRect(body.x + body.w - 16, body.y + body.h * 0.6, 12, body.h * 0.4);

  // Torso
  ctx.fillStyle = outfit;
  ctx.fillRect(body.x, body.y, body.w, body.h * 0.68);

  // Arms (kept inside the body hitbox so visible pixels are hittable,
  // per NFR-2: shots register at the visible crosshair).
  ctx.fillStyle = outfit;
  ctx.fillRect(body.x, body.y + 4, 7, body.h * 0.45);
  ctx.fillRect(body.x + body.w - 7, body.y + 4, 7, body.h * 0.45);

  // Head
  ctx.fillStyle = skin;
  ctx.fillRect(head.x, head.y, head.w, head.h);

  // Bandana (villains only)
  if (isVillain) {
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(head.x, head.y + head.h * 0.45, head.w, head.h * 0.4);
  }

  // Hat: crown + brim (kept inside the head hitbox so visible pixels
  // are hittable, per NFR-2: shots register at the visible crosshair).
  ctx.fillStyle = hatColor;
  ctx.fillRect(head.x + 4, head.y, head.w - 8, 8);
  ctx.fillRect(head.x, head.y + 7, head.w, 4);
}
