/**
 * Transient visual effects (muzzle flash, hit flash). The effect list
 * lives entirely in the render layer so `src/game/` stays canvas-free.
 */

export type EffectKind = 'muzzle' | 'hit';

export interface Effect {
  kind: EffectKind;
  x: number;
  y: number;
  t: number;
  duration: number;
}

export class Effects {
  private list: Effect[] = [];

  muzzle(x: number, y: number): void {
    this.list.push({ kind: 'muzzle', x, y, t: 0, duration: 0.09 });
  }

  hit(x: number, y: number): void {
    this.list.push({ kind: 'hit', x, y, t: 0, duration: 0.28 });
  }

  update(dt: number): void {
    for (const e of this.list) e.t += dt;
    this.list = this.list.filter((e) => e.t < e.duration);
  }

  clear(): void {
    this.list.length = 0;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const e of this.list) {
      const p = e.t / e.duration;
      if (e.kind === 'muzzle') drawMuzzle(ctx, e, p);
      else drawHit(ctx, e, p);
    }
  }
}

function drawMuzzle(ctx: CanvasRenderingContext2D, e: Effect, p: number): void {
  ctx.save();
  ctx.globalAlpha = 1 - p;
  const r = 6 + p * 14;
  ctx.fillStyle = '#fff8d0';
  ctx.beginPath();
  ctx.arc(e.x, e.y, r * 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd24a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawHit(ctx: CanvasRenderingContext2D, e: Effect, p: number): void {
  ctx.save();
  ctx.globalAlpha = 1 - p;
  ctx.translate(e.x, e.y);
  ctx.rotate(p * 0.6);
  const r = 10 + p * 26;
  ctx.strokeStyle = '#ff5040';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 220, 120, 0.9)';
  ctx.beginPath();
  ctx.arc(0, 0, 5 * (1 - p), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
