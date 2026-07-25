"use client";

import { createContext, useContext, useRef, useState, useEffect } from "react";

type Note = [number, number]; // [freq_hz, duration_secs] — 0 freq = rest
type Mode = "white-noise" | "lullaby";

interface SoundCtx {
  playing: boolean;
  volume: number;
  mode: Mode;
  lullabyIndex: number;
  lullabyName: string;
  lullabyCount: number;
  start: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
  setMode: (m: Mode) => void;
  nextLullaby: () => void;
  prevLullaby: () => void;
}

// ─── Lullaby note data ────────────────────────────────────────────────────────
// Quarter note at 70 BPM = 0.857s. All three melodies are traditional/
// public-domain; only the synthesized-tone rendering is done here.
const Q = 0.857; // quarter note
const H = Q * 2; // half note
const W = Q * 4; // whole note
const R = 0;     // rest (freq 0 = silence)

// Chromatic frequencies (Hz)
const G3 = 196.00, A3 = 220.00;
const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.00;
const A4 = 440.00;

const LULLABIES: { name: string; notes: Note[] }[] = [
  {
    name: "Twinkle Twinkle Little Star",
    notes: [
      // Twin-kle twin-kle lit-tle star
      [C4,Q],[C4,Q],[G4,Q],[G4,Q],[A4,Q],[A4,Q],[G4,H],
      // How I won-der what you are
      [F4,Q],[F4,Q],[E4,Q],[E4,Q],[D4,Q],[D4,Q],[C4,H],
      // Up a-bove the world so high
      [G4,Q],[G4,Q],[F4,Q],[F4,Q],[E4,Q],[E4,Q],[D4,H],
      // Like a dia-mond in the sky
      [G4,Q],[G4,Q],[F4,Q],[F4,Q],[E4,Q],[E4,Q],[D4,H],
      // Twin-kle twin-kle lit-tle star
      [C4,Q],[C4,Q],[G4,Q],[G4,Q],[A4,Q],[A4,Q],[G4,H],
      // How I won-der what you are
      [F4,Q],[F4,Q],[E4,Q],[E4,Q],[D4,Q],[D4,Q],[C4,H],[R,Q*2],
    ],
  },
  {
    name: "Mary Had a Little Lamb",
    notes: [
      // Ma-ry had a lit-tle lamb
      [E4,Q],[D4,Q],[C4,Q],[D4,Q],[E4,Q],[E4,Q],[E4,H],
      // lit-tle lamb
      [D4,Q],[D4,Q],[D4,H],
      // lit-tle lamb
      [E4,Q],[G4,Q],[G4,H],
      // Ma-ry had a lit-tle lamb, its fleece was
      [E4,Q],[D4,Q],[C4,Q],[D4,Q],[E4,Q],[E4,Q],[E4,Q],[E4,Q],
      // white as snow
      [D4,Q],[D4,Q],[E4,Q],[D4,Q],[C4,H],[R,Q*2],
    ],
  },
  {
    name: "Gentle Lullaby",
    notes: [
      // Original pentatonic melody — composed for this app
      [C4,Q],[E4,Q],[G4,Q],[A4,H],[R,Q],
      [G4,Q],[E4,Q],[C4,H],[R,Q],
      [G4,Q],[A4,Q],[G4,Q],[E4,H],[R,Q],
      [D4,Q],[E4,Q],[G4,H],[R,Q],
      [A4,Q],[G4,Q],[E4,Q],[C4,H],[R,Q],
      [G3,Q],[A3,Q],[C4,H+Q],[R,Q],
      [E4,Q],[G4,Q],[A4,Q],[G4,H],[R,Q],
      [E4,Q],[C4,Q],[G3,H],[R,W],
    ],
  },
];

// ─── Synthesis helpers ────────────────────────────────────────────────────────

