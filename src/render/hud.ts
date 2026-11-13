/**
 * HUD: score, lives, ammo (+ reload indicator), timer, streak and high
 * score; plus title and game-over screens.
 */

import { DEFAULTS, multiplierFor, type GameState } from '../game/state';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/levelLayout';

export function drawHud(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.phase === 'title') {
    drawTitle(ctx);
    return;
  }
  drawPlayHud(ctx, state);
  if (state.phase === 'gameover') drawGameOver(ctx, state);
}

function drawPlayHud(ctx: CanvasRenderingContext2D, state: GameState): void {
  // Top bar
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(0, 0, GAME_WIDTH, 46);

  ctx.textBaseline = 'middle';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffe9b8';
  ctx.fillText(`SCORE ${state.score}`, 16, 24);

  // Streak multiplier
  const mult = multiplierFor(state.streak);
  if (mult > 1) {
    ctx.fillStyle = '#ffb347';
    ctx.fillText(`x${mult}`, 230, 24);
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(formatTime(state.timeLeft), GAME_WIDTH / 2, 24);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#cfe8ff';
  ctx.fillText(`BEST ${state.highScore}`, GAME_WIDTH - 150, 24);
  drawLives(ctx, GAME_WIDTH - 24, 23, state.lives);

  // Ammo, bottom left
  const spent = DEFAULTS.magSize - state.ammo;
  for (let i = 0; i < DEFAULTS.magSize; i++) {
    const bx = 18 + i * 16;
    const loaded = i >= spent;
    ctx.fillStyle = loaded ? '#e8b84b' : 'rgba(232, 184, 75, 0.25)';
    ctx.fillRect(bx, GAME_HEIGHT - 30, 9, 18);
    ctx.beginPath();
    ctx.arc(bx + 4.5, GAME_HEIGHT - 30, 4.5, Math.PI, 0);
    ctx.fill();
  }

  // Citizen warning (FR-10): always visible while playing.
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ff8a7a';
  ctx.fillText("Don't shoot citizens!", GAME_WIDTH - 18, GAME_HEIGHT - 21);

  // Reload indicator
  if (state.reloadTimer > 0) {
    const total = DEFAULTS.reloadTime;
    const p = 1 - state.reloadTimer / total;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(18, GAME_HEIGHT - 52, 130, 14);
    ctx.fillStyle = '#ffb347';
    ctx.fillRect(20, GAME_HEIGHT - 50, 126 * p, 10);
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffe9b8';
    ctx.fillText('RELOADING', 156, GAME_HEIGHT - 45);
  }
}

function drawLives(ctx: CanvasRenderingContext2D, rightX: number, cy: number, lives: number): void {
  for (let i = 0; i < DEFAULTS.lives; i++) {
    const cx = rightX - (DEFAULTS.lives - 1 - i) * 30;
    drawStar(ctx, cx, cy, 10, i < lives ? '#ffd24a' : 'rgba(255, 210, 74, 0.22)');
  }
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = cx + Math.cos(ang) * rad;
    const py = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `0:${String(s).padStart(2, '0')}`;
}

function drawTitle(ctx: CanvasRenderingContext2D): void {
  overlay(ctx);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = 'bold 64px monospace';
  ctx.fillStyle = '#ffe9b8';
  ctx.fillText('SHERIFF SHOWDOWN', GAME_WIDTH / 2, 180);

  ctx.font = 'bold 24px monospace';
  ctx.fillStyle = '#ff8a7a';
  ctx.fillText("Don't shoot citizens!", GAME_WIDTH / 2, 250);

  ctx.font = '18px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Shoot the villains. Headshots score more.', GAME_WIDTH / 2, 300);
  ctx.fillText('Move: mouse    Fire: SPACE    6 shots, then auto-reload', GAME_WIDTH / 2, 330);
  ctx.fillText('60 seconds - 3 lives - villains who fire cost a life', GAME_WIDTH / 2, 356);

  ctx.font = 'bold 26px monospace';
  ctx.fillStyle = '#ffd24a';
  ctx.fillText('Press ENTER to start', GAME_WIDTH / 2, 430);
}

function drawGameOver(ctx: CanvasRenderingContext2D, state: GameState): void {
  overlay(ctx);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = 'bold 56px monospace';
  ctx.fillStyle = '#ff8a7a';
  ctx.fillText('GAME OVER', GAME_WIDTH / 2, 200);

  ctx.font = 'bold 28px monospace';
  ctx.fillStyle = '#ffe9b8';
  ctx.fillText(`Score: ${state.score}`, GAME_WIDTH / 2, 270);
  ctx.fillStyle = '#cfe8ff';
  ctx.fillText(`Best: ${state.highScore}`, GAME_WIDTH / 2, 310);

  ctx.font = 'bold 24px monospace';
  ctx.fillStyle = '#ffd24a';
  ctx.fillText('Press ENTER to restart', GAME_WIDTH / 2, 400);
}

function overlay(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgba(20, 12, 6, 0.72)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}
