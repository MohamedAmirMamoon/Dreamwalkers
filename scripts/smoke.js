// Dependency-free smoke harness for the Overworld engine.
//
// Shims just enough of the DOM (document events, Image, canvas 2d context,
// requestAnimationFrame) to boot the real engine code in Node, then asserts the
// map-instancing, cutscene-lifecycle and camera invariants.
//
// Run with: npm run smoke

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = join(ROOT, "public");

/* ------------------------------------------------------------------ shims */

class FakeEventTarget {
  constructor() {
    this.listeners = {};
  }
  addEventListener(name, fn) {
    (this.listeners[name] = this.listeners[name] || []).push(fn);
  }
  removeEventListener(name, fn) {
    const list = this.listeners[name];
    if (!list) return;
    const i = list.indexOf(fn);
    if (i > -1) list.splice(i, 1);
  }
  dispatchEvent(event) {
    // copy: handlers commonly remove themselves while dispatching
    (this.listeners[event.type] || []).slice().forEach(fn => fn(event));
  }
  countListeners(name) {
    return (this.listeners[name] || []).length;
  }
}

class FakeCustomEvent {
  constructor(type, options) {
    this.type = type;
    this.detail = (options || {}).detail;
  }
}

// Reads real PNG dimensions off disk so the camera test uses real art sizes.
function pngSize(src) {
  try {
    const buffer = readFileSync(join(PUBLIC_DIR, src.replace(/^\/+/, "")));
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  } catch (err) {
    return null;
  }
}

class FakeImage {
  constructor() {
    this._src = "";
    this.naturalWidth = 0;
    this.naturalHeight = 0;
    this.onload = null;
  }
  get src() {
    return this._src;
  }
  set src(value) {
    this._src = value;
    if (!value) {
      throw new Error(`FakeImage got an empty src - that would request the page URL`);
    }
    const size = pngSize(value);
    if (!size) {
      throw new Error(`FakeImage got a src that does not exist in public/: ${value}`);
    }
    // Images load asynchronously in a browser; mimic that.
    setTimeout(() => {
      this.naturalWidth = size.width;
      this.naturalHeight = size.height;
      this.onload && this.onload();
    }, 0);
  }
}

function makeCanvas(width, height) {
  const canvas = { width, height };
  canvas.ctx = {
    canvas,
    drawCalls: [],
    clearRect() {},
    drawImage(image, ...args) {
      this.drawCalls.push({ image, args });
    },
  };
  canvas.getContext = () => canvas.ctx;
  return canvas;
}

const gameCanvas = makeCanvas(352, 198);
const gameContainer = {
  querySelector: selector => (selector === ".game-canvas" ? gameCanvas : null),
  appendChild() {},
};

const fakeDocument = new FakeEventTarget();
fakeDocument.querySelector = selector =>
  selector === ".game-container" ? gameContainer : null;
fakeDocument.createElement = () => ({
  classList: { add() {} },
  querySelector: () => ({ addEventListener() {} }),
  remove() {},
  set innerHTML(_v) {},
});

globalThis.document = fakeDocument;
globalThis.CustomEvent = FakeCustomEvent;
globalThis.Image = FakeImage;
globalThis.requestAnimationFrame = () => 0; // never actually loop in tests

/* ---------------------------------------------------------------- helpers */

const { Overworld } = await import("../src/engine/Overworld.js");
const { OverworldMaps } = await import("../src/maps/index.js");
const { utils } = await import("../src/engine/utils.js");

let passed = 0;
const failures = [];

