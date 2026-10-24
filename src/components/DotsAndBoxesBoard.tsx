import { useEffect, useRef, useState } from "react";
import { sounds } from "@/lib/sounds";

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
const SVG_SIZE = 2 * PAD + Math.max(ROWS, COLS) * S;
const DOT_R = 6;
const LINE_W = 6;
const HIT_W = 24;

const C1 = "#e9c400";
const C1_BG = "rgba(233, 196, 0, 0.22)";
const C2 = "#38bdf8";
const C2_BG = "rgba(56, 189, 248, 0.22)";

function dotX(c: number) { return PAD + c * S; }
function dotY(r: number) { return PAD + r * S; }

export default function DotsAndBoxesBoard({ state, currentUserId, isMyTurn, isWaiting, playersMeta, onMove }: DotsAndBoxesBoardProps) {
  const [hoverLine, setHoverLine] = useState<{ row: number; col: number; orient: "h" | "v" } | null>(null);
  const prevScoreRef = useRef(0);

  const userNameMap: Record<string, string> = {};
  if (playersMeta) {
    for (const p of playersMeta) {
      userNameMap[p.userId] = p.username ?? p.userId;
    }
  }
  const myIndex = state.players.findIndex((p) => p.userId === currentUserId);
  const myColor = myIndex === 0 ? C1 : myIndex === 1 ? C2 : "#888";

  const score0 = state.players[0]?.score ?? 0;
  const score1 = state.players[1]?.score ?? 0;
  const totalScore = score0 + score1;

  useEffect(() => {
    if (totalScore > prevScoreRef.current) {
      sounds.playBoxClaim();
    }
    prevScoreRef.current = totalScore;
  }, [totalScore]);

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
    sounds.playPop();
    onMove({ row: r, col: c, orientation: orient });
  };

  const viewBox = `0 0 ${SVG_SIZE} ${SVG_SIZE}`;

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Scoreboard */}
      <div className="flex items-center justify-between w-full max-w-md rounded-2xl bg-panel/90 border border-white/10 px-5 py-3 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <span className="h-3.5 w-3.5 rounded-full shadow-lg shadow-yellow-500/50" style={{ backgroundColor: C1 }} />
          <div className="flex flex-col">
            <span className="text-xs font-bold" style={{ color: C1 }}>
              {state.players[0]?.userId === currentUserId ? "شما" : (userNameMap[state.players[0]?.userId] ?? state.players[0]?.userId ?? "بازیکن ۱")}
            </span>
            <span className="text-[10px] text-muted">امتیاز</span>
          </div>
          <span dir="ltr" className="text-lg font-black mr-1" style={{ color: C1 }}>{score0}</span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          {canMove ? (
            <span className="flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-[11px] font-bold text-accent ring-1 ring-accent/40 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-accent animate-ping" />
              نوبت شماست!
            </span>
          ) : isWaiting ? (
            <span className="text-xs text-muted">منتظر شروع...</span>
          ) : (
            <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] text-muted">
              نوبت حریف
            </span>
          )}
          <span className="text-[10px] text-muted/60">
            {claimedBoxes}/{state.totalBoxes} جعبه
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <span dir="ltr" className="text-lg font-black ml-1" style={{ color: C2 }}>{score1}</span>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold" style={{ color: C2 }}>
              {state.players[1]?.userId === currentUserId ? "شما" : (userNameMap[state.players[1]?.userId] ?? state.players[1]?.userId ?? "بازیکن ۲")}
            </span>
            <span className="text-[10px] text-muted">امتیاز</span>
          </div>
          <span className="h-3.5 w-3.5 rounded-full shadow-lg shadow-sky-500/50" style={{ backgroundColor: C2 }} />
        </div>
      </div>

      {/* SVG Board */}
      <div className="w-full max-w-sm rounded-2xl bg-black/40 p-2 border border-white/5 shadow-2xl">
        <svg viewBox={viewBox} className="w-full">
          {/* Box fills */}
          {Array.from({ length: ROWS }).map((_, r) =>
            Array.from({ length: COLS }).map((_, c) => {
              const owner = getBoxOwner(r, c);
              return (
                <g key={`box-${r}-${c}`}>
                  <rect
                    x={dotX(c)}
                    y={dotY(r)}
                    width={S}
                    height={S}
                    fill={getBoxFill(r, c)}
                    stroke={getBoxBorder(r, c)}
                    strokeWidth={owner ? 1.5 : 0}
                    rx={6}
                    className="transition-all duration-300"
                  />
                  {owner > 0 && (
                    <text
                      x={dotX(c) + S / 2}
                      y={dotY(r) + S / 2 + 7}
                      textAnchor="middle"
                      fill={owner === 1 ? C1 : C2}
                      fontSize={24}
                      fontWeight="bold"
                      opacity={0.5}
                      className="select-none pointer-events-none"
                    >
                      {owner === 1 ? "★" : "✦"}
                    </text>
                  )}
                </g>
              );
            })
          )}

          {/* Horizontal lines */}
          {Array.from({ length: ROWS + 1 }).map((_, r) =>
            Array.from({ length: COLS }).map((_, c) => {
              const drawn = lineDrawn(r, c, "h");
              const owner = lineOwner(r, c, "h");
              const isHover = hoverLine?.row === r && hoverLine?.col === c && hoverLine?.orient === "h";
              const margin = DOT_R + 4;
              return (
                <g
                  key={`h-${r}-${c}`}
                  className={canMove && !drawn ? "cursor-pointer" : "cursor-default"}
                  onMouseEnter={() => canMove && !drawn && setHoverLine({ row: r, col: c, orient: "h" })}
                  onMouseLeave={() => setHoverLine(null)}
                  onClick={() => handleLineClick(r, c, "h")}
                >
                  <rect
                    x={dotX(c) + margin}
                    y={dotY(r) - HIT_W / 2}
                    width={S - 2 * margin}
                    height={HIT_W}
                    fill="rgba(0,0,0,0.001)"
                    style={{ pointerEvents: "all" }}
                  />
                  <line
                    x1={dotX(c)}
                    y1={dotY(r)}
                    x2={dotX(c) + S}
                    y2={dotY(r)}
                    stroke={drawn ? (owner === 1 ? C1 : C2) : isHover ? myColor : "rgba(255,255,255,0.18)"}
                    strokeWidth={isHover ? LINE_W + 1 : drawn ? LINE_W : 3}
                    strokeLinecap="round"
                    style={{
                      filter: drawn
                        ? owner === 1
                          ? "drop-shadow(0 0 6px rgba(233,196,0,0.85))"
                          : "drop-shadow(0 0 6px rgba(56,189,248,0.85))"
                        : isHover
                        ? `drop-shadow(0 0 4px ${myColor})`
                        : undefined,
                    }}
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
              const margin = DOT_R + 4;
              return (
                <g
                  key={`v-${r}-${c}`}
                  className={canMove && !drawn ? "cursor-pointer" : "cursor-default"}
                  onMouseEnter={() => canMove && !drawn && setHoverLine({ row: r, col: c, orient: "v" })}
                  onMouseLeave={() => setHoverLine(null)}
                  onClick={() => handleLineClick(r, c, "v")}
                >
                  <rect
                    x={dotX(c) - HIT_W / 2}
                    y={dotY(r) + margin}
                    width={HIT_W}
                    height={S - 2 * margin}
                    fill="rgba(0,0,0,0.001)"
                    style={{ pointerEvents: "all" }}
                  />
                  <line
                    x1={dotX(c)}
                    y1={dotY(r)}
                    x2={dotX(c)}
                    y2={dotY(r) + S}
                    stroke={drawn ? (owner === 1 ? C1 : C2) : isHover ? myColor : "rgba(255,255,255,0.18)"}
                    strokeWidth={isHover ? LINE_W + 1 : drawn ? LINE_W : 3}
                    strokeLinecap="round"
                    style={{
                      filter: drawn
                        ? owner === 1
                          ? "drop-shadow(0 0 6px rgba(233,196,0,0.85))"
                          : "drop-shadow(0 0 6px rgba(56,189,248,0.85))"
                        : isHover
                        ? `drop-shadow(0 0 4px ${myColor})`
                        : undefined,
                    }}
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
