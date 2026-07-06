"use client";

import { createContext, useContext, useRef, useState, useEffect } from "react";

interface WhiteNoiseCtx {
  playing: boolean;
  volume: number;
  start: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
}

const WhiteNoiseContext = createContext<WhiteNoiseCtx | null>(null);

export function WhiteNoiseProvider({ children }: { children: React.ReactNode }) {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolumeState] = useState(60);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  function start() {
    if (audioCtxRef.current) return;
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.gain.value = volume / 100;
    gain.connect(ctx.destination);

    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;
    source.connect(gain);
    source.start();

    audioCtxRef.current = ctx;
    sourceRef.current = source;
    gainRef.current = gain;
    setPlaying(true);
  }

  function stop() {
    sourceRef.current?.stop();
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    sourceRef.current = null;
    gainRef.current = null;
    setPlaying(false);
  }

  function setVolume(v: number) {
    setVolumeState(v);
    if (gainRef.current) gainRef.current.gain.value = v / 100;
  }

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        sourceRef.current?.stop();
        audioCtxRef.current.close();
      }
    };
  }, []);

  return (
    <WhiteNoiseContext.Provider value={{ playing, volume, start, stop, setVolume }}>
      {children}
    </WhiteNoiseContext.Provider>
  );
}

export function useWhiteNoise(): WhiteNoiseCtx {
  const ctx = useContext(WhiteNoiseContext);
  if (!ctx) throw new Error("useWhiteNoise must be used inside WhiteNoiseProvider");
  return ctx;
}
