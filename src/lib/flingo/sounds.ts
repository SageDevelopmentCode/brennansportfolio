import type { SoundEvent } from "@/lib/flingo/engine";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let muted = false;
const lastPlayed: Partial<Record<SoundEvent, number>> = {};

const MIN_GAP: Partial<Record<SoundEvent, number>> = {
  bounce: 0.08,
  smash: 0.04,
  land: 0.1,
  hurt: 0.15,
};

const MASTER_VOLUME = 0.42;

export function resumeFlingoAudio() {
  if (typeof window === "undefined") return;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : MASTER_VOLUME;
    master.connect(ctx.destination);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") void ctx.resume();
}

export function setFlingoMuted(value: boolean) {
  muted = value;
  if (master) master.gain.value = value ? 0 : MASTER_VOLUME;
}

function envelope(g: GainNode, t0: number, dur: number, vol: number) {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
}

function tone(
  f0: number,
  f1: number,
  dur: number,
  type: OscillatorType,
  vol: number,
  delay = 0,
) {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t0);
  if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
  envelope(g, t0, dur, vol);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(
  dur: number,
  vol: number,
  freq: number,
  type: BiquadFilterType = "lowpass",
  delay = 0,
) {
  if (!ctx || !master || !noiseBuffer) return;
  const t0 = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  const g = ctx.createGain();
  envelope(g, t0, dur, vol);
  src.connect(filter).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

export function playFlingoSound(ev: SoundEvent) {
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  const gap = MIN_GAP[ev] ?? 0;
  if (gap && lastPlayed[ev] !== undefined && now - lastPlayed[ev]! < gap) return;
  lastPlayed[ev] = now;

  switch (ev) {
    case "fling":
      noise(0.12, 0.35, 900, "bandpass");
      tone(180, 520, 0.18, "square", 0.22);
      tone(90, 220, 0.22, "sawtooth", 0.12);
      break;
    case "bounce":
      tone(240, 160, 0.08, "triangle", 0.18);
      break;
    case "land":
      noise(0.08, 0.22, 280);
      tone(140, 90, 0.1, "sine", 0.15);
      break;
    case "smash":
      noise(0.1, 0.4, 1200, "bandpass");
      tone(420, 180, 0.12, "square", 0.2);
      break;
    case "combo":
      tone(520, 520, 0.07, "sine", 0.18);
      tone(660, 660, 0.07, "sine", 0.18, 0.07);
      tone(880, 880, 0.1, "sine", 0.2, 0.14);
      break;
    case "dash":
      noise(0.14, 0.3, 1800, "highpass");
      tone(300, 900, 0.16, "sawtooth", 0.16);
      break;
    case "star":
      tone(660, 990, 0.12, "sine", 0.22);
      tone(990, 1320, 0.14, "sine", 0.18, 0.08);
      break;
    case "hurt":
      noise(0.18, 0.35, 400);
      tone(220, 80, 0.2, "sawtooth", 0.22);
      break;
    case "boost":
      tone(200, 600, 0.2, "triangle", 0.25);
      noise(0.1, 0.2, 700, "bandpass");
      break;
    case "pop":
      noise(0.12, 0.28, 500);
      tone(160, 60, 0.12, "square", 0.15);
      break;
    case "death":
      tone(300, 60, 0.45, "sawtooth", 0.25);
      noise(0.4, 0.3, 350);
      break;
  }
}
