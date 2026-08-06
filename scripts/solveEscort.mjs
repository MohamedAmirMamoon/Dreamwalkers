// Re-solve the Jungle escort so Ollie LEADS the hero to Billy (instead of the
// hero walking out in front - the bug this replaces).
//
// Ollie starts in the dead-end pocket at (71,27), EAST of the hero at (70,27),
// and the trail out is single-file. So before Ollie can lead he has to overtake:
//
//   1. the hero steps UP to (70,26) to clear the corridor,
//   2. Ollie takes TWO solo steps west along row 27 - past the hero's old tile
//      and one beyond - so he is genuinely ahead,
//   3. the hero drops back down onto Ollie's vacated tile and from there follows
//      in Ollie's exact footsteps, one tile behind, the whole way to Billy.
//
// This is a conga line under the engine's moving-wall rule: a walk frees the
// mover's tile the instant it STARTS, so the follower can always step into the
// tile the leader just left. We BFS Ollie's path, derive the hero's trailing
// path, replay the interleaved steps through that same bookkeeping, and assert
// (a) no step is ever blocked, (b) the final tableau is right, and (c) the hero
// is never on a tile Ollie hasn't already visited - i.e. Ollie always leads.
//
// Prints the exact event sequence to paste into src/maps/index.js.
// Run with: node scripts/solveEscort.mjs   (TRACE=1 for a step-by-step dump)

import { OverworldMaps } from "../src/maps/index.js";

const jungle = OverworldMaps.Jungle;
const walls = jungle.walls;
const open = (x, y) => !walls[`${x * 16},${y * 16}`];

const OLLIE_START = [71, 27];
const HERO_START = [70, 27];
const HERO_WAIT = [70, 26]; // off-trail tile the hero yields onto
const BILLY = [jungle.gameObjects.billy.x / 16, jungle.gameObjects.billy.y / 16];
const OLLIE_END = [BILLY[0] + 1, BILLY[1]]; // Billy's right
const HERO_END = [BILLY[0], BILLY[1] + 1];  // in front of Billy

const DELTAS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const key = t => `${t[0]},${t[1]}`;
const eq = (a, b) => a[0] === b[0] && a[1] === b[1];
const dirOf = (from, to) => Object.keys(DELTAS).find(
  d => DELTAS[d][0] === to[0] - from[0] && DELTAS[d][1] === to[1] - from[1]);

// 4-connected shortest path over the walkable trail.
function bfsPath(start, goal, blocked = new Set()) {
  const q = [start];
  const prev = { [key(start)]: null };
  while (q.length) {
    const cur = q.shift();
    if (eq(cur, goal)) break;
    for (const [dx, dy] of Object.values(DELTAS)) {
      const n = [cur[0] + dx, cur[1] + dy];
      if (key(n) in prev || !open(...n) || blocked.has(key(n))) continue;
      prev[key(n)] = key(cur);
      q.push(n);
    }
  }
  if (!(key(goal) in prev)) return null;
  const path = [];
  for (let c = key(goal); c; c = prev[c]) path.unshift(c.split(",").map(Number));
  return path;
}

if (!open(...HERO_WAIT)) throw new Error("hero waiting tile 70,26 is not open");

// Ollie's lead path. (70,26) is the hero's waiting tile, so it's off-limits to
// Ollie - which forces his shortest path out of the pocket along row 27.
const olliePath = bfsPath(OLLIE_START, OLLIE_END, new Set([key(BILLY), key(HERO_WAIT)]));
if (!olliePath) throw new Error("no path for Ollie");

// Hero's trailing path: yield up, drop back down onto Ollie's first vacated
// corridor tile (70,27), then trace Ollie's own tiles up to the one before his
// final tile, and divert to the spot in front of Billy.
const trail = olliePath.slice(1, olliePath.length - 1); // (70,27) ... tile before Billy's right
const toBilly = bfsPath(trail[trail.length - 1], HERO_END, new Set([key(BILLY), key(OLLIE_END)])).slice(1);
const heroTiles = [HERO_START, HERO_WAIT, ...trail, ...toBilly];
let heroPath = heroTiles.filter((t, i) => i === 0 || !eq(t, heroTiles[i - 1]));
// Collapse A->B->A backtracks (the hero following Ollie one tile too far near
// Billy, then stepping back to divert). Skip index 1: the yield
// (70,27)->(70,26)->(70,27) is a deliberate A->B->A, not a wobble.
for (let changed = true; changed; ) {
  changed = false;
  for (let i = 2; i + 1 < heroPath.length; i++) {
    if (eq(heroPath[i - 1], heroPath[i + 1])) {
      heroPath.splice(i, 2);
      changed = true;
      break;
    }
  }
}
for (let i = 1; i < heroPath.length; i++) {
  if (!dirOf(heroPath[i - 1], heroPath[i])) throw new Error(`hero hop ${i}: ${heroPath[i - 1]} -> ${heroPath[i]}`);
  if (!open(...heroPath[i])) throw new Error(`hero step ${i} onto wall ${heroPath[i]}`);
}

