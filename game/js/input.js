// Keyboard + mouse input for Solmar Bay. WASD/arrows to move and drive, E to
// enter or leave a car, mouse to aim, click to shoot, Space handbrake, Shift run,
// P pause, M mute, R restart after game over.
export function createInput(canvas) {
  const keys = new Set();
  const input = {
    up: false, down: false, left: false, right: false, run: false,
    enter: false, shoot: false, handbrake: false, pause: false,
    aimX: 0, aimY: 0, mouseDown: false,
  };
  const codeMap = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', ShiftLeft: 'run', ShiftRight: 'run', Space: 'handbrake' };
  window.addEventListener('keydown', (e) => {
    if (codeMap[e.code]) { input[codeMap[e.code]] = true; e.preventDefault(); }
    if (e.code === 'KeyE' && !e.repeat) input.enter = true;
    if (e.code === 'KeyP' && !e.repeat) input.pause = true;
    if (e.code === 'KeyM' && !e.repeat) input.mute = true;
    if (e.code === 'KeyR' && !e.repeat) input.restart = true;
    if (e.code === 'Enter' && !e.repeat) input.start = true;
  });
  window.addEventListener('keyup', (e) => { if (codeMap[e.code]) input[codeMap[e.code]] = false; });
  canvas.addEventListener('mousemove', (e) => { const r = canvas.getBoundingClientRect(); input.aimX = e.clientX - r.left; input.aimY = e.clientY - r.top; });
  canvas.addEventListener('mousedown', (e) => { if (e.button === 0) { input.mouseDown = true; input.shoot = true; } });
  window.addEventListener('mouseup', () => { input.mouseDown = false; input.shoot = false; });
  input.consumeEdges = function consumeEdges() {
    const edges = { enter: input.enter, pause: input.pause, mute: input.mute, restart: input.restart, start: input.start };
    input.enter = false; input.pause = false; input.mute = false; input.restart = false; input.start = false;
    return edges;
  };
  return input;
}
