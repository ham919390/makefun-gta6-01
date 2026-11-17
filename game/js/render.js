// Canvas rendering for Solmar Bay: top-down city, cars, people, police, HUD,
// minimap, day/night tint and rain, plus the title / pause / game-over screens.
import { WORLD, ROAD_W, DISTRICTS } from './config.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSE, SCREEN_OVER, SCREEN_WIN, currentMission } from './sim.js';
import { districtAt } from './world.js';

function skyTint(clock) {
  // 0 = deep night … 1 = bright midday, from the in-game hour.
  if (clock < 5 || clock > 20) return 0.18;
  if (clock < 7) return 0.18 + (clock - 5) / 2 * 0.6;
  if (clock < 17) return 0.78 + Math.sin((clock - 7) / 10 * Math.PI) * 0.22;
  if (clock < 20) return 0.78 - (clock - 17) / 3 * 0.6;
  return 0.18;
}

export function drawCar(ctx, c) {
  ctx.save();
  ctx.translate(c.x, c.y); ctx.rotate(c.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-20, -11, 42, 24);
  ctx.fillStyle = c.police ? '#20243a' : c.color;
  roundRect(ctx, -20, -12, 40, 24, 6); ctx.fill();
  ctx.fillStyle = c.police ? '#e8e8ff' : '#1c2733';
  roundRect(ctx, -6, -10, 12, 20, 3); ctx.fill(); // cabin / windshield
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(18, -10, 2, 4); ctx.fillRect(18, 6, 2, 4); // headlights
  ctx.fillStyle = '#ff3b30';
  ctx.fillRect(-20, -10, 2, 4); ctx.fillRect(-20, 6, 2, 4); // tail lights
  if (c.police) {
    ctx.fillStyle = '#fff'; ctx.fillRect(-14, -12, 10, 4); ctx.fillRect(-14, 8, 10, 4);
    ctx.fillStyle = Math.floor(performance.now() / 300) % 2 ? '#ff2d2d' : '#2d7dff';
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x, y + h, x, y + h, r);
  ctx.arcTo(x, y, x + w, y, r); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.closePath();
}

export function viewOrigin(state, w, h) {
  // Top-left world coordinate of the view, clamped so the view never shows
  // void beyond the world edge; when the viewport is wider than the world
  // (a tall phone window, a wide monitor) the world is centred instead.
  const ox = w >= WORLD ? (WORLD - w) / 2 : Math.min(Math.max(state.camera.x - w / 2, 0), WORLD - w);
  const oy = h >= WORLD ? (WORLD - h) / 2 : Math.min(Math.max(state.camera.y - h / 2, 0), WORLD - h);
  return { x: ox, y: oy };
}

