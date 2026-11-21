// Night Vault — the entry point: game states (title / playing / paused /
// won / lost), the main loop, and the screenshot hooks (?shot=) the maker
// uses to capture real renders of each moment of the game.
import { GUARD_PATROLS, TILE, VIEW_H, VIEW_W } from './config.js';
import { findTile, tileCenter } from './level.js';
import { createPlayer, isHiddenInBush, isInShadow, tossCoin, updatePlayer } from './player.js';
import {
  alertGuardsToNoise,
  anyAlarmed,
  createGuard,
  updateGuard,
} from './guards.js';
import { drawHud, drawMinimap, drawWorld } from './render.js';
import {
  ensureAudio,
  playCaught,
  playDoor,
  playLose,
  playPickup,
  playWin,
  startAmbient,
  toggleMute,
} from './audio.js';
import { consumeAnyKey, initInput, isDown, pressed, takeClicks } from './input.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

canvas.width = VIEW_W;
canvas.height = VIEW_H;
initInput(canvas);

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

function newGame() {
  const start = findTile('P');
  return {
    state: 'title',
    player: createPlayer(start),
    guards: GUARD_PATROLS.map((p, i) => createGuard(p, i)),
    elapsed: 0,
    alarms: 0,
    time: 0,
    caughtBy: null,
    message: '',
    messageTimer: 0,
  };
}

let game = newGame();

// Screenshot hooks: ?shot=start|play|alert|win puts the game straight into
// a real state so the maker can capture it with a headless browser.
function applyShotHook() {
  if (!shot) return;
  const start = findTile('P');
  if (shot === 'start') {
    game.state = 'title';
  } else if (shot === 'play') {
    game.state = 'playing';
    // Mid-gallery, crouched behind a crate while a guard sweeps past.
    game.player.x = 6.5 * TILE;
    game.player.y = 8.5 * TILE;
    game.player.sneaking = true;
    game.player.dirX = 1;
    game.player.dirY = 0;
  } else if (shot === 'alert') {
    game.state = 'playing';
    // Four tiles below the guard, at the edge of its cone: suspicion is
    // high and climbing, but the alarm has not tripped yet.
    game.player.x = 12.5 * TILE;
    game.player.y = 11.5 * TILE;
    game.player.sneaking = false;
    const g = game.guards[2];
    g.x = 12.5 * TILE;
    g.y = 7.5 * TILE;
    g.dirX = 0;
    g.dirY = 1;
    g.state = 'suspicious';
    g.suspicion = 0.62;
    g.lastSeen = { x: game.player.x, y: game.player.y };
  } else if (shot === 'win') {
    game.state = 'won';
    game.player.hasGem = true;
    game.elapsed = 187;
    game.alarms = 1;
  }
}
applyShotHook();

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function onNoise(x, y, radiusTiles) {
  alertGuardsToNoise(game.guards, x, y, radiusTiles);
}

function flashMessage(text) {
  game.message = text;
  game.messageTimer = 2.2;
}

function startGame() {
  game = newGame();
  game.state = 'playing';
  ensureAudio();
  startAmbient();
  setStatus('Night Vault: steal the Star Sapphire, then reach the exit unseen.');
}

function update(dt) {
  game.time += dt;
  if (game.messageTimer > 0) game.messageTimer -= dt;

  if (game.state === 'title') {
    if (pressed('confirm') || consumeAnyKey()) startGame();
    for (const c of takeClicks()) {
      if (clickIn(c, VIEW_W / 2 - 110, 470, 220, 52)) startGame();
    }
    return;
  }
  if (game.state === 'won' || game.state === 'lost') {
    if (pressed('restart') || pressed('confirm')) startGame();
    for (const c of takeClicks()) {
      if (clickIn(c, VIEW_W / 2 - 110, 470, 220, 52)) startGame();
    }
    return;
  }
  if (game.state !== 'playing') return;

  if (pressed('pause')) {
    game.state = 'paused';
    return;
  }
  if (pressed('mute')) {
    const muted = toggleMute();
    flashMessage(muted ? 'Sound off (M to turn back on)' : 'Sound on');
  }
  if (pressed('coin')) {
    if (tossCoin(game.player)) flashMessage('Coin tossed — a guard will come to look.');
    else flashMessage('Out of coins!');
  }

  game.elapsed += dt;
  const p = game.player;
  p.inShadow = isInShadow(p);
  const hidden = isHiddenInBush(p);
  updatePlayer(
    p,
    {
      up: isDown('up'),
      down: isDown('down'),
      left: isDown('left'),
      right: isDown('right'),
      sneak: isDown('sneak'),
    },
    dt,
    onNoise,
  );

  // The gem: walk over it to steal it.
  const gem = findTile('*');
  if (!p.hasGem && gem) {
    const c = tileCenter(gem.x, gem.y);
    if (Math.hypot(p.x - c.x, p.y - c.y) < TILE * 0.6) {
      p.hasGem = true;
      playPickup();
      flashMessage('Star Sapphire stolen! Now reach the exit — unseen.');
      setStatus('Sapphire stolen. Reach the exit unseen.');
    }
  }

  const events = [];
  let caught = null;
  for (const g of game.guards) {
    const result = updateGuard(g, p, hidden, dt, events);
    if (result === 'caught') caught = g;
  }
  for (const e of events) {
    if (e.type === 'alarm') {
      game.alarms += 1;
      flashMessage('ALARM! A guard is chasing you — break line of sight!');
      setStatus('Alarm! A guard is chasing you.');
    } else if (e.type === 'spotted') {
      flashMessage('A guard thinks it saw something…');
    }
  }
  if (caught) {
    game.state = 'lost';
    game.caughtBy = caught.index;
    playCaught();
    playLose();
    setStatus('Caught! The guards take you away. Press R to try again.');
    return;
  }

  // The exit: open only once the sapphire is stolen.
  const exit = findTile('E');
  if (exit) {
    const c = tileCenter(exit.x, exit.y);
    if (Math.hypot(p.x - c.x, p.y - c.y) < TILE * 0.55) {
      if (p.hasGem) {
        game.state = 'won';
        playDoor();
        playWin();
        setStatus('You slipped out with the Star Sapphire. You win!');
      } else if (game.messageTimer <= 0) {
        flashMessage('The exit is locked — steal the Star Sapphire first.');
      }
    }
  }

  // Keep the alarm banner honest when every guard calms down.
  if (!anyAlarmed(game.guards) && game.state === 'playing') {
    // Nothing to do: the HUD reads the guards directly.
  }
}

