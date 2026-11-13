/**
 * Static background: sky, distant hills, saloon facades with doors,
 * boardwalk and street. Placeholder shapes only, drawn back to front.
 */

import { BOARDWALK_HEIGHT, BOARDWALK_Y, DOORS, GAME_WIDTH, SKY_HEIGHT } from '../game/levelLayout';

const FACADE_COLORS = ['#8a5a33', '#7a4f2d', '#96653a', '#6f4526', '#8a5a33'];
const FACADE_LIFT = [22, 46, 12, 40, 28]; // how far each roof rises above SKY_HEIGHT

export function drawScene(ctx: CanvasRenderingContext2D): void {
  drawSky(ctx);
  drawFacades(ctx);
  drawBoardwalk(ctx);
  drawStreet(ctx);
}

function drawSky(ctx: CanvasRenderingContext2D): void {
  const sky = ctx.createLinearGradient(0, 0, 0, SKY_HEIGHT + 40);
  sky.addColorStop(0, '#7fb2d9');
  sky.addColorStop(1, '#f4dca4');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, GAME_WIDTH, SKY_HEIGHT + 60);

  // Sun
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(810, 80, 34, 0, Math.PI * 2);
  ctx.fill();

  // Distant mesas
  ctx.fillStyle = '#b07b4f';
  ctx.beginPath();
  ctx.moveTo(0, SKY_HEIGHT);
  ctx.lineTo(120, SKY_HEIGHT - 46);
  ctx.lineTo(210, SKY_HEIGHT);
  ctx.lineTo(430, SKY_HEIGHT - 30);
  ctx.lineTo(560, SKY_HEIGHT);
  ctx.lineTo(760, SKY_HEIGHT - 52);
  ctx.lineTo(900, SKY_HEIGHT);
  ctx.closePath();
  ctx.fill();
}

function drawFacades(ctx: CanvasRenderingContext2D): void {
  const segment = GAME_WIDTH / DOORS.length;
  for (let i = 0; i < DOORS.length; i++) {
    const door = DOORS[i];
    if (!door) continue;
    const bx = i * segment;
    const top = SKY_HEIGHT - (FACADE_LIFT[i] ?? 20);

    // Wall
    ctx.fillStyle = FACADE_COLORS[i % FACADE_COLORS.length] ?? '#7a4f2d';
    ctx.fillRect(bx + 4, top, segment - 8, BOARDWALK_Y - top);

    // Roof trim
    ctx.fillStyle = '#4a2f1a';
    ctx.fillRect(bx + 2, top - 8, segment - 4, 10);

    // Windows
    ctx.fillStyle = '#2e1e10';
    ctx.fillRect(bx + 34, top + 26, 34, 30);
    ctx.fillRect(bx + segment - 68, top + 26, 34, 30);

    // Door: frame then dark opening
    ctx.fillStyle = '#3a2415';
    ctx.fillRect(door.x - 5, door.y - 5, door.w + 10, door.h + 5);
    ctx.fillStyle = '#241509';
    ctx.fillRect(door.x, door.y, door.w, door.h);

    // Facade sign board
    ctx.fillStyle = '#d9c69a';
    ctx.fillRect(bx + 24, top + 66, segment - 48, 18);
  }
}

function drawBoardwalk(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#a97b4f';
  ctx.fillRect(0, BOARDWALK_Y, GAME_WIDTH, BOARDWALK_HEIGHT);
  ctx.strokeStyle = 'rgba(74, 47, 26, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= GAME_WIDTH; x += 24) {
    ctx.moveTo(x, BOARDWALK_Y);
    ctx.lineTo(x, BOARDWALK_Y + BOARDWALK_HEIGHT);
  }
  ctx.stroke();
  ctx.fillStyle = '#6f4a28';
  ctx.fillRect(0, BOARDWALK_Y + BOARDWALK_HEIGHT - 5, GAME_WIDTH, 5);
}

function drawStreet(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#c49a6c';
  ctx.fillRect(0, BOARDWALK_Y + BOARDWALK_HEIGHT, GAME_WIDTH, 540 - BOARDWALK_Y - BOARDWALK_HEIGHT);
  // Static dirt patches
  ctx.fillStyle = 'rgba(140, 100, 60, 0.45)';
  const patches: Array<[number, number, number, number]> = [
    [90, 460, 90, 16],
    [300, 500, 130, 18],
    [540, 455, 100, 14],
    [760, 495, 120, 20],
    [180, 525, 110, 14],
    [660, 520, 90, 14],
  ];
  for (const [x, y, w, h] of patches) {
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
