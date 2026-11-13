/**
 * Crosshair rendering. Drawn last, on top of everything.
 */

const RADIUS = 13;
const GAP = 5;
const TICK = 8;

export function drawCrosshair(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  strokeShape(ctx, x, y);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(20, 20, 20, 0.95)';
  strokeShape(ctx, x, y);
  ctx.fillStyle = 'rgba(255, 60, 40, 0.95)';
  ctx.beginPath();
  ctx.arc(x, y, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function strokeShape(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.beginPath();
  ctx.arc(x, y, RADIUS, 0, Math.PI * 2);
  // Four ticks outside the central gap.
  ctx.moveTo(x - RADIUS - TICK, y);
  ctx.lineTo(x - GAP, y);
  ctx.moveTo(x + GAP, y);
  ctx.lineTo(x + RADIUS + TICK, y);
  ctx.moveTo(x, y - RADIUS - TICK);
  ctx.lineTo(x, y - GAP);
  ctx.moveTo(x, y + GAP);
  ctx.lineTo(x, y + RADIUS + TICK);
  ctx.stroke();
}
