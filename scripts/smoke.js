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

// Minimal in-memory localStorage so the inventory's persistence path runs under
// test the same way it does in a browser.
const fakeStore = new Map();
globalThis.localStorage = {
  getItem: key => (fakeStore.has(key) ? fakeStore.get(key) : null),
  setItem: (key, value) => { fakeStore.set(key, String(value)); },
  removeItem: key => { fakeStore.delete(key); },
  clear: () => { fakeStore.clear(); },
};

/* ---------------------------------------------------------------- helpers */

const { Overworld } = await import("../src/engine/Overworld.js");
const { OverworldMaps } = await import("../src/maps/index.js");
const { utils } = await import("../src/engine/utils.js");
const { Inventory } = await import("../src/ui/Inventory.js");
const { OverworldEvent } = await import("../src/engine/OverworldEvent.js");

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
    check(`round ${round}: Jungle spawn is 61,11`, heroTile(overworld) === "61,11", heroTile(overworld));
    walk(overworld, "left", 1);
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

  const walkTile = (x, y, dir) =>
    dir === "right" ? [x + 1, y] : dir === "left" ? [x - 1, y]
      : dir === "up" ? [x, y - 1] : [x, y + 1];
  for (const key of guardedKeys) {
    const [tx, ty] = key.split(",").map(Number);
    const events = jungleSpaces[`${tx * 16},${ty * 16}`][0].events;
    check(`snake ring (${tx},${ty}) shows a message`, events.some(e => e.type === "textMessage"));

    // The turn-back walks now live in the flute question's `no` branch (played
    // when you have no flute / decline). Pull them from there.
    const question = events.find(e => e.type === "question");
    check(`snake ring (${tx},${ty}) offers the flute`, !!question && Array.isArray(question.no));
    const steps = (question.no || []).filter(e => e.type === "walk");

    let x = tx, y = ty;
    let blocked = null;
    for (const walkStep of steps) {
      [x, y] = walkTile(x, y, walkStep.direction);
      // the snake's own tile is a wall too, not just terrain
      if (terrain[`${x * 16},${y * 16}`] || (x === SNAKE[0] && y === SNAKE[1])) {
        blocked = `${x},${y}`;
        break;
      }
    }
    check(`snake ring (${tx},${ty}) pushback never hits a wall`, blocked === null, blocked);
    check(`snake ring (${tx},${ty}) pushback is 3 tiles`, steps.length === 3, steps.length);
    check(`snake ring (${tx},${ty}) pushback ends clear of the ring`, !inRing(x, y), `${x},${y}`);

    // The flute `yes` branch must set the sleep flag and remove the snake so the
    // gate opens, and its own retreat walk must never hit a wall either.
    const yes = question.yes || [];
    check(`snake ring (${tx},${ty}) flute sets snakeAsleep`, yes.some(e => e.type === "setFlag" && e.flag === "snakeAsleep"));
    check(`snake ring (${tx},${ty}) flute removes the snake`, yes.some(e => e.type === "removeObject" && e.who === "snake"));
    let yx = tx, yy = ty, yBlocked = null;
    for (const walkStep of yes.filter(e => e.type === "walk")) {
      [yx, yy] = walkTile(yx, yy, walkStep.direction);
      // the snake has just left, so its tile is walkable in this branch
      if (terrain[`${yx * 16},${yy * 16}`]) { yBlocked = `${yx},${yy}`; break; }
    }
    check(`snake ring (${tx},${ty}) flute retreat never hits a wall`, yBlocked === null, yBlocked);
  }

  // the snake itself has to seal row 31, otherwise the gate is walkable around
  check(
    "snake occupies (28,31) as a wall",
    map.walls[`${28 * 16},${31 * 16}`] === true,
  );

  // (28,32) is the ONLY remaining opening: with it and the snake shut, nothing
  // west of the gate is reachable from the hero's spawn.
  const gated = reachableTiles(terrain, 61, 11, new Set(["28,31", "28,32"]));
  check("west of the snake is sealed while the gate holds", !gated.has("25,33") && !gated.has("17,35"));
  check("billy is still reachable on the near side", gated.has("40,30"));

  // ...and opening the gate must genuinely restore the west, so the puzzle has
  // somewhere to lead once the "do something" step exists.
  const opened = reachableTiles(terrain, 61, 11, new Set(["28,31"]));
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

