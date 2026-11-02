/** Slower = clearer; high = Elmo-ish “50-year-old” falsetto. */
export const LENNY_SPEECH_RATE = 0.81;
export const LENNY_SPEECH_PITCH = 1.35;

let activeSession = 0;
let primedFromGesture = false;

const PREFERRED_VOICE_NAMES =
  /samantha|karen|moira|google us english|zira|flo|junior|compact|victoria|tessa|allison|ava|nicky|superstar/i;

/** Never use bare `male` — it matches inside “Female”. */
const AVOID_VOICE_NAMES =
  /daniel|fred|gordon|arthur|albert|ralph|aaron|rocko|deep|baritone|grandpa|elder|\bmale\b/i;

function getSynth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
}

function getVoicesList(): SpeechSynthesisVoice[] {
  const synth = getSynth();
  if (!synth) return [];
  return synth.getVoices();
}

function pickLennyVoice(): SpeechSynthesisVoice | null {
  const voices = getVoicesList();
  if (voices.length === 0) return null;

  const enUs = voices.filter((v) => v.lang.startsWith("en-US"));
  const en = enUs.length > 0 ? enUs : voices.filter((v) => v.lang.startsWith("en"));

  const preferred = en.find(
    (v) => PREFERRED_VOICE_NAMES.test(v.name) && !AVOID_VOICE_NAMES.test(v.name),
  );
  if (preferred) return preferred;

  const notDeep = en.find((v) => !AVOID_VOICE_NAMES.test(v.name));
  return notDeep ?? en[0] ?? null;
}

function ensureVoicesLoaded() {
  const synth = getSynth();
  if (!synth) return;
  synth.getVoices();
  synth.addEventListener("voiceschanged", () => synth.getVoices(), { once: true });
}

