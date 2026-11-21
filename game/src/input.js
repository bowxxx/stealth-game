// Night Vault — input: keyboard state plus mouse clicks on the canvas.
// The game reads this each frame; menus read clicks through onClick.
// Held keys, and keys pressed since the last frame was read. The pressed
// set is separate from the held set: a quick tap (down and up between two
// frames) must still register as a press.
const keys = new Set();
const pressedSinceRead = new Set();
let clickQueue = [];
let anyKeyPressed = false;

const KEYMAP = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ShiftLeft: 'sneak',
  ShiftRight: 'sneak',
  KeyC: 'sneak',
  KeyQ: 'coin',
  Space: 'coin',
  KeyM: 'mute',
  KeyP: 'pause',
  Escape: 'pause',
  Enter: 'confirm',
  KeyR: 'restart',
};

export function initInput(canvas) {
  window.addEventListener('keydown', (e) => {
    const action = KEYMAP[e.code];
    if (action) {
      if (['up', 'down', 'left', 'right', 'coin'].includes(action)) e.preventDefault();
      if (!e.repeat) {
        keys.add(action);
        pressedSinceRead.add(action);
        anyKeyPressed = true;
      }
    }
  });
  window.addEventListener('keyup', (e) => {
    const action = KEYMAP[e.code];
    if (action) keys.delete(action);
  });
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    clickQueue.push({
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    });
    anyKeyPressed = true;
  });
}

export function isDown(action) {
  return keys.has(action);
}

// True once for a key pressed since the last frame (edge-triggered).
// A press survives its keyup: it is consumed here, not when released.
export function pressed(action) {
  if (pressedSinceRead.has(action)) {
    pressedSinceRead.delete(action);
    return true;
  }
  return false;
}

export function takeClicks() {
  const out = clickQueue;
  clickQueue = [];
  return out;
}

export function consumeAnyKey() {
  const had = anyKeyPressed;
  anyKeyPressed = false;
  return had;
}
