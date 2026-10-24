"use client";

import { useState, useMemo } from "react";
import { sounds } from "@/lib/sounds";

export type Connect4State = {
  rows: number;
  cols: number;
  grid: number[][]; // 0: empty, 1: player 1, 2: player 2
  players: Array<{ userId: string; score: number }>;
  currentPlayerIndex: number;
  status: "waiting" | "active" | "finished";
  winnerId: string | null;
  isDraw: boolean;
  winningCells: Array<[number, number]>;
  lastMove: { row: number; col: number; player: number } | null;
};

type Connect4BoardProps = {
  state: Connect4State;
  currentUserId: string;
  isMyTurn: boolean;
  isWaiting: boolean;
  playersMeta?: Array<{ userId: string; username?: string }>;
  onMove: (payload: { col: number }) => void;
};

const COLS = 7;
const ROWS = 6;

const P1_COLOR = "#facc15"; // Yellow / Gold
const P2_COLOR = "#06b6d4"; // Cyan / Sky

export default function Connect4Board({
  state,
  currentUserId,
  isMyTurn,
  isWaiting,
  playersMeta,
  onMove,
}: Connect4BoardProps) {
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  const myPlayerIndex = state.players.findIndex((p) => p.userId === currentUserId);
  const myPlayerNum = myPlayerIndex !== -1 ? myPlayerIndex + 1 : 1;
  const activePlayerNum = state.currentPlayerIndex + 1;

  const userNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    playersMeta?.forEach((pm) => {
      if (pm.username) map[pm.userId] = pm.username;
    });
    return map;
  }, [playersMeta]);

  const p1Name =
    state.players[0]?.userId === currentUserId
      ? "شما"
      : userNameMap[state.players[0]?.userId] || "بازیکن ۱ (زرد)";
  const p2Name =
    state.players[1]?.userId === currentUserId
      ? "شما"
      : userNameMap[state.players[1]?.userId] || "بازیکن ۲ (آبی)";

  const canMove = isMyTurn && !isWaiting && state.status === "active";

  const isWinningCell = (r: number, c: number) => {
    return state.winningCells?.some(([wr, wc]) => wr === r && wc === c);
  };

  const handleColClick = (colIndex: number) => {
    if (!canMove) return;
    // Check if column is full
    if (state.grid[0][colIndex] !== 0) return;

    sounds.playPop();
    onMove({ col: colIndex });
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full select-none">
      {/* Top Scoreboard */}
      <div className="flex items-center justify-between w-full max-w-md rounded-2xl bg-panel/90 border border-white/10 px-5 py-3 shadow-xl backdrop-blur-xl">
        {/* Player 1 (Yellow) */}
        <div className="flex items-center gap-2.5">
          <div
            className={`h-4 w-4 rounded-full shadow-lg transition-transform ${
              activePlayerNum === 1 && state.status === "active" ? "scale-125 ring-2 ring-yellow-400" : ""
            }`}
            style={{ backgroundColor: P1_COLOR }}
          />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-yellow-400">{p1Name}</span>
            <span className="text-[10px] text-muted">امتیاز: {state.players[0]?.score ?? 0}</span>
          </div>
        </div>

        {/* Status Center */}
        <div className="flex flex-col items-center gap-1">
          {state.status === "finished" ? (
            state.winnerId ? (
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/40">
                {state.winnerId === currentUserId ? "🎉 شما بردید!" : "🏆 پایان بازی!"}
              </span>
            ) : (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-muted">
                بازی مساوی شد!
              </span>
            )
          ) : canMove ? (
            <span className="flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-[11px] font-bold text-accent ring-1 ring-accent/40 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-accent animate-ping" />
              نوبت شماست!
            </span>
          ) : isWaiting ? (
            <span className="text-xs text-muted">در انتظار حریف...</span>
          ) : (
            <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] text-muted">
              نوبت حریف
            </span>
          )}
        </div>

        {/* Player 2 (Cyan) */}
        <div className="flex items-center gap-2.5 text-left">
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-cyan-400">{p2Name}</span>
            <span className="text-[10px] text-muted">امتیاز: {state.players[1]?.score ?? 0}</span>
          </div>
          <div
            className={`h-4 w-4 rounded-full shadow-lg transition-transform ${
              activePlayerNum === 2 && state.status === "active" ? "scale-125 ring-2 ring-cyan-400" : ""
            }`}
            style={{ backgroundColor: P2_COLOR }}
          />
        </div>
      </div>

      {/* Connect 4 Board Container */}
      <div className="relative w-full max-w-[420px] rounded-3xl bg-gradient-to-b from-indigo-950/90 via-slate-900 to-black p-4 border border-indigo-500/30 shadow-[0_0_35px_rgba(79,70,229,0.2)]">
        {/* Drop Column Buttons (Ghost disc hover zone) */}
        <div className="grid grid-cols-7 gap-2 mb-2 px-1">
          {Array.from({ length: COLS }).map((_, c) => {
            const isColFull = state.grid[0][c] !== 0;
            const isHovered = hoverCol === c;
            return (
              <button
                key={`btn-col-${c}`}
                type="button"
                disabled={!canMove || isColFull}
                onMouseEnter={() => setHoverCol(c)}
                onMouseLeave={() => setHoverCol(null)}
                onClick={() => handleColClick(c)}
                className={`h-8 flex items-center justify-center rounded-xl transition-all ${
                  canMove && !isColFull ? "cursor-pointer hover:bg-white/5" : "cursor-default"
                }`}
              >
                {isHovered && canMove && !isColFull && (
                  <div
                    className="w-6 h-6 rounded-full shadow-lg animate-bounce"
                    style={{
                      backgroundColor: myPlayerNum === 1 ? P1_COLOR : P2_COLOR,
                      boxShadow: `0 0 10px ${myPlayerNum === 1 ? P1_COLOR : P2_COLOR}`,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* 7x6 Matrix Grid */}
        <div className="grid grid-cols-7 gap-2 sm:gap-2.5 p-3 rounded-2xl bg-indigo-950/60 border border-indigo-500/20 shadow-inner">
          {state.grid.map((row, r) =>
            row.map((cell, c) => {
              const isWin = isWinningCell(r, c);
              const isLast = state.lastMove?.row === r && state.lastMove?.col === c;

              return (
                <div
                  key={`cell-${r}-${c}`}
                  onClick={() => handleColClick(c)}
                  onMouseEnter={() => canMove && setHoverCol(c)}
                  onMouseLeave={() => setHoverCol(null)}
                  className={`aspect-square rounded-full flex items-center justify-center relative overflow-hidden transition-all ${
                    canMove && state.grid[0][c] === 0 ? "cursor-pointer" : ""
                  }`}
                  style={{
                    backgroundColor: "#030712",
                    boxShadow: "inset 0 3px 6px rgba(0,0,0,0.8)",
                  }}
                >
                  {cell !== 0 ? (
                    <div
                      className={`w-full h-full rounded-full transition-transform duration-300 relative ${
                        isWin ? "scale-95 animate-pulse" : "scale-90"
                      }`}
                      style={{
                        background:
                          cell === 1
                            ? "radial-gradient(circle at 35% 35%, #fef08a, #eab308 60%, #ca8a04)"
                            : "radial-gradient(circle at 35% 35%, #a5f3fc, #06b6d4 60%, #0891b2)",
                        boxShadow:
                          isWin || isLast
                            ? `0 0 16px ${cell === 1 ? P1_COLOR : P2_COLOR}`
                            : "inset 0 -2px 4px rgba(0,0,0,0.4)",
                        border: isWin ? "2.5px solid #ffffff" : "none",
                      }}
                    >
                      {/* Gloss highlight */}
                      <div className="absolute top-1 left-2 w-2.5 h-1.5 rounded-full bg-white/40 blur-[0.5px]" />
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Instructions footer */}
      <span className="text-[11px] text-muted/70">
        روی هر ستون کلیک کنید تا دیسک شما با جاذبه به پایین بیفتد. ۴ تا پشت سر هم بچینید!
      </span>
    </div>
  );
}
