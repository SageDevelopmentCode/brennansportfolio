let audioContext: AudioContext | null = null;
let ambientNodes: {
  noise: AudioBufferSourceNode;
  gain: GainNode;
  filter: BiquadFilterNode;
} | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

function resumeContext(ctx: AudioContext): void {
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

export function playBananaCollect(golden: boolean): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  resumeContext(ctx);

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  const base = golden ? 620 : 480;
  osc.frequency.setValueAtTime(base, now);
  osc.frequency.exponentialRampToValueAtTime(base * 1.6, now + 0.07);
  gain.gain.setValueAtTime(0.28, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}

export function playCrash(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  resumeContext(ctx);

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(55, now + 0.2);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.22);
}

export function startJungleAmbient(): void {
  const ctx = getAudioContext();
  if (!ctx || ambientNodes) return;
  resumeContext(ctx);

  const bufferSize = ctx.sampleRate * 2;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  filter.Q.value = 0.4;

  const gain = ctx.createGain();
  gain.gain.value = 0.055;

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start();

  ambientNodes = { noise, gain, filter };
}

export function stopJungleAmbient(): void {
  if (!ambientNodes) return;
  try {
    ambientNodes.noise.stop();
    ambientNodes.noise.disconnect();
    ambientNodes.filter.disconnect();
    ambientNodes.gain.disconnect();
  } catch {
    // already stopped
  }
  ambientNodes = null;
}

/** @deprecated kitchen game — use startJungleAmbient */
export function startKitchenAmbient(): void {
  startJungleAmbient();
}

/** @deprecated kitchen game — use stopJungleAmbient */
export function stopKitchenAmbient(): void {
  stopJungleAmbient();
}
