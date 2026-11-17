// Simulation core for Solmar Bay: player, cars, traffic, pedestrians, police,
// wanted level, combat, missions, day/night and weather. No DOM or canvas here —
// the browser loop and the headless playtest both step this same function.
import { WORLD, ROAD_W, MISSIONS, CAR_COLORS, CAR_MODELS, PED_NAMES, WEAPONS, STEP } from './config.js';
import { buildCity, hitsBuilding, onRoad, nearestRoadPoint, districtAt } from './world.js';
import { makeRng } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

let nextId = 1;

export function createGame(seed = 7) {
  const rng = makeRng(seed);
  const city = buildCity(seed);
  const state = {
    seed, city, rng,
    screen: SCREEN_TITLE,
    time: 0, clock: 8.2, // in-game hour, starts 08:12
    weather: 'clear', rain: 0, rainTimer: 40,
    player: {
      x: 330, y: 480, angle: -Math.PI / 2, speed: 0, onFoot: true,
      health: 100, armor: 0, money: 150, respect: 0, ammo: 60,
      carId: null, wantedHeat: 0, stars: 0, busted: 0, hidden: 0,
      shootCd: 0, hurtCd: 0, dead: false,
    },
    cars: [], peds: [], police: [], enemies: [], bullets: [], particles: [], pickups: [],
    trafficTimer: 0, pedTimer: 0,
    missionIndex: 0, missionStep: 0, missionTimer: 0, missionDone: false,
    missionMsg: '', banner: '', bannerTimer: 0, objective: '',
    stats: { carsStolen: 0, pedsHit: 0, shotsFired: 0, missionsDone: 0, distance: 0 },
    camera: { x: 330, y: 480 },
    events: [],
  };
  spawnTraffic(state, 26);
  spawnPeds(state, 34);
  // A few parked cars near the start so the first mission is playable at once.
  parkCar(state, 330, 540, '#c0392b', 1);
  parkCar(state, 420, 540, '#2980b9', 0);
  parkCar(state, 250, 540, '#f1c40f', 3);
  setMission(state, 0);
  return state;
}

export function parkCar(state, x, y, color, modelIdx) {
  const model = CAR_MODELS[modelIdx % CAR_MODELS.length];
  const car = { id: nextId++, x, y, angle: 0, speed: 0, color, model, parked: true, traffic: false, police: false, hp: 100, owner: 'parked' };
  state.cars.push(car);
  return car;
}

function spawnTraffic(state, n) {
  const lines = state.city.lines;
  for (let i = 0; i < n; i++) {
    const vertical = state.rng.chance(0.5);
    const road = state.rng.pick(lines);
    const along = state.rng.range(140, WORLD - 140);
    const model = state.rng.pick(CAR_MODELS);
    state.cars.push({
      id: nextId++, x: vertical ? road + 9 : along, y: vertical ? along : road + 9,
      angle: vertical ? Math.PI / 2 : 0, speed: state.rng.range(60, 110),
      color: state.rng.pick(CAR_COLORS), model, parked: false, traffic: true,
      police: false, hp: 100, owner: 'traffic', dir: state.rng.chance(0.5) ? 1 : -1,
    });
  }
}

