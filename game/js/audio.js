// Synthesised sound for Solmar Bay: every sound is made live with WebAudio —
// engine hum, siren, gunshot, pickup chime and mission jingles. No audio files.
export function createAudio() {
  const api = { ctx: null, muted: false, engineOsc: null, engineGain: null, sirenOsc: null, sirenGain: null };
  api.ensure = function ensure() {
    if (api.ctx) { if (api.ctx.state === 'suspended') api.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    api.ctx = new AC();
    api.engineOsc = api.ctx.createOscillator();
    api.engineGain = api.ctx.createGain();
    api.engineOsc.type = 'sawtooth'; api.engineOsc.frequency.value = 50;
    api.engineGain.gain.value = 0;
    api.engineOsc.connect(api.engineGain); api.engineGain.connect(api.ctx.destination);
    api.engineOsc.start();
    api.sirenOsc = api.ctx.createOscillator();
    api.sirenGain = api.ctx.createGain();
    api.sirenOsc.type = 'sine'; api.sirenOsc.frequency.value = 700;
    api.sirenGain.gain.value = 0;
    api.sirenOsc.connect(api.sirenGain); api.sirenGain.connect(api.ctx.destination);
    api.sirenOsc.start();
  };
  api.engine = function engine(speed, driving) {
    if (!api.ctx || api.muted) return;
    const target = driving ? 0.03 + Math.min(0.05, Math.abs(speed) / 6000) : 0;
    api.engineGain.gain.setTargetAtTime(target, api.ctx.currentTime, 0.1);
    api.engineOsc.frequency.setTargetAtTime(50 + Math.abs(speed) * 0.35, api.ctx.currentTime, 0.1);
  };
  api.siren = function siren(on, t) {
    if (!api.ctx || api.muted) return;
    api.sirenGain.gain.setTargetAtTime(on ? 0.02 : 0, api.ctx.currentTime, 0.2);
    if (on) api.sirenOsc.frequency.setTargetAtTime(650 + Math.sin(t * 4) * 250, api.ctx.currentTime, 0.05);
  };
  function blip(freq, dur, type, vol) {
    if (!api.ctx || api.muted) return;
    const o = api.ctx.createOscillator(); const g = api.ctx.createGain();
    o.type = type || 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.08, api.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, api.ctx.currentTime + dur);
    o.connect(g); g.connect(api.ctx.destination);
    o.start(); o.stop(api.ctx.currentTime + dur);
  }
  api.shot = function shot() {
    if (!api.ctx || api.muted) return;
    const len = api.ctx.sampleRate * 0.12;
    const buf = api.ctx.createBuffer(1, len, api.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = api.ctx.createBufferSource(); src.buffer = buf;
    const g = api.ctx.createGain(); g.gain.value = 0.25;
    src.connect(g); g.connect(api.ctx.destination); src.start();
  };
  api.pickup = function pickup() { blip(880, 0.12, 'sine', 0.1); setTimeout(() => blip(1320, 0.15, 'sine', 0.1), 90); };
  api.mission = function mission() { [523, 659, 784].forEach((f, i) => setTimeout(() => blip(f, 0.18, 'triangle', 0.12), i * 120)); };
  api.crash = function crash() { blip(90, 0.25, 'sawtooth', 0.15); };
  api.toggleMute = function toggleMute() { api.muted = !api.muted; return api.muted; };
  return api;
}
