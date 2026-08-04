// Trace the walkable dirt path out of biggerJungle.png and print a compact
// `compose(line(...), ...)` block you can paste into the Jungle map's
// `walls: invert(compose(...), 90, 57)`.
//
// The forest art paints a brown dirt path over a field of green trees. We
// classify each 16px tile by how much brown (dirt) it contains, then flood-fill
// from the hero spawn so only ONE connected trail survives (stray tree trunks,
// which are also brown, get dropped). Everything not on that trail becomes a
// wall via invert() at load time.
//
// Requires a PNG decoder. This repo has none as a dependency, so the path was
// generated once with Python/PIL using the same logic below and pasted into
// src/maps/index.js. This file documents the exact procedure so the walls can
// be regenerated if the art changes.
//
// Reference procedure (Python/PIL):
//
//   from PIL import Image
//   from collections import deque
//   im = Image.open('public/images/biggerJungle.png').convert('RGB')
//   W, H = im.size; px = im.load(); TW, TH = W // 16, H // 16
//
//   def is_brown(r, g, b):
//       return (80 < r < 175 and 40 < g < 125 and 40 < b < 120
//               and r > g and (r - g) >= 8 and (r - b) < 80)
//
//   # fraction of brown pixels per tile
//   frac = [[sum(1 for dy in range(16) for dx in range(16)
//                if is_brown(*px[tx*16+dx, ty*16+dy])) / 256
//            for tx in range(TW)] for ty in range(TH)]
//
//   THRESH = 0.12                       # canopy overhangs a lot of the path
//   walk = [[frac[ty][tx] >= THRESH for tx in range(TW)] for ty in range(TH)]
//
//   # 8-connected flood fill from the solid path tile just above spawn (29,30)
//   seen = [[False]*TW for _ in range(TH)]
//   q = deque([(29, 30)]); seen[30][29] = True
//   while q:
//       x, y = q.popleft()
//       for dx in (-1, 0, 1):
//           for dy in (-1, 0, 1):
//               if dx or dy:
//                   nx, ny = x+dx, y+dy
//                   if 0 <= nx < TW and 0 <= ny < TH and not seen[ny][nx] and walk[ny][nx]:
//                       seen[ny][nx] = True; q.append((nx, ny))
//
//   # emit one line() per horizontal run of walkable tiles
//   for ty in range(TH):
//       x = 0
//       while x < TW:
//           if seen[ty][x]:
//               x0 = x
//               while x < TW and seen[ty][x]: x += 1
//               print(f"line({x0},{ty},{x-1},{ty}),")
//           else:
//               x += 1
//
// Result: 413 walkable tiles across 98 row-runs, verified to include the hero
// spawn (29,32), billy (40,30) and the snake (25,33), all reachable from spawn.

console.log(
  "This is a documentation stub. Run the Python procedure in the header " +
  "comment to regenerate the Jungle walkable path, then paste the printed " +
  "line(...) calls into src/maps/index.js.",
);