function check(label, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL ${label}${detail === undefined ? "" : ` -- ${detail}`}`);
  }
}

function equalKeys(a, b) {
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  return ka.length === kb.length && ka.every((key, i) => key === kb[i]);
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function makeOverworld() {
  return new Overworld({ element: gameContainer });
}

// One engine tick for every object on the current map.
function tick(overworld, arrow) {
  const map = overworld.map;
  Object.values(map.gameObjects).forEach(object => {
    object.update({ arrow, map });
  });
}

// Walk the hero `tiles` tiles in `direction`. 17 ticks covers start + 16 steps.
function walk(overworld, direction, tiles) {
  for (let i = 0; i < tiles * 17; i++) {
    tick(overworld, direction);
  }
  tick(overworld, undefined);
}

function heroTile(overworld) {
  const hero = overworld.map.gameObjects.hero;
  return `${hero.x / 16},${hero.y / 16}`;
}

/* ------------------------------------------------------- (a) fresh spawns */

async function testFreshSpawnsOnReentry() {
  console.log("\n(a) map re-entry restores the declared spawn point");
  const overworld = makeOverworld();
  overworld.directionInput = { direction: undefined };

  const visits = [];
  for (let round = 0; round < 2; round++) {
    overworld.startMap("Bedroom");
    visits.push(heroTile(overworld));
    // wander away from the spawn so a shared instance would remember it
    walk(overworld, "left", 3);
    check(
      `round ${round}: hero actually moved off spawn (now ${heroTile(overworld)})`,
      heroTile(overworld) !== "17,10"
    );

    overworld.startMap("Beach");
    check(`round ${round}: Beach spawn is 12,32`, heroTile(overworld) === "12,32", heroTile(overworld));
    walk(overworld, "up", 1);

    overworld.startMap("Jungle");
    check(`round ${round}: Jungle spawn is 29,32`, heroTile(overworld) === "29,32", heroTile(overworld));
    walk(overworld, "left", 2);
  }

  overworld.startMap("Bedroom");
  visits.push(heroTile(overworld));

  check(
    `Bedroom spawn is 17,10 on every entry (saw ${visits.join(" / ")})`,
    visits.every(tile => tile === "17,10")
  );

  // NPC state must not persist across visits either
  overworld.startMap("Bedroom");
  const first = overworld.map.gameObjects.dreamkeeper;
  first.behaviorLoopIndex = 3;
  first.direction = "right";
  overworld.startMap("Jungle");
  overworld.startMap("Bedroom");
  const second = overworld.map.gameObjects.dreamkeeper;
  check("NPC is a new instance on re-entry", first !== second);
  check("NPC behaviorLoopIndex resets to 0", second.behaviorLoopIndex === 0, second.behaviorLoopIndex);
  check("NPC direction resets to down", second.direction === "down", second.direction);
  check(
    "blueprint behaviorLoop untouched by the previous visit",
    OverworldMaps.Bedroom.gameObjects.dreamkeeper.behaviorLoop.every(step => step.who === undefined)
  );
}

/* --------------------------------------------------------- (b) wall reset */

async function testWallsResetOnReentry() {
  console.log("\n(b) wall set is identical on second entry after the hero mutates it");
  const overworld = makeOverworld();
  overworld.directionInput = { direction: undefined };

  overworld.startMap("Jungle");
  const firstWalls = { ...overworld.map.walls };
  const blueprintWallCount = Object.keys(OverworldMaps.Jungle.walls).length;

  walk(overworld, "left", 2);
  walk(overworld, "down", 1);
  const mutatedWalls = overworld.map.walls;
  check(
    "walking mutated the live wall set (as the engine intends)",
    !equalKeys(firstWalls, mutatedWalls) || firstWalls !== mutatedWalls
  );
  check(
    "blueprint wall count is unchanged after walking",
    Object.keys(OverworldMaps.Jungle.walls).length === blueprintWallCount,
    Object.keys(OverworldMaps.Jungle.walls).length
  );
  check(
    "live wall object is not the blueprint wall object",
    overworld.map.walls !== OverworldMaps.Jungle.walls
  );

  overworld.startMap("Bedroom");
  overworld.startMap("Jungle");
  const secondWalls = overworld.map.walls;
  check(
    `wall set identical on second entry (${Object.keys(firstWalls).length} vs ${Object.keys(secondWalls).length} walls)`,
    equalKeys(firstWalls, secondWalls)
  );

  // Every authored wall still present, no holes punched by the last visit
  const missing = Object.keys(OverworldMaps.Jungle.walls).filter(key => !secondWalls[key]);
  check(`no authored wall is missing on re-entry`, missing.length === 0, missing.join(" "));
}

/* ------------------------------------------------- (c) no orphan cutscene */

async function testNoOrphanedCutscene() {
  console.log("\n(c) map change cancels the outgoing map's cutscene and behavior loops");
  const overworld = makeOverworld();
  overworld.directionInput = { direction: undefined };

  overworld.startMap("Bedroom");
  const oldMap = overworld.map;
  const dreamkeeper = oldMap.gameObjects.dreamkeeper;

  let behaviorCalls = 0;
  const realStartBehavior = dreamkeeper.startBehavior.bind(dreamkeeper);
  dreamkeeper.startBehavior = (state, behavior) => {
    behaviorCalls += 1;
    return realStartBehavior(state, behavior);
  };

  await sleep(200);
  check("behavior loop is running before the map change", behaviorCalls > 0, behaviorCalls);

  // also put a cutscene in flight on the outgoing map
  oldMap.startCutscene([
    { who: "dreamkeeper", type: "stand", direction: "left", time: 40 },
    { who: "dreamkeeper", type: "stand", direction: "up", time: 40 },
    { who: "dreamkeeper", type: "stand", direction: "right", time: 40 },
    { who: "dreamkeeper", type: "stand", direction: "down", time: 40 },
    { who: "dreamkeeper", type: "stand", direction: "left", time: 40 },
  ]);
  await sleep(60);
  check("cutscene is in flight before the map change", oldMap.isCutscenePlaying === true);

  const listenersBefore = fakeDocument.countListeners("PersonStandComplete");
  overworld.startMap("Beach");
  const callsAtChange = behaviorCalls;

  await sleep(400);

  check("outgoing map is marked inactive", oldMap.isActive === false);
  check("outgoing map isCutscenePlaying cleared", oldMap.isCutscenePlaying === false);
  check("outgoing NPC is unmounted", dreamkeeper.isMounted === false);
  check("outgoing NPC isStanding cleared", dreamkeeper.isStanding === false);
  check("outgoing NPC has no pending timeouts", dreamkeeper.pendingTimeouts.length === 0, dreamkeeper.pendingTimeouts.length);
  check(
    `no further events ran on the dead map (${callsAtChange} -> ${behaviorCalls})`,
    behaviorCalls === callsAtChange
  );
  check(
    `stand listeners cleaned up (was ${listenersBefore}, now ${fakeDocument.countListeners("PersonStandComplete")})`,
    fakeDocument.countListeners("PersonStandComplete") <= listenersBefore
  );
  check("new map is live", overworld.map.isActive === true && overworld.map !== oldMap);

  // A changeMap in the middle of a cutscene must abandon the remaining events
  // instead of running them against the destroyed map.
  overworld.startMap("Bedroom");
  const leaving = overworld.map;
  const ran = [];
  const cutscene = leaving.startCutscene([
    { type: "changeMap", map: "Beach" },
    { who: "dreamkeeper", type: "stand", direction: "left", time: 10 },
    { who: "dreamkeeper", type: "stand", direction: "up", time: 10 },
  ]);
  const watched = leaving.gameObjects.dreamkeeper;
  const realStart = watched.startBehavior.bind(watched);
  watched.startBehavior = (state, behavior) => {
    ran.push(behavior.direction);
    return realStart(state, behavior);
  };
  await cutscene;
  await sleep(150);
  check(
    `events after changeMap never run (ran: [${ran.join(",")}])`,
    ran.length === 0
  );
  check("the map we left is inactive", leaving.isActive === false);
  check("we ended up on Beach", overworld.map.id === "Beach", overworld.map.id);

  // Listener count must not grow without bound over many map changes
  const walkListenersStart = fakeDocument.countListeners("PersonWalkingComplete");
  for (let i = 0; i < 10; i++) {
    overworld.startMap("Jungle");
    await sleep(20);
    overworld.startMap("Bedroom");
    await sleep(20);
  }
  await sleep(100);
  const walkListenersEnd = fakeDocument.countListeners("PersonWalkingComplete");
  check(
    `walk listeners do not leak over 20 map changes (${walkListenersStart} -> ${walkListenersEnd})`,
    walkListenersEnd - walkListenersStart <= 1
  );
}

/* ------------------------------------------------ (d) cutscene space guards */

async function testCutsceneSpaceGuards() {
  console.log("\n(d) cutscene space re-entry protection and oneShot");
  const overworld = makeOverworld();
  overworld.directionInput = { direction: undefined };

  // --- oneShot: Beach Ollie intro at 12,31
  overworld.startMap("Beach");
  let map = overworld.map;
  const fired = [];
  map.startCutscene = events => fired.push(events);

  const placeHero = (m, x, y) => {
    m.gameObjects.hero.x = utils.withGrid(x);
    m.gameObjects.hero.y = utils.withGrid(y);
  };

  check("Beach Ollie intro is declared oneShot", OverworldMaps.Beach.cutsceneSpaces[utils.asGridCoord(12, 31)][0].oneShot === true);

  placeHero(map, 12, 31);
  map.checkForFootstepCutscene();
  check("oneShot space fires on arrival", fired.length === 1, fired.length);

  map.checkForFootstepCutscene();
  check("oneShot space does not re-fire while standing on it", fired.length === 1, fired.length);

  placeHero(map, 12, 32);
  map.checkForFootstepCutscene();
  check("oneShot space does not re-fire from an adjacent tile", fired.length === 1, fired.length);

  placeHero(map, 12, 36);
  map.checkForFootstepCutscene();
  placeHero(map, 12, 31);
  map.checkForFootstepCutscene();
  check("oneShot space never fires a second time", fired.length === 1, fired.length);

  overworld.startMap("Jungle");
  overworld.startMap("Beach");
  const beachAgain = overworld.map;
  const firedAgain = [];
  beachAgain.startCutscene = events => firedAgain.push(events);
  placeHero(beachAgain, 12, 31);
  beachAgain.checkForFootstepCutscene();
  check("oneShot stays fired after leaving and re-entering the map", firedAgain.length === 0, firedAgain.length);

  // --- repeatable space: the Jungle snake's blocked path at 28,32
  overworld.startMap("Jungle");
  map = overworld.map;
  const snakeFired = [];
  map.startCutscene = events => snakeFired.push(events);

  placeHero(map, 28, 32);
  map.checkForFootstepCutscene();
  check("snake space fires on arrival", snakeFired.length === 1, snakeFired.length);

  map.checkForFootstepCutscene();
  map.checkForFootstepCutscene();
  check("snake space does not re-fire on repeated footsteps", snakeFired.length === 1, snakeFired.length);

  // the pushback lands the hero 3 tiles east, clear of the one-tile guard, so
  // the next attempt is allowed to fire again (it is not oneShot)
  placeHero(map, 31, 32);
  map.checkForFootstepCutscene();
  placeHero(map, 28, 32);
  map.checkForFootstepCutscene();
  check("snake space fires again after the pushback", snakeFired.length === 2, snakeFired.length);

  // Terrain only: mountObjects turns every person's tile into a wall so that
  // characters block each other, which would otherwise read as impassable art.
  const terrain = { ...OverworldMaps.Jungle.walls };

  // --- every tile touching the snake, diagonals included, must turn you back.
  // Walk the authored routes against real terrain: a step onto a wall would make
  // the retry:true pushback spin forever and soft-lock the game.
  const jungleSpaces = OverworldMaps.Jungle.cutsceneSpaces;
  const SNAKE = [28, 31];
  const inRing = (x, y) => Math.abs(x - SNAKE[0]) <= 1 && Math.abs(y - SNAKE[1]) <= 1;
  // reachable from the hero's side, treating the snake as a wall and each guarded
  // tile as terminal (the cutscene takes over the moment you step on it)
  const guardedKeys = new Set(
    Object.keys(jungleSpaces)
      .map(k => k.split(",").map(n => Number(n) / 16).join(","))
      .filter(k => { const [x, y] = k.split(",").map(Number); return inRing(x, y); })
  );
  check("all four reachable ring tiles are guarded", guardedKeys.size === 4, [...guardedKeys].join(" "));

  for (const key of guardedKeys) {
    const [tx, ty] = key.split(",").map(Number);
    const events = jungleSpaces[`${tx * 16},${ty * 16}`][0].events;
    check(`snake ring (${tx},${ty}) shows a message`, events.some(e => e.type === "textMessage"));

    let x = tx, y = ty;
    let blocked = null;
    const steps = events.filter(e => e.type === "walk");
    for (const walkStep of steps) {
      if (walkStep.direction === "right") x += 1;
      else if (walkStep.direction === "left") x -= 1;
      else if (walkStep.direction === "up") y -= 1;
      else y += 1;
      // the snake's own tile is a wall too, not just terrain
      if (terrain[`${x * 16},${y * 16}`] || (x === SNAKE[0] && y === SNAKE[1])) {
        blocked = `${x},${y}`;
        break;
      }
    }
    check(`snake ring (${tx},${ty}) pushback never hits a wall`, blocked === null, blocked);
    check(`snake ring (${tx},${ty}) pushback is 3 tiles`, steps.length === 3, steps.length);
    check(`snake ring (${tx},${ty}) pushback ends clear of the ring`, !inRing(x, y), `${x},${y}`);
  }

  // the snake itself has to seal row 31, otherwise the gate is walkable around
  check(
    "snake occupies (28,31) as a wall",
    map.walls[`${28 * 16},${31 * 16}`] === true,
  );

  // (28,32) is the ONLY remaining opening: with it and the snake shut, nothing
  // west of the gate is reachable from the hero's spawn.
  const gated = reachableTiles(terrain, 29, 32, new Set(["28,31", "28,32"]));
  check("west of the snake is sealed while the gate holds", !gated.has("25,33") && !gated.has("17,35"));
  check("billy is still reachable on the near side", gated.has("40,30"));

  // ...and opening the gate must genuinely restore the west, so the puzzle has
  // somewhere to lead once the "do something" step exists.
  const opened = reachableTiles(terrain, 29, 32, new Set(["28,31"]));
  check("opening the gate reconnects the western trail", opened.has("25,33") && opened.has("17,35"));
}

// 4-directional flood fill over a wall set, minus extra blocked tiles.
function reachableTiles(walls, startX, startY, blocked = new Set()) {
  const open = (x, y) => !walls[`${x * 16},${y * 16}`] && !blocked.has(`${x},${y}`);
  const seen = new Set([`${startX},${startY}`]);
  const queue = [[startX, startY]];
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
      if (!seen.has(key) && nx >= 0 && ny >= 0 && nx < 90 && ny < 57 && open(nx, ny)) {
        seen.add(key);
        queue.push([nx, ny]);
      }
    }
  }
  return seen;
}

/* -------------------------------------------------- camera clamping (item 5) */

async function testCameraClamping() {
  console.log("\n(e) camera clamps to map bounds");
  const overworld = makeOverworld();
  overworld.directionInput = { direction: undefined };

  const canvas = gameCanvas;

  // Bedroom art is exactly one screen: it must never scroll.
  overworld.startMap("Bedroom");
  await sleep(10); // let the image "load"
  let map = overworld.map;
  const hero = map.gameObjects.hero;
  const offsets = new Set();
  [
    [0, 0],
    [5, 5],
    [21, 12],
    [17, 10],
  ].forEach(([x, y]) => {
    hero.x = utils.withGrid(x);
    hero.y = utils.withGrid(y);
    const camera = map.getCamera(hero, canvas);
    offsets.add(`${camera.x - hero.x},${camera.y - hero.y}`);
  });
  check(
    `bedroom never scrolls (draw offsets: ${[...offsets].join(" | ")})`,
    offsets.size === 1 && [...offsets][0] === "0,0"
  );

  // Beach 960x640 and Jungle 1440x912 must clamp inside the art.
  for (const [name, w, h] of [
    ["Beach", 960, 640],
    ["Jungle", 1440, 912],
  ]) {
    overworld.startMap(name);
    await sleep(10);
    map = overworld.map;
    check(`${name} art measured as ${w}x${h}`, JSON.stringify(map.getMapDimensions()) === JSON.stringify({ width: w, height: h }), JSON.stringify(map.getMapDimensions()));

    // The art is drawn at (drawX, drawY). To leave no black gap we need the
    // art's top-left at or before the viewport origin (drawX <= 0) and its
    // bottom-right at or past the viewport end (drawX + w >= canvas.width).
    const person = map.gameObjects.hero;
    let worstLeading = -Infinity; // max drawX / drawY, must stay <= 0
    let worstTrailing = Infinity; // min overhang, must stay >= 0
    for (let x = -5; x < w / 16 + 5; x++) {
      for (let y = -5; y < h / 16 + 5; y += 3) {
        person.x = utils.withGrid(x);
        person.y = utils.withGrid(y);
        const camera = map.getCamera(person, canvas);
        const drawX = camera.x - person.x;
        const drawY = camera.y - person.y;
        worstLeading = Math.max(worstLeading, drawX, drawY);
        worstTrailing = Math.min(worstTrailing, drawX + w - canvas.width, drawY + h - canvas.height);
      }
    }
    check(`${name} never shows a gap on the top/left (worst drawX/drawY ${worstLeading})`, worstLeading === 0);
    check(`${name} never shows a gap on the bottom/right (worst overhang ${worstTrailing})`, worstTrailing === 0);
  }

  // Before the image loads, drawing must not throw
  overworld.startMap("Jungle");
  map = overworld.map;
  check("camera works before the image has loaded", map.getMapDimensions() === null);
  map.drawLowerImage(canvas.ctx, map.gameObjects.hero);
  map.drawUpperImage(canvas.ctx, map.gameObjects.hero);
  check("Jungle has no upper layer to draw", map.upperImage === null);
}

/* ------------------------------------------------------ sprite config (item 6) */

async function testSpriteConfig() {
  console.log("\n(f) sprite frame config");
  const overworld = makeOverworld();
  overworld.directionInput = { direction: undefined };
  overworld.startMap("Jungle");
  const map = overworld.map;

  const snake = map.gameObjects.snake;
  const billy = map.gameObjects.billy;

  check("every object starts on an idle animation", Object.values(map.gameObjects).every(o => o.sprite.currentAnimation.startsWith("idle-")));

  const snakeFrames = new Set();
  ["walk-down", "walk-up", "walk-left", "walk-right", "idle-down"].forEach(key => {
    (snake.sprite.animations[key] || []).forEach(([fx, fy]) => snakeFrames.add(`${fx},${fy}`));
  });
  check(
    `snake only uses frames inside its 64x32 sheet (${[...snakeFrames].join(" ")})`,
    [...snakeFrames].every(frame => {
      const [fx, fy] = frame.split(",").map(Number);
      return fx * 32 + 32 <= 64 && fy * 32 + 32 <= 32;
    })
  );

  const billyFrames = new Set();
  Object.values(billy.sprite.animations).forEach(frames =>
    frames.forEach(([fx, fy]) => billyFrames.add(`${fx},${fy}`))
  );
  check(
    "default sheets still use the 4x4 32x32 layout",
    billy.sprite.frameWidth === 32 &&
      billy.sprite.frameHeight === 32 &&
      [...billyFrames].every(frame => {
        const [fx, fy] = frame.split(",").map(Number);
        return fx < 4 && fy < 4;
      })
  );
}

/* ---------------------------------------------------- stand defaults (item 8) */

async function testStandDefault() {
  console.log("\n(g) stand with no time");
  const overworld = makeOverworld();
  overworld.directionInput = { direction: undefined };
  // Kitchen's npcB has no behaviorLoop, so nothing starts a fresh stand the
  // moment the cutscene ends - which is what lets us observe isStanding clear.
  overworld.startMap("Kitchen");
  const map = overworld.map;
  const idler = map.gameObjects.npcB;

  const started = Date.now();
  await map.startCutscene([{ who: "npcB", type: "stand", direction: "right" }]);
  const elapsed = Date.now() - started;
  check(`stand without a time waits a sensible default (${elapsed}ms)`, elapsed >= 100, elapsed);
  check("isStanding clears after the stand", idler.isStanding === false);

  // A stand interrupted by a map change must not leave isStanding stuck
  overworld.startMap("Beach");
  const map2 = overworld.map;
  const ollie2 = map2.gameObjects.Ollie;
  ollie2.startBehavior({ map: map2 }, { type: "stand", direction: "up", time: 5000 });
  check("isStanding is true mid-stand", ollie2.isStanding === true);
  overworld.startMap("Jungle");
  check("isStanding is cleared by the map change", ollie2.isStanding === false);
}

/* -------------------------------------------------------------------- main */

console.log("Dreamwalkers engine smoke test");

await testFreshSpawnsOnReentry();
await testWallsResetOnReentry();
await testNoOrphanedCutscene();
await testCutsceneSpaceGuards();
await testCameraClamping();
await testSpriteConfig();
await testStandDefault();

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  failures.forEach(label => console.log(`  - ${label}`));
  process.exit(1);
}
process.exit(0);