function spawnPeds(state, n) {
  // Pedestrians walk the sidewalks, parallel to the street, not down its middle:
  // they stand a sidewalk's width off the road centreline and face along it.
  for (let i = 0; i < n; i++) {
    const p = nearestRoadPoint(state.rng.range(200, WORLD - 200), state.rng.range(200, WORLD - 200));
    const alongVertical = state.city.lines.some((l) => Math.abs(p.x - l) < 2);
    const side = state.rng.chance(0.5) ? 1 : -1;
    const off = (ROAD_W / 2 + 14) * side;
    const x = alongVertical ? p.x + off : p.x;
    const y = alongVertical ? p.y : p.y + off;
    const angle = alongVertical ? (state.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : (state.rng.chance(0.5) ? 0 : Math.PI);
    state.peds.push({
      id: nextId++, name: state.rng.pick(PED_NAMES), x, y,
      angle, speed: state.rng.range(18, 42),
      flee: 0, hp: 30, walkPhase: state.rng.range(0, 6),
    });
  }
}

export function currentMission(state) { return MISSIONS[state.missionIndex] ?? null; }
export function missionStepDef(state) {
  const m = currentMission(state);
  return m ? m.steps[state.missionStep] ?? null : null;
}

export function setMission(state, index) {
  state.missionIndex = index;
  state.missionStep = 0;
  state.missionTimer = 0;
  state.missionDone = index >= MISSIONS.length;
  const m = currentMission(state);
  state.missionMsg = m ? `${m.title} — ${m.brief}` : '';
  state.objective = m ? m.steps[0].text : '';
  state.enemies = [];
  if (m) showBanner(state, `${m.title}: ${m.giver}`, m.brief);
}

export function showBanner(state, title, sub) {
  state.banner = title; state.bannerTimer = 3.2;
  state.events.push({ type: 'banner', title, sub });
}

export function addHeat(state, amount, reason) {
  const p = state.player;
  p.wantedHeat = Math.min(150, p.wantedHeat + amount);
  const stars = Math.min(5, Math.floor(p.wantedHeat / 30));
  if (stars > p.stars) state.events.push({ type: 'wanted', stars, reason });
  p.stars = stars;
}

function spawnPolice(state, n) {
  const p = state.player;
  for (let i = 0; i < n; i++) {
    const a = state.rng.range(0, Math.PI * 2);
    const d = state.rng.range(380, 520);
    state.police.push({
      id: nextId++, x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d,
      angle: a, speed: 0, color: '#1a1a2e', model: CAR_MODELS[1],
      parked: false, traffic: false, police: true, hp: 120, owner: 'police', siren: 0,
    });
  }
}

function spawnEnemies(state, n, x, y) {
  for (let i = 0; i < n; i++) {
    state.enemies.push({
      id: nextId++, x: x + state.rng.range(-90, 90), y: y + state.rng.range(-90, 90),
      angle: 0, hp: 60, shootCd: state.rng.range(0.5, 1.5), alive: true, speed: 55,
    });
  }
}

function explode(state, x, y, big) {
  for (let i = 0; i < (big ? 26 : 12); i++) {
    const a = state.rng.range(0, Math.PI * 2);
    state.particles.push({ x, y, vx: Math.cos(a) * state.rng.range(40, big ? 320 : 160), vy: Math.sin(a) * state.rng.range(40, big ? 320 : 160), life: state.rng.range(0.3, 0.9), max: 0.9, color: state.rng.pick(['#ff9f1a', '#ff5a1a', '#ffd23f', '#888']), size: state.rng.range(2, 6) });
  }
}

function hurtPlayer(state, dmg, cause) {
  const p = state.player;
  if (p.hurtCd > 0 || p.dead) return;
  p.hurtCd = 0.5;
  const absorbed = Math.min(p.armor, dmg);
  p.armor -= absorbed;
  p.health -= (dmg - absorbed);
  if (p.health <= 0) { p.health = 0; p.dead = true; state.screen = SCREEN_OVER; state.events.push({ type: 'over', cause }); }
}

function nearestCar(state, x, y, maxDist) {
  let best = null, bd = maxDist;
  for (const c of state.cars) {
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

function moveWithCollision(state, ent, nx, ny, radius) {
  // Move, then push out of any building along the smallest penetration axis,
  // so a car sliding along a wall keeps moving instead of wedging in a corner.
  ent.x = Math.max(20, Math.min(WORLD - 20, nx));
  ent.y = Math.max(20, Math.min(WORLD - 20, ny));
  for (const b of state.city.buildings) {
    const ox = Math.min(ent.x + radius, b.x + b.w) - Math.max(ent.x - radius, b.x);
    const oy = Math.min(ent.y + radius, b.y + b.h) - Math.max(ent.y - radius, b.y);
    if (ox > 0 && oy > 0) {
      if (ox < oy) ent.x += ent.x < b.x + b.w / 2 ? -ox : ox;
      else ent.y += ent.y < b.y + b.h / 2 ? -oy : oy;
    }
  }
}

// One simulation tick. input: {up,down,left,right,run,enter,shoot,aimX,aimY,handbrake,pause}
export function stepGame(state, input, dt = STEP) {
  const p = state.player;
  state.time += dt;
  state.clock = (state.clock + dt / 24) % 24; // a full day in ~24 real minutes
  state.rainTimer -= dt;
  if (state.rainTimer <= 0) {
    state.weather = state.weather === 'clear' ? 'rain' : 'clear';
    state.rain = state.weather === 'rain' ? 1 : 0;
    state.rainTimer = state.rng.range(30, 80);
  }
  if (state.bannerTimer > 0) state.bannerTimer -= dt;
  if (p.hurtCd > 0) p.hurtCd -= dt;
  if (p.shootCd > 0) p.shootCd -= dt;

  // --- Wanted decay: hiding out of sight cools the heat. ---
  const policeNear = state.police.some((c) => Math.hypot(c.x - p.x, c.y - p.y) < 420);
  if (!policeNear && p.wantedHeat > 0) {
    p.hidden += dt;
    if (p.hidden > 2) p.wantedHeat = Math.max(0, p.wantedHeat - dt * (p.onFoot ? 3 : 1.5));
  } else p.hidden = 0;
  p.stars = Math.min(5, Math.floor(p.wantedHeat / 30));

  // --- Police presence matches the wanted level. ---
  const wantPolice = p.stars * 2;
  if (state.police.length < wantPolice && p.stars > 0) spawnPolice(state, wantPolice - state.police.length);
  if (p.stars === 0 && state.police.length > 0 && !policeNear) state.police = state.police.filter((c) => Math.hypot(c.x - p.x, c.y - p.y) < 900);

  if (state.screen !== SCREEN_PLAY) return state;

  // --- Player on foot ---
  if (p.onFoot) {
    const run = input.run ? 1.7 : 1;
    const spd = 150 * run;
    let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (mx || my) {
      const len = Math.hypot(mx, my); mx /= len; my /= len;
      p.angle = Math.atan2(my, mx);
      moveWithCollision(state, p, p.x + mx * spd * dt, p.y + my * spd * dt, 10);
      state.stats.distance += spd * dt;
    }
    if (input.enter) {
      const car = nearestCar(state, p.x, p.y, 56);
      if (car) {
        p.onFoot = false; p.carId = car.id; car.parked = false; car.traffic = false;
        if (car.owner === 'parked' || car.owner === 'traffic') {
          state.stats.carsStolen += 1;
          addHeat(state, 12, 'car theft');
          state.events.push({ type: 'steal', model: car.model.name });
        }
      }
    }
  } else {
    // --- Driving ---
    const car = state.cars.find((c) => c.id === p.carId);
    if (!car) { p.onFoot = true; p.carId = null; }
    else {
      const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
      if (car.hp <= 0) {
        car.speed = 0; // wrecked: the car will not move until the player leaves it
        if (state.rng.chance(0.1)) state.particles.push({ x: car.x, y: car.y - 10, vx: 0, vy: -30, life: 0.6, max: 0.6, color: '#555', size: 4 });
      } else {
        const accel = input.up ? car.model.accel : input.down ? -car.model.accel * 0.7 : 0;
        car.speed += accel * dt;
      }
      car.speed *= input.handbrake ? Math.pow(0.02, dt) : Math.pow(0.35, dt); // drag
      car.speed = Math.max(-car.model.top * 0.45, Math.min(car.model.top, car.speed));
      // Steering always bites a little, even near standstill, so a car can be
      // turned out of a tight spot instead of sitting dead straight.
      const grip = 0.35 + 0.65 * Math.min(1, Math.abs(car.speed) / 90);
      const turn = steer * 1.9 * dt * grip * (car.speed < 0 ? -1 : 1);
      car.angle += turn;
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const ny = car.y + Math.sin(car.angle) * car.speed * dt;
      const before = { x: car.x, y: car.y };
      moveWithCollision(state, car, nx, ny, 16);
      const hitWall = Math.hypot(car.x - before.x, car.y - before.y) < Math.abs(car.speed) * dt * 0.4;
      if (hitWall && Math.abs(car.speed) > 120) {
        car.hp -= 8; car.speed *= 0.3;
        explode(state, car.x, car.y, false);
        hurtPlayer(state, 6, 'crash');
      }
      p.x = car.x; p.y = car.y; p.angle = car.angle; p.speed = car.speed;
      state.stats.distance += Math.abs(car.speed) * dt;
      if (Math.abs(car.speed) > 180 && state.rng.chance(0.3)) {
        state.particles.push({ x: car.x - Math.cos(car.angle) * 18, y: car.y - Math.sin(car.angle) * 18, vx: 0, vy: 0, life: 0.4, max: 0.4, color: '#999', size: 3 });
      }
      if (input.enter) { // step out
        p.onFoot = true; p.carId = null; car.speed = 0;
        p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 26;
        p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 26;
        car.parked = true;
      }
    }
  }

  // --- Shooting (on foot, mouse aims) ---
  if (input.shoot && p.onFoot && p.shootCd <= 0 && p.ammo > 0) {
    p.shootCd = WEAPONS.pistol.rate;
    p.ammo -= 1;
    state.stats.shotsFired += 1;
    const aim = Math.atan2((input.aimY ?? p.y - 100) - p.y, (input.aimX ?? p.x + 100) - p.x);
    state.bullets.push({ x: p.x + Math.cos(aim) * 16, y: p.y + Math.sin(aim) * 16, vx: Math.cos(aim) * 720, vy: Math.sin(aim) * 720, life: 0.6, from: 'player' });
    addHeat(state, 2, 'gunfire');
  }

  // --- Bullets ---
  for (const b of state.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (hitsBuilding(state.city, b.x, b.y, 0)) b.life = 0;
    if (b.from === 'player') for (const e of state.enemies) {
      if (e.alive && Math.hypot(e.x - b.x, e.y - b.y) < 16) {
        e.hp -= WEAPONS.pistol.damage; b.life = 0;
        if (e.hp <= 0) { e.alive = false; explode(state, e.x, e.y, false); state.events.push({ type: 'kill' }); }
      }
    }
    for (const c of state.police) {
      if (Math.hypot(c.x - b.x, c.y - b.y) < 20) { c.hp -= WEAPONS.pistol.damage; b.life = 0; addHeat(state, 6, 'shot police'); if (c.hp <= 0) explode(state, c.x, c.y, true); }
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);
  state.police = state.police.filter((c) => c.hp > 0);

  // --- Enemies (rival crew) ---
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    e.angle = Math.atan2(p.y - e.y, p.x - e.x);
    if (d > 220) { e.x += Math.cos(e.angle) * e.speed * dt; e.y += Math.sin(e.angle) * e.speed * dt; }
    e.shootCd -= dt;
    if (e.shootCd <= 0 && d < 380) {
      e.shootCd = state.rng.range(0.9, 1.6);
      state.bullets.push({ x: e.x, y: e.y, vx: Math.cos(e.angle) * 520, vy: Math.sin(e.angle) * 520, life: 0.7, from: 'enemy' });
    }
  }
  for (const b of state.bullets) {
    if (b.from === 'enemy' && Math.hypot(b.x - p.x, b.y - p.y) < 12) { b.life = 0; hurtPlayer(state, 9, 'shot'); }
  }

  // --- Traffic: follow their road, turn at intersections, avoid the player a little. ---
  for (const c of state.cars) {
    if (!c.traffic) continue;
    const vertical = Math.abs(Math.sin(c.angle)) > 0.7;
    const road = vertical ? c.x : c.y;
    const lane = 9 * c.dir;
    if (vertical) { c.y += c.dir * c.speed * dt; c.x += (road + lane - c.x) * dt * 2; }
    else { c.x += c.dir * c.speed * dt; c.y += (road + lane - c.y) * dt * 2; }
    if (c.x < 120 || c.x > WORLD - 120 || c.y < 120 || c.y > WORLD - 120) { c.dir *= -1; c.angle += Math.PI; }
    // Bump into the player's car: damage + heat if it was the player's fault (speed).
    if (!p.onFoot && p.carId && Math.hypot(c.x - p.x, c.y - p.y) < 34) {
      if (Math.abs(p.speed) > 100) { addHeat(state, 4, 'hit and run'); c.hp -= 10; }
      c.speed *= 0.5;
    }
  }
  state.trafficTimer -= dt;
  if (state.trafficTimer <= 0) {
    state.trafficTimer = 4;
    const traffic = state.cars.filter((c) => c.traffic);
    if (traffic.length < 22) spawnTraffic(state, 1);
  }

  // --- Pedestrians: stroll, flee gunfire and speeding cars. ---
  for (const pd of state.peds) {
    const threat = Math.hypot(pd.x - p.x, pd.y - p.y) < 90 && (!p.onFoot || state.bullets.length > 0);
    if (threat) pd.flee = 1.5;
    if (pd.flee > 0) {
      pd.flee -= dt;
      const away = Math.atan2(pd.y - p.y, pd.x - p.x);
      pd.x += Math.cos(away) * 90 * dt; pd.y += Math.sin(away) * 90 * dt;
    } else {
      pd.walkPhase += dt;
      pd.x += Math.cos(pd.angle) * pd.speed * dt;
      pd.y += Math.sin(pd.angle) * pd.speed * dt;
      // Stroll along the sidewalk: only ever turn a right angle (onto the next
      // street) or double back, never wander diagonally into traffic.
      if (state.rng.chance(0.002)) pd.angle += state.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
      if (state.rng.chance(0.001)) pd.angle += Math.PI;
    }
    pd.x = Math.max(30, Math.min(WORLD - 30, pd.x));
    pd.y = Math.max(30, Math.min(WORLD - 30, pd.y));
    if (!p.onFoot && Math.abs(p.speed) > 60 && Math.hypot(pd.x - p.x, pd.y - p.y) < 24) {
      pd.hp = 0; state.stats.pedsHit += 1; addHeat(state, 15, 'hit pedestrian');
      explode(state, pd.x, pd.y, false);
    }
  }
  state.peds = state.peds.filter((pd) => pd.hp > 0);
  state.pedTimer -= dt;
  if (state.pedTimer <= 0) { state.pedTimer = 3; if (state.peds.length < 28) spawnPeds(state, 1); }

  // --- Police chase: ram the player, and bust them if they are slow and close. ---
  for (const cop of state.police) {
    const d = Math.hypot(p.x - cop.x, p.y - cop.y);
    const want = Math.atan2(p.y - cop.y, p.x - cop.x);
    let diff = want - cop.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    cop.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    cop.speed = Math.min(300 + p.stars * 12, cop.speed + 200 * dt);
    cop.siren += dt;
    const nx = cop.x + Math.cos(cop.angle) * cop.speed * dt;
    const ny = cop.y + Math.sin(cop.angle) * cop.speed * dt;
    moveWithCollision(state, cop, nx, ny, 16);
    if (d < 40) {
      if (p.onFoot || Math.abs(p.speed ?? 0) < 40) {
        p.busted += dt;
        if (p.busted > 2.5) { p.dead = true; state.screen = SCREEN_OVER; state.events.push({ type: 'over', cause: 'busted' }); }
      } else {
        hurtPlayer(state, 4, 'rammed');
        cop.speed *= 0.4;
      }
    } else p.busted = Math.max(0, p.busted - dt);
  }

  // --- Particles ---
  for (const pt of state.particles) { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt; }
  state.particles = state.particles.filter((pt) => pt.life > 0);

  // --- Pickups (cash / health / ammo dropped in the world) ---
  for (const pk of state.pickups) {
    if (Math.hypot(pk.x - p.x, pk.y - p.y) < 34) {
      pk.taken = true;
      if (pk.kind === 'cash') { p.money += pk.value; state.events.push({ type: 'cash', value: pk.value }); }
      if (pk.kind === 'health') p.health = Math.min(100, p.health + 40);
      if (pk.kind === 'ammo') p.ammo += 24;
    }
  }
  state.pickups = state.pickups.filter((pk) => !pk.taken);

  // --- Missions ---
  updateMission(state, dt);

  state.camera.x += (p.x - state.camera.x) * Math.min(1, dt * 5);
  state.camera.y += (p.y - state.camera.y) * Math.min(1, dt * 5);
  return state;
}

function updateMission(state, dt) {
  const m = currentMission(state);
  if (!m) { if (!state.missionDone) { state.missionDone = true; state.screen = SCREEN_WIN; } return; }
  const step = missionStepDef(state);
  if (!step) {
    // Mission complete: pay out, advance.
    state.player.money += m.reward;
    state.player.respect += 10;
    state.stats.missionsDone += 1;
    state.events.push({ type: 'missionDone', title: m.title, reward: m.reward });
    showBanner(state, 'Mission complete', `${m.title} — +$${m.reward}`);
    state.pickups.push({ kind: 'cash', value: 100, x: state.player.x + 60, y: state.player.y, taken: false });
    if (state.missionIndex + 1 >= MISSIONS.length) { state.missionDone = true; state.screen = SCREEN_WIN; }
    else setMission(state, state.missionIndex + 1);
    return;
  }
  state.objective = step.text;
  const p = state.player;
  const advance = () => { state.missionStep += 1; };
  if (step.kind === 'enterCar') { if (!p.onFoot) advance(); }
  else if (step.kind === 'goto') {
    if (Math.hypot(p.x - step.x, p.y - step.y) < step.r) advance();
  } else if (step.kind === 'heat') {
    if (p.stars < step.stars) addHeat(state, 75, 'mission heat');
    advance();
  } else if (step.kind === 'cool') {
    if (p.stars === 0) advance();
  } else if (step.kind === 'defeat') {
    if (state.enemies.length === 0 && state.missionStep === 1 && m.id === 4) spawnEnemies(state, step.count, 2050, 1250);
    const left = state.enemies.filter((e) => e.alive).length;
    state.objective = `Deal with the Kestrel crew (${left} left)`;
    if (left === 0 && state.enemies.length > 0) advance();
  }
  state.missionTimer += dt;
}

export function districtName(state) { return districtAt(state.player.x, state.player.y); }
export { STEP };
