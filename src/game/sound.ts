// Zero-dependency procedural Web Audio sound synthesizer & retro arcade BGM engine

let ctx: AudioContext | null = null;
let soundEnabled = true;
let bgmRunning = false;
let bgmTimer: number | null = null;
let bgmGain: GainNode | null = null;
let currentStep = 0;
let nextStepTime = 0;

function getContext(): AudioContext | null {
  if (!soundEnabled) return null;
  if (!ctx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      ctx = new AudioCtx();
    }
  }
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

/** Ensure audio context is unlocked upon user gesture and start BGM */
export function unlockAudio(): void {
  const c = getContext();
  if (c && c.state === 'suspended') {
    c.resume().then(() => {
      if (soundEnabled && !bgmRunning) startBgm();
    }).catch(() => {});
  } else if (c && soundEnabled && !bgmRunning) {
    startBgm();
  }
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function toggleSound(): boolean {
  soundEnabled = !soundEnabled;
  if (soundEnabled) {
    unlockAudio();
    startBgm();
  } else {
    stopBgm();
  }
  return soundEnabled;
}

// ============================================================================
// RETRO ARCADE BGM SEQUENCER (Dark Dungeon Synth Chiptune)
// ============================================================================

// Frequencies (Hz)
const NOTE: Record<string, number> = {
  'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'G2': 98.00, 'A2': 110.00, 'Bb2': 116.54, 'C3': 130.81,
  'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'Bb3': 233.08, 'C4': 261.63,
  'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'Bb4': 466.16, 'C5': 523.25,
  'D5': 587.33, 'E5': 659.25, 'F5': 698.46,
};

// 32-step 16th-note patterns (2 bars of 4/4 at 128 BPM)
const BASS_PATTERN = [
  'D2', 'D2', 'D3', 'D2', 'F2', 'F2', 'A2', 'D2',
  'G2', 'G2', 'Bb2', 'G2', 'A2', 'G2', 'F2', 'E2',
  'D2', 'D2', 'D3', 'D2', 'Bb2', 'Bb2', 'D3', 'Bb2',
  'C3', 'C3', 'E3', 'C3', 'A2', 'A2', 'C#3', 'E2',
];

const LEAD_PATTERN = [
  'D4', 'F4', 'A4', 'D5', 'F5', 'D5', 'A4', 'F4',
  'G4', 'Bb4', 'D5', 'G4', 'A4', 'G4', 'F4', 'E4',
  'D4', 'F4', 'A4', 'D5', 'Bb4', 'D5', 'F5', 'D5',
  'C4', 'E4', 'G4', 'C5', 'A4', 'G4', 'E4', 'C#4',
];

const SECONDS_PER_STEP = 60 / 128 / 4; // 16th notes at 128 BPM (~0.117s)

function scheduleNote(stepTime: number, stepIndex: number) {
  if (!ctx || !bgmGain || !soundEnabled) return;

  const step = stepIndex % 32;

  // 1. Bassline (driving triangle wave)
  const bassNote = BASS_PATTERN[step];
  if (bassNote && NOTE[bassNote]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(NOTE[bassNote], stepTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, stepTime);

    gain.gain.setValueAtTime(0.35, stepTime);
    gain.gain.exponentialRampToValueAtTime(0.01, stepTime + SECONDS_PER_STEP * 0.9);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(bgmGain);

    osc.start(stepTime);
    osc.stop(stepTime + SECONDS_PER_STEP);
  }

  // 2. Chiptune Arpeggio Lead (square wave with fast envelope)
  const leadNote = LEAD_PATTERN[step];
  if (leadNote && NOTE[leadNote]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'square';
    osc.frequency.setValueAtTime(NOTE[leadNote], stepTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, stepTime);

    gain.gain.setValueAtTime(0.18, stepTime);
    gain.gain.exponentialRampToValueAtTime(0.005, stepTime + SECONDS_PER_STEP * 0.7);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(bgmGain);

    osc.start(stepTime);
    osc.stop(stepTime + SECONDS_PER_STEP * 0.8);
  }

  // 3. Chiptune Percussion
  // Kick on 0, 8, 16, 24
  if (step % 8 === 0) {
    const kick = ctx.createOscillator();
    const kickGain = ctx.createGain();
    kick.frequency.setValueAtTime(130, stepTime);
    kick.frequency.exponentialRampToValueAtTime(35, stepTime + 0.08);

    kickGain.gain.setValueAtTime(0.4, stepTime);
    kickGain.gain.exponentialRampToValueAtTime(0.01, stepTime + 0.08);

    kick.connect(kickGain);
    kickGain.connect(bgmGain);
    kick.start(stepTime);
    kick.stop(stepTime + 0.09);
  }

  // Snare on 4, 12, 20, 28
  if (step % 8 === 4) {
    const bufLen = Math.floor(ctx.sampleRate * 0.06);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, stepTime);

    const snGain = ctx.createGain();
    snGain.gain.setValueAtTime(0.2, stepTime);
    snGain.gain.exponentialRampToValueAtTime(0.01, stepTime + 0.06);

    noise.connect(filter);
    filter.connect(snGain);
    snGain.connect(bgmGain);
    noise.start(stepTime);
  }
}

