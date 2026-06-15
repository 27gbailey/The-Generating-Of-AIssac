let ctx = null;
let unlocked = false;

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return ctx;
}

export function unlockAudio() {
  if (unlocked) return;
  const ac = getCtx();
  if (ac.state === "suspended") ac.resume();
  unlocked = true;
}

function tone(freq, duration, type = "square", volume = 0.08, slideTo = null) {
  if (!unlocked) return;
  const ac = getCtx();
  const t0 = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + duration);
  }
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function noise(duration, volume = 0.06) {
  if (!unlocked) return;
  const ac = getCtx();
  const bufferSize = Math.floor(ac.sampleRate * duration);
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(volume, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  src.connect(gain);
  gain.connect(ac.destination);
  src.start();
}

export const sfx = {
  shoot: () => tone(620, 0.07, "triangle", 0.06, 280),
  tearHit: () => tone(180, 0.08, "square", 0.05),
  tearPoop: () => tone(140, 0.12, "sawtooth", 0.05, 80),
  tearBarrel: () => tone(110, 0.1, "square", 0.07, 60),
  tearCampfire: () => noise(0.08, 0.04),
  extinguish: () => tone(300, 0.15, "sine", 0.05, 90),
  bombPlace: () => tone(90, 0.12, "square", 0.07),
  explosion: () => {
    noise(0.25, 0.12);
    tone(70, 0.3, "sawtooth", 0.08, 30);
  },
  pickup: () => tone(880, 0.06, "sine", 0.05, 1200),
  chestOpen: () => {
    tone(220, 0.1, "square", 0.05, 440);
    tone(330, 0.12, "square", 0.04, 660);
  },
  hurt: () => tone(150, 0.18, "sawtooth", 0.07, 90),
  fireBurn: () => tone(200, 0.1, "triangle", 0.04, 160),
  door: () => tone(260, 0.14, "sine", 0.04, 180),
  barrelExplode: () => {
    noise(0.15, 0.1);
    tone(55, 0.2, "square", 0.07, 25);
  },
};
