"use client";

import { SignAudioPanel } from "@/components/sign-audio-panel";
import { SignLanguagePanel } from "@/components/sign-language-panel";
import { textToSignSequence } from "@/lib/asl/sequence";
import { subscribeBand } from "@/lib/asl/band";
import { canSpeak, finishedSpeechEnd, singText, speakText, stopSpeaking } from "@/lib/asl/speech";
import { useEffect, useMemo, useRef, useState } from "react";

type SignMode = "sign" | "audio";

const MODES: { id: SignMode; label: string }[] = [
  { id: "sign", label: "Sign language" },
  { id: "audio", label: "Text to audio" },
];

const SPEAK_PAUSE_MS = 980;

export function SignTranslatorClient() {
  const [mode, setMode] = useState<SignMode>("sign");
  const [text, setText] = useState("");
  const [liveUpdate, setLiveUpdate] = useState(true);
  const [draft, setDraft] = useState("");
  const [committed, setCommitted] = useState("");
  const [speakAsYouType, setSpeakAsYouType] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const [bandOn, setBandOn] = useState(false);
  const spokenRef = useRef({ length: 0, snapshot: "" });

  useEffect(() => {
    setSpeechSupported(canSpeak());
  }, []);

  useEffect(() => subscribeBand(setBandOn), []);

  useEffect(() => () => stopSpeaking(), []);

  useEffect(() => {
    if (mode !== "sign" || !liveUpdate) return;
    const timer = window.setTimeout(() => setDraft(text), 560);
    return () => window.clearTimeout(timer);
  }, [text, liveUpdate, mode]);

  useEffect(() => {
    if (mode !== "audio" || !speechSupported || !speakAsYouType) return;

    const spoken = spokenRef.current;
    if (text.slice(0, spoken.length) !== spoken.snapshot.slice(0, spoken.length)) {
      spokenRef.current = { length: 0, snapshot: "" };
    }

    const finishedEnd = finishedSpeechEnd(text);
    const start = spokenRef.current.length;
    if (finishedEnd > start) {
      const phrase = text.slice(start, finishedEnd).trim();
      if (phrase) {
        speakText(phrase);
        setAnnouncement(phrase);
      }
      spokenRef.current = { length: finishedEnd, snapshot: text };
    }

    const timer = window.setTimeout(() => {
      const cursor = spokenRef.current.length;
      const phrase = text.slice(cursor).trim();
      if (!phrase) {
        spokenRef.current = { length: text.length, snapshot: text };
        return;
      }
      speakText(phrase);
      setAnnouncement(phrase);
      spokenRef.current = { length: text.length, snapshot: text };
    }, SPEAK_PAUSE_MS);

    return () => window.clearTimeout(timer);
  }, [text, speakAsYouType, speechSupported, mode]);

  const sequenceSource = liveUpdate ? draft : committed;

  const sequence = useMemo(
    () => textToSignSequence(mode === "sign" ? sequenceSource : ""),
    [sequenceSource, mode],
  );

  const selectMode = (next: SignMode) => {
    if (next === mode) return;
    stopSpeaking();
    setMode(next);
  };

  const handleLiveUpdateChange = (enabled: boolean) => {
    setLiveUpdate(enabled);
    if (enabled) {
      setDraft(text);
    } else {
      setCommitted(text);
    }
  };

  const handleShowSigns = () => {
    setCommitted(text);
  };

  const readAloud = () => {
    const phrase = text.trim();
    if (!phrase) return;
    speakText(phrase);
    setAnnouncement(phrase);
    spokenRef.current = { length: text.length, snapshot: text };
  };

  const singAloud = () => {
    const phrase = text.trim();
    if (!phrase) return;
    singText(phrase);
    setAnnouncement(`Rock star with the band: ${phrase}`);
    spokenRef.current = { length: text.length, snapshot: text };
  };

  const toggleSpeakAsYouType = (enabled: boolean) => {
    setSpeakAsYouType(enabled);
    if (!enabled) {
      stopSpeaking();
      spokenRef.current = { length: text.length, snapshot: text };
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Sign Bridge modes">
        {MODES.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={mode === tab.id}
            id={`sign-tab-${tab.id}`}
            aria-controls={`sign-panel-${tab.id}`}
            onClick={() => selectMode(tab.id)}
            className={`sign-mode-tab ${mode === tab.id ? "sign-mode-tab-active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`sign-panel-${mode}`}
        aria-labelledby={`sign-tab-${mode}`}
      >
        {mode === "sign" ? (
          <SignLanguagePanel
            text={text}
            onTextChange={setText}
            liveUpdate={liveUpdate}
            onLiveUpdateChange={handleLiveUpdateChange}
            onShowSigns={handleShowSigns}
            sequence={sequence}
          />
        ) : (
          <SignAudioPanel
            text={text}
            onTextChange={setText}
            speechSupported={speechSupported}
            speakAsYouType={speakAsYouType}
            onSpeakAsYouTypeChange={toggleSpeakAsYouType}
            onReadAloud={readAloud}
            onSing={singAloud}
            bandOn={bandOn}
            announcement={announcement}
          />
        )}
      </div>
    </div>
  );
}
