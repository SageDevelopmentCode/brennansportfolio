let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

function playTone(
  frequency: number,
  durationMs: number,
  type: OscillatorType = "sine",
  volume = 0.08
) {
  const ctx = getContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = volume;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    ctx.currentTime + durationMs / 1000
  );
  oscillator.stop(ctx.currentTime + durationMs / 1000);
}

export function playKeyClick() {
  playTone(880, 35, "triangle", 0.05);
}

export function playCorrectWord() {
  playTone(660, 60, "sine", 0.07);
  window.setTimeout(() => playTone(990, 80, "sine", 0.06), 50);
}

export function playErrorBuzz() {
  playTone(180, 120, "sawtooth", 0.07);
}

export function playCelebration() {
  const notes = [523, 659, 784, 1047, 1319];
  notes.forEach((freq, index) => {
    window.setTimeout(() => playTone(freq, 140, "sine", 0.09), index * 90);
  });
}

export async function resumeAudio() {
  const ctx = getContext();
  if (ctx?.state === "suspended") {
    await ctx.resume();
  }
}