export function render(ctx, state, view, input) {
  const { w, h } = view;
  const { x: camX, y: camY } = viewOrigin(state, w, h);
  const tint = skyTint(state.clock);
  ctx.fillStyle = '#0e1a24'; ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(-camX, -camY);

  // Ground: grass, then beach + sea on the west edge.
  ctx.fillStyle = '#5a7a4a'; ctx.fillRect(0, 0, WORLD, WORLD);
  ctx.fillStyle = '#e8d49a'; ctx.fillRect(0, 0, 290, WORLD); // sand
  ctx.fillStyle = '#2a7a9e'; ctx.fillRect(0, 0, 90, WORLD); // sea
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let y = 0; y < WORLD; y += 130) ctx.fillRect(88, y, 4, 60);
  // Parks
  for (const pk of state.city.parks) { ctx.fillStyle = '#3d7a3a'; ctx.fillRect(pk.x, pk.y, pk.w, pk.h); ctx.fillStyle = '#2e6b2e'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(pk.x + 20 + i * 26, pk.y + 30 + (i % 3) * 40, 12, 0, Math.PI * 2); ctx.fill(); } }
  // Roads
  ctx.fillStyle = '#33363d';
  for (const p of state.city.lines) { ctx.fillRect(p - ROAD_W / 2, 0, ROAD_W, WORLD); ctx.fillRect(0, p - ROAD_W / 2, WORLD, ROAD_W); }
  ctx.fillStyle = '#c8a83a';
  for (const p of state.city.lines) {
    for (let d = 0; d < WORLD; d += 44) { ctx.fillRect(p - 1, d, 2, 20); ctx.fillRect(d, p - 1, 20, 2); }
  }
  // District labels
  ctx.font = 'bold 26px system-ui, sans-serif'; ctx.textAlign = 'center';
  for (const d of DISTRICTS) { ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillText(d.name.toUpperCase(), d.x + d.w / 2, d.y + d.h / 2); }
  // Buildings with height shading
  for (const b of state.city.buildings) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(b.x + 5, b.y + 5, b.w, b.h);
    ctx.fillStyle = `hsl(${b.hue}, 22%, ${42 + b.height * 2}%)`; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof; ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
    ctx.fillStyle = 'rgba(255,240,180,0.5)';
    for (let wx = b.x + 10; wx < b.x + b.w - 8; wx += 18) for (let wy = b.y + 10; wy < b.y + b.h - 8; wy += 18) ctx.fillRect(wx, wy, 5, 5);
  }
  // Palms on the beach
  for (const palm of state.city.palms) {
    ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(palm.x, palm.y); ctx.lineTo(palm.x + 4, palm.y - 12); ctx.stroke();
    ctx.fillStyle = '#2e7a3a'; ctx.beginPath(); ctx.arc(palm.x + 4, palm.y - 14, 8, 0, Math.PI * 2); ctx.fill();
  }
  // Pickups
  for (const pk of state.pickups) {
    ctx.fillStyle = pk.kind === 'cash' ? '#2ecc71' : pk.kind === 'health' ? '#e74c3c' : '#f1c40f';
    ctx.beginPath(); ctx.arc(pk.x, pk.y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(pk.kind === 'cash' ? '$' : pk.kind === 'health' ? '+' : 'A', pk.x, pk.y + 4);
  }
  // Mission marker
  const step = state.missionIndex < 6 ? currentMission(state) : null;
  const marker = missionMarker(state);
  if (marker) {
    const pulse = 1 + Math.sin(state.time * 5) * 0.15;
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(marker.x, marker.y, 26 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,210,63,0.25)'; ctx.beginPath(); ctx.arc(marker.x, marker.y, 26 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(marker.x, marker.y - 44); ctx.lineTo(marker.x - 8, marker.y - 28); ctx.lineTo(marker.x + 8, marker.y - 28); ctx.closePath(); ctx.fill();
  }
  // Pedestrians
  for (const pd of state.peds) {
    ctx.fillStyle = pd.flee > 0 ? '#ff8c1a' : '#e8e0d0';
    ctx.beginPath(); ctx.arc(pd.x, pd.y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(pd.x + Math.cos(pd.angle) * 3, pd.y + Math.sin(pd.angle) * 3, 3, 0, Math.PI * 2); ctx.fill();
  }
  // Enemies
  for (const e of state.enemies) {
    if (!e.alive) continue;
    ctx.fillStyle = '#8e1a1a'; ctx.beginPath(); ctx.arc(e.x, e.y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.fillRect(e.x - 8, e.y - 16, 16 * (e.hp / 60), 3);
  }
  // Cars, police, bullets, particles
  for (const c of state.cars) drawCar(ctx, c);
  for (const c of state.police) drawCar(ctx, c);
  for (const b of state.bullets) { ctx.fillStyle = '#ffe14d'; ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill(); }
  for (const pt of state.particles) { ctx.globalAlpha = Math.max(0, pt.life / pt.max); ctx.fillStyle = pt.color; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
  // Player
  const p = state.player;
  if (!p.onFoot) {
    // aim line from the car is skipped; the car is the player
  } else {
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(p.x + Math.cos(p.angle) * 4, p.y + Math.sin(p.angle) * 4, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(p.angle) * 22, p.y + Math.sin(p.angle) * 22); ctx.stroke();
  }
  // Day/night + rain overlays (world space, then screen space below)
  // The tint is screen space (the transform is restored), so it covers the
  // whole view from the origin — the old camX/camY offset left a strip untinted.
  ctx.fillStyle = `rgba(8,12,40,${(1 - tint) * 0.55})`; ctx.fillRect(0, 0, w, h);
  ctx.restore();

  if (state.rain > 0) {
    ctx.strokeStyle = 'rgba(180,200,255,0.35)'; ctx.lineWidth = 1;
    for (let i = 0; i < 60; i++) {
      const rx = ((i * 173 + state.time * 900) % (w + 40)) - 20;
      const ry = ((i * 97 + state.time * 1400) % (h + 40)) - 20;
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 4, ry + 14); ctx.stroke();
    }
  }
  if (state.screen === SCREEN_PLAY || state.screen === SCREEN_PAUSE) drawHud(ctx, state, view, input);
  if (state.screen === SCREEN_TITLE) drawTitle(ctx, state, view);
  if (state.screen === SCREEN_PAUSE) drawCenter(ctx, view, 'PAUSED', 'P to resume · M mute · R restart');
  if (state.screen === SCREEN_OVER) drawCenter(ctx, view, p.dead && p.busted > 0 ? 'BUSTED' : 'WASTED', 'Rico is down. Press R to start over in Solmar Bay.');
  if (state.screen === SCREEN_WIN) drawCenter(ctx, view, 'THE BIG SCORE — DONE', `All six jobs complete. $${p.money} banked · ${state.stats.missionsDone}/6 missions · press R to play again.`);
  if (state.bannerTimer > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(w / 2 - 260, 84, 520, 54);
    ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(state.banner, w / 2, 106);
    ctx.fillStyle = '#fff'; ctx.font = '15px system-ui';
    ctx.fillText(state.events.length ? '' : '', w / 2, 126);
  }
}

export function missionMarker(state) {
  const m = currentMission(state);
  if (!m) return null;
  const step = m.steps[state.missionStep];
  if (!step) return null;
  if (step.kind === 'goto') return { x: step.x, y: step.y };
  if (step.kind === 'defeat') return { x: 2050, y: 1250 };
  return null;
}

function drawHud(ctx, state, view, input) {
  const { w, h } = view;
  const p = state.player;
  // Top-left: money, district, clock
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(12, 12, 250, 74);
  ctx.fillStyle = '#2ecc71'; ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'left';
  ctx.fillText(`$${p.money}`, 24, 40);
  ctx.fillStyle = '#fff'; ctx.font = '15px system-ui';
  ctx.fillText(`${districtAt(p.x, p.y)}  ·  ${String(Math.floor(state.clock)).padStart(2, '0')}:${String(Math.floor((state.clock % 1) * 60)).padStart(2, '0')}  ${state.weather === 'rain' ? '· rain' : ''}`, 24, 62);
  ctx.fillStyle = '#ffd23f'; ctx.font = '13px system-ui';
  ctx.fillText(`Respect ${p.respect}  ·  Mission ${Math.min(state.missionIndex + 1, 6)}/6`, 24, 80);
  // Wanted stars top-right
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(w - 212, 12, 200, 40);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < p.stars ? (Math.floor(state.time * 4) % 2 && p.stars >= 3 ? '#ff3b30' : '#ffd23f') : 'rgba(255,255,255,0.25)';
    ctx.font = '22px system-ui'; ctx.fillText('★', w - 196 + i * 36, 40);
  }
  // Health / armor / ammo bottom-left
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(12, h - 84, 250, 72);
  ctx.fillStyle = '#e74c3c'; ctx.fillRect(24, h - 66, 200 * (p.health / 100), 12);
  ctx.strokeStyle = '#fff'; ctx.strokeRect(24, h - 66, 200, 12);
  ctx.fillStyle = '#fff'; ctx.font = '13px system-ui';
  ctx.fillText(`Health ${Math.ceil(p.health)}${p.armor ? ` · Armour ${Math.ceil(p.armor)}` : ''}`, 24, h - 34);
  ctx.fillText(p.onFoot ? `Pistol · ${p.ammo} rounds — click to shoot` : `${(state.cars.find((c) => c.id === p.carId)?.model.name) ?? 'Car'} · ${Math.abs(Math.round(p.speed * 2.2))} km/h — E to step out`, 24, h - 18);
  // Objective bar bottom-centre
  const m = currentMission(state);
  if (m) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(w / 2 - 300, h - 52, 600, 40);
    ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(`${m.title}: ${state.objective}`, w / 2, h - 27);
  }
  drawMinimap(ctx, state, view);
  // Controls hint
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '12px system-ui'; ctx.textAlign = 'right';
  ctx.fillText('WASD drive/walk · E car · mouse aim · click shoot · Space brake · Shift run · P pause', w - 14, h - 8);
}

