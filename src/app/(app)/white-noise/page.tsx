"use client";

import { useWhiteNoise } from "@/components/providers/WhiteNoiseProvider";

export default function WhiteNoisePage() {
  const { playing, volume, mode, lullabyName, lullabyIndex, lullabyCount, start, stop, setVolume, setMode, nextLullaby, prevLullaby } = useWhiteNoise();

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">Rest Time Sounds</h1>
      <p className="mt-1 text-sm text-ink/60">
        Audio continues while you use the rest of the app. White noise reduces background distraction; lullabies help children settle.
      </p>

      {/* Mode tabs */}
      <div className="mt-5 flex gap-1 rounded-2xl border border-coral-light p-1">
        {(["white-noise", "lullaby"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
              mode === m
                ? "bg-coral text-white shadow-sm"
                : "text-ink/60 hover:text-coral-dark"
            }`}
          >
            {m === "white-noise" ? "White Noise" : "Lullabies"}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-coral-light bg-white p-6 shadow-sm">
        {/* Lullaby selector */}
        {mode === "lullaby" && (
          <div className="mb-5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={prevLullaby}
              className="rounded-xl border border-coral-light px-3 py-1.5 text-sm text-ink/50 hover:border-coral hover:text-coral-dark"
              aria-label="Previous lullaby"
            >
              ←
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold text-ink">{lullabyName}</p>
              <p className="text-xs text-ink/40">{lullabyIndex + 1} of {lullabyCount}</p>
            </div>
            <button
              type="button"
              onClick={nextLullaby}
              className="rounded-xl border border-coral-light px-3 py-1.5 text-sm text-ink/50 hover:border-coral hover:text-coral-dark"
              aria-label="Next lullaby"
            >
              →
            </button>
          </div>
        )}

        <div className="flex flex-col items-center gap-6">
          <button
            type="button"
            onClick={playing ? stop : start}
            className={`flex h-20 w-20 items-center justify-center rounded-full text-3xl shadow-md transition-all ${
              playing
                ? "bg-sage text-white shadow-sage/30 hover:bg-sage-dark active:scale-95"
                : "bg-coral text-white shadow-coral/30 hover:bg-coral-dark active:scale-95"
            }`}
            aria-label={playing ? "Stop" : "Play"}
          >
            {playing ? "⏹" : "▶"}
          </button>

          <div className="text-center">
            {playing ? (
              <p className="flex items-center gap-1.5 text-sm font-medium text-sage-dark">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-sage" />
                {mode === "white-noise"
                  ? "White noise playing"
                  : `Playing: ${lullabyName}`}
                {" — "}audio continues while you navigate
              </p>
            ) : (
              <p className="text-sm text-ink/50">Press play to start</p>
            )}
          </div>

          <div className="w-full">
            <div className="flex items-center justify-between text-xs text-ink/50">
              <span>Volume</span>
              <span>{volume}%</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-lg">🔈</span>
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-coral-light accent-coral"
              />
              <span className="text-lg">🔊</span>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-ink/40">
        {mode === "white-noise"
          ? "Generated locally in your browser — no audio file is downloaded or stored."
          : "Synthesised music-box tones using public-domain melodies — no audio file downloaded."}
      </p>
    </div>
  );
}
