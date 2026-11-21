// Night Vault — the player: a burglar who walks, sneaks, hides and tosses
// coins. Movement is axis-separated so you slide along walls instead of
// sticking to them.
import { TILE, TUNING } from './config.js';
import { canStandAt, isBush, isShadow, tileAt } from './level.js';
import { playCoin, playFootstep } from './audio.js';

export const RADIUS = 13;

export function createPlayer(startTile) {
  return {
    x: (startTile.x + 0.5) * TILE,
    y: (startTile.y + 0.5) * TILE,
    dirX: 1,
    dirY: 0,
    sneaking: false,
    moving: false,
    stepTimer: 0,
    coins: TUNING.coins,
    hasGem: false,
    // Coins in flight: {x, y, tx, ty, t} — they arc to their target, then clink.
    tossed: [],
  };
}

// Where the player stands right now, in tiles.
export function playerTile(p) {
  return { x: Math.floor(p.x / TILE), y: Math.floor(p.y / TILE) };
}

export function isHiddenInBush(p) {
  const t = playerTile(p);
  return p.sneaking && isBush(t.x, t.y);
}

export function isInShadow(p) {
  const t = playerTile(p);
  return isShadow(t.x, t.y);
}

export function updatePlayer(p, input, dt, onNoise) {
  let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const len = Math.hypot(mx, my);
  p.moving = len > 0;
  p.sneaking = !!input.sneak;
  if (len > 0) {
    mx /= len;
    my /= len;
    p.dirX = mx;
    p.dirY = my;
    const speed = (p.sneaking ? TUNING.playerSneak : TUNING.playerWalk) * TILE;
    const nx = p.x + mx * speed * dt;
    const ny = p.y + my * speed * dt;
    // Move one axis at a time so walls never trap the player diagonally.
    if (canStandAt(nx, p.y, RADIUS)) p.x = nx;
    if (canStandAt(p.x, ny, RADIUS)) p.y = ny;

    p.stepTimer -= dt;
    if (p.stepTimer <= 0) {
      playFootstep(p.sneaking);
      p.stepTimer = p.sneaking ? 0.55 : 0.34;
      // Running is loud: guards nearby come to look.
      if (!p.sneaking) onNoise(p.x, p.y, TUNING.noiseRadius);
    }
  }

  // Tossed coins fly for half a second, then land with a clink.
  for (const c of p.tossed) {
    c.t += dt * 2;
    if (c.t >= 1 && !c.landed) {
      c.landed = true;
      playCoin();
      onNoise(c.tx, c.ty, TUNING.coinRange);
    }
  }
  p.tossed = p.tossed.filter((c) => c.t < 1.6);
}

// Throw a coin toward the facing direction; it lands a few tiles ahead.
export function tossCoin(p) {
  if (p.coins <= 0) return false;
  p.coins -= 1;
  const dist = 3.2 * TILE;
  let tx = p.x + p.dirX * dist;
  let ty = p.y + p.dirY * dist;
  // Clamp the landing spot inside the floor (never inside a wall).
  if (!canStandAt(tx, ty, RADIUS)) {
    tx = p.x + p.dirX * 1.5 * TILE;
    ty = p.y + p.dirY * 1.5 * TILE;
  }
  p.tossed.push({ x: p.x, y: p.y, tx, ty, t: 0, landed: false });
  return true;
}

export function currentTileChar(p) {
  const t = playerTile(p);
  return tileAt(t.x, t.y);
}