/* ------------------------------------------- Ollie's escort walk to Billy */

//The escort is 77 sequential walks with retry:true, so a single step into an
//occupied tile hangs the game permanently. Replay the authored routes against
//the real wall data using the engine's own wall bookkeeping (walls move when a
//walk STARTS, which is what lets the follower enter the tile the leader just
//left) and prove every step lands on open ground.
async function testOllieEscort() {
  console.log("\n(h) Ollie escorts the hero to Billy");
  const jungle = OverworldMaps.Jungle;
  const blueprint = jungle.gameObjects;

  const ollieStart = [blueprint.Ollie.x / 16, blueprint.Ollie.y / 16];
  const billy = [blueprint.billy.x / 16, blueprint.billy.y / 16];

  // Ollie must sit in a dead end, so talking to him is only possible from one
  // tile and the routes have a single starting layout to satisfy.
  const terrain = { ...jungle.walls };
  const open = (x, y) => !terrain[`${x * 16},${y * 16}`];
  const neighbours = [[0, -1], [0, 1], [-1, 0], [1, 0]]
    .filter(([dx, dy]) => open(ollieStart[0] + dx, ollieStart[1] + dy));
  check("Ollie sits in a dead end (one approach only)", neighbours.length === 1,
    neighbours.map(([dx, dy]) => `${ollieStart[0] + dx},${ollieStart[1] + dy}`).join(" "));
  const heroStart = [ollieStart[0] + neighbours[0][0], ollieStart[1] + neighbours[0][1]];

  // The escort is the first talking option and must be one-shot: replaying it
  // from anywhere else walks someone into a wall and never recovers.
  const scene = blueprint.Ollie.talking[0];
  check("the escort is oneShot", scene.oneShot === true);
  check("Ollie has a follow-up line for afterwards", blueprint.Ollie.talking.length > 1);

  // Walk the whole scene. Every person is a wall (mountObjects does this), so
  // seed the occupied set with all three characters.
  const walls = new Set(Object.keys(terrain).map(k => k.split(",").map(n => Number(n) / 16).join(",")));
  const at = { Ollie: [...ollieStart], hero: [...heroStart], billy: [...billy] };
  Object.values(at).forEach(([x, y]) => walls.add(`${x},${y}`));

  const DELTAS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  let blockedAt = null;
  let walkCount = 0;
  // Leadership guard: Ollie must lead, so while he is still travelling the hero
  // must never stand on ground Ollie hasn't already crossed. The one allowed
  // exception is the yield tile just off the trail (up from the hero's start).
  // Once Ollie reaches his final tile (Billy's right) he has arrived and is
  // leading by definition, so the hero completing his own last steps to the
  // spot in front of Billy no longer counts. A violation before then means the
  // hero walked out in front - the exact bug this scene was rewritten to fix.
  const ollieVisited = new Set([`${at.Ollie}`]);
  const yieldTile = `${heroStart[0]},${heroStart[1] - 1}`;
  const ollieEnd = `${billy[0] + 1},${billy[1]}`;
  let heroLed = null;
  for (const event of scene.events) {
    if (event.type !== "walk") continue;
    walkCount++;
    const who = event.who;
    const [dx, dy] = DELTAS[event.direction];
    const from = at[who];
    const to = [from[0] + dx, from[1] + dy];
    if (walls.has(`${to[0]},${to[1]}`)) {
      blockedAt = `${who} step #${walkCount} ${event.direction} into ${to}`;
      break;
    }
    walls.delete(`${from[0]},${from[1]}`);
    walls.add(`${to[0]},${to[1]}`);
    at[who] = to;
    ollieVisited.add(`${at.Ollie}`);
    const heroKey = `${at.hero}`;
    const ollieArrived = `${at.Ollie}` === ollieEnd;
    if (!heroLed && !ollieArrived && heroKey !== yieldTile && !ollieVisited.has(heroKey)) {
      heroLed = `hero on ${heroKey} at step #${walkCount} before Ollie`;
    }
  }
  check("no step in the escort is ever blocked", blockedAt === null, blockedAt);
  check("the escort actually walks somewhere", walkCount > 30, walkCount);
  check("Ollie leads - the hero never walks out in front", heroLed === null, heroLed);

  // Requested final tableau: hero in front of Billy, Ollie on Billy's right.
  check("hero ends in front of Billy", `${at.hero}` === `${billy[0]},${billy[1] + 1}`, `${at.hero}`);
  check("Ollie ends on Billy's right", `${at.Ollie}` === `${billy[0] + 1},${billy[1]}`, `${at.Ollie}`);
  check("Billy never moves", `${at.billy}` === `${billy}`);

  // Billy's thank-you is the payoff and has to come last.
  const messages = scene.events.filter(e => e.type === "textMessage");
  check("Billy thanks you near the end of the scene",
    messages.some(m => /THANK YOU for finding Ollie/.test(m.text)));

  // The escort hands over a flute as a reward, right after the thank-you.
  const gift = scene.events.find(e => e.type === "addToInventory");
  check("the escort gives you the flute", gift && gift.item.name === "Flute");
  const thanksIdx = scene.events.findIndex(e => e.type === "textMessage" && /THANK YOU/.test(e.text));
  check("the flute is given after Billy thanks you",
    gift && scene.events.indexOf(gift) > thanksIdx);

  // A spent one-shot conversation must fall through instead of replaying.
  const overworld = makeOverworld();
  overworld.directionInput = { direction: undefined };
  overworld.startMap("Jungle");
  const map = overworld.map;
  const hero = map.gameObjects.hero;
  map.removeWall(hero.x, hero.y);
  hero.x = heroStart[0] * 16;
  hero.y = heroStart[1] * 16;
  map.addWall(hero.x, hero.y);
  // neighbours[0] points from Ollie to the hero, so face the hero back at him.
  hero.direction = neighbours[0][0] < 0 ? "right" : neighbours[0][0] > 0 ? "left"
    : neighbours[0][1] < 0 ? "down" : "up";

  // Record which scene each conversation starts instead of letting the walks run.
  const started = [];
  map.startCutscene = events => { started.push(events); };

  map.checkForActionCutscene();
  check("talking to Ollie starts the escort", started.length === 1 && started[0] === scene.events);
  check("the one-shot escort was recorded",
    overworld.hasCompletedOneShot("Jungle", "talk:Ollie") === true);

  // Talk again: must fall through to the follow-up line, never replay the walk.
  map.checkForActionCutscene();
  check("talking again does not replay the escort",
    started.length === 2 && started[1] !== scene.events);
  check("talking again gives the follow-up line",
    started[1] === blueprint.Ollie.talking[1].events);
}

