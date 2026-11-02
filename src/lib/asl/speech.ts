import { startBand, stopBand } from "@/lib/asl/band";

let speakToken = 0;

/** Fast enough to sound excited, still clear. */
const SPEECH_RATE = 1.35;

/** Bright and lifted, so the voice feels hyped. */
const HYPER_PITCH = 1.4;

export function canSpeak(): boolean {
  return typeof window !== "undefined" && !!window.speechSynthesis;
}

export function stopSpeaking(): void {
  speakToken += 1;
  stopBand();
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
}

function namedEnglishVoice(needle: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return voices.find(
    (voice) =>
      voice.name.toLowerCase().includes(needle) &&
      (voice.lang.startsWith("en") || /english/i.test(voice.name) || !voice.lang)
  );
}

function pickHyperVoice(): SpeechSynthesisVoice | null {
  return (
    namedEnglishVoice("good news") ??
    namedEnglishVoice("samantha") ??
    namedEnglishVoice("kathy") ??
    null
  );
}

function pickSingingVoice(): SpeechSynthesisVoice | null {
  return (
    namedEnglishVoice("superstar") ??
    namedEnglishVoice("cellos") ??
    namedEnglishVoice("bells") ??
    namedEnglishVoice("organ") ??
    null
  );
}

function waitForVoices(timeoutMs = 400): Promise<void> {
  const synth = window.speechSynthesis;
  if (synth.getVoices().length > 0) return Promise.resolve();

  return new Promise((resolve) => {
    const finish = () => {
      synth.removeEventListener("voiceschanged", onChange);
      window.clearTimeout(timer);
      resolve();
    };
    const onChange = () => {
      if (synth.getVoices().length > 0) finish();
    };
    const timer = window.setTimeout(finish, timeoutMs);
    synth.addEventListener("voiceschanged", onChange);
    synth.getVoices();
  });
}

/** Slower than talking, without dragging every word. */
const SING_RATE = 0.85;
const SING_PITCH = 1.12;

function say(phrase: string, style: "talk" | "sing", token: number): void {
  void waitForVoices().then(() => {
    if (token !== speakToken) return;
    if (!canSpeak()) {
      if (style === "sing") stopBand();
      return;
    }
    const singing = style === "sing";
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.rate = singing ? SING_RATE : SPEECH_RATE;
    utterance.pitch = singing ? SING_PITCH : HYPER_PITCH;
    const voice = singing ? pickSingingVoice() : pickHyperVoice();
    if (voice) utterance.voice = voice;
    if (singing) {
      const stopIfCurrent = () => {
        if (token === speakToken) stopBand();
      };
      utterance.onend = stopIfCurrent;
      utterance.onerror = stopIfCurrent;
    }
    window.speechSynthesis.speak(utterance);
  });
}

export function speakText(text: string): void {
  const phrase = text.trim();
  if (!phrase || !canSpeak()) return;

  const current = ++speakToken;
  stopBand();
  window.speechSynthesis.cancel();
  say(phrase, "talk", current);
}

export function singText(text: string): void {
  const phrase = text.trim();
  if (!phrase || !canSpeak()) return;

  const current = ++speakToken;
  window.speechSynthesis.cancel();
  startBand(phrase);
  say(phrase, "sing", current);
}

/** How far `text` has a finished word (ends on a space or punctuation). */
export function finishedSpeechEnd(text: string): number {
  if (!text) return 0;
  if (/[\s.,!?;:]$/.test(text)) return text.length;

  let index = text.trimEnd().length - 1;
  while (index >= 0 && !/[\s.,!?;:]/.test(text[index])) index -= 1;
  return index + 1;
}