function waitForVoices(timeoutMs = 2500): Promise<void> {
  const synth = getSynth();
  if (!synth) return Promise.resolve();
  if (getVoicesList().length > 0) return Promise.resolve();

  return new Promise((resolve) => {
    const finish = () => {
      synth.removeEventListener("voiceschanged", onChange);
      window.clearTimeout(timer);
      resolve();
    };
    const onChange = () => {
      if (getVoicesList().length > 0) finish();
    };
    const timer = window.setTimeout(finish, timeoutMs);
    synth.addEventListener("voiceschanged", onChange);
    onChange();
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Call from a click/tap so TTS works when owner denies via realtime. */
export function primeLennySpeechFromUserGesture() {
  const synth = getSynth();
  // #region agent log
  fetch("http://127.0.0.1:7380/ingest/87f3419d-18bb-4b16-a6a8-dcdb1c7d5c46", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "503e96",
    },
    body: JSON.stringify({
      sessionId: "503e96",
      location: "gym-lenny-speech.ts:primeLennySpeechFromUserGesture",
      message: "prime called",
      data: { hasSynth: !!synth, paused: synth?.paused ?? null },
      timestamp: Date.now(),
      hypothesisId: "A",
    }),
  }).catch(() => {});
  // #endregion
  if (!synth) return;

  primedFromGesture = true;
  ensureVoicesLoaded();
  if (synth.paused) synth.resume();

  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(" ");
  utterance.volume = 0.01;
  utterance.rate = 1;
  utterance.pitch = 1;
  synth.speak(utterance);
}

export function isLennySpeechPrimed(): boolean {
  return primedFromGesture;
}

/** Stops audio without invalidating in-flight session (React strict-mode cleanup). */
export function cancelLennySpeechPlayback() {
  getSynth()?.cancel();
}

function normalizeForSpeech(text: string): string {
  return text
    .replace(/[""]/g, '"')
    .replace(/…/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

function splitIntoSentences(text: string): string[] {
  const normalized = normalizeForSpeech(text);
  const parts = normalized.split(/(?<=[.!?])\s+/).filter((p) => p.length > 0);
  return parts.length > 0 ? parts : [normalized];
}

function buildLennyUtterance(text: string, pitch = LENNY_SPEECH_PITCH): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = LENNY_SPEECH_RATE;
  utterance.pitch = pitch;
  utterance.volume = 1;
  utterance.lang = "en-US";
  const voice = pickLennyVoice();
  if (voice) utterance.voice = voice;
  return utterance;
}

const UTTERANCE_WATCHDOG_MS = 12_000;

function speakOneChunk(
  text: string,
  session: number,
  options?: { skipLeadIn?: boolean },
): Promise<void> {
  const skipLeadIn = options?.skipLeadIn ?? false;

  const run = async () => {
    if (!skipLeadIn) {
      await delay(60);
      if (session !== activeSession) return;
      cancelLennySpeechPlayback();
      await delay(40);
      if (session !== activeSession) return;
    }

    let started = false;

    await new Promise<void>((resolve) => {
      const synth = getSynth();
      if (!synth || session !== activeSession) {
        resolve();
        return;
      }

      synth.resume();

      const utterance = buildLennyUtterance(text);
      utterance.onstart = () => {
        started = true;
        // #region agent log
        fetch("http://127.0.0.1:7380/ingest/87f3419d-18bb-4b16-a6a8-dcdb1c7d5c46", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "503e96",
          },
          body: JSON.stringify({
            sessionId: "503e96",
            location: "gym-lenny-speech.ts:speakOneChunk:onstart",
            message: "utterance started",
            data: {
              session,
              activeSession,
              textLen: text.length,
              voiceName: utterance.voice?.name ?? null,
            },
            timestamp: Date.now(),
            hypothesisId: "E",
          }),
        }).catch(() => {});
        // #endregion
      };
      const finish = () => {
        window.clearTimeout(watchdog);
        resolve();
      };

      const watchdog = window.setTimeout(() => {
        // #region agent log
        fetch("http://127.0.0.1:7380/ingest/87f3419d-18bb-4b16-a6a8-dcdb1c7d5c46", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "503e96",
          },
          body: JSON.stringify({
            sessionId: "503e96",
            location: "gym-lenny-speech.ts:speakOneChunk:watchdog",
            message: "utterance watchdog fired",
            data: { session, activeSession, started, skipLeadIn },
            timestamp: Date.now(),
            hypothesisId: "D",
            runId: "post-fix",
          }),
        }).catch(() => {});
        // #endregion
        if (!started) synth.cancel();
        finish();
      }, UTTERANCE_WATCHDOG_MS);

      utterance.onend = () => finish();
      utterance.onerror = (ev) => {
        // #region agent log
        fetch("http://127.0.0.1:7380/ingest/87f3419d-18bb-4b16-a6a8-dcdb1c7d5c46", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "503e96",
          },
          body: JSON.stringify({
            sessionId: "503e96",
            location: "gym-lenny-speech.ts:speakOneChunk:onerror",
            message: "utterance error",
            data: {
              session,
              activeSession,
              error: (ev as SpeechSynthesisErrorEvent).error ?? "unknown",
              started,
            },
            timestamp: Date.now(),
            hypothesisId: "D",
            runId: "post-fix",
          }),
        }).catch(() => {});
        // #endregion
        finish();
      };

      // #region agent log
      fetch("http://127.0.0.1:7380/ingest/87f3419d-18bb-4b16-a6a8-dcdb1c7d5c46", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "503e96",
        },
        body: JSON.stringify({
          sessionId: "503e96",
          location: "gym-lenny-speech.ts:speakOneChunk:speak",
          message: "calling synth.speak",
          data: { session, activeSession, skipLeadIn, textLen: text.length },
          timestamp: Date.now(),
          hypothesisId: "F",
          runId: "post-fix",
        }),
      }).catch(() => {});
      // #endregion

      synth.speak(utterance);
    });

    if (started || session !== activeSession) return;

    await new Promise<void>((resolve) => {
      const synth = getSynth();
      if (!synth || session !== activeSession) {
        resolve();
        return;
      }

      synth.resume();
      const utterance = buildLennyUtterance(text, 1.1);
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      synth.speak(utterance);
    });
  };

  return run();
}

