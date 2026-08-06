# Dreamwalkers — working notes

A top-down 2D adventure game (a fork of the Pizza Legends engine, heavily
modernized to Vite/ESM). This file is the shared progress log between Amir and
Claude: what the game is, how it's laid out, the non-obvious rules, and a running
record of changes. Update it as we go.

## Run / build / verify

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server (hot reload) |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built `dist/` |
| `npm run smoke` | **Headless engine test suite** (`scripts/smoke.js`) — shims the DOM and boots the real engine in Node. Run this after any change to maps, cutscenes, or engine code. Currently **92 checks**. |

There is no unit-test framework; `smoke.js` is the safety net. Prefer adding a
check there over manual testing for anything about walls, cutscenes, or camera.

## Layout

- `src/main.js` — entry point.
- `src/maps/index.js` — **all level data** (maps, NPCs, walls, cutscenes) as pure
  data blueprints. This is where most gameplay lives.
- `src/engine/` — the engine: `Overworld` (loop), `OverworldMap` (mounts a map,
  runs cutscenes), `OverworldEvent` (one cutscene step), `Person`/`GameObject`/
  `Sprite` (actors), `DirectionInput`/`KeyPressListener` (input), `utils`.
- `src/ui/` — `TextMessage` (dialogue box), `Inventory` (backpack HUD, persists
  to localStorage), `Notification` (pickup toasts).
- `src/collision/walls.js` — wall-set combinators (`rect`, `line`, `compose`,
  `invert`, …).
- `scripts/` — tooling: `smoke.js` (tests), `traceJungle.mjs` (regenerate the
  jungle walkable path from the art), `solveEscort.mjs` (re-solve the Ollie
  escort routes), `drawOllieOtter.py` (sprite generation).

## Levels

- **DemoRoom, Kitchen** — leftover Pizza Legends tutorial maps, not real
  Dreamwalkers levels. Still have `npc1/2/3` placeholders.
- **Beach** — intro. Ollie potters about on the sand and gives the opening
  "follow me" cutscene. Exit at (12,19) → Jungle.
- **Jungle (level 3)** — the main level. Hero spawns at (29,32). A snake gates
  the only path west and turns you back from any adjacent tile. Billy stands at
  (40,30) and has lost his otter. Ollie sits in a dead-end pocket at (71,27) at
  the far east end of the trail; returning him to Billy is the escort cutscene.

## Non-obvious engine rules (read before editing maps)

- **Maps are blueprints, not live objects.** `OverworldMap` instantiates fresh
  game objects and copies the wall set every mount, so leaving/re-entering a map
  replays the authored spawns, behavior loops, and walls.
- **Every person is a wall.** `mount()` calls `addWall` for each game object, so
  an NPC parked in a corridor can box the hero in.
- **Moving-wall bookkeeping.** A walk frees the mover's tile the instant it
  *starts* (not when it finishes). This is what lets a follower step into the
  tile a leader just left — the basis of the escort conga line.
- **Cutscene walks use `retry:true`.** A scripted walk into an occupied/wall tile
  retries forever and hangs the game permanently. Cutscene routes must therefore
  be verified against real wall data — don't hand-author them; use the solver
  scripts and `npm run smoke`.
- **Cutscene steps run sequentially** (`startCutscene` awaits each). To make two
  people move "together" you interleave their steps (see `escort()` in
  `src/maps/index.js`).
- **Sprites don't y-sort** (draw order is object-key order) and the Jungle's
  `changeMap` trigger at (2,6) is unreachable — both are known, deliberately
  deferred gaps. Ask before "fixing" level-design issues.

## Change log

- **2026-08-05 — Billy's thank-you + the flute snake puzzle.** Two story beats:
  (1) once Ollie is walked home, Billy only ever says *"thank you btw for
  returning ollie!"* — his old "where's my otter" lines are gone. Done with a
  new `when(map)` predicate on `talking` options, gated on the escort's existing
  `talk:Ollie` one-shot. (2) The snake now offers escape: on any guarded tile,
  if you hold a **Flute** you're asked *"Play the Flute?"* (Yes/No). Yes → the
  snake falls asleep, slithers off, and the west trail opens; No / no-flute →
  the old turn-back. New engine pieces: a `question` event (Yes/No prompt via
  the new `QuestionMessage` UI, with a `when` guard and `yes`/`no` sub-event
  branches), `setFlag`/`removeObject` events, generic **story flags**
  (`overworld.storyFlags` + `hasFlag`/`setFlag`), `overworld.hasItem(name)`, and
  `when(map)` support on both `talking` options and `cutsceneSpaces`. The snake
  block is gated on `!snakeAsleep` so it dies once solved. Smoke suite now
  **129 checks**. Files: `src/engine/OverworldEvent.js`, `src/engine/Overworld.js`,
  `src/engine/OverworldMap.js`, `src/maps/index.js`, `src/ui/QuestionMessage.js`
  (new), `src/styles/QuestionMessage.css` (new), `src/main.js`, `scripts/smoke.js`.
  Note: the TODO in `cutsceneSpaces` about the snake's "do something" is now
  resolved — the flute is that something.
- **2026-08-05 — Added pickup toasts + inventory persistence.** New
  `Notification` UI (`src/ui/Notification.js` + `Notification.css`): a gray box
  with black body text and a **bold white** item name, shown at bottom-centre as
  `Obtained <name>!` whenever something enters the bag. It's separate from the
  dialogue `TextMessage` box, doesn't block input, and auto-dismisses; toasts
  stack. Wired through `Inventory.onItemAdded` → `Overworld` → the toast. The
  `Inventory` now also persists to `localStorage` (key `dreamwalkers.inventory.v1`)
  so the bag survives a reload; a fresh bag falls back to the default items.
  Server/cloud storage can layer on later. Smoke test grew a localStorage shim
  and an inventory suite (now **101 checks**). Files: `src/ui/Notification.js`
  (new), `src/styles/Notification.css` (new), `src/ui/Inventory.js`,
  `src/engine/Overworld.js`, `src/main.js`, `scripts/smoke.js`.
- **2026-08-05 — Fixed: Ollie now leads the hero in the Jungle escort (was
  backwards).** Ollie starts *east* of the hero in the pocket, and the old scene
  stepped the hero *west* first, leaving the hero out in front the whole walk to
  Billy (so it looked like the otter followed you). New choreography: the hero
  yields *up* to (70,26), Ollie takes two solo steps west to get ahead, then the
  hero follows one tile behind in Ollie's footsteps. Routes re-solved and
  verified by the new `scripts/solveEscort.mjs`; added a smoke check ("Ollie
  leads — the hero never walks out in front") that replays the real scene and
  fails if the hero is ever on ground Ollie hasn't crossed. `src/maps/index.js`,
  `scripts/solveEscort.mjs` (new), `scripts/smoke.js`.

### Earlier (from git history)
- Billy gives you a flute for returning Ollie.
- Backpack inventory HUD.
- Ollie added to the eastern jungle trail; leads the hero back to Billy.
- Snake blocks the jungle trail west and turns you back from adjacent tiles.
- Billy added with dialogue and a looking-around behavior loop.
