// Night Vault — the guards: they patrol waypoints, watch a vision cone,
// grow suspicious when they glimpse you, hunt you when the alarm trips,
// and go back to their beat once they lose you.
import { TILE, TUNING } from './config.js';
import { canStandAt, hasLineOfSight, tileCenter } from './level.js';
import { playAlert, playGuardStep, playSpotted } from './audio.js';

export const GUARD_RADIUS = 14;

// state: 'patrol' | 'suspicious' | 'alert' | 'investigate' | 'search'
export function createGuard(patrol, index) {
  const start = tileCenter(patrol.waypoints[0][0], patrol.waypoints[0][1]);
  const next = tileCenter(patrol.waypoints[1][0], patrol.waypoints[1][1]);
  return {
    index,
    x: start.x,
    y: start.y,
    dirX: Math.sign(next.x - start.x) || 1,
    dirY: Math.sign(next.y - start.y) || 0,
    patrol,
    waypointIndex: 1,
    pauseTimer: 0,
    state: 'patrol',
    suspicion: 0,
    // Where the guard last saw you (or heard something).
    lastSeen: null,
    lostTimer: 0,
    searchTimer: 0,
    stepTimer: Math.random() * 0.4,
    alarmed: false,
    // The guard's patrol leg, remembered so it can walk back to its beat.
    legFrom: 0,
  };
}

// Can this guard see the player right now? Distance, cone angle, line of
// sight, bushes and crouching all matter.
export function guardSeesPlayer(g, player, hiddenInBush) {
  const dx = player.x - g.x;
  const dy = player.y - g.y;
  const dist = Math.hypot(dx, dy);
  const range = TUNING.visionRange * TILE;
  if (dist > range) return { sees: false, dist };
  // A crouched burglar in a bush is invisible unless the guard is close.
  if (hiddenInBush && dist > TUNING.bushHideRange * TILE) return { sees: false, dist };
  const angleTo = Math.atan2(dy, dx);
  const facing = Math.atan2(g.dirY, g.dirX);
  let diff = Math.abs(angleTo - facing);
  if (diff > Math.PI) diff = 2 * Math.PI - diff;
  if (diff > TUNING.visionHalfAngle) return { sees: false, dist };
  if (!hasLineOfSight(g.x, g.y, player.x, player.y)) return { sees: false, dist };
  return { sees: true, dist };
}

function moveToward(g, tx, ty, speedTiles, dt) {
  const dx = tx - g.x;
  const dy = ty - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const speed = speedTiles * TILE;
  const step = Math.min(dist, speed * dt);
  const nx = g.x + (dx / dist) * step;
  const ny = g.y + (dy / dist) * step;
  g.dirX = dx / dist;
  g.dirY = dy / dist;
  if (canStandAt(nx, g.y, GUARD_RADIUS)) g.x = nx;
  if (canStandAt(g.x, ny, GUARD_RADIUS)) g.y = ny;
  g.stepTimer -= dt;
  if (g.stepTimer <= 0) {
    playGuardStep(dist / TILE);
    g.stepTimer = 0.42;
  }
  return dist <= speed * dt + 2;
}

function nextWaypoint(g) {
  const wps = g.patrol.waypoints;
  g.legFrom = g.waypointIndex;
  g.waypointIndex = (g.waypointIndex + 1) % wps.length;
  g.pauseTimer = g.patrol.pause;
}

