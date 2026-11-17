// City generation for Solmar Bay: a seeded grid of streets, blocks, buildings,
// parks, the beach and the docks. Pure data — no DOM, no canvas — so the headless
// playtest can build the same city Node does in the browser.
import { WORLD, ROAD_GAP, ROAD_W, DISTRICTS } from './config.js';
import { makeRng } from './random.js';

export function roadLines() {
  const lines = [];
  for (let p = 110; p < WORLD; p += ROAD_GAP) lines.push(p);
  return lines;
}

// Is this point on a road (within the street plus a small shoulder)?
export function onRoad(x, y) {
  for (const p of roadLines()) {
    if (Math.abs(x - p) < ROAD_W / 2 + 6 || Math.abs(y - p) < ROAD_W / 2 + 6) return true;
  }
  return false;
}

export function buildCity(seed) {
  const rng = makeRng(seed);
  const lines = roadLines();
  const buildings = [];
  const parks = [];
  const palms = [];
  // One building (or park) per block between neighbouring streets.
  for (let i = 0; i < lines.length - 1; i++) {
    for (let j = 0; j < lines.length - 1; j++) {
      const bx = lines[i] + ROAD_W / 2 + 8;
      const by = lines[j] + ROAD_W / 2 + 8;
      const bw = ROAD_GAP - ROAD_W - 16;
      const bh = ROAD_GAP - ROAD_W - 16;
      const cx = bx + bw / 2, cy = by + bh / 2;
      // Central Park district stays green; the west strip is beach.
      const inPark = cx > 900 && cx < 1600 && cy > 900 && cy < 1700;
      if (inPark && rng.chance(0.7)) { parks.push({ x: bx, y: by, w: bw, h: bh }); continue; }
      if (cx < 300) continue; // beachfront: no buildings on the sand
      const tall = cx > 1400 && cy < 900; // downtown towers
      buildings.push({
        x: bx + rng.range(0, 20), y: by + rng.range(0, 20),
        w: bw - rng.range(10, 50), h: bh - rng.range(10, 50),
        height: tall ? rng.int(3, 9) : rng.int(1, 3),
        hue: rng.int(0, 360),
        roof: rng.pick(['#7a6a58', '#5a6a7a', '#8a7a6a', '#4a5a4a', '#6a5a7a']),
      });
    }
  }
  for (let i = 0; i < 40; i++) palms.push({ x: rng.range(40, 260), y: rng.range(40, WORLD - 40) });
  return { seed, lines, buildings, parks, palms, districts: DISTRICTS };
}

// Nearest point on a road centreline (used to snap traffic and spawn points).
export function nearestRoadPoint(x, y) {
  const lines = roadLines();
  let bx = lines[0], bd = Infinity;
  for (const p of lines) { const d = Math.abs(x - p); if (d < bd) { bd = d; bx = p; } }
  let by = lines[0]; bd = Infinity;
  for (const p of lines) { const d = Math.abs(y - p); if (d < bd) { bd = d; by = p; } }
  return Math.abs(x - bx) < Math.abs(y - by) ? { x: bx, y } : { x, y: by };
}

export function districtAt(x, y) {
  for (const d of DISTRICTS) if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.name;
  return 'Solmar Bay';
}

// Point-in-building test for collision (buildings are solid).
export function hitsBuilding(city, x, y, pad = 0) {
  for (const b of city.buildings) {
    if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) return b;
  }
  return null;
}
