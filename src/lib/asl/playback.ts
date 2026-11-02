"use client";

import type { SignToken } from "@/lib/asl/types";
import { useCallback, useEffect, useRef, useState } from "react";

const BASE_MS = 1150;

export type SignPlaybackState = {
  index: number;
  playing: boolean;
  speed: number;
  reducedMotion: boolean;
};

export function useSignPlayback(tokens: SignToken[]) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [tokens]);

  const tokensLengthRef = useRef(tokens.length);
  tokensLengthRef.current = tokens.length;

  useEffect(() => {
    if (!playing || reducedMotion || tokens.length === 0) return;

    const delay = BASE_MS / speed;
    const timer = window.setInterval(() => {
      setIndex((current) => {
        if (current >= tokensLengthRef.current - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, delay);

    return () => window.clearInterval(timer);
  }, [playing, reducedMotion, speed, tokens.length]);

  const goPrev = useCallback(() => {
    setPlaying(false);
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setPlaying(false);
    setIndex((i) => Math.min(tokens.length - 1, i + 1));
  }, [tokens.length]);

  const restart = useCallback(() => {
    setPlaying(false);
    setIndex(0);
  }, []);

  const togglePlay = useCallback(() => {
    if (tokens.length === 0) return;
    if (reducedMotion) return;
    setPlaying((p) => {
      if (!p && index >= tokens.length - 1) {
        setIndex(0);
      }
      return !p;
    });
  }, [index, reducedMotion, tokens.length]);

  const selectIndex = useCallback(
    (next: number) => {
      setPlaying(false);
      setIndex(Math.max(0, Math.min(tokens.length - 1, next)));
    },
    [tokens.length],
  );

  return {
    index,
    playing,
    speed,
    setSpeed,
    reducedMotion,
    goPrev,
    goNext,
    restart,
    togglePlay,
    selectIndex,
    current: tokens[index] ?? null,
  };
}