// One guard, one frame. Returns 'caught' when the guard grabs the player.
export function updateGuard(g, player, hiddenInBush, dt, events) {
  const { sees, dist } = guardSeesPlayer(g, player, hiddenInBush);
  const range = TUNING.visionRange * TILE;

  if (sees) {
    // The closer and more exposed you are, the faster suspicion builds.
    let gain = TUNING.suspicionGain * (1.25 - dist / range);
    if (player.sneaking) gain *= TUNING.crouchFactor;
    if (player.inShadow) gain *= TUNING.shadowFactor;
    const before = g.suspicion;
    g.suspicion = Math.min(1, g.suspicion + gain * dt);
    g.lastSeen = { x: player.x, y: player.y };
    g.lostTimer = 0;
    if (before < 0.55 && g.suspicion >= 0.55 && g.state === 'patrol') {
      g.state = 'suspicious';
      playSpotted();
      events.push({ type: 'spotted', guard: g.index });
    }
    if (g.suspicion >= 1 && !g.alarmed) {
      g.alarmed = true;
      g.state = 'alert';
      playAlert();
      events.push({ type: 'alarm', guard: g.index });
    }
  } else {
    g.suspicion = Math.max(0, g.suspicion - TUNING.suspicionDecay * dt);
    if (g.state === 'suspicious' && g.suspicion <= 0.05) g.state = 'patrol';
    if (g.state === 'alert' || g.state === 'investigate') {
      g.lostTimer += dt;
      if (g.lostTimer > TUNING.alarmMemory) {
        g.alarmed = false;
        g.state = 'search';
        g.searchTimer = 3;
      }
    }
  }

  switch (g.state) {
    case 'patrol': {
      if (g.pauseTimer > 0) {
        g.pauseTimer -= dt;
        break;
      }
      const wp = g.patrol.waypoints[g.waypointIndex];
      const target = tileCenter(wp[0], wp[1]);
      if (moveToward(g, target.x, target.y, TUNING.guardPatrol, dt)) nextWaypoint(g);
      break;
    }
    case 'suspicious': {
      // Freeze and stare at where you were glimpsed; suspicion keeps
      // building only while you stay visible, otherwise it fades.
      if (g.lastSeen) {
        g.dirX = (g.lastSeen.x - g.x) / Math.max(1, Math.hypot(g.lastSeen.x - g.x, g.lastSeen.y - g.y));
        g.dirY = (g.lastSeen.y - g.y) / Math.max(1, Math.hypot(g.lastSeen.x - g.x, g.lastSeen.y - g.y));
      }
      break;
    }
    case 'alert': {
      // Run at the last place you were seen; catch you on contact.
      if (g.lastSeen && moveToward(g, g.lastSeen.x, g.lastSeen.y, TUNING.guardChase, dt)) {
        g.state = 'search';
        g.searchTimer = 3;
        g.alarmed = false;
      }
      if (Math.hypot(player.x - g.x, player.y - g.y) < TUNING.catchRange * TILE) {
        return 'caught';
      }
      break;
    }
    case 'investigate': {
      if (g.lastSeen && moveToward(g, g.lastSeen.x, g.lastSeen.y, TUNING.guardInvestigate, dt)) {
        g.state = 'search';
        g.searchTimer = 2.5;
      }
      break;
    }
    case 'search': {
      // Look around the spot, then walk back to the patrol beat.
      g.searchTimer -= dt;
      g.dirX = Math.cos(g.searchTimer * 1.8);
      g.dirY = Math.sin(g.searchTimer * 1.8);
      if (g.searchTimer <= 0) {
        const wp = g.patrol.waypoints[g.legFrom];
        const target = tileCenter(wp[0], wp[1]);
        if (moveToward(g, target.x, target.y, TUNING.guardPatrol, dt)) {
          g.state = 'patrol';
          g.waypointIndex = (g.legFrom + 1) % g.patrol.waypoints.length;
        }
      }
      break;
    }
  }
  return null;
}

// A noise at (x, y): patrolling or searching guards nearby go to look.
export function alertGuardsToNoise(guards, x, y, radiusTiles) {
  const radius = radiusTiles * TILE;
  for (const g of guards) {
    if (g.state === 'alert') continue;
    if (Math.hypot(x - g.x, y - g.y) <= radius) {
      g.lastSeen = { x, y };
      g.state = 'investigate';
      g.lostTimer = 0;
    }
  }
}

// The loudest suspicion in the room, for the HUD meter.
export function maxSuspicion(guards) {
  return guards.reduce((m, g) => Math.max(m, g.suspicion), 0);
}

export function anyAlarmed(guards) {
  return guards.some((g) => g.alarmed);
}
