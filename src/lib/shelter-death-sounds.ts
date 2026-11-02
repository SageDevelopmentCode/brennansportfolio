export type ShelterDeathSoundKey =
  | "drone"
  | "flicker"
  | "stamp"
  | "door"
  | "snort"
  | "heartbeat"
  | "charge"
  | "impact"
  | "silence"
  | "gameOver"
  | "pigNear"
  | "hit"
  | "garyDown";

let audioContext: AudioContext | null = null;
const activeNodes: AudioNode[] = [];

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

export async function resumeShelterDeathAudio() {
  const ctx = getContext();
  if (ctx?.state === "suspended") {
    await ctx.resume();
  }
}

function playTone(
  frequency: number,
  durationMs: number,
  type: OscillatorType = "sine",
  volume = 0.08,
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
  activeNodes.push(oscillator, gain);
  const end = ctx.currentTime + durationMs / 1000;
  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.stop(end);
}

function playNoiseBurst(durationMs: number, volume = 0.04) {
  const ctx = getContext();
  if (!ctx) return;

  const bufferSize = ctx.sampleRate * (durationMs / 1000);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buffer;
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(ctx.destination);
  activeNodes.push(source, gain);
  source.start();
  source.stop(ctx.currentTime + durationMs / 1000);
}

export function stopShelterDeathSounds() {
  activeNodes.length = 0;
}

export function playShelterDeathSound(key: ShelterDeathSoundKey) {
  void resumeShelterDeathAudio();

  switch (key) {
    case "drone":
      playTone(55, 3200, "sawtooth", 0.03);
      playTone(82, 3200, "sine", 0.04);
      break;
    case "flicker":
      playNoiseBurst(80, 0.02);
      window.setTimeout(() => playTone(120, 40, "square", 0.03), 60);
      break;
    case "stamp":
      playTone(90, 180, "square", 0.12);
      playNoiseBurst(120, 0.08);
      break;
    case "door":
      playNoiseBurst(400, 0.06);
      window.setTimeout(() => playTone(200, 80, "sawtooth", 0.05), 100);
      break;
    case "snort":
      [180, 140, 220].forEach((f, i) => {
        window.setTimeout(() => playTone(f, 90, "sawtooth", 0.07), i * 120);
      });
      break;
    case "heartbeat":
      playTone(48, 100, "sine", 0.1);
      window.setTimeout(() => playTone(48, 100, "sine", 0.08), 280);
      break;
    case "charge":
      for (let i = 0; i < 6; i++) {
        window.setTimeout(
          () => playTone(160 + i * 30, 60, "triangle", 0.06),
          i * 80,
        );
      }
      break;
    case "impact":
      playNoiseBurst(200, 0.14);
      playTone(70, 300, "sawtooth", 0.1);
      window.setTimeout(() => playTone(400, 150, "sawtooth", 0.06), 50);
      break;
    case "silence":
      break;
    case "gameOver":
      playTone(110, 500, "sine", 0.08);
      window.setTimeout(() => playTone(73, 800, "sine", 0.06), 200);
      break;
    case "pigNear":
      playTone(95, 400, "sawtooth", 0.035);
      playTone(130, 350, "triangle", 0.03);
      break;
    case "hit":
      playNoiseBurst(60, 0.1);
      playTone(180, 80, "square", 0.09);
      break;
    case "garyDown":
      playTone(220, 120, "square", 0.08);
      window.setTimeout(() => playTone(165, 200, "sine", 0.07), 100);
      window.setTimeout(() => playTone(98, 600, "sine", 0.06), 280);
      break;
  }
}