function bgmScheduler() {
  if (!bgmRunning || !ctx || !soundEnabled) return;

  while (nextStepTime < ctx.currentTime + 0.15) {
    scheduleNote(nextStepTime, currentStep);
    nextStepTime += SECONDS_PER_STEP;
    currentStep++;
  }

  bgmTimer = window.setTimeout(bgmScheduler, 40);
}

export function startBgm(): void {
  const c = getContext();
  if (!c || !soundEnabled || bgmRunning) return;

  if (!bgmGain) {
    bgmGain = c.createGain();
    bgmGain.gain.setValueAtTime(0.08, c.currentTime); // Master BGM level
    bgmGain.connect(c.destination);
  } else {
    bgmGain.gain.setValueAtTime(0.08, c.currentTime);
  }

  bgmRunning = true;
  currentStep = 0;
  nextStepTime = c.currentTime + 0.05;
  bgmScheduler();
}

export function stopBgm(): void {
  bgmRunning = false;
  if (bgmTimer) {
    clearTimeout(bgmTimer);
    bgmTimer = null;
  }
  if (bgmGain && ctx) {
    try {
      bgmGain.gain.setValueAtTime(0, ctx.currentTime);
    } catch {}
  }
}

// ============================================================================
// SOUND EFFECTS
// ============================================================================

/** Sword slash whoosh */
export function playSlash(): void {
  const c = getContext();
  if (!c) return;

  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  const filter = c.createBiquadFilter();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, now);
  filter.frequency.linearRampToValueAtTime(150, now + 0.12);

  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);

  osc.start(now);
  osc.stop(now + 0.13);
}

/** Impact hit sound */
export function playHit(): void {
  const c = getContext();
  if (!c) return;

  const now = c.currentTime;

  // Punchy low thud
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.14);

  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

  osc.connect(gain);
  gain.connect(c.destination);

  osc.start(now);
  osc.stop(now + 0.15);

  // Metallic crunch noise burst
  const bufferSize = Math.floor(c.sampleRate * 0.08);
  const noiseBuffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  const whiteNoise = c.createBufferSource();
  whiteNoise.buffer = noiseBuffer;

  const noiseFilter = c.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(1200, now);

  const noiseGain = c.createGain();
  noiseGain.gain.setValueAtTime(0.28, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

  whiteNoise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(c.destination);

  whiteNoise.start(now);
}

/** Metallic sword block sound */
export function playBlock(): void {
  const c = getContext();
  if (!c) return;

  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(950, now);
  osc.frequency.setValueAtTime(1200, now + 0.02);
  osc.frequency.exponentialRampToValueAtTime(500, now + 0.2);

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  osc.connect(gain);
  gain.connect(c.destination);

  osc.start(now);
  osc.stop(now + 0.21);
}

/** Fast dash / evade sound */
export function playEvade(): void {
  const c = getContext();
  if (!c) return;

  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(480, now + 0.08);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.16);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

  osc.connect(gain);
  gain.connect(c.destination);

  osc.start(now);
  osc.stop(now + 0.17);
}

/** Dragon breath fire burst */
export function playDragonBreath(): void {
  const c = getContext();
  if (!c) return;

  const now = c.currentTime;
  const bufferSize = Math.floor(c.sampleRate * 0.4);
  const noiseBuffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  const whiteNoise = c.createBufferSource();
  whiteNoise.buffer = noiseBuffer;

  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(450, now);
  filter.frequency.linearRampToValueAtTime(180, now + 0.4);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

  whiteNoise.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);

  whiteNoise.start(now);
}

/** Room clear triumphant fanfare */
export function playVictory(): void {
  const c = getContext();
  if (!c) return;

  const notes = [261.63, 329.63, 392.0, 523.25]; // C4, E4, G4, C5
  notes.forEach((freq, idx) => {
    const now = c.currentTime + idx * 0.12;
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

    osc.connect(gain);
    gain.connect(c.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  });
}

/** Defeat chime */
export function playDefeat(): void {
  const c = getContext();
  if (!c) return;

  const notes = [392.0, 369.99, 329.63, 293.66]; // Descending
  notes.forEach((freq, idx) => {
    const now = c.currentTime + idx * 0.18;
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(c.destination);

    osc.start(now);
    osc.stop(now + 0.27);
  });
}
