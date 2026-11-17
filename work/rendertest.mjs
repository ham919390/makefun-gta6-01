import { stageShot } from '../game/js/shots.js';
import { render } from '../game/js/render.js';
globalThis.window = { innerWidth: 1280, innerHeight: 720 };
globalThis.performance = { now: () => 1000 };
const texts = [];
const ctx = new Proxy({}, { get: (t, k) => {
  if (k === 'fillText') return (txt, x, y) => texts.push(String(txt));
  if (k === 'measureText') return () => ({ width: 10 });
  if (k === 'createLinearGradient') return () => ({ addColorStop: () => {} });
  return () => {};
}, set: () => true });
for (const shot of ['start','drive','wanted','mission']) {
  texts.length = 0;
  try {
    const state = stageShot(shot, 7);
    render(ctx, state, { w: 1280, h: 720 }, {});
    const hud = texts.filter(t => /\$|SOLMAR|Mission|Wanted|Press ENTER|Health|Respect/.test(t));
    console.log(shot, 'screen=', state.screen, 'texts=', texts.length, 'hud/title texts=', JSON.stringify(hud.slice(0,6)));
  } catch (e) { console.log(shot, 'THREW:', e.message); }
}
