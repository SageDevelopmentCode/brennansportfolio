let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) audioContext = new AudioContext();
  return audioContext;
}

export async function resumeRocketAudio() {
  const ctx = getContext();
  if (ctx?.state === "suspended") await ctx.resume();
}

function playTone(
  frequency: number,
  durationMs: number,
  type: OscillatorType,
  volume: number,
  slideTo?: number
) {
  const ctx = getContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
  if (slideTo) {
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, slideTo),
      ctx.currentTime + durationMs / 1000
    );
  }
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + durationMs / 1000);
}

function playNoise(duration: number, volume: number, frequency: number) {
  const ctx = getContext();
  if (!ctx) return;

  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = frequency;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
  source.stop(ctx.currentTime + duration);
}

export function playRocketPunch() {
  playTone(240, 70, "square", 0.04, 90);
  playNoise(0.06, 0.05, 900);
}

export function playRocketExplode(big: boolean) {
  playNoise(big ? 0.22 : 0.12, big ? 0.08 : 0.05, big ? 420 : 700);
  playTone(big ? 140 : 200, big ? 160 : 90, "sawtooth", 0.03, 50);
}

export function playRocketDash() {
  playTone(420, 120, "square", 0.04, 980);
}

export function playRocketHurt() {
  playTone(160, 180, "sawtooth", 0.06, 60);
}

export function playRocketBlock() {
  playTone(720, 70, "triangle", 0.05, 1180);
}

export function playRocketPickup(kind: "triple" | "shield" | "slow" | "pizza") {
  const root = kind === "pizza" ? 392 : kind === "shield" ? 523 : kind === "slow" ? 494 : 587;
  playTone(root, 80, "sine", 0.06);
  window.setTimeout(() => playTone(root * 1.5, 110, "sine", 0.05), 60);
}

export function playRocketWave() {
  playTone(660, 90, "square", 0.04);
  window.setTimeout(() => playTone(880, 120, "square", 0.04), 80);
}

export function playRocketBoss() {
  const notes = [196, 247, 330, 392];
  notes.forEach((frequency, index) => {
    window.setTimeout(() => playTone(frequency, 180, "sawtooth", 0.05), index * 110);
  });
}