/** Queue speech synchronously inside a click/tap handler (before awaits). */
export function queueLennySpeechFromUserGesture(text: string): void {
  const synth = getSynth();
  if (!synth) return;

  primedFromGesture = true;
  ensureVoicesLoaded();
  activeSession += 1;
  const session = activeSession;

  synth.resume();
  const utterance = buildLennyUtterance(normalizeForSpeech(text));
  utterance.onstart = () => {
    // #region agent log
    fetch("http://127.0.0.1:7380/ingest/87f3419d-18bb-4b16-a6a8-dcdb1c7d5c46", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "503e96",
      },
      body: JSON.stringify({
        sessionId: "503e96",
        location: "gym-lenny-speech.ts:queueLennySpeechFromUserGesture:onstart",
        message: "gesture utterance started",
        data: { session, activeSession, textLen: text.length },
        timestamp: Date.now(),
        hypothesisId: "F",
        runId: "post-fix",
      }),
    }).catch(() => {});
    // #endregion
  };
  utterance.onerror = (ev) => {
    // #region agent log
    fetch("http://127.0.0.1:7380/ingest/87f3419d-18bb-4b16-a6a8-dcdb1c7d5c46", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "503e96",
      },
      body: JSON.stringify({
        sessionId: "503e96",
        location: "gym-lenny-speech.ts:queueLennySpeechFromUserGesture:onerror",
        message: "gesture utterance error",
        data: {
          session,
          error: (ev as SpeechSynthesisErrorEvent).error ?? "unknown",
        },
        timestamp: Date.now(),
        hypothesisId: "F",
        runId: "post-fix",
      }),
    }).catch(() => {});
    // #endregion
  };
  synth.speak(utterance);
}

export function stopLennySpeech() {
  activeSession += 1;
  cancelLennySpeechPlayback();
}

export async function speakLennyLine(
  text: string,
  onSpeakingChange?: (speaking: boolean) => void,
): Promise<void> {
  const synth = getSynth();
  // #region agent log
  fetch("http://127.0.0.1:7380/ingest/87f3419d-18bb-4b16-a6a8-dcdb1c7d5c46", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "503e96",
    },
    body: JSON.stringify({
      sessionId: "503e96",
      location: "gym-lenny-speech.ts:speakLennyLine:entry",
      message: "speakLennyLine called",
      data: {
        hasSynth: !!synth,
        primedFromGesture,
        textLen: text.length,
        voiceCount: getVoicesList().length,
        paused: synth?.paused ?? null,
      },
      timestamp: Date.now(),
      hypothesisId: "A,C",
    }),
  }).catch(() => {});
  // #endregion
  if (!synth) return;

  ensureVoicesLoaded();
  await waitForVoices();

  activeSession += 1;
  const session = activeSession;
  if (!primedFromGesture) {
    cancelLennySpeechPlayback();
    await delay(80);
  }

  const sentences = splitIntoSentences(text);
  onSpeakingChange?.(true);

  try {
    for (let i = 0; i < sentences.length; i += 1) {
      if (session !== activeSession) return;
      await speakOneChunk(sentences[i], session, {
        skipLeadIn: primedFromGesture && i === 0,
      });
      if (session !== activeSession) return;
      if (sentences.length > 1 && i < sentences.length - 1) {
        await delay(280);
      }
    }
  } finally {
    if (session === activeSession) {
      onSpeakingChange?.(false);
    }
  }
}

export function resumeLennySpeech() {
  const synth = getSynth();
  if (!synth) return;
  ensureVoicesLoaded();
  if (synth.paused) synth.resume();
}
