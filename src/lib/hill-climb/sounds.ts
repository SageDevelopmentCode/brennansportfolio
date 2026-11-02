const MUTE_STORAGE_KEY = "hill-climb-muted";

let audioContext: AudioContext | null = null;
let muted = false;

if (typeof window !== "undefined") {
  try {
    muted = localStorage.getItem(MUTE_STORAGE_KEY) === "1";
  } catch {
    /* ignore */
  }
}

export function isHillClimbMuted(): boolean {
  return muted;
}

export function setHillClimbMuted(value: boolean): void {
  muted = value;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  }
  if (value && engineGain) {
    engineGain.gain.setTargetAtTime(0, getCtx()?.currentTime ?? 0, 0.02);
  }
}

function effectiveGain(base: number): number {
  return muted || isHillClimbMuted() ? 0 : base;
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) audioContext = new AudioContext();
  return audioContext;
}

export function resumeHillClimbAudio(): void {
  const ctx = getCtx();
  if (ctx?.state === "suspended") ctx.resume().catch(() => {});
}

let engineOsc: OscillatorNode | null = null;
let engineGain: GainNode | null = null;

export function startEngineSound(): void {
  const ctx = getCtx();
  if (!ctx || engineOsc) return;
  resumeHillClimbAudio();
  engineOsc = ctx.createOscillator();
  engineGain = ctx.createGain();
  engineOsc.type = "sawtooth";
  engineOsc.frequency.value = 80;
  engineGain.gain.value = 0;
  engineOsc.connect(engineGain);
  engineGain.connect(ctx.destination);
  engineOsc.start();
}

export function stopEngineSound(): void {
  if (engineOsc) {
    engineOsc.stop();
    engineOsc.disconnect();
    engineOsc = null;
  }
  engineGain = null;
}

export function updateEngineRpm(rpm: number, gas: boolean): void {
  if (!engineOsc || !engineGain) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const targetHz = 70 + rpm * 180;
  engineOsc.frequency.setTargetAtTime(targetHz, now, 0.05);
  const vol = effectiveGain(gas ? 0.06 + rpm * 0.04 : 0.02);
  engineGain.gain.setTargetAtTime(vol, now, 0.08);
}

let lastLowFuelBeep = 0;

export function playLowFuelBeep(): void {
  const ctx = getCtx();
  if (!ctx || isHillClimbMuted()) return;
  const now = ctx.currentTime;
  if (now - lastLowFuelBeep < 0.7) return;
  lastLowFuelBeep = now;
  resumeHillClimbAudio();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(520, now);
  gain.gain.setValueAtTime(effectiveGain(0.05), now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.12);
}

export function playCoinSound(): void {
  const ctx = getCtx();
  if (!ctx) return;
  resumeHillClimbAudio();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(1320, now + 0.06);
  gain.gain.setValueAtTime(effectiveGain(0.2), now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}

export function playCrashSound(): void {
  const ctx = getCtx();
  if (!ctx) return;
  resumeHillClimbAudio();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
  gain.gain.setValueAtTime(effectiveGain(0.25), now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.3);
}

export function playFuelCollectSound(): void {
  const ctx = getCtx();
  if (!ctx) return;
  resumeHillClimbAudio();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);
  gain.gain.setValueAtTime(effectiveGain(0.12), now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.15);
}

export function playBonusSound(): void {
  const ctx = getCtx();
  if (!ctx) return;
  resumeHillClimbAudio();
  const now = ctx.currentTime;
  const notes = [523, 659, 784];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    const t0 = now + i * 0.06;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(effectiveGain(0.08), t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.12);
  });
}

export function playFuelEmptySound(): void {
  const ctx = getCtx();
  if (!ctx) return;
  resumeHillClimbAudio();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.linearRampToValueAtTime(80, now + 0.4);
  gain.gain.setValueAtTime(effectiveGain(0.15), now);
  gain.gain.linearRampToValueAtTime(0, now + 0.45);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.45);
}
