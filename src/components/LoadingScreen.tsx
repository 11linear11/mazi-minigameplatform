"use client";

import { useEffect, useState } from "react";

type LoadingScreenProps = {
  progress: number;
  onComplete?: () => void;
};

export default function LoadingScreen({ progress, onComplete }: LoadingScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (progress === 100) {
      const fadeTimer = setTimeout(() => setFadeOut(true), 50);
      return () => clearTimeout(fadeTimer);
    }
  }, [progress]);

  useEffect(() => {
    if (fadeOut) {
      const doneTimer = setTimeout(() => onComplete?.(), 500);
      return () => clearTimeout(doneTimer);
    }
  }, [fadeOut, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-panel-deep transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="golden-glow pointer-events-none fixed inset-0" />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, #ffd700 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <main className="relative z-10 flex w-full max-w-lg flex-col items-center px-8">
        <div className="relative mb-12 flex h-64 w-64 items-center justify-center md:h-80 md:w-80">
          <div className="absolute inset-0 scale-125 transform rounded-full bg-accent-bright/5 blur-3xl" />
          <img
            src="/assets/images/loading.png"
            alt="MazI"
            className="relative h-full w-full object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
          />
        </div>

        <div className="flex w-full flex-col items-center space-y-6">
          <div className="relative h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-panel-highest">
            <div
              className="progress-pulse absolute left-0 top-0 h-full rounded-full bg-accent-bright transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            >
              <div className="loading-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
          </div>

          <div className="flex flex-col items-center text-center">
            <p className="text-[14px] font-semibold uppercase tracking-[0.2em] text-accent-bright">
              PLAY OR DIE
            </p>
            <p className="mt-2 text-[11px] uppercase tracking-widest text-muted/50">
              hint: if you&apos;re thirsty you can drink water
            </p>
          </div>
        </div>
      </main>

      <footer className="fixed bottom-12 left-0 right-0 flex justify-center opacity-20 transition-opacity duration-500 hover:opacity-100">
        <h1 className="text-[48px] font-extrabold tracking-tighter text-accent-bright">
          MAZI
        </h1>
      </footer>

      <div className="fixed left-8 top-8 h-12 w-12 border-l border-t border-outline/30" />
      <div className="fixed right-8 top-8 h-12 w-12 border-r border-t border-outline/30" />
      <div className="fixed bottom-8 left-8 h-12 w-12 border-l border-b border-outline/30" />
      <div className="fixed bottom-8 right-8 h-12 w-12 border-r border-b border-outline/30" />
    </div>
  );
}