/* ---------------------------------------- inventory pickups + persistence */

//A picked-up item must (a) fire the onItemAdded callback so the overworld can
//toast "Obtained <name>!", (b) actually land in the bag, and (c) survive a
//"reload" via localStorage - a fresh Inventory reads the saved contents back.
async function testInventoryPickup() {
  console.log("\n(i) inventory pickups notify and persist");
  localStorage.clear();

  const container = { appendChild() {} };
  const added = [];
  const bag = new Inventory({
    container,
    onItemAdded: item => added.push(item),
  });

  const before = bag.items.length;
  bag.addItem({ icon: "🪈", name: "Flute", count: 1 });
  check("onItemAdded fires with the picked-up item", added.length === 1 && added[0].name === "Flute");
  check("the item lands in the bag", bag.items.some(i => i.name === "Flute" && i.count === 1));
  check("adding a new item grows the bag by one", bag.items.length === before + 1);

  // Same item again bumps the count instead of duplicating.
  bag.addItem({ icon: "🪈", name: "Flute", count: 1 });
  check("re-adding bumps the count", bag.items.find(i => i.name === "Flute").count === 2);
  check("re-adding does not duplicate the row", bag.items.filter(i => i.name === "Flute").length === 1);

  // "Reload": a fresh Inventory should load the exact saved bag.
  const savedLength = bag.items.length;
  const reloaded = new Inventory({ container });
  const flute = reloaded.items.find(i => i.name === "Flute");
  check("a fresh inventory loads the saved bag (localStorage)", flute && flute.count === 2);
  check("reload restores the whole saved bag", reloaded.items.length === savedLength);

  // With nothing saved, a fresh inventory falls back to the defaults.
  localStorage.clear();
  const fresh = new Inventory({ container });
  check("an empty store falls back to the default items",
    fresh.items.some(i => i.name === "Dream Shard"));
  check("a fresh bag has no leftover Flute", !fresh.items.some(i => i.name === "Flute"));

  localStorage.clear();
}

