/** Rock backing band. Each letter you spelled becomes a note, each word a chord. */

/** Sits with the slower rock-star vocal. */
const BPM = 100;
const BEAT = 60 / BPM;
const EIGHTH = BEAT / 2;

/** Minor pentatonic, so the spelled notes still sound like rock. */
const SCALE = [0, 3, 5, 7, 10];

/** E, A, G, F, B — the key follows the first letter. */
const KEYS = [40, 45, 43, 41, 47];

type NoteEvent = { time: number; midi: number; dur: number };

type BandPattern = {
  duration: number;
  eighths: number;
  letters: NoteEvent[];
  chords: NoteEvent[];
};

type BandSession = {
  sources: AudioScheduledSourceNode[];
  master: GainNode;
  timers: number[];
};

let audioContext: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
let distortion: Float32Array | null = null;
let session: BandSession | null = null;
let listener: ((playing: boolean) => void) | null = null;

export function subscribeBand(next: (playing: boolean) => void): () => void {
  listener = next;
  return () => {
    if (listener === next) listener = null;
  };
}

function notify(playing: boolean): void {
  listener?.(playing);
}

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) audioContext = new AudioContext();
  return audioContext;
}

function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

function keyFromSpelling(phrase: string): number {
  const first = phrase.match(/[a-z]/i)?.[0];
  if (!first) return KEYS[0];
  return KEYS[(first.toLowerCase().charCodeAt(0) - 97) % KEYS.length];
}

/** Map a–z onto the rock scale so the melody is the spelling. */
function letterMidi(letter: string, key: number): number {
  const index = letter.toLowerCase().charCodeAt(0) - 97;
  const degree = SCALE[index % SCALE.length];
  const octave = Math.floor(index / SCALE.length) % 3;
  return key + 12 + degree + octave * 12;
}

export function bandPatternFromSpelling(phrase: string): BandPattern | null {
  const clipped = phrase.trim().slice(0, 180);
  const key = keyFromSpelling(clipped);
  const letters: NoteEvent[] = [];
  const chords: NoteEvent[] = [];
  let step = 0;
  let inWord = false;
  let wordRoot = key;
  let wordStart = 0;

  const flushWord = (endStep: number) => {
    if (!inWord || endStep <= wordStart) return;
    chords.push({
      time: wordStart * EIGHTH,
      midi: wordRoot,
      dur: (endStep - wordStart) * EIGHTH,
    });
    inWord = false;
  };

  for (const char of clipped) {
    if (/\s/.test(char)) {
      flushWord(step);
      step += 2;
      continue;
    }
    if (!/[a-z]/i.test(char)) continue;
    if (!inWord) {
      const index = char.toLowerCase().charCodeAt(0) - 97;
      wordRoot = key + SCALE[index % SCALE.length];
      wordStart = step;
      inWord = true;
    }
    const vowel = /[aeiou]/i.test(char);
    const eighths = vowel ? 2 : 1;
    letters.push({
      time: step * EIGHTH,
      midi: letterMidi(char, key),
      dur: eighths * EIGHTH * 0.92,
    });
    step += eighths;
  }
  flushWord(step);
  if (letters.length === 0) return null;

  const eighths = Math.ceil(step / 8) * 8;
  return { duration: eighths * EIGHTH, eighths, letters, chords };
}

function getNoise(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const length = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
}

function distortionCurve(): Float32Array {
  if (distortion) return distortion;
  const curve = new Float32Array(256);
  for (let i = 0; i < curve.length; i += 1) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * 5);
  }
  distortion = curve;
  return curve;
}

function envGain(ctx: AudioContext, when: number, peak: number, dur: number): GainNode {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0001), when + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(dur, 0.03));
  return gain;
}

function playKick(ctx: AudioContext, current: BandSession, when: number): void {
  const osc = ctx.createOscillator();
  const gain = envGain(ctx, when, 0.28, 0.16);
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, when);
  osc.frequency.exponentialRampToValueAtTime(46, when + 0.09);
  osc.connect(gain);
  gain.connect(current.master);
  osc.start(when);
  osc.stop(when + 0.18);
  current.sources.push(osc);
}

function playNoise(
  ctx: AudioContext,
  current: BandSession,
  when: number,
  dur: number,
  peak: number,
  type: BiquadFilterType,
  freq: number,
): void {
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = envGain(ctx, when, peak, dur);
  src.buffer = getNoise(ctx);
  filter.type = type;
  filter.frequency.setValueAtTime(freq, when);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(current.master);
  src.start(when);
  src.stop(when + dur + 0.02);
  current.sources.push(src);
}

function playBass(ctx: AudioContext, current: BandSession, when: number, midi: number): void {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = envGain(ctx, when, 0.12, 0.22);
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(midiToHz(midi), when);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(240, when);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(current.master);
  osc.start(when);
  osc.stop(when + 0.24);
  current.sources.push(osc);
}

