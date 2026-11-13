# Implementation Plan: Western Shooting Range Game

## 1. Overview

A browser-based 2D shooting range game. The player is the town sheriff, standing at a range that looks onto an old Western street lined with saloons. Villains and innocent citizens step out of saloon doors onto the boardwalk. The player aims a crosshair with the mouse and fires with a key press.

**Goals**

- Shoot villains as they appear.
- Never shoot innocent citizens.
- Score points, keep lives, and try to beat the high score.

**Feasibility:** Feasible. The repository is empty, so this is a greenfield project.

## 2. Decisions

| Decision | Choice | Status |
|---|---|---|
| Language | TypeScript | Proposed, to confirm |
| Build tool | Vite | Proposed, to confirm |
| Rendering | HTML5 Canvas 2D (no game engine) | Proposed, to confirm |
| Unit tests | Vitest | Proposed, to confirm |
| E2E tests | Playwright (optional) | Optional |
| Art | Placeholder shapes first, then CC0 or self-made sprites | Proposed |
| Audio | WebAudio, added late (optional) | Optional |

**Alternative considered:** Flutter Web. Possible, but adds weight for little gain in a 2D canvas game.

## 3. Requirements

### 3.1 Functional

- FR-1: The game shows a Western street with a row of saloons, a boardwalk, and a street.
- FR-2: A crosshair follows the mouse. The OS cursor is hidden over the game canvas.
- FR-3: Pressing Space fires a shot at the crosshair position.
- FR-4: Villains and citizens emerge from saloon doors, stay exposed for a limited time, then leave or fire.
- FR-5: A villain hit scores points. A headshot scores more.
- FR-6: Hitting a citizen costs a life and points.
- FR-7: A villain that stays exposed until the end fires and costs the player health.
- FR-8: The round ends when lives or health run out, or the timer ends. Restart is available.
- FR-9: The high score is saved in `localStorage`.
- FR-10: A HUD shows score, lives or health, ammo or reload, time remaining, and a hint not to shoot citizens.

### 3.2 Non-Functional

- NFR-1: Gameplay runs at a stable 60 FPS on a typical laptop browser.
- NFR-2: Shots register at the visible crosshair position at any window size.
- NFR-3: Holding Space does not auto-fire.
- NFR-4: The game pauses when the tab is hidden.
- NFR-5: Game logic is testable without a browser.

## 4. Architecture

Game logic is kept separate from rendering. Logic is driven by a fixed timestep, an injected RNG, and an injected clock.

```
src/
  main.ts                 bootstrap, wires modules together
  core/
    loop.ts               fixed-timestep loop, pause on hidden tab
    input.ts              mouse, keyboard, shot events
    coords.ts             toGameCoords(): client -> logical 960x540
    rng.ts                seedable RNG
  game/
    entities.ts           Actor type, states, hitboxes
    spawner.ts            spawns actors on free doors, difficulty curve
    behavior.ts           actor state transitions over time
    hit.ts                hit detection against exposed actors
    state.ts              phases, score, lives, streak, high score
    levelLayout.ts        door positions and street geometry
  render/
    scene.ts              background, facades, boardwalk, street
    actors.ts             villain and citizen drawing
    hud.ts                score, lives, ammo, timer, hint
    crosshair.ts          crosshair drawing
    effects.ts            muzzle and hit flashes
public/assets/            sprites and audio
e2e/smoke.spec.ts         optional Playwright smoke test
```

**Coordinate system:** Logical resolution is 960×540. The canvas is scaled to fit the window and keeps its aspect ratio. All game logic uses logical coordinates.

## 5. Data Model

```ts
type ActorKind = 'villain' | 'citizen';
type ActorState = 'emerging' | 'exposed' | 'leaving' | 'firing' | 'shot' | 'gone';

interface Hitbox { x: number; y: number; w: number; h: number; }

interface Actor {
  id: number;
  kind: ActorKind;
  doorIndex: number;
  state: ActorState;
  x: number;
  y: number;
  hitboxBody: Hitbox;
  hitboxHead: Hitbox;
  timer: number;       // time left in current state, seconds
}

type HitResult =
  | { hit: true; actor: Actor; zone: 'head' | 'body' }
  | { hit: false };

interface GameState {
  phase: 'title' | 'playing' | 'gameover';
  score: number;
  lives: number;
  streak: number;
  ammo: number;
  timeLeft: number;
  highScore: number;
}
```

## 6. Work Breakdown

### Phase 1: Foundation

1. **Scaffold the project.** Create `package.json` (scripts: `dev`, `build`, `test`), `tsconfig.json`, `vite.config.ts`, `index.html` with one `<canvas>`, `src/main.ts`, and `.gitignore`.
2. **Coordinate helper.** Implement `toGameCoords()` in `src/core/coords.ts`. Handle CSS scaling and device pixel ratio.
3. **Game loop.** Implement `src/core/loop.ts` with a fixed timestep (`dt` clamped to 50 ms), a separate `render()`, and pause on `visibilitychange`.
4. **Input.** Implement `src/core/input.ts`. Track mouse movement, hide the OS cursor, fire on Space (ignoring `e.repeat`), and handle Enter or R to start or restart.

