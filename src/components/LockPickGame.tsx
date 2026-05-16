"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Lock, Check } from "lucide-react";

type RingData = {
  labels: string[];
  ballPositions: number[];
  slotPositions: number[];
  initialRotation: number;
};

type LockPickGameProps = {
  state: {
    rings: RingData[];
    players: Array<{
      userId: string;
      currentRotations: number[];
      locked: boolean[];
    }>;
    status: string;
    startedAt: number | null;
    timerDuration: number;
    winnerId: string | null;
    isDraw: boolean;
  };
  currentUserId: string;
  isWaiting: boolean;
  onAction: (payload: any) => void;
};

const COLORS: Record<string, string> = {
  red: "#ef4444",
  yellow: "#eab308",
  blue: "#3b82f6",
};

const COLORS_DIM: Record<string, string> = {
  red: "#ef444480",
  yellow: "#eab30880",
  blue: "#3b82f680",
};

const NUM_POS = 8;
const CENTER = 140;
const BALL_R = 6;
const VIEWBOX = 280;

function computeRadii(count: number): number[] {
  const minR = 40;
  const maxR = 120;
  if (count <= 1) return [Math.round((minR + maxR) / 2)];
  const step = (maxR - minR) / (count - 1);
  return Array.from({ length: count }, (_, i) => Math.round(minR + i * step));
}

function getAngle(pos: number) {
  return ((pos * 2 * Math.PI) / NUM_POS) - Math.PI / 2;
}

function getPos(radius: number, pos: number) {
  const a = getAngle(pos);
  return { x: CENTER + radius * Math.cos(a), y: CENTER + radius * Math.sin(a) };
}

