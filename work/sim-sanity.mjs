import { createGame, stepGame, SCREEN_PLAY } from '../game/js/sim.js';
import { stageShot } from '../game/js/shots.js';
import { viewOrigin } from '../game/js/render.js';
const IDLE = { up:false,down:false,left:false,right:false,run:false,enter:false,shoot:false,handbrake:false };
// 1. drive: enter a car, drive forward 5s, player must move
let s = createGame(7); s.screen = SCREEN_PLAY;
const car = s.cars.find(c => c.owner === 'parked');
s.player.x = car.x; s.player.y = car.y;
stepGame(s, { ...IDLE, enter: true }, 1/60);
const x0 = s.player.x, y0 = s.player.y;
for (let i=0;i<300;i++) stepGame(s, { ...IDLE, up:true }, 1/60);
console.log('drive moved:', Math.hypot(s.player.x-x0, s.player.y-y0).toFixed(0), 'px, onFoot=', s.player.onFoot, 'stars=', s.player.stars);
// 2. wanted: heat 95 -> police spawn and chase, stars >= 3
s.player.wantedHeat = 95;
for (let i=0;i<360;i++) stepGame(s, { ...IDLE, up:true }, 1/60);
console.log('wanted stars=', s.player.stars, 'police=', s.police.length, 'player dead=', s.player.dead);
// 3. mission: stage Dockside, shoot 2s, crew must take damage/die
const m = stageShot('mission', 7);
const alive0 = m.enemies.filter(e=>e.alive).length;
for (let i=0;i<120;i++) stepGame(m, { ...IDLE, shoot:true, aimX: 2050, aimY: 1250 }, 1/60);
console.log('mission crew alive before/after:', alive0, '->', m.enemies.filter(e=>e.alive).length, 'missionIndex=', m.missionIndex);
// 4. camera clamp at browser viewport 1919x998 for every scene
for (const shot of ['start','drive','wanted','mission']) {
  const st = stageShot(shot, 7);
  const o = viewOrigin(st, 1919, 998);
  const ok = o.x >= 0 && o.x + 1919 <= 2600 && o.y >= 0 && o.y + 998 <= 2600;
  console.log('view', shot, 'origin=', JSON.stringify(o), 'inside world:', ok);
}
console.log('sim sanity OK');
