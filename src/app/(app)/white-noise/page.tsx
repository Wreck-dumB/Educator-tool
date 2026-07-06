"use client";

import { useWhiteNoise } from "@/components/providers/WhiteNoiseProvider";

export default function WhiteNoisePage() {
  const { playing, volume, start, stop, setVolume } = useWhiteNoise();

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-3xl font-semibold text-coral-dark">White Noise</h1>
      <p className="mt-1 text-sm text-ink/60">
        Plays continuous white noise — useful for rest time or reducing background distraction.
        Audio keeps running while you use other parts of the app.
      </p>

      <div className="mt-8 rounded-2xl border border-coral-light bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-6">
          <button
            type="button"
            onClick={playing ? stop : start}
            className={`flex h-20 w-20 items-center justify-center rounded-full text-3xl shadow-md transition-all ${
              playing
                ? "bg-sage text-white shadow-sage/30 hover:bg-sage-dark active:scale-95"
                : "bg-coral text-white shadow-coral/30 hover:bg-coral-dark active:scale-95"
            }`}
            aria-label={playing ? "Stop white noise" : "Start white noise"}
          >
            {playing ? "⏹" : "▶"}
          </button>

          <div className="text-center">
            {playing ? (
              <p className="flex items-center gap-1.5 text-sm font-medium text-sage-dark">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-sage" />
                Playing — audio will continue while you navigate
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
        Generated locally in your browser — no audio file is downloaded or stored.
      </p>
    </div>
  );
}