export default function LockPickGame({ state, currentUserId, isWaiting, onAction }: LockPickGameProps) {
  const ringCount = state.rings.length;
  const RING_RADII = useMemo(() => computeRadii(ringCount), [ringCount]);
  const [activeRing, setActiveRing] = useState(0);
  const [timeLeft, setTimeLeft] = useState(state.timerDuration);
  const [shake, setShake] = useState(false);

  const myPlayer = useMemo(
    () => state.players.find((p) => p.userId === currentUserId),
    [state.players, currentUserId]
  );
  const opponent = useMemo(
    () => state.players.find((p) => p.userId !== currentUserId),
    [state.players, currentUserId]
  );

  const myRotations = myPlayer?.currentRotations ?? Array(ringCount).fill(0);
  const myLocked = myPlayer?.locked ?? Array(ringCount).fill(false);
  const opponentLocked = opponent?.locked ?? Array(ringCount).fill(false);

  useEffect(() => {
    if (myLocked[activeRing]) {
      const nextUnlocked = myLocked.findIndex((l: boolean) => !l);
      if (nextUnlocked !== -1) setActiveRing(nextUnlocked);
    }
  }, [myLocked, activeRing]);

  const handleLock = useCallback(() => {
    onAction({ type: "lock", ringIndex: activeRing });
  }, [onAction, activeRing]);

  useEffect(() => {
    if (state.startedAt && state.status === "active") {
      const tick = () => {
        const elapsed = (Date.now() - state.startedAt!) / 1000;
        const remaining = Math.max(0, state.timerDuration - elapsed);
        setTimeLeft(remaining);
        if (remaining <= 0) return;
      };
      tick();
      const id = setInterval(tick, 200);
      return () => clearInterval(id);
    }
  }, [state.startedAt, state.status, state.timerDuration]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (isWaiting || state.status !== "active") return;
    if (e.key === "ArrowLeft" || e.key === "a") {
      onAction({ type: "rotate", ringIndex: activeRing, direction: -1 });
    } else if (e.key === "ArrowRight" || e.key === "d") {
      onAction({ type: "rotate", ringIndex: activeRing, direction: 1 });
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handleLock();
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const timerPct = timeLeft / state.timerDuration;
  const timerColor =
    timerPct > 0.5 ? "bg-green-500" : timerPct > 0.2 ? "bg-yellow-500" : "bg-red-500";

  const lockDisabled = isWaiting || state.status !== "active" || myLocked[activeRing];

  const handleLockClick = () => {
    if (lockDisabled) return;
    setShake(true);
    setTimeout(() => setShake(false), 400);
    handleLock();
  };

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/80 to-slate-950/90 p-4">
      {/* Opponent progress */}
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted">تو:</span>
          <span className="text-white">{myLocked.filter(Boolean).length}/{ringCount}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted">حریف:</span>
          <span className="text-white">{opponentLocked.filter(Boolean).length}/{ringCount}</span>
        </div>
      </div>

      {/* Timer bar */}
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-300 ${timerColor}`}
          style={{ width: `${timerPct * 100}%` }}
        />
      </div>
      <div className="mb-3 text-center text-[10px] text-muted">
        {Math.ceil(timeLeft)} ثانیه
      </div>

      {/* SVG Board */}
      <div className="flex justify-center">
        <svg
          viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
          className="w-full max-w-xs"
        >
          {/* Rings */}
          {state.rings.map((ring, ri) => {
            const radius = RING_RADII[ri];
            const isActive = ri === activeRing;
            const isLocked = myLocked[ri];
            const rotation = myRotations[ri];

            return (
              <g key={ri}>
                {/* Ring circle */}
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={radius}
                  fill="none"
                  stroke={isLocked ? "#22c55e" : isActive ? "#FFC400" : "#ffffff20"}
                  strokeWidth={isActive ? 3 : 1.5}
                  className="transition-all"
                />

                {/* Guidelines */}
                {Array.from({ length: NUM_POS }).map((_, pi) => {
                  const p = getPos(radius, pi);
                  return (
                    <line
                      key={pi}
                      x1={CENTER}
                      y1={CENTER}
                      x2={p.x}
                      y2={p.y}
                      stroke="#ffffff08"
                      strokeWidth={0.5}
                    />
                  );
                })}

                {/* Slots (fixed - don't rotate) */}
                {ring.slotPositions.map((sp) => {
                  const p = getPos(radius + 2, sp);
                  const color = ring.labels[sp];
                  return (
                    <rect
                      key={`slot-${sp}`}
                      x={p.x - 5}
                      y={p.y - 2}
                      width={10}
                      height={4}
                      rx={2}
                      fill={COLORS[color] ?? "#666"}
                      stroke={isActive ? "#fff" : "none"}
                      strokeWidth={isActive ? 0.5 : 0}
                      className="transition-all"
                    />
                  );
                })}

                {/* Balls (rotate with ring) */}
                {!isLocked && ring.ballPositions.map((bp) => {
                  const rotatedPos = (bp + rotation) % NUM_POS;
                  const p = getPos(radius - 2, rotatedPos);
                  const color = ring.labels[bp];
                  return (
                    <circle
                      key={`ball-${bp}`}
                      cx={p.x}
                      cy={p.y}
                      r={BALL_R}
                      fill={COLORS[color] ?? "#666"}
                      stroke={isActive ? "#fff" : "#ffffff40"}
                      strokeWidth={isActive ? 1.5 : 0.5}
                      className="transition-all"
                    />
                  );
                })}

                {/* Locked indicator */}
                {isLocked && (
                  <text
                    x={CENTER}
                    y={CENTER - radius + 10}
                    textAnchor="middle"
                    fill="#22c55e"
                    fontSize={12}
                    fontWeight="bold"
                  >
                    ✓
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Ring selector */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {Array.from({ length: ringCount }).map((_, ri) => (
          <button
            key={ri}
            onClick={() => setActiveRing(ri)}
            disabled={myLocked[ri]}
            className={`h-8 w-8 rounded-full text-[10px] font-bold transition-all ${
              ri === activeRing && !myLocked[ri]
                ? "bg-accent text-[#05070B] scale-110 ring-2 ring-accent/60"
                : myLocked[ri]
                ? "bg-green-500/30 text-green-400 cursor-default"
                : "bg-white/10 text-muted hover:bg-white/20"
            }`}
          >
            {myLocked[ri] ? "✓" : ri + 1}
          </button>
        ))}
      </div>
      <div className="mb-3 text-center text-[9px] text-muted">
        حلقه {activeRing + 1}
      </div>

      {/* Controls */}
      <div className="mt-3 flex items-center justify-center gap-4" dir="ltr">
        <button
          onClick={() => onAction({ type: "rotate", ringIndex: activeRing, direction: -1 })}
          disabled={isWaiting || state.status !== "active" || myLocked[activeRing]}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-xl text-white shadow-lg disabled:opacity-30 hover:bg-white/20 active:scale-90 transition-all"
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>
        <button
          onClick={handleLockClick}
          disabled={lockDisabled}
          className={`flex h-12 items-center justify-center rounded-xl bg-accent px-6 text-sm font-bold text-[#05070B] shadow-lg disabled:opacity-30 hover:brightness-110 active:scale-90 transition-all ${
            shake ? "animate-[shake_0.4s_ease-in-out]" : ""
          }`}
        >
          قفل
          <Lock size={16} className="mr-1.5" />
        </button>
        <button
          onClick={() => onAction({ type: "rotate", ringIndex: activeRing, direction: 1 })}
          disabled={isWaiting || state.status !== "active" || myLocked[activeRing]}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-xl text-white shadow-lg disabled:opacity-30 hover:bg-white/20 active:scale-90 transition-all"
        >
          <ChevronRight size={22} strokeWidth={2.5} />
        </button>
      </div>

      {/* Keyboard hint */}
      <div className="mt-2 text-center text-[8px] text-muted">
        ← → یا A D برای چرخش | Space یا Enter برای قفل
      </div>
    </div>
  );
}
