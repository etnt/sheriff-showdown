# Sheriff Showdown

A browser-based Western shooting range game. Villains and citizens step out of
doorways along the street, while townspeople stroll the boardwalks. Shoot the villains, spare the citizens, beat
the high score.

Built with TypeScript, Vite, Canvas 2D and Vitest.

## Install

```bash
npm install
```

## Run

```bash
npm run dev       # dev server, prints a local URL
```

## Build

```bash
npm run build     # type-checks (tsc --noEmit) and bundles into dist/
npm run preview   # serve the production build locally
```

## Test

```bash
npm test          # run the Vitest suite once
npm run test:watch
```

## Controls

| Input | Action |
| --- | --- |
| Mouse | Aim the crosshair |
| Space | Fire (one shot per press; holding does not auto-fire) |
| Enter or R | Start / restart |
| M | Mute or unmute all sound |

The OS cursor is hidden over the canvas; the crosshair is your cursor.

## Rules

- The round lasts **60 seconds** and you have **3 lives**. The round ends when
  either runs out.
- Villains (rough outlaws) and citizens (townsfolk) step out of five doorways
  in the photo. Citizens also walk along the left and right boardwalks.
  Shooting a walking citizen counts like any other citizen hit.
- Far-away doors and walkers are smaller, so they are harder to hit.
- A villain fires back 2.0 s (start of round) down to 0.9 s (end) after it
  steps out, always within 3 s. A bar above its head drains from yellow to
  red, it cocks its gun 0.6 s before firing, and the screen flashes red when
  you are hit.
- Sound: gunshots and hit sounds, plus a town ambience (wind, creaking signs,
  a far-off saloon piano). Press **M** to mute or unmute everything.
- Shooting a villain: **+100** body, **+150** headshot.
- Shooting a citizen: **−200 points** and **−1 life**.
- A villain that stays exposed until its timer ends **fires** and costs you
  **1 life**.
- Streak multiplier: `1 + floor(streak / 5)`, capped at **×4**. A miss, a
  citizen hit, or a villain firing resets the streak.
- **6-shot** magazine with a **150 ms** cooldown between shots. When the
  magazine empties, a **1.0 s** reload starts automatically; shots during a
  reload are ignored.
- The high score is saved in `localStorage`.

## Architecture

```
src/
  main.ts            bootstrap, scaling, per-frame ordering
  core/
    loop.ts          fixed-timestep loop (1/60 s, 50 ms clamp), pause on hidden tab
    input.ts         mouse + keyboard, shot/start events
    coords.ts        toGameCoords(): client px -> logical 960x540
    rng.ts           seedable mulberry32 RNG
  game/              pure logic, no canvas/DOM (unit-testable in Node)
    levelLayout.ts   doorways, walk paths, perspective scale, canvas constants
    entities.ts      Actor model, hitboxes, state durations
    behavior.ts      state machine: emerging/exposed/leaving/firing/shot/gone
    spawner.ts       free-door picking, 65% villains, difficulty curve, boardwalk walkers
    hit.ts           front-to-back hit detection, head before body
    state.ts         phases, score, lives, streak, ammo/reload, high score
  render/            all canvas drawing
    scene.ts         sky, facades, boardwalk, street
    actors.ts        villain/citizen shapes, emerge/leave clipping, fall anim
    hud.ts           score, lives, ammo, timer, streak, title/game-over screens
    crosshair.ts     drawn last, on top
    effects.ts       muzzle flash, hit flash (render-layer only)
```

All game logic runs on a fixed timestep with an injected RNG and injected
time/storage, so the Vitest suite runs in Node with no browser.

## Manual checklist

Not yet verified by hand; these items still need a human pass in a real
desktop browser:

- [ ] Resize the window: the canvas keeps its 16:9 aspect ratio and shots
      still register exactly at the visible crosshair position.
- [ ] Holding Space fires exactly once (no auto-fire on key repeat).
- [ ] Switching tabs pauses the game; no burst of updates on return.
- [ ] The crosshair aligns with the hit point at multiple window sizes.
- [ ] Citizens are visually distinct from villains.

## Assumptions made in v1

These rules were not fully specified in the implementation plan and were
decided for v1:

- Health is **lives only** (3); a villain that fires costs 1 life.
- Ammo: 6-shot magazine, 1.0 s auto-reload when empty, 150 ms shot cooldown,
  shots ignored during reload.
- Streak multiplier formula `1 + floor(streak/5)` capped at 4; the multiplier
  for a hit uses the streak count before that hit.
- A villain firing also resets the streak (treated like a miss penalty).
- Score may go negative from citizen hits; it is never clamped.
- Audio is synthesized with WebAudio (`src/audio/sound.ts`), with no asset files. It starts after the first click or key press, because browsers block earlier audio.
- Art: a photo background (`src/assets/town.jpg`, cropped to 16:9) and six character sprites (`v1-3` villains, `c1-3` citizens) cut from the character sheet. Doorways and boardwalk paths are placed by eye on the photo (`levelLayout.ts`). Actor size follows a simple perspective rule, `scale = (feetY - 252) / 100`, clamped to 0.34-1.1. Actors step out of the doorway shadow (fading in from dark).
