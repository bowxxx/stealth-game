// Night Vault — the level: parses the map grid, answers tile questions,
// and tests line of sight between two points on the floor.
import { MAP, SHADOW_RECTS, TILE } from './config.js';

export const COLS = MAP[0].length;
export const ROWS = MAP.length;

// Tile kinds, derived once from the map text.
const grid = MAP.map((row) => row.split(''));

export function tileAt(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return grid[ty][tx];
}

export function isWall(tx, ty) {
  return tileAt(tx, ty) === '#';
}

// Crates and walls block both movement and sight; bushes block neither
// (they hide you only while you crouch inside them).
export function blocksSight(tx, ty) {
  const t = tileAt(tx, ty);
  return t === '#' || t === 'C';
}

export function blocksMove(tx, ty) {
  const t = tileAt(tx, ty);
  return t === '#' || t === 'C';
}

export function isBush(tx, ty) {
  return tileAt(tx, ty) === 'B';
}

export function isShadow(tx, ty) {
  return SHADOW_RECTS.some(
    (r) => tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h,
  );
}

// Find the single tile holding a map character (P, *, E).
export function findTile(ch) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (grid[y][x] === ch) return { x, y };
    }
  }
  return null;
}

export function tileCenter(tx, ty) {
  return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
}

// True when the straight segment between two pixel points crosses no
// sight-blocking tile. Steps along the segment in small increments.
export function hasLineOfSight(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / (TILE / 4)));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const tx = Math.floor((ax + dx * t) / TILE);
    const ty = Math.floor((ay + dy * t) / TILE);
    if (blocksSight(tx, ty)) return false;
  }
  return true;
}

// Can a circle of the given radius stand at pixel (x, y) without
// overlapping a movement-blocking tile?
export function canStandAt(x, y, radius) {
  const minTx = Math.floor((x - radius) / TILE);
  const maxTx = Math.floor((x + radius) / TILE);
  const minTy = Math.floor((y - radius) / TILE);
  const maxTy = Math.floor((y + radius) / TILE);
  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (!blocksMove(tx, ty)) continue;
      const nearestX = Math.max(tx * TILE, Math.min(x, (tx + 1) * TILE));
      const nearestY = Math.max(ty * TILE, Math.min(y, (ty + 1) * TILE));
      if ((x - nearestX) ** 2 + (y - nearestY) ** 2 < radius * radius) return false;
    }
  }
  return true;
}

// Breadth-first walk over open floor, used to check the level is solvable.
export function reachableFrom(startTx, startTy) {
  const seen = new Set([`${startTx},${startTy}`]);
  const queue = [[startTx, startTy]];
  while (queue.length) {
    const [x, y] = queue.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (seen.has(key) || blocksMove(nx, ny)) continue;
      seen.add(key);
      queue.push([nx, ny]);
    }
  }
  return seen;
}
