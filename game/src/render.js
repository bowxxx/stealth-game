// Night Vault — rendering: draws the museum floor, walls, cover, guards
// with their vision cones, the player, the HUD and the minimap, all on one
// canvas with procedural art (no image files).
import { COLORS, TILE, TUNING, VIEW_H, VIEW_W } from './config.js';
import {
  COLS,
  ROWS,
  findTile,
  isBush,
  isShadow,
  tileAt,
  tileCenter,
} from './level.js';
import { maxSuspicion } from './guards.js';

const gemTile = findTile('*');
const exitTile = findTile('E');

function drawFloor(ctx) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = tileAt(x, y);
      if (t === '#') continue;
      ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      // A faint tile seam so the floor reads as stone slabs.
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x * TILE + 0.5, y * TILE + 0.5, TILE, TILE);
    }
  }
  // Shadow patches: darker floor where you are harder to spot.
  ctx.fillStyle = COLORS.shadow;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (isShadow(x, y)) ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }
}

function drawWallsAndCover(ctx) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = tileAt(x, y);
      const px = x * TILE;
      const py = y * TILE;
      if (t === '#') {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(px, py, TILE, 6);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(px, py + 6, TILE, 3);
      } else if (t === 'C') {
        // A crate: wooden box you can hide behind; it blocks sight.
        ctx.fillStyle = COLORS.crate;
        ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
        ctx.fillStyle = COLORS.crateTop;
        ctx.fillRect(px + 4, py + 4, TILE - 8, 8);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 4, py + 4, TILE - 8, TILE - 8);
        ctx.beginPath();
        ctx.moveTo(px + 4, py + 4);
        ctx.lineTo(px + TILE - 4, py + TILE - 4);
        ctx.moveTo(px + TILE - 4, py + 4);
        ctx.lineTo(px + 4, py + TILE - 4);
        ctx.stroke();
      } else if (t === 'B') {
        // A bush: crouch inside it and guards cannot see you.
        ctx.fillStyle = COLORS.bush;
        ctx.beginPath();
        ctx.arc(px + TILE / 2, py + TILE / 2, TILE / 2 - 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORS.bushTop;
        ctx.beginPath();
        ctx.arc(px + TILE / 2 - 6, py + TILE / 2 - 6, 9, 0, Math.PI * 2);
        ctx.arc(px + TILE / 2 + 7, py + TILE / 2 + 4, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawGem(ctx, hasGem, time) {
  if (hasGem || !gemTile) return;
  const c = tileCenter(gemTile.x, gemTile.y);
  const pulse = 0.6 + 0.4 * Math.sin(time * 3);
  const glow = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, 46);
  glow.addColorStop(0, `rgba(95, 242, 255, ${0.5 * pulse})`);
  glow.addColorStop(1, 'rgba(95, 242, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(c.x, c.y, 46, 0, Math.PI * 2);
  ctx.fill();
  // The Star Sapphire: a cut diamond.
  ctx.fillStyle = COLORS.gem;
  ctx.beginPath();
  ctx.moveTo(c.x, c.y - 13);
  ctx.lineTo(c.x + 10, c.y);
  ctx.lineTo(c.x, c.y + 13);
  ctx.lineTo(c.x - 10, c.y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.moveTo(c.x, c.y - 13);
  ctx.lineTo(c.x + 5, c.y - 2);
  ctx.lineTo(c.x - 5, c.y - 2);
  ctx.closePath();
  ctx.fill();
}

function drawExit(ctx, hasGem, time) {
  if (!exitTile) return;
  const c = tileCenter(exitTile.x, exitTile.y);
  const open = hasGem;
  const pulse = open ? 0.55 + 0.45 * Math.sin(time * 4) : 0.25;
  ctx.fillStyle = open ? `rgba(57, 211, 83, ${0.35 * pulse + 0.15})` : 'rgba(120,120,120,0.25)';
  ctx.fillRect(c.x - 20, c.y - 20, 40, 40);
  ctx.strokeStyle = open ? COLORS.exit : '#888';
  ctx.lineWidth = 3;
  ctx.strokeRect(c.x - 20, c.y - 20, 40, 40);
  // A door with an arrow pointing out.
  ctx.fillStyle = open ? COLORS.exit : '#999';
  ctx.beginPath();
  ctx.moveTo(c.x - 8, c.y - 6);
  ctx.lineTo(c.x + 4, c.y - 6);
  ctx.lineTo(c.x + 4, c.y - 11);
  ctx.lineTo(c.x + 14, c.y);
  ctx.lineTo(c.x + 4, c.y + 11);
  ctx.lineTo(c.x + 4, c.y + 6);
  ctx.lineTo(c.x - 8, c.y + 6);
  ctx.closePath();
  ctx.fill();
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = open ? '#b9f5c3' : '#bbb';
  ctx.fillText(open ? 'EXIT' : 'LOCKED', c.x, c.y + 32);
}

function drawCone(ctx, g) {
  const range = TUNING.visionRange * TILE;
  const facing = Math.atan2(g.dirY, g.dirX);
  const half = TUNING.visionHalfAngle;
  const color = g.alarmed
    ? COLORS.coneAlert
    : g.suspicion > 0.05
      ? COLORS.coneSuspicious
      : COLORS.coneCalm;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  ctx.arc(g.x, g.y, range, facing - half, facing + half);
  ctx.closePath();
  ctx.fill();
  // Cone edge lines, so the boundary reads at a glance.
  ctx.strokeStyle = color.replace(/[\d.]+\)$/, '0.55)');
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  ctx.lineTo(g.x + Math.cos(facing - half) * range, g.y + Math.sin(facing - half) * range);
  ctx.moveTo(g.x, g.y);
  ctx.lineTo(g.x + Math.cos(facing + half) * range, g.y + Math.sin(facing + half) * range);
  ctx.stroke();
}

function drawGuard(ctx, g, time) {
  drawCone(ctx, g);
  // Body: a guard in a dark red uniform, with a cap and a facing tick.
  ctx.fillStyle = '#1c1f26';
  ctx.beginPath();
  ctx.arc(g.x, g.y, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = g.alarmed ? COLORS.guard : COLORS.guardCalm;
  ctx.beginPath();
  ctx.arc(g.x, g.y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b2f38';
  ctx.beginPath();
  ctx.arc(g.x + g.dirX * 4, g.y + g.dirY * 4, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd65a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(g.x + g.dirX * 12, g.y + g.dirY * 12);
  ctx.lineTo(g.x + g.dirX * 20, g.y + g.dirY * 20);
  ctx.stroke();
  // "?" while suspicious, "!" while alarmed — the tell you play around.
  if (g.alarmed || g.suspicion > 0.05) {
    const bob = Math.sin(time * 6) * 2;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = g.alarmed ? '#ff5a5a' : '#ffb020';
    ctx.fillText(g.alarmed ? '!' : '?', g.x, g.y - 24 + bob);
  }
  // Suspicion arc above the guard while it builds.
  if (g.suspicion > 0.02 && g.suspicion < 1) {
    ctx.strokeStyle = '#ffb020';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 20, -Math.PI / 2, -Math.PI / 2 + g.suspicion * Math.PI * 2);
    ctx.stroke();
  }
}

function drawPlayer(ctx, p, time) {
  // A soft pool of light around the burglar so you can read the floor.
  const light = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, 90);
  light.addColorStop(0, 'rgba(255, 240, 180, 0.10)');
  light.addColorStop(1, 'rgba(255, 240, 180, 0)');
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 90, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0d2b29';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
  ctx.fill();
  // Facing tick and a hood point.
  ctx.strokeStyle = '#e8fffb';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p.x + p.dirX * 10, p.y + p.dirY * 10);
  ctx.lineTo(p.x + p.dirX * 18, p.y + p.dirY * 18);
  ctx.stroke();
  // Crouching reads as a smaller, lower silhouette.
  if (p.sneaking) {
    ctx.strokeStyle = 'rgba(47, 214, 200, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 17, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Tossed coins arc through the air.
  for (const c of p.tossed) {
    const x = c.x + (c.tx - c.x) * c.t;
    const y = c.y + (c.ty - c.y) * c.t - Math.sin(c.t * Math.PI) * 26;
    ctx.fillStyle = '#ffd65a';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a8874f';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  if (p.hasGem) {
    ctx.fillStyle = COLORS.gem;
    ctx.beginPath();
    ctx.moveTo(p.x + 14, p.y - 16);
    ctx.lineTo(p.x + 19, p.y - 11);
    ctx.lineTo(p.x + 14, p.y - 6);
    ctx.lineTo(p.x + 9, p.y - 11);
    ctx.closePath();
    ctx.fill();
  }
}

// A vignette over the whole scene: night, with the player lit.
function drawNight(ctx, time) {
  const g = ctx.createRadialGradient(
    VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35,
    VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.85,
  );
  g.addColorStop(0, 'rgba(4, 6, 14, 0)');
  g.addColorStop(1, 'rgba(4, 6, 14, 0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

export function drawWorld(ctx, game, time) {
  drawFloor(ctx);
  drawGem(ctx, game.player.hasGem, time);
  drawExit(ctx, game.player.hasGem, time);
  drawWallsAndCover(ctx);
  for (const g of game.guards) drawGuard(ctx, g, time);
  drawPlayer(ctx, game.player, time);
  drawNight(ctx, time);
}

export function drawHud(ctx, game) {
  const suspicion = maxSuspicion(game.guards);
  const alarmed = game.guards.some((g) => g.alarmed);
  // Top bar.
  ctx.fillStyle = 'rgba(8, 10, 18, 0.82)';
  ctx.fillRect(0, 0, VIEW_W, 34);
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e8ecf4';
  ctx.fillText('NIGHT VAULT', 12, 22);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = game.player.hasGem ? COLORS.gem : '#9aa4b8';
  ctx.fillText(game.player.hasGem ? '◆ Star Sapphire stolen' : '◇ Steal the Star Sapphire', 150, 22);
  ctx.fillStyle = '#ffd65a';
  ctx.fillText(`● Coins: ${game.player.coins}  (Q to toss)`, 400, 22);
  // Detection meter.
  const mx = 620;
  ctx.fillStyle = '#2a3145';
  ctx.fillRect(mx, 10, 180, 14);
  ctx.fillStyle = alarmed ? '#ff4444' : suspicion > 0.5 ? '#ffb020' : '#39d353';
  ctx.fillRect(mx, 10, 180 * suspicion, 14);
  ctx.strokeStyle = '#5a6b8c';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx + 0.5, 10.5, 180, 14);
  ctx.fillStyle = alarmed ? '#ff8888' : '#e8ecf4';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(alarmed ? 'ALARM!' : suspicion > 0.05 ? 'SPOTTED?' : 'UNSEEN', mx + 190, 22);
  // Timer and alerts.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#e8ecf4';
  const t = Math.floor(game.elapsed);
  ctx.fillText(
    `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}   Alarms: ${game.alarms}`,
    VIEW_W - 12,
    22,
  );
  // Controls hint along the bottom.
  ctx.textAlign = 'left';
  ctx.font = '12px sans-serif';
  ctx.fillStyle = 'rgba(232, 236, 244, 0.75)';
  ctx.fillText(
    'WASD / arrows — move    Shift / C — sneak    Q / Space — toss a coin    M — mute    P — pause',
    12,
    VIEW_H - 10,
  );
}

export function drawMinimap(ctx, game) {
  const scale = 0.14;
  const w = VIEW_W * scale;
  const h = VIEW_H * scale;
  // Bottom-left, so the exit door in the bottom-right stays visible.
  const ox = 12;
  const oy = VIEW_H - h - 26;
  ctx.fillStyle = 'rgba(8, 10, 18, 0.8)';
  ctx.fillRect(ox - 4, oy - 4, w + 8, h + 8);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = tileAt(x, y);
      if (t === '#') ctx.fillStyle = '#5a6b8c';
      else if (t === 'C') ctx.fillStyle = '#8a6a3f';
      else if (t === 'B') ctx.fillStyle = '#3f7a44';
      else continue;
      ctx.fillRect(ox + x * TILE * scale, oy + y * TILE * scale, TILE * scale, TILE * scale);
    }
  }
  if (!game.player.hasGem && gemTile) {
    ctx.fillStyle = COLORS.gem;
    ctx.fillRect(ox + gemTile.x * TILE * scale - 2, oy + gemTile.y * TILE * scale - 2, 5, 5);
  }
  if (exitTile) {
    ctx.fillStyle = COLORS.exit;
    ctx.fillRect(ox + exitTile.x * TILE * scale - 2, oy + exitTile.y * TILE * scale - 2, 5, 5);
  }
  for (const g of game.guards) {
    ctx.fillStyle = g.alarmed ? '#ff4444' : '#e5484d';
    ctx.beginPath();
    ctx.arc(ox + g.x * scale, oy + g.y * scale, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(ox + game.player.x * scale, oy + game.player.y * scale, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e8ecf4';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(ox + game.player.x * scale, oy + game.player.y * scale, 6, 0, Math.PI * 2);
  ctx.stroke();
}