function drawMinimap(ctx, state, view) {
  const { w, h } = view;
  const size = 170, mx = w - size - 12, my = h - size - 12;
  const scale = size / WORLD;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(mx - 4, my - 4, size + 8, size + 8);
  ctx.save(); ctx.translate(mx, my);
  ctx.fillStyle = '#2e4a2e'; ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#e8d49a'; ctx.fillRect(0, 0, 290 * scale, size);
  ctx.fillStyle = '#33363d';
  for (const p of state.city.lines) { ctx.fillRect((p - ROAD_W / 2) * scale, 0, ROAD_W * scale, size); ctx.fillRect(0, (p - ROAD_W / 2) * scale, size, ROAD_W * scale); }
  const marker = missionMarker(state);
  if (marker) { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(marker.x * scale, marker.y * scale, 5, 0, Math.PI * 2); ctx.fill(); }
  for (const c of state.police) { ctx.fillStyle = '#2d7dff'; ctx.fillRect(c.x * scale - 2, c.y * scale - 2, 4, 4); }
  const p = state.player;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x * scale, p.y * scale, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'left';
  ctx.fillText('SOLMAR BAY', mx, my - 8);
}

function drawTitle(ctx, state, view) {
  const { w, h } = view;
  ctx.fillStyle = 'rgba(10,16,30,0.72)'; ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 64px system-ui';
  ctx.fillText('SOLMAR BAY', w / 2, h / 2 - 120);
  ctx.fillStyle = '#fff'; ctx.font = '24px system-ui';
  ctx.fillText('Streets of Solmar — an original open-world crime game', w / 2, h / 2 - 80);
  ctx.font = '16px system-ui'; ctx.fillStyle = '#cfe0ff';
  ctx.fillText('Rico Vale is back in Solmar. Steal cars, outrun the police, run six jobs for Dario and Mira,', w / 2, h / 2 - 40);
  ctx.fillText('and take the city back from the Kestrel crew — one street at a time.', w / 2, h / 2 - 16);
  ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 20px system-ui';
  ctx.fillText('Press ENTER or click to start', w / 2, h / 2 + 40);
  ctx.fillStyle = '#fff'; ctx.font = '15px system-ui';
  ctx.fillText('WASD move / drive · E enter a car · mouse aims · click shoots · Space handbrake · Shift run · P pause · M mute', w / 2, h / 2 + 74);
  ctx.fillStyle = '#9fb4d8'; ctx.font = '13px system-ui';
  ctx.fillText('Save: progress is kept in this browser (localStorage). All city, characters, vehicles, story, art and sound are original.', w / 2, h / 2 + 104);
}

function drawCenter(ctx, view, title, sub) {
  const { w, h } = view;
  ctx.fillStyle = 'rgba(10,16,30,0.78)'; ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 52px system-ui';
  ctx.fillText(title, w / 2, h / 2 - 20);
  ctx.fillStyle = '#fff'; ctx.font = '18px system-ui';
  ctx.fillText(sub, w / 2, h / 2 + 24);
}
