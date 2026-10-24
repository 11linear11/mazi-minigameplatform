"use client";

import { sounds } from "@/lib/sounds";

type TicTacToeBoardProps = {
  board: Array<string | null>;
  currentPlayer: string;
  onMove: (index: number) => void;
  disabled?: boolean;
  playerSymbol?: string | null;
  isMyTurn?: boolean;
};

const WINNING_COMBOS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export default function TicTacToeBoard({
  board,
  currentPlayer,
  onMove,
  disabled = false,
  playerSymbol = null,
  isMyTurn = false,
}: TicTacToeBoardProps) {
  const winningCombo = WINNING_COMBOS.find(
    ([a, b, c]) => board[a] && board[a] === board[b] && board[b] === board[c]
  );

  const handleClick = (index: number) => {
    if (disabled || !isMyTurn || board[index] !== null) return;
    sounds.playPop();
    onMove(index);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-panel-deep/90 via-panel/80 to-panel-deep/95 p-6 shadow-2xl backdrop-blur-xl">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 -bottom-20 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />

      {/* Header status */}
      <div className="relative z-10 mb-5 flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          {playerSymbol && (
            <span className="rounded-xl bg-white/5 px-2.5 py-1 text-xs font-semibold text-muted">
              شما:{" "}
              <strong className={playerSymbol === "X" ? "text-cyan-400" : "text-rose-400"}>
                {playerSymbol}
              </strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all ${
              isMyTurn
                ? "bg-accent/20 text-accent ring-1 ring-accent/40 shadow-lg shadow-accent/10"
                : "bg-white/5 text-muted"
            }`}
          >
            {isMyTurn && <span className="h-2 w-2 rounded-full bg-accent animate-ping" />}
            <span>
              {isMyTurn
                ? "نوبت شماست!"
                : `نوبت ${currentPlayer === "X" ? "X" : "O"}`}
            </span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="relative z-10 grid grid-cols-3 gap-3">
        {board.map((cell, index) => {
          const isWinningCell = winningCombo?.includes(index);
          const isCellDisabled = disabled || !isMyTurn || cell !== null;

          return (
            <button
              key={index}
              onClick={() => handleClick(index)}
              disabled={isCellDisabled}
              className={`group relative flex aspect-square items-center justify-center rounded-2xl border transition-all duration-300 ${
                isWinningCell
                  ? "border-accent bg-accent/20 shadow-lg shadow-accent/30 scale-[1.03] z-20 animate-pulse"
                  : cell !== null
                  ? "border-white/10 bg-white/[0.03] cursor-default"
                  : isMyTurn
                  ? "border-white/10 bg-white/[0.04] hover:border-accent/50 hover:bg-white/[0.08] hover:scale-105 active:scale-95 cursor-pointer"
                  : "border-white/5 bg-white/[0.02] cursor-not-allowed opacity-60"
              }`}
            >
              {cell === "X" ? (
                <svg
                  viewBox="0 0 40 40"
                  className="h-10 w-10 lg:h-12 lg:w-12 filter drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]"
                >
                  <line
                    x1="8"
                    y1="8"
                    x2="32"
                    y2="32"
                    stroke="#22d3ee"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1="32"
                    y1="8"
                    x2="8"
                    y2="32"
                    stroke="#22d3ee"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                  />
                </svg>
              ) : cell === "O" ? (
                <svg
                  viewBox="0 0 40 40"
                  className="h-10 w-10 lg:h-12 lg:w-12 filter drop-shadow-[0_0_12px_rgba(251,113,133,0.7)]"
                >
                  <circle
                    cx="20"
                    cy="20"
                    r="12"
                    fill="none"
                    stroke="#fb7185"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                  />
                </svg>
              ) : isMyTurn && !disabled ? (
                <span className="text-xl font-bold text-accent/20 opacity-0 group-hover:opacity-100 transition-opacity">
                  +
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