**Exit criteria:** A blank canvas runs the loop. The mouse position is logged in logical coordinates. Space emits a shot event once per press.

### Phase 2: Scene and Crosshair

5. **Layout data.** Define door positions and boardwalk line in `levelLayout.ts`.
6. **Scene rendering.** Draw sky, saloon facades, boardwalk, and street, back to front.
7. **Crosshair.** Draw the crosshair at the mouse position, last in the draw order.

**Exit criteria:** The street is visible, and the crosshair follows the mouse accurately at multiple window sizes.

### Phase 3: Actors and Behavior

8. **Entity model.** Implement `Actor` and its state machine in `entities.ts`. Define hitboxes for body and head.
9. **Behavior.** Implement timed transitions in `behavior.ts`: `emerging → exposed → leaving | firing | shot → gone`.
10. **Spawner.** Implement `spawner.ts`:
    - Pick a free door at random.
    - Choose villain or citizen by ratio (for example, 65% villain).
    - Shorten the spawn interval and exposure time as the round progresses.
    - Cap concurrent actors. Never use an occupied door.
11. **Actor rendering.** Draw villains and citizens with clearly different looks (for example, hat and bandana colors).

**Exit criteria:** Actors appear from doors, stay exposed for the set time, and leave on their own. The spawner respects door and cap rules.

### Phase 4: Hit Detection and Rules

12. **Hit detection.** Implement `hit.ts`:
    - Test only `exposed` actors.
    - Test front to back and return at most one hit.
    - Return `{ hit, actor, zone }` or a miss.
    - Ignore `emerging`, `shot`, and `gone` actors.
13. **Shot handling.** On a shot, apply the result: villain body or head, citizen hit, or miss. Update the actor state to `shot`.
14. **Scoring.** Implement `state.ts`:
    - Villain body hit: +100.
    - Villain headshot: +150.
    - Citizen hit: −200 and lose one life.
    - Streak multiplier that resets on a citizen hit or a miss.
    - Villain that fires: lose health or a life.
15. **Phases.** Implement title → playing → gameover, with restart. Save the high score to `localStorage`.

**Exit criteria:** All rules work with a fake clock and seeded RNG. Restart resets score, lives, and timer.

### Phase 5: HUD and Feedback

16. **HUD.** Implement `hud.ts`: score, lives, ammo or reload indicator, timer, and the "don't shoot citizens" hint on the title screen.
17. **Effects.** Add muzzle flash, hit flash, and a short fall or flinch animation for hit actors.
18. **Audio (optional).** Gunshot, hit, and penalty sounds. Start audio only after the first user input.

**Exit criteria:** The player can read the state of the round at a glance, and feedback is clear for hits and misses.

### Phase 6: Testing and Polish

19. **Unit tests (Vitest)** beside each module:
    - `coords`: scaling at several window sizes.
    - `hit`: head, body, edge, overlap, and miss.
    - `behavior`: state transitions with a fake clock.
    - `spawner`: no occupied door, cap respected, ratio respected under a seeded RNG.
    - `state`: villain hit, citizen hit, streak reset, game over, restart.
20. **Manual checklist:** resize accuracy, no auto-fire on hold, pause on tab switch, crosshair alignment with the hit point.
21. **Optional E2E smoke test (Playwright):** load the page, press Enter, move the mouse, press Space, and assert no console errors.
22. **Polish:** tune difficulty, replace placeholders with final art, and write `README.md` with run and build instructions.

## 7. Testing Strategy

| Level | Tool | Scope |
|---|---|---|
| Unit | Vitest | Pure logic: coords, hit, behavior, spawner, state |
| Manual | Browser | Feel, alignment, pause, resize |
| E2E (optional) | Playwright | Start, move, shoot, no errors |

## 8. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Stack not confirmed | Rework | Confirm before Phase 1 |
| Mouse coordinate mismatch | Shots miss visible target | Single conversion helper, unit tested |
| Logic mixed with rendering | Hard to test | Keep `game/` free of canvas calls |
| Frame-rate-dependent timing | Unfair difficulty | Fixed timestep, `dt` clamp |
| Key-repeat auto-fire | Accidental citizen shots | Ignore `e.repeat`, add cooldown |
| Citizens and villains look alike | Accidental citizen shots | Distinct hats and colors, short exposure tuning |
| Asset licensing | Legal issues | CC0 or self-made art only |
| Audio autoplay blocking | No sound | Start audio after first input |

## 9. Open Questions

1. Confirm the stack (TypeScript, Vite, Canvas 2D, Vitest).
2. Should the round be timed, lives-based, or both?
3. Should the shot be fired with Space, or another key?
4. Is audio required for the first version?
5. Should the first version include any art, or use placeholders only?

## 10. Definition of Done

- All functional requirements (FR-1 to FR-10) are met.
- Unit tests pass with `npm test`.
- `npm run build` produces a working bundle.
- Manual checklist passes in at least one desktop browser.
- `README.md` explains how to run and build the game.
