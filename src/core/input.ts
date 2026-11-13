/**
 * Mouse + keyboard input.
 *
 * - Tracks the mouse position in logical game coordinates.
 * - Emits a `shot` event on Space keydown (ignoring key repeat, so
 *   holding Space never auto-fires).
 * - Enter or R emits a `start` event (start / restart).
 * - Events are queued and handed out through `drain()`.
 */

import { GAME_HEIGHT, GAME_WIDTH, toGameCoords, type Point } from './coords';

export type InputEvent = { type: 'shot'; x: number; y: number } | { type: 'start' };

export interface InputOptions {
  toGame?: (clientX: number, clientY: number) => Point;
}

export class Input {
  readonly mouse: Point = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
  private queue: InputEvent[] = [];
  private readonly toGame: (clientX: number, clientY: number) => Point;
  private readonly cleanups: Array<() => void> = [];

  constructor(canvas: HTMLCanvasElement, opts: InputOptions = {}) {
    this.toGame =
      opts.toGame ??
      ((clientX, clientY) =>
        toGameCoords(clientX, clientY, canvas.getBoundingClientRect(), GAME_WIDTH, GAME_HEIGHT));

    const onMove = (e: MouseEvent): void => {
      const p = this.toGame(e.clientX, e.clientY);
      this.mouse.x = p.x;
      this.mouse.y = p.y;
    };

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.repeat) return;
      if (e.code === 'Space') {
        e.preventDefault();
        // The shot fires at the current crosshair (mouse) position.
        this.queue.push({ type: 'shot', x: this.mouse.x, y: this.mouse.y });
      } else if (e.code === 'Enter' || e.code === 'KeyR') {
        e.preventDefault();
        this.queue.push({ type: 'start' });
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('keydown', onKeyDown);
    this.cleanups.push(
      () => window.removeEventListener('mousemove', onMove),
      () => window.removeEventListener('keydown', onKeyDown),
    );
  }

  /** Return and clear all queued events. */
  drain(): InputEvent[] {
    const out = this.queue;
    this.queue = [];
    return out;
  }

  dispose(): void {
    for (const fn of this.cleanups) fn();
    this.cleanups.length = 0;
  }
}
