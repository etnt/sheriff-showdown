/**
 * Bootstrap: canvas setup, scaling, input, loop, and the per-frame
 * ordering: drain input (hit detection runs against pre-update actor
 * state) -> behavior -> spawn -> game timers -> render back to front.
 */

import { GameLoop } from './core/loop';
import { Input } from './core/input';
import { Rng } from './core/rng';
import { GAME_HEIGHT, GAME_WIDTH, toGameCoords } from './core/coords';
import { Game, type Storage } from './game/state';
import { Spawner } from './game/spawner';
import { actorCenter, isAlive, type Actor } from './game/entities';
import { updateActors } from './game/behavior';
import { drawScene } from './render/scene';
import { drawActors } from './render/actors';
import { drawHud } from './render/hud';
import { drawCrosshair } from './render/crosshair';
import { Effects } from './render/effects';
import { Sound } from './audio/sound';

const found = document.querySelector<HTMLCanvasElement>('#game');
if (!found) throw new Error('#game canvas not found');
const canvas: HTMLCanvasElement = found;
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('2D context not available');

// --- Scaling: fixed aspect ratio, DPR-aware -------------------------------
function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  const aspect = GAME_WIDTH / GAME_HEIGHT;
  let cssW = window.innerWidth;
  let cssH = cssW / aspect;
  if (cssH > window.innerHeight) {
    cssH = window.innerHeight;
    cssW = cssH * aspect;
  }
  cssW = Math.max(1, Math.floor(cssW));
  cssH = Math.max(1, Math.floor(cssH));
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
}
resize();
window.addEventListener('resize', resize);

// --- Wiring ----------------------------------------------------------------
const browserStorage: Storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore storage failures (private mode etc.).
    }
  },
};

const game = new Game(browserStorage);
const rng = new Rng((Date.now() ^ Math.floor(performance.now() * 1000)) >>> 0);

let roundElapsed = 0;
let actors: Actor[] = [];
const spawner = new Spawner({ rng, getTime: () => roundElapsed });
const effects = new Effects();
const sound = new Sound();

// Browsers only allow audio after a user gesture. Unlock on the first
// input of any kind; calling this again is harmless.
for (const type of ['pointerdown', 'keydown'] as const) {
  window.addEventListener(type, () => sound.unlock(), { capture: true });
}

const input = new Input(canvas, {
  toGame: (clientX, clientY) =>
    toGameCoords(clientX, clientY, canvas.getBoundingClientRect(), GAME_WIDTH, GAME_HEIGHT),
});

function resetWorld(): void {
  actors = [];
  roundElapsed = 0;
  spawner.reset();
  effects.clear();
}

// --- Frame -----------------------------------------------------------------
const loop = new GameLoop({
  update(dt: number) {
    const phaseBefore = game.state.phase;

    // 1. Input first: shots test the actor state from before this
    //    frame's behavior update, so nothing "just left" unfairly.
    for (const ev of input.drain()) {
      if (ev.type === 'start') {
        if (game.state.phase !== 'playing') {
          game.startRound();
          resetWorld();
        }
      } else if (ev.type === 'shot') {
        const outcome = game.handleShot({ x: ev.x, y: ev.y }, actors);
        if (outcome.type === 'miss') {
          effects.muzzle(ev.x, ev.y);
          sound.play('shot');
        } else if (outcome.type === 'hit') {
          effects.muzzle(ev.x, ev.y);
          sound.play('shot');
          sound.play(outcome.kind === 'citizen' ? 'citizenHit' : 'villainHit');
          const c = actorCenter(outcome.actor);
          effects.hit(c.x, c.y);
        }
      }
    }

    // 2. Behavior updates. Frozen outside 'playing' (e.g. on the
    //    game-over screen) so exposed villains stop firing behind the
    //    overlay.
    if (game.state.phase === 'playing') {
      const events = updateActors(actors, dt);
      for (const e of events) {
        const c = actorCenter(e.actor);
        effects.hit(c.x, c.y); // red flash where the villain fired from
        sound.play('villainFired');
        game.onVillainFired();
      }
      actors = actors.filter(isAlive);
    }

    // 3. Spawning (only while playing).
    if (game.state.phase === 'playing') {
      roundElapsed += dt;
      const spawned = spawner.update(dt, actors);
      if (spawned) actors.push(spawned);
      game.update(dt);
    }

    effects.update(dt);

    if (phaseBefore === 'playing' && game.state.phase === 'gameover') {
      sound.play('gameOver');
    }
  },

  render() {
    // Logical 960x540 -> backing store (DPR already in canvas size).
    ctx.setTransform(canvas.width / GAME_WIDTH, 0, 0, canvas.height / GAME_HEIGHT, 0, 0);
    drawScene(ctx);
    drawActors(ctx, actors, game.state.phase === 'playing');
    effects.draw(ctx);
    drawHud(ctx, game.state);
    drawCrosshair(ctx, input.mouse.x, input.mouse.y);
  },
});

loop.start();
