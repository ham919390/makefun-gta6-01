// Main loop for Solmar Bay: wires input, audio, the simulation and the renderer
// together, owns the save in localStorage, and honours ?shot= scenes for capture.
import { createGame, stepGame, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSE, SCREEN_OVER, SCREEN_WIN, STEP } from './sim.js';
import { render, viewOrigin } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const SAVE_KEY = 'solmar-bay-save-v1';
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const input = createInput(canvas);
const audio = createAudio();

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || 7) || 7;

let state;
if (shot) {
  state = stageShot(shot, seed);
} else {
  state = createGame(seed);
  loadSave(state);
}
let last = performance.now();
let acc = 0;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function loadSave(saved) {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (typeof s.money === 'number') saved.player.money = s.money;
    if (typeof s.missionIndex === 'number') saved.missionIndex = Math.min(s.missionIndex, 5);
    if (typeof s.respect === 'number') saved.player.respect = s.respect;
    if (typeof s.bestMoney === 'number') saved.bestMoney = s.bestMoney;
  } catch { /* a corrupt save never blocks play */ }
}

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: state.player.money, missionIndex: state.missionIndex,
      respect: state.player.respect, bestMoney: Math.max(state.bestMoney || 0, state.player.money),
      savedAt: Date.now(),
    }));
  } catch { /* storage may be unavailable; play continues */ }
}

function toScreenAim() {
  // The sim aims in world coordinates; the mouse gives screen coordinates.
  // Aim through the same clamped view origin the renderer uses, so the mouse
  // still points where it looks near the map edges.
  const o = viewOrigin(state, canvas.width, canvas.height);
  return { aimX: input.aimX + o.x, aimY: input.aimY + o.y };
}

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const edges = input.consumeEdges();
  if (edges.mute) audio.toggleMute();
  if (edges.start && state.screen === SCREEN_TITLE) { state.screen = SCREEN_PLAY; audio.ensure(); }
  if (edges.pause && (state.screen === SCREEN_PLAY || state.screen === SCREEN_PAUSE)) {
    state.screen = state.screen === SCREEN_PLAY ? SCREEN_PAUSE : SCREEN_PLAY;
  }
  if (edges.restart && (state.screen === SCREEN_OVER || state.screen === SCREEN_WIN)) {
    const fresh = createGame(seed);
    fresh.screen = SCREEN_PLAY;
    state = fresh;
  }
  if (state.screen === SCREEN_PLAY && !shot) {
    audio.ensure();
    acc += dt;
    while (acc >= STEP) {
      const aim = toScreenAim();
      stepGame(state, { ...input, ...aim }, STEP);
      acc -= STEP;
    }
    const p = state.player;
    audio.engine(p.speed || 0, !p.onFoot);
    audio.siren(p.stars >= 2, state.time);
    for (const ev of state.events.splice(0)) {
      if (ev.type === 'missionDone') { audio.mission(); saveGame(); }
      if (ev.type === 'cash') audio.pickup();
    }
    if (state.player.dead) saveGame();
    statusEl.textContent = `Solmar Bay: $${state.player.money}, ${state.player.stars} wanted stars, mission ${state.missionIndex + 1} of 6.`;
  }
  if (shot) {
    // Screenshot scenes are already staged; render one frame and hold it.
    render(ctx, state, { w: canvas.width, h: canvas.height }, input);
    return;
  }
  render(ctx, state, { w: canvas.width, h: canvas.height }, input);
  requestAnimationFrame(frame);
}

if (shot) {
  render(ctx, state, { w: canvas.width, h: canvas.height }, input);
} else {
  requestAnimationFrame(frame);
}
