"use client";

import { useState } from "react";

type DotsAndBoxesState = {
  rows: number;
  cols: number;
  grid: Array<Array<{ h: number; v: number; p: number }>>;
  players: Array<{ userId: string; score: number }>;
  currentPlayerIndex: number;
  status: string;
  winnerId: string | null;
  isDraw: boolean;
  totalBoxes: number;
};

type DotsAndBoxesBoardProps = {
  state: DotsAndBoxesState;
  currentUserId: string;
  isMyTurn: boolean;
  isWaiting: boolean;
  playersMeta?: Array<{ userId: string; username?: string }>;
  onMove: (payload: { row: number; col: number; orientation: "h" | "v" }) => void;
};

const ROWS = 5;
const COLS = 5;
const PAD = 40;
const S = 100;
const SVG_SIZE = 2 * PAD + Math.max(ROWS, COLS) * S + S;
const DOT_R = 5;
const LINE_W = 5;
const HIT_W = 20;

const C1 = "#e9c400";
const C1_BG = "rgba(233, 196, 0, 0.15)";
const C2 = "#ff6b6b";
const C2_BG = "rgba(255, 107, 107, 0.15)";

function dotX(c: number) { return PAD + c * S; }
function dotY(r: number) { return PAD + r * S; }

export default function DotsAndBoxesBoard({ state, currentUserId, isMyTurn, isWaiting, playersMeta, onMove }: DotsAndBoxesBoardProps) {
  const [hoverLine, setHoverLine] = useState<{ row: number; col: number; orient: "h" | "v" } | null>(null);

  const userNameMap: Record<string, string> = {};
  if (playersMeta) {
    for (const p of playersMeta) {
      userNameMap[p.userId] = p.username ?? p.userId;
    }
  }
  const myIndex = state.players.findIndex((p) => p.userId === currentUserId);
  const myColor = myIndex === 0 ? C1 : myIndex === 1 ? C2 : "#888";
  const myBg = myIndex === 0 ? C1_BG : myIndex === 1 ? C2_BG : "transparent";

  const score0 = state.players[0]?.score ?? 0;
  const score1 = state.players[1]?.score ?? 0;
  const claimedBoxes = state.grid.slice(0, ROWS).reduce((sum, row) =>
    sum + row.slice(0, COLS).filter((c) => c.p !== 0).length, 0);

  const canMove = isMyTurn && !isWaiting && state.status === "active";

  const getGridVal = (r: number, c: number, key: "h" | "v") => {
    if (r < 0 || r > ROWS || c < 0 || c > COLS) return -1;
    return state.grid[r][c][key];
  };

  const getBoxOwner = (r: number, c: number) => {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return 0;
    return state.grid[r][c].p;
  };

  const lineDrawn = (r: number, c: number, orient: "h" | "v") => {
    return getGridVal(r, c, orient) !== 0;
  };

  const lineOwner = (r: number, c: number, orient: "h" | "v") => {
    return getGridVal(r, c, orient);
  };

  const getBoxFill = (r: number, c: number) => {
    const o = getBoxOwner(r, c);
    if (o === 1) return C1_BG;
    if (o === 2) return C2_BG;
    return "transparent";
  };

  const getBoxBorder = (r: number, c: number) => {
    const o = getBoxOwner(r, c);
    if (o === 1) return C1;
    if (o === 2) return C2;
    return "none";
  };

  const handleLineClick = (r: number, c: number, orient: "h" | "v") => {
    if (!canMove) return;
    if (lineDrawn(r, c, orient)) return;
    onMove({ row: r, col: c, orientation: orient });
  };

  const viewBox = `0 0 ${SVG_SIZE} ${SVG_SIZE}`;

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Scoreboard */}
      <div className="flex items-center justify-between w-full max-w-sm rounded-xl bg-panel/80 border border-outline px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: C1 }} />
          <span className="text-xs font-semibold" style={{ color: C1 }}>
            {state.players[0]?.userId === currentUserId ? "تو" : (userNameMap[state.players[0]?.userId] ?? state.players[0]?.userId ?? "بازیکن ۱")}
          </span>
          <span dir="ltr" className="text-sm font-black" style={{ color: C1 }}>{score0}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted">
          {canMove ? (
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              نوبت توئه!
            </span>
          ) : isWaiting ? (
            "منتظر..."
          ) : (
            `نوبت حریف`
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-black" style={{ color: C2 }}>{score1}</span>
          <span className="text-xs font-semibold" style={{ color: C2 }}>
            {state.players[1]?.userId === currentUserId ? "تو" : (userNameMap[state.players[1]?.userId] ?? state.players[1]?.userId ?? "بازیکن ۲")}
          </span>
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: C2 }} />
        </div>
      </div>

      {/* SVG Board */}
      <div className="w-full max-w-sm">
        <svg viewBox={viewBox} className="w-full">
          {/* Box fills */}
          {Array.from({ length: ROWS }).map((_, r) =>
            Array.from({ length: COLS }).map((_, c) => (
              <rect
                key={`fill-${r}-${c}`}
                x={dotX(c)}
                y={dotY(r)}
                width={S}
                height={S}
                fill={getBoxFill(r, c)}
                stroke={getBoxBorder(r, c)}
                strokeWidth={getBoxOwner(r, c) ? 1 : 0}
                rx={3}
              />
            ))
          )}

          {/* Horizontal lines */}
          {Array.from({ length: ROWS + 1 }).map((_, r) =>
            Array.from({ length: COLS }).map((_, c) => {
              const drawn = lineDrawn(r, c, "h");
              const owner = lineOwner(r, c, "h");
              const isHover = hoverLine?.row === r && hoverLine?.col === c && hoverLine?.orient === "h";
              return (
                <g key={`h-${r}-${c}`}>
                  <rect
                    x={dotX(c) - HIT_W / 2}
                    y={dotY(r) - HIT_W / 2}
                    width={S + HIT_W}
                    height={HIT_W}
                    fill="transparent"
                    className={canMove && !drawn ? "cursor-pointer" : "cursor-default"}
                    onMouseEnter={() => canMove && !drawn && setHoverLine({ row: r, col: c, orient: "h" })}
                    onMouseLeave={() => setHoverLine(null)}
                    onClick={() => handleLineClick(r, c, "h")}
                  />
                  <line
                    x1={dotX(c)}
                    y1={dotY(r)}
                    x2={dotX(c) + S}
                    y2={dotY(r)}
                    stroke={drawn ? (owner === 1 ? C1 : C2) : isHover ? myColor : "rgba(255,255,255,0.15)"}
                    strokeWidth={isHover ? LINE_W + 2 : drawn ? LINE_W : LINE_W - 1}
                    strokeLinecap="round"
                    className="transition-all duration-150"
                  />
                </g>
              );
            })
          )}

          {/* Vertical lines */}
          {Array.from({ length: ROWS }).map((_, r) =>
            Array.from({ length: COLS + 1 }).map((_, c) => {
              const drawn = lineDrawn(r, c, "v");
              const owner = lineOwner(r, c, "v");
              const isHover = hoverLine?.row === r && hoverLine?.col === c && hoverLine?.orient === "v";
              return (
                <g key={`v-${r}-${c}`}>
                  <rect
                    x={dotX(c) - HIT_W / 2}
                    y={dotY(r) - HIT_W / 2}
                    width={HIT_W}
                    height={S + HIT_W}
                    fill="transparent"
                    className={canMove && !drawn ? "cursor-pointer" : "cursor-default"}
                    onMouseEnter={() => canMove && !drawn && setHoverLine({ row: r, col: c, orient: "v" })}
                    onMouseLeave={() => setHoverLine(null)}
                    onClick={() => handleLineClick(r, c, "v")}
                  />
                  <line
                    x1={dotX(c)}
                    y1={dotY(r)}
                    x2={dotX(c)}
                    y2={dotY(r) + S}
                    stroke={drawn ? (owner === 1 ? C1 : C2) : isHover ? myColor : "rgba(255,255,255,0.15)"}
                    strokeWidth={isHover ? LINE_W + 2 : drawn ? LINE_W : LINE_W - 1}
                    strokeLinecap="round"
                    className="transition-all duration-150"
                  />
                </g>
              );
            })
          )}

          {/* Dots */}
          {Array.from({ length: ROWS + 1 }).map((_, r) =>
            Array.from({ length: COLS + 1 }).map((_, c) => (
              <circle
                key={`dot-${r}-${c}`}
                cx={dotX(c)}
                cy={dotY(r)}
                r={DOT_R}
                fill="#e9c400"
                stroke="rgba(255,215,0,0.3)"
                strokeWidth={1}
              />
            ))
          )}
        </svg>
      </div>

      {/* Progress */}
      <div className="text-[10px] text-muted">
        {claimedBoxes} از {state.totalBoxes} جعبه گرفته شده
      </div>
    </div>
  );
}