function clickIn(c, x, y, w, h) {
  return c.x >= x && c.x <= x + w && c.y >= y && c.y <= y + h;
}

function drawButton(label, y) {
  const w = 220;
  const h = 52;
  const x = VIEW_W / 2 - w / 2;
  ctx.fillStyle = '#2fd6c8';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#08131a';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, VIEW_W / 2, y + 34);
}

function drawOverlay(title, lines, buttonLabel) {
  ctx.fillStyle = 'rgba(5, 7, 14, 0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8ecf4';
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText(title, VIEW_W / 2, 210);
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#c6cede';
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 270 + i * 30));
  drawButton(buttonLabel, 470);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#8b94a8';
  ctx.fillText('or press Enter', VIEW_W / 2, 550);
}

function draw() {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (game.state === 'title') {
    drawWorld(ctx, game, game.time);
    drawOverlay('NIGHT VAULT', [
      'A museum after dark. One burglar. Four guards. One sapphire.',
      'Sneak past the patrols, steal the Star Sapphire, reach the exit unseen.',
      'Vision cones show what guards can see — crates block their sight,',
      'bushes hide you while you crouch, shadows slow their suspicion.',
      'Running is loud. Toss a coin (Q) to lure a guard away.',
    ], 'START THE HEIST');
    return;
  }
  drawWorld(ctx, game, game.time);
  drawHud(ctx, game);
  drawMinimap(ctx, game);
  if (game.messageTimer > 0 && game.message) {
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    const w = ctx.measureText(game.message).width + 28;
    ctx.fillStyle = 'rgba(8, 10, 18, 0.85)';
    ctx.fillRect(VIEW_W / 2 - w / 2, 44, w, 30);
    ctx.fillStyle = '#ffd65a';
    ctx.fillText(game.message, VIEW_W / 2, 65);
  }
  if (game.state === 'paused') {
    drawOverlay('PAUSED', ['Take a breath. The guards are waiting.', 'Press P to keep sneaking.'], 'RESUME');
    return;
  }
  if (game.state === 'won') {
    const t = Math.floor(game.elapsed);
    drawOverlay('CLEAN GETAWAY!', [
      `You slipped out with the Star Sapphire in ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}.`,
      `Alarms raised: ${game.alarms}. The museum never knew you were there.`,
      'Press R to run the heist again.',
    ], 'PLAY AGAIN');
    return;
  }
  if (game.state === 'lost') {
    drawOverlay('CAUGHT!', [
      'A guard grabbed you under the gallery lights.',
      'Study the patrols, use the crates and the dark — and try again.',
      'Press R to run the heist again.',
    ], 'TRY AGAIN');
  }
}

// The main loop, capped at a 50 ms step so tab switches cannot teleport
// anyone through a wall.
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// A handle for automated play-testing: the test driver reads the state and
// can teleport the player to probe the win and lose paths.
window.__game = {
  get state() {
    return game.state;
  },
  get player() {
    return game.player;
  },
  get guards() {
    return game.guards;
  },
  get elapsed() {
    return game.elapsed;
  },
  get alarms() {
    return game.alarms;
  },
  teleport(x, y) {
    game.player.x = x;
    game.player.y = y;
  },
  start() {
    startGame();
  },
};
