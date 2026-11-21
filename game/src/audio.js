// Night Vault — sound: every effect is synthesised with WebAudio, so the
// game ships no audio files and makes no network request for sound.
let ctx = null;
let muted = false;
let ambientNodes = null;

export function ensureAudio() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      ctx = null;
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (muted) stopAmbient();
  else startAmbient();
  return muted;
}

function tone(freq, dur, type, vol, when = 0, slideTo = null) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(dur, vol, lowpass) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(t0);
}

// A soft footstep: quieter and duller while sneaking.
export function playFootstep(sneaking) {
  if (sneaking) noiseBurst(0.05, 0.03, 500);
  else noiseBurst(0.07, 0.09, 900);
}

// A guard's heavier boot, heard when one walks near you.
export function playGuardStep(distanceTiles) {
  const vol = Math.max(0.01, 0.12 - distanceTiles * 0.015);
  noiseBurst(0.08, vol, 420);
}

export function playCoin() {
  tone(1900, 0.07, 'sine', 0.12);
  tone(2500, 0.12, 'sine', 0.1, 0.06);
}

export function playPickup() {
  tone(660, 0.1, 'sine', 0.14);
  tone(880, 0.1, 'sine', 0.14, 0.09);
  tone(1320, 0.22, 'sine', 0.14, 0.18);
}

// Rising two-note sting when a guard's suspicion turns into an alarm.
export function playAlert() {
  tone(220, 0.18, 'sawtooth', 0.1, 0, 330);
  tone(330, 0.28, 'sawtooth', 0.1, 0.16, 440);
}

export function playSpotted() {
  tone(180, 0.12, 'square', 0.07);
}

export function playCaught() {
  tone(320, 0.5, 'sawtooth', 0.12, 0, 90);
  noiseBurst(0.4, 0.1, 300);
}

export function playWin() {
  [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.28, 'triangle', 0.12, i * 0.12));
}

export function playLose() {
  [392, 330, 262, 196].forEach((f, i) => tone(f, 0.32, 'triangle', 0.1, i * 0.14));
}

export function playDoor() {
  noiseBurst(0.25, 0.08, 700);
  tone(140, 0.2, 'sine', 0.08);
}

// A low, quiet drone under the whole game so the museum never feels dead.
export function startAmbient() {
  if (!ctx || muted || ambientNodes) return;
  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 55;
  osc2.type = 'sine';
  osc2.frequency.value = 55.7;
  gain.gain.value = 0.025;
  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc2.start();
  ambientNodes = { osc, osc2, gain };
}

export function stopAmbient() {
  if (!ambientNodes) return;
  try {
    ambientNodes.osc.stop();
    ambientNodes.osc2.stop();
  } catch {
    // Already stopped; nothing to do.
  }
  ambientNodes = null;
}