function playNote(
  ctx: AudioContext,
  masterGain: GainNode,
  freq: number,
  startTime: number,
  dur: number,
) {
  if (freq === 0) return;

  const noteGain = ctx.createGain();
  const osc = ctx.createOscillator();
  const harmOsc = ctx.createOscillator();
  const harmGain = ctx.createGain();

  // Music-box tone: fundamental sine + quiet 2nd harmonic for warmth
  osc.type = "sine";
  osc.frequency.value = freq;
  harmOsc.type = "sine";
  harmOsc.frequency.value = freq * 2;
  harmGain.gain.value = 0.22;

  // Envelope: fast attack → quick exponential decay → soft tail → release
  const attackEnd = startTime + 0.008;
  const decayTarget = startTime + Math.min(0.35, dur * 0.45);
  const releaseStart = startTime + dur - Math.min(0.06, dur * 0.12);
  const end = startTime + dur;

  noteGain.gain.setValueAtTime(0, startTime);
  noteGain.gain.linearRampToValueAtTime(1.0, attackEnd);
  noteGain.gain.exponentialRampToValueAtTime(0.12, decayTarget);
  noteGain.gain.setValueAtTime(0.12, releaseStart);
  noteGain.gain.linearRampToValueAtTime(0.0001, end);

  harmOsc.connect(harmGain);
  harmGain.connect(noteGain);
  osc.connect(noteGain);
  noteGain.connect(masterGain);

  osc.start(startTime);
  osc.stop(end + 0.01);
  harmOsc.start(startTime);
  harmOsc.stop(end + 0.01);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const WhiteNoiseContext = createContext<SoundCtx | null>(null);

export function WhiteNoiseProvider({ children }: { children: React.ReactNode }) {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolumeState] = useState(60);
  const [mode, setModeState] = useState<Mode>("white-noise");
  const [lullabyIndex, setLullabyIndex] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const lullabyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Refs for values used inside async callbacks (avoid stale closure capture)
  const lullabyIndexRef = useRef(0);
  const modeRef = useRef<Mode>("white-noise");
  const volumeRef = useRef(60);

  function clearLullabyTimer() {
    if (lullabyTimerRef.current !== null) {
      clearTimeout(lullabyTimerRef.current);
      lullabyTimerRef.current = null;
    }
  }

  function stop() {
    clearLullabyTimer();
    sourceRef.current?.stop();
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    sourceRef.current = null;
    gainRef.current = null;
    setPlaying(false);
  }

  function scheduleLullabyPass(ctx: AudioContext, gain: GainNode) {
    const notes = LULLABIES[lullabyIndexRef.current].notes;
    let time = ctx.currentTime + 0.08;
    for (const [freq, dur] of notes) {
      playNote(ctx, gain, freq, time, dur);
      time += dur;
    }
    // Reschedule slightly early to avoid any gap between loops
    const msUntilEnd = (time - ctx.currentTime) * 1000 - 120;
    lullabyTimerRef.current = setTimeout(() => {
      if (audioCtxRef.current === ctx) {
        scheduleLullabyPass(ctx, gain);
      }
    }, Math.max(50, msUntilEnd));
  }

  function startNewContext(forMode: Mode, forLullabyIndex: number) {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.gain.value = volumeRef.current / 100;
    gain.connect(ctx.destination);
    audioCtxRef.current = ctx;
    gainRef.current = gain;

    if (forMode === "white-noise") {
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const source = ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;
      source.connect(gain);
      source.start();
      sourceRef.current = source;
    } else {
      lullabyIndexRef.current = forLullabyIndex;
      scheduleLullabyPass(ctx, gain);
    }
  }

  function start() {
    if (audioCtxRef.current) return;
    startNewContext(modeRef.current, lullabyIndexRef.current);
    setPlaying(true);
  }

  function setVolume(v: number) {
    setVolumeState(v);
    volumeRef.current = v;
    if (gainRef.current) gainRef.current.gain.value = v / 100;
  }

  function setMode(m: Mode) {
    modeRef.current = m;
    setModeState(m);
    if (audioCtxRef.current) stop();
  }

  function switchLullaby(newIndex: number) {
    lullabyIndexRef.current = newIndex;
    setLullabyIndex(newIndex);
    if (playing && modeRef.current === "lullaby") {
      // Tear down the current context (cancels queued notes) and restart
      clearLullabyTimer();
      sourceRef.current?.stop();
      const old = audioCtxRef.current;
      audioCtxRef.current = null;
      sourceRef.current = null;
      gainRef.current = null;
      old?.close();
      // Brief gap then restart on the new melody
      setTimeout(() => {
        startNewContext("lullaby", newIndex);
      }, 60);
    }
  }

  function nextLullaby() {
    switchLullaby((lullabyIndex + 1) % LULLABIES.length);
  }

  function prevLullaby() {
    switchLullaby((lullabyIndex - 1 + LULLABIES.length) % LULLABIES.length);
  }

  useEffect(() => {
    return () => {
      clearLullabyTimer();
      sourceRef.current?.stop();
      audioCtxRef.current?.close();
    };
  }, []);

  return (
    <WhiteNoiseContext.Provider
      value={{
        playing, volume, mode, lullabyIndex,
        lullabyName: LULLABIES[lullabyIndex].name,
        lullabyCount: LULLABIES.length,
        start, stop, setVolume, setMode, nextLullaby, prevLullaby,
      }}
    >
      {children}
    </WhiteNoiseContext.Provider>
  );
}

export function useWhiteNoise(): SoundCtx {
  const ctx = useContext(WhiteNoiseContext);
  if (!ctx) throw new Error("useWhiteNoise must be used inside WhiteNoiseProvider");
  return ctx;
}
