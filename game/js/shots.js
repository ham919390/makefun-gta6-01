// Deterministic screenshot scenes behind ?shot=start|drive|wanted|mission.
// Each scene plays the real rules forward from a fresh seeded game with a simple
// pilot, so the frame is what real play looks like, and the same seed gives the
// same frame. When staged, window.__shotReady is set for the capture step.
import { createGame, stepGame, SCREEN_PLAY, SCREEN_TITLE } from './sim.js';

const IDLE = { up: false, down: false, left: false, right: false, run: false, enter: false, shoot: false, handbrake: false };

function makeDrivePilot() {
  // Steer toward the target, braking for sharp turns and reversing out of a
  // wedge: a car nose-first into a wall turns best after a short reverse.
  let reversing = 0, lastX = 0, lastY = 0, stuckFor = 0;
  return function drivePilot(state) {
    const p = state.player;
    const target = { x: 1900, y: 450 };
    const want = Math.atan2(target.y - p.y, target.x - p.x);
    let diff = want - p.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    // Stuck means the wheels are spinning but the car is not moving — speed
    // high, displacement tiny. Rotating in place at low speed is not stuck.
    if (Math.hypot(p.x - lastX, p.y - lastY) < 4 && Math.abs(p.speed) > 50) stuckFor += 1 / 60; else stuckFor = 0;
    lastX = p.x; lastY = p.y;
    if (stuckFor > 1.2 && reversing <= 0) { reversing = 0.9; stuckFor = 0; }
    if (reversing > 0) {
      reversing -= 1 / 60;
      return { ...IDLE, down: true, left: diff > 0.15, right: diff < -0.15 };
    }
    // Otherwise drive forward and steer. For a sharp turn, hold still and let
    // the car swing round first: accelerating into a 90-degree turn at speed
    // is what wedges it nose-first into a building corner.
    if (Math.abs(diff) > 0.6) return { ...IDLE, left: diff < -0.15, right: diff > 0.15 };
    return { ...IDLE, up: true, left: diff < -0.15, right: diff > 0.15 };
  };
}


function simulate(state, pilot, seconds) {
  const steps = Math.floor(seconds * 60);
  for (let i = 0; i < steps; i++) stepGame(state, pilot(state), 1 / 60);
}

export function stageShot(shot, seed) {
  const state = createGame(seed);
  state.screen = SCREEN_PLAY;
  if (shot === 'start') {
    state.screen = SCREEN_TITLE;
    state.clock = 17.5; // golden hour over the Marina
    state.player.x = 330; state.player.y = 480;
    state.camera.x = 330; state.camera.y = 480;
  } else if (shot === 'drive') {
    // Put Rico in the Comet GT and drive him downtown through traffic.
    const car = state.cars.find((c) => c.owner === 'parked');
    state.player.x = car.x; state.player.y = car.y;
    stepGame(state, { ...IDLE, enter: true }, 1 / 60);
    simulate(state, makeDrivePilot(), 9);
    // The drive scene is the clean city cruise: clear the heat the pilot's
    // bumper-car route through traffic picked up, so the frame shows driving,
    // not a chase (the wanted scene shows that separately).
    state.player.wantedHeat = 0; state.player.stars = 0; state.police = [];
  } else if (shot === 'wanted') {
    const car = state.cars.find((c) => c.owner === 'parked');
    state.player.x = car.x; state.player.y = car.y;
    stepGame(state, { ...IDLE, enter: true }, 1 / 60);
    state.player.wantedHeat = 95; // three stars
    simulate(state, makeDrivePilot(), 6);
  } else if (shot === 'mission') {
    // Stage the Dockside Trouble shootout: Rico on foot, crew in front of him.
    state.missionIndex = 3; state.missionStep = 1;
    state.player.x = 2050; state.player.y = 1420; state.player.angle = -Math.PI / 2;
    state.camera.x = 2050; state.camera.y = 1350;
    stepGame(state, IDLE, 1 / 60); // spawns the crew via the mission step
    state.player.ammo = 120;
    simulate(state, (s) => ({ ...IDLE, shoot: true, aimX: 640, aimY: 200 }), 1.2);
  }
  if (typeof window !== 'undefined') window.__shotReady = true;
  return state;
}