const pathToDirs = p => p.slice(1).map((t, i) => dirOf(p[i], t));
const ollieDirs = pathToDirs(olliePath);
const heroDirs = pathToDirs(heroPath);

// Build the interleaved event order. The hero yields (up) first; then Ollie
// takes TWO solo steps to get ahead; then Ollie/hero alternate. The hero has
// one fewer "travel" step than Ollie (he stops one tile short and diverts), so
// the counts line up: heroDirs = [up, down, ...trail..., divert].
const events = [];
events.push({ who: "hero", dir: heroDirs[0] });   // up, yield off-trail
events.push({ who: "Ollie", dir: ollieDirs[0] }); // solo step 1
events.push({ who: "Ollie", dir: ollieDirs[1] }); // solo step 2 - Ollie now ahead
for (let i = 1; i < heroDirs.length; i++) {
  events.push({ who: "hero", dir: heroDirs[i] });
  if (i + 1 < ollieDirs.length) events.push({ who: "Ollie", dir: ollieDirs[i + 1] });
}

// ---- Replay through the engine's moving-wall bookkeeping ----
const occupied = new Set(Object.keys(walls).map(k => k.split(",").map(n => Number(n) / 16).join(",")));
const at = { Ollie: [...OLLIE_START], hero: [...HERO_START], billy: [...BILLY] };
Object.values(at).forEach(p => occupied.add(key(p)));

const ollieVisited = new Set([key(OLLIE_START)]);
let blocked = null, heroAhead = null, maxGap = 0;
events.forEach((s, idx) => {
  if (blocked) return;
  const [dx, dy] = DELTAS[s.dir];
  const from = at[s.who];
  const to = [from[0] + dx, from[1] + dy];
  if (occupied.has(key(to))) { blocked = `#${idx} ${s.who} ${s.dir} into ${to}`; return; }
  occupied.delete(key(from));
  occupied.add(key(to));
  at[s.who] = to;
  ollieVisited.add(key(at.Ollie));
  // Hero must never stand on ground Ollie hasn't already covered (the waiting
  // tile 70,26 excepted). If he does, he's leading - the bug.
  if (!eq(at.hero, HERO_WAIT) && !ollieVisited.has(key(at.hero)) && !heroAhead) {
    heroAhead = `#${idx}: hero on ${key(at.hero)} before Ollie`;
  }
  maxGap = Math.max(maxGap, Math.max(Math.abs(at.Ollie[0] - at.hero[0]), Math.abs(at.Ollie[1] - at.hero[1])));
  if (process.env.TRACE) console.log(`#${idx} ${s.who} ${s.dir} -> Ollie ${at.Ollie} hero ${at.hero}`);
});

// RLE only the contiguous same-who runs so we can hand the map two clean routes
// plus the fixed lead-in. Here we just report per-character direction lists.
const CODE = { up: "u", down: "d", left: "l", right: "r" };
const rle = dirs => {
  const out = []; let run = 1;
  for (let i = 1; i <= dirs.length; i++) {
    if (dirs[i] === dirs[i - 1]) { run++; continue; }
    out.push(`${run}${CODE[dirs[i - 1]]}`); run = 1;
  }
  return out.join(" ");
};

console.log("blocked:   ", blocked);
console.log("hero ahead:", heroAhead, "(only the final tile in front of Billy is expected)");
console.log("max gap:   ", maxGap, "tiles");
console.log("Ollie ends:", at.Ollie.join(","), "(want", OLLIE_END.join(","), ")");
console.log("hero  ends:", at.hero.join(","), "(want", HERO_END.join(","), ")");
console.log("");
console.log("Paste into src/maps/index.js (Ollie's talking[0] escort):");
console.log("-----------------------------------------------------------");
console.log(`{ who: "hero",  type: "walk", direction: "up" },   // yield off-trail`);
console.log(`{ who: "Ollie", type: "walk", direction: "${ollieDirs[0]}" }, // solo 1`);
console.log(`{ who: "Ollie", type: "walk", direction: "${ollieDirs[1]}" }, // solo 2 - Ollie now ahead`);
console.log(`...escort(`);
console.log(`  "hero",  "${rle(heroDirs.slice(1))}",`);
console.log(`  "Ollie", "${rle(ollieDirs.slice(2))}",`);
console.log(`),`);
