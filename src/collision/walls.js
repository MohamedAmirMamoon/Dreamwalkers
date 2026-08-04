// Declarative wall helpers.
//
// Every helper returns a plain `{ "x,y": true }` object with pixel-space keys
// (matching utils.asGridCoord), so the engine consumes them with no changes.
// Coordinates passed in are TILE coordinates.

import { utils } from "../engine/utils.js";

const key = (x, y) => utils.asGridCoord(x, y);

// Explicit list of tiles. The escape hatch.
export function points(tiles) {
  const out = {};
  for (const [x, y] of tiles) out[key(x, y)] = true;
  return out;
}

// Straight or diagonal run from (x1,y1) to (x2,y2), inclusive.
// Handles horizontal, vertical, and 45-degree diagonal runs — anything else
// is walked via a simple Bresenham line.
export function line(x1, y1, x2, y2) {
  const out = {};
  const dx = Math.sign(x2 - x1);
  const dy = Math.sign(y2 - y1);
  const adx = Math.abs(x2 - x1);
  const ady = Math.abs(y2 - y1);
  if (adx === 0 || ady === 0 || adx === ady) {
    // straight or 45-degree
    const steps = Math.max(adx, ady);
    for (let i = 0; i <= steps; i++) {
      out[key(x1 + i * dx, y1 + i * dy)] = true;
    }
    return out;
  }
  // arbitrary Bresenham
  let x = x1, y = y1;
  let err = adx - ady;
  out[key(x, y)] = true;
  while (x !== x2 || y !== y2) {
    const e2 = err * 2;
    if (e2 > -ady) { err -= ady; x += dx; }
    if (e2 <  adx) { err += adx; y += dy; }
    out[key(x, y)] = true;
  }
  return out;
}

// Solid filled rectangle, inclusive on both corners.
export function rect(x1, y1, x2, y2) {
  const [xa, xb] = x1 <= x2 ? [x1, x2] : [x2, x1];
  const [ya, yb] = y1 <= y2 ? [y1, y2] : [y2, y1];
  const out = {};
  for (let y = ya; y <= yb; y++) {
    for (let x = xa; x <= xb; x++) out[key(x, y)] = true;
  }
  return out;
}

// Rectangle outline only (walls on the four edges, interior walkable).
export function hollowRect(x1, y1, x2, y2) {
  const [xa, xb] = x1 <= x2 ? [x1, x2] : [x2, x1];
  const [ya, yb] = y1 <= y2 ? [y1, y2] : [y2, y1];
  const out = {};
  for (let x = xa; x <= xb; x++) { out[key(x, ya)] = true; out[key(x, yb)] = true; }
  for (let y = ya; y <= yb; y++) { out[key(xa, y)] = true; out[key(xb, y)] = true; }
  return out;
}

// Perimeter ring for a map that's `width` x `height` tiles.
// Passing no args returns a helper you can call later with dimensions.
export function border(width, height) {
  return hollowRect(0, 0, width - 1, height - 1);
}

// Merge any number of wall sets into one.
export function compose(...sets) {
  return Object.assign({}, ...sets);
}

// Wall everything on a `width` x `height` map EXCEPT the walkable tiles.
// `walkable` is a wall-set object (pixel-space keys) describing the floor;
// the result is its complement over the whole grid. Useful when the open area
// is small (a path through a forest) and listing the walls would be huge.
export function invert(walkable, width, height) {
  const out = {};
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const k = key(x, y);
      if (!walkable[k]) out[k] = true;
    }
  }
  return out;
}

// Punch tiles out of a wall set (for doorways, exits, gaps).
// Accepts either a wall set object or a list of [x,y] tuples in `holes`.
export function subtract(set, ...holes) {
  const out = { ...set };
  for (const h of holes) {
    if (Array.isArray(h)) {
      // list of tuples
      for (const [x, y] of h) delete out[key(x, y)];
    } else {
      for (const k of Object.keys(h)) delete out[k];
    }
  }
  return out;
}