/* -------------------------------------- Billy's dialogue + flute snake puzzle */

async function testStoryProgression() {
  console.log("\n(j) Billy's thank-you and the flute snake puzzle");
  const overworld = makeOverworld();
  overworld.directionInput = { direction: undefined };
  overworld.startMap("Jungle");
  const map = overworld.map;

  // --- Billy swaps his line once Ollie is home ---
  const billy = map.gameObjects.billy;
  const pick = () => billy.talking.find(o => !o.when || o.when(map));
  const before = pick();
  check("Billy asks about his otter before Ollie is home",
    before.events.some(e => /otter/.test(e.text)));
  overworld.markCompletedOneShot("Jungle", "talk:Ollie");
  const after = pick();
  check("Billy thanks you once Ollie is home",
    after.events.some(e => /thank you btw for returning ollie/i.test(e.text)));
  check("Billy's old otter line is gone after returning Ollie",
    !after.events.some(e => /where do i go|wonder where my otter/.test(e.text)));

  // --- snake space gates on the snakeAsleep flag ---
  const guard = OverworldMaps.Jungle.cutsceneSpaces[utils.asGridCoord(28, 32)][0];
  const fakeMapNoFlag = { overworld: { hasFlag: () => false } };
  const fakeMapAsleep = { overworld: { hasFlag: () => true } };
  check("snake block is live while the snake is awake", guard.when(fakeMapNoFlag) === true);
  check("snake block stops firing once the snake is asleep", guard.when(fakeMapAsleep) === false);

  // --- the flute question runs its branches; hasFlag/hasItem/removeObject work ---
  // No flute: the question skips straight to the turn-back (never resolves yes).
  overworld.inventory = { items: [] };
  const q = guard.events.find(e => e.type === "question");
  check("the flute question only shows when you hold a Flute",
    q.when({ overworld }) === false);
  overworld.inventory = { items: [{ name: "Flute", count: 1 }] };
  check("the flute question shows once you have the Flute",
    q.when({ overworld }) === true);

  // Play the flute and prove the snake is gone, its wall is freed, and the flag
  // is set. Run only the effectful events (textMessage/stand wait on input or
  // timers, which never resolve in this headless slice).
  check("snake exists before the flute", !!map.gameObjects.snake);
  const snakeKey = `${map.gameObjects.snake.x},${map.gameObjects.snake.y}`;
  for (const event of q.yes) {
    if (event.type === "setFlag" || event.type === "removeObject") {
      await new OverworldEvent({ map, event }).init();
    }
  }
  check("playing the flute sets snakeAsleep", overworld.hasFlag("snakeAsleep") === true);
  check("the snake is removed after the flute", !map.gameObjects.snake);
  check("the snake's wall is freed after the flute", !map.walls[snakeKey]);
  // With the snake asleep, the guard no longer fires - the puzzle is solved.
  check("the snake block is dead once solved", guard.when(map) === false);
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
await testOllieEscort();
await testInventoryPickup();
await testStoryProgression();

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  failures.forEach(label => console.log(`  - ${label}`));
  process.exit(1);
}
process.exit(0);