function playGuitar(ctx: AudioContext, current: BandSession, when: number, midi: number, dur: number): void {
  [0, 7, 12].forEach((semi, index) => {
    const start = when + index * 0.014;
    const osc = ctx.createOscillator();
    const shaper = ctx.createWaveShaper();
    const filter = ctx.createBiquadFilter();
    const gain = envGain(ctx, start, 0.035, dur);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(midiToHz(midi + semi), start);
    osc.detune.setValueAtTime(index === 0 ? -6 : 7, start);
    shaper.curve = distortionCurve() as Float32Array<ArrayBuffer>;
    shaper.oversample = "2x";
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1400, start);
    osc.connect(shaper);
    shaper.connect(filter);
    filter.connect(gain);
    gain.connect(current.master);
    osc.start(start);
    osc.stop(start + dur + 0.02);
    current.sources.push(osc);
  });
}

function playLead(ctx: AudioContext, current: BandSession, when: number, midi: number, dur: number): void {
  const osc = ctx.createOscillator();
  const shaper = ctx.createWaveShaper();
  const filter = ctx.createBiquadFilter();
  const gain = envGain(ctx, when, 0.05, dur);
  osc.type = "square";
  osc.frequency.setValueAtTime(midiToHz(midi), when);
  shaper.curve = distortionCurve() as Float32Array<ArrayBuffer>;
  shaper.oversample = "2x";
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1200, when);
  filter.Q.setValueAtTime(0.7, when);
  osc.connect(shaper);
  shaper.connect(filter);
  filter.connect(gain);
  gain.connect(current.master);
  osc.start(when);
  osc.stop(when + dur + 0.02);
  current.sources.push(osc);
}

function scheduleLoop(ctx: AudioContext, current: BandSession, loopStart: number, pattern: BandPattern): void {
  const now = ctx.currentTime;
  if (loopStart + pattern.duration < now) return;

  const quarters = pattern.eighths / 2;
  for (let beat = 0; beat < quarters; beat += 1) {
    const when = loopStart + beat * BEAT;
    if (when < now) continue;
    const place = beat % 4;
    if (place === 0 || place === 2) playKick(ctx, current, when);
    if (place === 1 || place === 3) playNoise(ctx, current, when, 0.12, 0.08, "bandpass", 1800);
    if (place === 0) playNoise(ctx, current, when, 0.4, 0.05, "highpass", 6000);
    playNoise(ctx, current, when, 0.04, 0.035, "highpass", 8000);
    playNoise(ctx, current, when + EIGHTH, 0.03, 0.02, "highpass", 9000);
  }

  for (const chord of pattern.chords) {
    const when = loopStart + chord.time;
    if (when < now) continue;
    const stab = Math.min(0.42, chord.dur * 0.85);
    playGuitar(ctx, current, when, chord.midi + 12, stab);
    if (chord.dur > BEAT * 2) {
      playGuitar(ctx, current, when + BEAT * 2, chord.midi + 12, stab * 0.8);
    }
    const hits = Math.max(1, Math.round(chord.dur / BEAT));
    for (let hit = 0; hit < hits; hit += 1) {
      const bassAt = when + hit * BEAT;
      if (bassAt < now) continue;
      const semi = hit % 2 === 0 ? 0 : 7;
      playBass(ctx, current, bassAt, chord.midi + semi);
    }
  }

  for (const note of pattern.letters) {
    const when = loopStart + note.time;
    if (when < now) continue;
    playLead(ctx, current, when, note.midi, note.dur);
  }
}

function halt(notifyOff: boolean): void {
  const current = session;
  session = null;
  if (!current) {
    if (notifyOff) notify(false);
    return;
  }
  for (const timer of current.timers) window.clearTimeout(timer);
  const ctx = audioContext;
  if (ctx) {
    const now = ctx.currentTime;
    current.master.gain.cancelScheduledValues(now);
    current.master.gain.setValueAtTime(Math.max(current.master.gain.value, 0.0001), now);
    current.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
  }
  window.setTimeout(() => {
    for (const source of current.sources) {
      try {
        source.stop();
      } catch {
        /* already finished */
      }
      try {
        source.disconnect();
      } catch {
        /* already disconnected */
      }
    }
    try {
      current.master.disconnect();
    } catch {
      /* already disconnected */
    }
  }, 80);
  if (notifyOff) notify(false);
}

export function stopBand(): void {
  halt(true);
}

export function startBand(phrase: string): void {
  halt(false);
  const pattern = bandPatternFromSpelling(phrase);
  const ctx = getContext();
  if (!pattern || !ctx) {
    notify(false);
    return;
  }
  void ctx.resume();

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.62, ctx.currentTime);
  master.connect(ctx.destination);
  const current: BandSession = { sources: [], master, timers: [] };
  session = current;
  notify(true);

  const origin = ctx.currentTime + 0.05;
  let loop = 0;
  const pump = () => {
    if (session !== current) return;
    if (loop >= 8) {
      halt(true);
      return;
    }
    const loopStart = origin + loop * pattern.duration;
    scheduleLoop(ctx, current, loopStart, pattern);
    loop += 1;
    const waitMs = (loopStart + pattern.duration - ctx.currentTime - 0.2) * 1000;
    current.timers.push(window.setTimeout(pump, Math.max(30, waitMs)));
  };
  pump();
}
