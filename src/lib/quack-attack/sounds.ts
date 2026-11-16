import type { SoundEvent } from "@/lib/quack-attack/engine";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let muted = false;
const lastPlayed: Partial<Record<SoundEvent, number>> = {};

const MIN_GAP: Partial<Record<SoundEvent, number>> = {
  shoot: 0.07,
  hit: 0.04,
  kill: 0.03,
  gem: 0.03,
  zap: 0.1,
  laser: 0.1,
  boom: 0.06,
  squeak: 0.12,
  throw: 0.1,
  hurt: 0.15,
  levelup: 0.3,
};

const MASTER_VOLUME = 0.4;

export function resumeQuackAudio() {
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

export function setQuackMuted(value: boolean) {
  muted = value;
  if (master) master.gain.value = value ? 0 : MASTER_VOLUME;
}

function envelope(g: GainNode, t0: number, dur: number, vol: number) {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
}

function tone(f0: number, f1: number, dur: number, type: OscillatorType, vol: number, delay = 0) {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t0);
  if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  envelope(g, t0, dur, vol);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(dur: number, vol: number, freq: number, type: BiquadFilterType = "lowpass", delay = 0) {
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

function quack(delay = 0, pitch = 1) {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(560 * pitch, t0);
  osc.frequency.exponentialRampToValueAtTime(320 * pitch, t0 + 0.16);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1150;
  band.Q.value = 3.5;
  const g = ctx.createGain();
  envelope(g, t0, 0.18, 0.5);
  osc.connect(band).connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + 0.25);
}

function arpeggio(notes: number[], step: number, type: OscillatorType, vol: number) {
  notes.forEach((f, i) => tone(f, f, step * 1.6, type, vol, i * step));
}

export function playQuackSound(name: SoundEvent) {
  if (!ctx || muted) return;
  const now = ctx.currentTime;
  const gap = MIN_GAP[name] ?? 0;
  const last = lastPlayed[name] ?? -1;
  if (now - last < gap) return;
  lastPlayed[name] = now;

  const r = Math.random();
  switch (name) {
    case "shoot":
      tone(900, 500, 0.06, "square", 0.03);
      break;
    case "hit":
      tone(240, 120, 0.05, "triangle", 0.06);
      break;
    case "kill":
      tone(420 + r * 260, 1300 + r * 400, 0.07, "sine", 0.08);
      break;
    case "gem":
      tone(1200 + r * 500, 1900 + r * 500, 0.05, "sine", 0.045);
      break;
    case "levelup":
      arpeggio([523, 659, 784, 1047, 1319], 0.065, "square", 0.06);
      break;
    case "hurt":
      tone(320, 80, 0.22, "sawtooth", 0.12);
      noise(0.15, 0.12, 1200);
      break;
    case "boom":
      noise(0.35, 0.22, 900);
      tone(130, 40, 0.3, "sine", 0.22);
      break;
    case "zap":
      noise(0.12, 0.08, 4000, "highpass");
      tone(1500, 300, 0.1, "sawtooth", 0.05);
      break;
    case "laser":
      tone(1800, 200, 0.25, "sawtooth", 0.06);
      tone(900, 100, 0.25, "square", 0.03);
      break;
    case "quack":
      quack(0, 1);
      quack(0.17, 0.85);
      noise(0.6, 0.3, 700, "lowpass", 0.05);
      tone(110, 35, 0.6, "sine", 0.3, 0.05);
      break;
    case "boss":
      tone(90, 40, 1.1, "sawtooth", 0.18);
      tone(60, 30, 1.3, "square", 0.08);
      noise(0.8, 0.1, 300);
      break;
    case "bossdown":
      noise(0.8, 0.3, 800);
      arpeggio([392, 523, 659, 784, 1047, 1319, 1568], 0.08, "square", 0.07);
      break;
    case "chest":
      arpeggio([784, 988, 1175, 1568, 1976], 0.05, "triangle", 0.09);
      break;
    case "pickup":
      tone(600, 1200, 0.12, "triangle", 0.1);
      tone(900, 1800, 0.12, "triangle", 0.06, 0.06);
      break;
    case "swarm":
      tone(400, 800, 0.35, "square", 0.05);
      tone(400, 800, 0.35, "square", 0.05, 0.4);
      break;
    case "death":
      tone(600, 60, 1.1, "sawtooth", 0.14);
      quack(0.1, 0.6);
      quack(0.35, 0.45);
      break;
    case "squeak":
      tone(1400, 2300, 0.08, "square", 0.025);
      break;
    case "throw":
      noise(0.12, 0.06, 1800, "bandpass");
      break;
    case "nope":
      tone(200, 160, 0.12, "square", 0.05);
      break;
  }
}
