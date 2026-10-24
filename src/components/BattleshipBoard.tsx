"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Crosshair,
  Shield,
  Flame,
  Trophy,
  AlertTriangle,
  RotateCw,
  Shuffle,
  CheckCircle2,
  Edit3,
} from "lucide-react";
import { sounds } from "@/lib/sounds";

export type BattleshipShip = {
  id: string;
  name: string;
  size: number;
  icon: string;
  hits: number;
  sunk: boolean;
  coordinates?: Array<[number, number]>;
};

export type BattleshipPlayer = {
  userId: string;
  score: number;
  ready: boolean;
  shipGrid?: (string | number)[][];
  radarGrid: number[][]; // 0: unshot, 1: miss, 2: hit
  fleet: BattleshipShip[];
};

export type BattleshipState = {
  size: number;
  status: "waiting" | "placement" | "active" | "finished";
  players: BattleshipPlayer[];
  currentPlayerIndex: number;
  winnerId: string | null;
  isDraw: boolean;
  lastShot: {
    shooterId: string;
    row: number;
    col: number;
    isHit: boolean;
    sunkShip: { id: string; name: string } | null;
  } | null;
};

type BattleshipBoardProps = {
  state: BattleshipState;
  currentUserId: string;
  isMyTurn: boolean;
  isWaiting: boolean;
  playersMeta?: Array<{ userId: string; username?: string }>;
  onMove: (payload: any) => void;
};

const COLS_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

export default function BattleshipBoard({
  state,
  currentUserId,
  isMyTurn,
  isWaiting,
  playersMeta,
  onMove,
}: BattleshipBoardProps) {
  // Mobile tab in battle phase
  const [mobileTab, setMobileTab] = useState<"attack" | "defense">("attack");

  // Hover states for shooting
  const [hoverCell, setHoverCell] = useState<{ r: number; c: number } | null>(null);

  // Placement Phase States
  const [selectedShipId, setSelectedShipId] = useState<string>("carrier");
  const [orientation, setOrientation] = useState<"H" | "V">("H");
  const [placementHover, setPlacementHover] = useState<{ r: number; c: number } | null>(null);

  const myPlayerIndex = state.players.findIndex((p) => p.userId === currentUserId);
  const myPlayer = myPlayerIndex !== -1 ? state.players[myPlayerIndex] : state.players[0];
  const enemyIndex = myPlayerIndex === 0 ? 1 : 0;
  const enemyPlayer = state.players[enemyIndex] ?? state.players[1];

  const userNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    playersMeta?.forEach((pm) => {
      if (pm.username) map[pm.userId] = pm.username;
    });
    return map;
  }, [playersMeta]);

  const enemyName = enemyPlayer ? userNameMap[enemyPlayer.userId] || "حریف" : "حریف";
  const isPlacementPhase =
    state.status === "placement" ||
    (!myPlayer?.ready && state.status !== "active" && state.status !== "finished");
  const canFire = isMyTurn && !isWaiting && state.status === "active";

  // Quick toggle orientation
  const toggleOrientation = useCallback(() => {
    if (myPlayer?.ready) return;
    setOrientation((prev) => (prev === "H" ? "V" : "H"));
    sounds.playPop();
  }, [myPlayer?.ready]);

  // Keyboard shortcut listener: Spacebar or 'R'
  useEffect(() => {
    if (!isPlacementPhase || myPlayer?.ready) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === "r" || e.key === "R") {
        e.preventDefault();
        toggleOrientation();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlacementPhase, myPlayer?.ready, toggleOrientation]);

  // Audio trigger on shot events
  const prevLastShotRef = useRef<BattleshipState["lastShot"]>(null);
  useEffect(() => {
    if (!state.lastShot) return;
    if (
      prevLastShotRef.current?.row !== state.lastShot.row ||
      prevLastShotRef.current?.col !== state.lastShot.col ||
      prevLastShotRef.current?.shooterId !== state.lastShot.shooterId
    ) {
      if (state.lastShot.shooterId === currentUserId) {
        if (state.lastShot.isHit) {
          sounds.playExplosion();
        } else {
          sounds.playSplash();
        }
      } else {
        if (state.lastShot.isHit) {
          sounds.playCapture();
        } else {
          sounds.playSplash();
        }
      }
      prevLastShotRef.current = state.lastShot;
    }
  }, [state.lastShot, currentUserId]);

  // Shooting action
  const handleCellClick = (r: number, c: number) => {
    if (!canFire) return;
    if (!myPlayer) return;
    if (myPlayer.radarGrid[r][c] !== 0) return; // already fired

    sounds.playPop();
    onMove({ row: r, col: c });
  };

  // Helper for computing coordinates of a ship being placed
  const getCandidateCoords = (r: number, c: number, size: number, orient: "H" | "V") => {
    const coords: Array<[number, number]> = [];
    for (let i = 0; i < size; i++) {
      const cr = orient === "V" ? r + i : r;
      const cc = orient === "H" ? c + i : c;
      if (cr < 0 || cr >= 8 || cc < 0 || cc >= 8) return null;
      coords.push([cr, cc]);
    }
    return coords;
  };

  // Check if placement candidate is valid against other ships
  const isPlacementValid = (coords: Array<[number, number]> | null, shipId: string) => {
    if (!coords || !myPlayer?.fleet) return false;
    const otherShips = myPlayer.fleet.filter((s) => s.id !== shipId);
    const occupied = new Set<string>();
    for (const os of otherShips) {
      os.coordinates?.forEach(([or, oc]) => occupied.add(`${or},${oc}`));
    }
    return coords.every(([cr, cc]) => !occupied.has(`${cr},${cc}`));
  };

  // Rotate an already placed ship in place
  const handleRotateInPlace = (shipId: string) => {
    if (!myPlayer?.fleet || myPlayer.ready) return;
    const ship = myPlayer.fleet.find((s) => s.id === shipId);
    if (!ship?.coordinates || ship.coordinates.length < 2) return;

    const isCurrentlyH = ship.coordinates.every(([r]) => r === ship.coordinates![0][0]);
    const targetOrient: "H" | "V" = isCurrentlyH ? "V" : "H";
    const [r0, c0] = ship.coordinates[0];

    let candidate = getCandidateCoords(r0, c0, ship.size, targetOrient);
    if (!isPlacementValid(candidate, shipId)) {
      for (let offset = 1; offset < ship.size; offset++) {
        const testR = targetOrient === "V" ? r0 - offset : r0;
        const testC = targetOrient === "H" ? c0 - offset : c0;
        if (testR >= 0 && testC >= 0) {
          const testCandidate = getCandidateCoords(testR, testC, ship.size, targetOrient);
          if (isPlacementValid(testCandidate, shipId)) {
            candidate = testCandidate;
            break;
          }
        }
      }
    }

    if (candidate && isPlacementValid(candidate, shipId)) {
      sounds.playCardPlay();
      setOrientation(targetOrient);
      const updatedFleet = myPlayer.fleet.map((s) => {
        if (s.id === shipId) {
          return { ...s, coordinates: candidate! };
        }
        return s;
      });
      onMove({ action: "set_fleet", fleet: updatedFleet });
    } else {
      sounds.playError();
    }
  };

  // Handle clicking a cell during placement
  const handlePlaceShipAt = (r: number, c: number) => {
    if (!myPlayer?.fleet || myPlayer.ready) return;

    const clickedShip = myPlayer.fleet.find((s) =>
      s.coordinates?.some(([sr, sc]) => sr === r && sc === c)
    );

    if (clickedShip) {
      if (clickedShip.id === selectedShipId) {
        handleRotateInPlace(clickedShip.id);
        return;
      }
      setSelectedShipId(clickedShip.id);
      sounds.playPop();
      return;
    }

    const currentShip = myPlayer.fleet.find((s) => s.id === selectedShipId);
    if (!currentShip) return;

    const coords = getCandidateCoords(r, c, currentShip.size, orientation);
    if (!isPlacementValid(coords, selectedShipId)) {
      sounds.playError();
      return;
    }

    sounds.playCardPlay();
    const updatedFleet = myPlayer.fleet.map((s) => {
      if (s.id === selectedShipId) {
        return { ...s, coordinates: coords! };
      }
      return s;
    });

    onMove({ action: "set_fleet", fleet: updatedFleet });
  };

  const handleRandomize = () => {
    if (myPlayer?.ready) return;
    sounds.playRatchet();
    onMove({ action: "randomize_fleet" });
  };

  const handleToggleReady = () => {
    if (myPlayer?.ready) {
      sounds.playPop();
      onMove({ action: "unready" });
    } else {
      sounds.playLockSuccess();
      onMove({ action: "ready", fleet: myPlayer?.fleet });
    }
  };

  // ==========================================
  // RENDER: 1. CUSTOM FLEET PLACEMENT PHASE
  // ==========================================
  if (isPlacementPhase) {
    const selectedShip = myPlayer?.fleet?.find((s) => s.id === selectedShipId);
    const ghostCoords =
      placementHover && selectedShip
        ? getCandidateCoords(placementHover.r, placementHover.c, selectedShip.size, orientation)
        : null;
    const ghostValid = ghostCoords ? isPlacementValid(ghostCoords, selectedShipId) : false;

    const allPlaced = myPlayer?.fleet?.every(
      (s) => s.coordinates && s.coordinates.length === s.size
    );

    return (
      <div className="flex flex-col items-center gap-2.5 w-full select-none max-w-3xl mx-auto h-full justify-center">
        {/* Compact Placement Header */}
        <div className="w-full rounded-xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-500/25 px-3 py-2 shadow-lg backdrop-blur-md flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚓</span>
            <div>
              <h3 className="text-xs font-bold text-white leading-tight">استقرار ناوگان دریایی</h3>
              <p className="text-[11px] text-slate-300 leading-tight">
                کشتی‌های خود را بچینید یا چینش تصادفی را انتخاب کنید.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {myPlayer?.ready ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-xs font-bold text-emerald-300">
                <CheckCircle2 size={14} />
                <span>آماده نبرد ✓</span>
              </div>
            ) : (
              <span className="text-xs text-amber-300 font-semibold animate-pulse">
                در حال تنظیم...
              </span>
            )}
          </div>
        </div>

        {/* Placement Workspace (Fixed-height, zero-scroll) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 w-full items-center">
          {/* 8x8 Placement Grid (Left) */}
          <div className="md:col-span-7 flex flex-col items-center w-full">
            <div
              onContextMenu={(e) => {
                e.preventDefault();
                toggleOrientation();
              }}
              className="w-full rounded-2xl bg-gradient-to-b from-[#0b1c33] via-[#09172a] to-[#06101e] border border-blue-500/25 p-3 shadow-xl relative"
            >
              {/* Orientation Switcher directly above the board */}
              <div className="flex items-center justify-between mb-2 px-1 gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sky-300 text-[11px]">جهت ناو:</span>
                  <div className="flex items-center rounded-lg bg-slate-900/90 p-0.5 border border-white/10 shadow-sm">
                    <button
                      type="button"
                      disabled={myPlayer?.ready}
                      onClick={() => {
                        setOrientation("H");
                        sounds.playPop();
                      }}
                      className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all ${
                        orientation === "H"
                          ? "bg-blue-600 text-white shadow-md ring-1 ring-blue-400"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <span>↔ افقی</span>
                    </button>
                    <button
                      type="button"
                      disabled={myPlayer?.ready}
                      onClick={() => {
                        setOrientation("V");
                        sounds.playPop();
                      }}
                      className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all ${
                        orientation === "V"
                          ? "bg-blue-600 text-white shadow-md ring-1 ring-blue-400"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <span>↕ عمودی</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={myPlayer?.ready}
                    onClick={toggleOrientation}
                    className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-amber-400 border border-white/10 active:scale-95 transition-all"
                    title="چرخش سریع (کلیک‌راست یا Space)"
                  >
                    <RotateCw size={13} />
                  </button>
                </div>

                <span className="text-[10px] text-amber-300/80 font-medium">
                  💡 کلیک‌راست / Space = چرخش
                </span>
              </div>

              {/* Column labels A-H */}
              <div className="grid grid-cols-8 gap-1 mb-1 text-center pr-5">
                {COLS_LETTERS.map((l) => (
                  <span key={l} className="text-[10px] font-mono font-semibold text-sky-400/70">
                    {l}
                  </span>
                ))}
              </div>

              {/* Grid rows */}
              <div className="flex flex-col gap-1">
                {Array.from({ length: 8 }).map((_, r) => (
                  <div key={`place-row-${r}`} className="flex items-center gap-1">
                    <span className="w-4 text-[10px] font-mono font-semibold text-sky-400/70 text-center">
                      {r + 1}
                    </span>

                    <div className="grid grid-cols-8 gap-1 flex-1">
                      {Array.from({ length: 8 }).map((_, c) => {
                        const shipAtCell = myPlayer?.fleet?.find((s) =>
                          s.coordinates?.some(([sr, sc]) => sr === r && sc === c)
                        );
                        const isGhost = ghostCoords?.some(([gr, gc]) => gr === r && gc === c);

                        return (
                          <button
                            key={`place-cell-${r}-${c}`}
                            type="button"
                            disabled={myPlayer?.ready}
                            onMouseEnter={() => !myPlayer?.ready && setPlacementHover({ r, c })}
                            onMouseLeave={() => setPlacementHover(null)}
                            onClick={() => handlePlaceShipAt(r, c)}
                            className={`aspect-square max-h-[36px] rounded-md sm:rounded-lg flex items-center justify-center transition-all relative ${
                              isGhost
                                ? ghostValid
                                  ? "bg-emerald-500/60 border-2 border-emerald-300 shadow-[0_0_8px_#10b981]"
                                  : "bg-rose-500/60 border-2 border-rose-300 shadow-[0_0_8px_#f43f5e]"
                                : shipAtCell
                                ? shipAtCell.id === selectedShipId && !myPlayer?.ready
                                  ? "bg-blue-600 border border-amber-400 shadow-md ring-1 ring-amber-400/50"
                                  : "bg-blue-700/80 border border-blue-400/60"
                                : "bg-blue-950/40 border border-blue-500/15 hover:border-sky-400/40"
                            }`}
                          >
                            {shipAtCell && (
                              <div className="h-2 w-2 rounded-xs bg-sky-200 shadow-xs" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Controls & Ships Selector (Right) */}
          <div className="md:col-span-5 flex flex-col gap-2.5 w-full">
            {/* Quick Actions Panel */}
            <div className="rounded-xl bg-gradient-to-b from-[#0a182b] to-[#071221] border border-blue-500/20 p-3 shadow-lg flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={myPlayer?.ready}
                  onClick={toggleOrientation}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-50"
                >
                  <RotateCw size={13} className="text-amber-400" />
                  <span>چرخش: {orientation === "H" ? "افقی" : "عمودی"}</span>
                </button>

                <button
                  type="button"
                  disabled={myPlayer?.ready}
                  onClick={handleRandomize}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-50"
                >
                  <Shuffle size={13} className="text-sky-400" />
                  <span>چینش تصادفی</span>
                </button>
              </div>

              {/* Ready / Unready confirmation button */}
              <button
                type="button"
                disabled={!allPlaced}
                onClick={handleToggleReady}
                className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 ${
                  myPlayer?.ready
                    ? "bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/30"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40"
                }`}
              >
                {myPlayer?.ready ? (
                  <>
                    <Edit3 size={14} />
                    <span>ویرایش مجدد چینش</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>تأیید ناوگان و آماده‌باش</span>
                  </>
                )}
              </button>

              {/* Opponent waiting indicator */}
              <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                <span>وضعیت حریف ({enemyName}):</span>
                {enemyPlayer?.ready ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    آماده نبرد ✓
                  </span>
                ) : (
                  <span className="text-amber-300 flex items-center gap-1 animate-pulse">
                    در حال چیدن...
                  </span>
                )}
              </div>
            </div>

            {/* Ship list to select */}
            <div className="rounded-xl bg-gradient-to-b from-[#0a182b] to-[#071221] border border-white/10 p-2.5 shadow-lg flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-slate-300 px-1">
                ناوهای شما (برای چیدن انتخاب کنید):
              </span>
              {myPlayer?.fleet?.map((ship) => {
                const isSelected = ship.id === selectedShipId;
                return (
                  <button
                    key={ship.id}
                    type="button"
                    disabled={myPlayer?.ready}
                    onClick={() => {
                      setSelectedShipId(ship.id);
                      sounds.playPop();
                    }}
                    className={`flex items-center justify-between rounded-lg p-2 border text-xs transition-all ${
                      isSelected
                        ? "bg-blue-600/30 border-amber-400 text-white shadow-sm ring-1 ring-amber-400/40"
                        : "bg-slate-800/40 border-white/5 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{ship.icon}</span>
                      <span className="font-bold text-[11px]">{ship.name}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: ship.size }).map((_, i) => (
                        <div
                          key={`ship-size-${ship.id}-${i}`}
                          className={`w-3 h-3 rounded-xs border ${
                            isSelected
                              ? "bg-amber-400 border-amber-300"
                              : "bg-blue-500/60 border-blue-400/40"
                          }`}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: 2. ACTIVE BATTLE PHASE
  // ==========================================
  const enemySunkCount = enemyPlayer?.fleet?.filter((s) => s.sunk).length ?? 0;
  const enemyTotalShips = enemyPlayer?.fleet?.length ?? 4;
  const mySunkCount = myPlayer?.fleet?.filter((s) => s.sunk).length ?? 0;
  const myTotalShips = myPlayer?.fleet?.length ?? 4;

  return (
    <div className="flex flex-col items-center gap-2.5 w-full select-none max-w-4xl mx-auto h-full justify-center">
      {/* Compact Naval Command Header */}
      <div className="w-full rounded-xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-500/20 px-3.5 py-2 shadow-lg backdrop-blur-md flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🚢</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white leading-tight">نبرد ناوگان دریایی</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-sky-300 font-medium">
                {myTotalShips - mySunkCount} ناو سالم شما
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              ناوهای دشمن ({enemyName}):{" "}
              <span className="text-amber-400 font-bold">{enemyTotalShips - enemySunkCount}</span> از {enemyTotalShips}
            </span>
          </div>
        </div>

        {/* Turn / Outcome Badge */}
        <div>
          {state.status === "finished" ? (
            state.winnerId === currentUserId ? (
              <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 text-xs font-bold text-emerald-300 shadow-sm animate-bounce">
                <Trophy size={14} className="text-amber-400" />
                <span>پیروزی مقتدرانه! ناوگان دشمن غرق شد</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 px-3 py-1 text-xs font-bold text-rose-300 shadow-sm">
                <AlertTriangle size={14} />
                <span>شکست! تمام ناوگان شما نابود شد</span>
              </div>
            )
          ) : canFire ? (
            <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/20 border border-amber-400/40 px-3 py-1 text-xs font-bold text-amber-300 shadow-xs animate-pulse">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              <span>نوبت شلیک شماست — روی آب کلیک کنید</span>
            </div>
          ) : isWaiting ? (
            <span className="text-xs text-slate-400">در حال اتصال بازیکنان...</span>
          ) : (
            <div className="flex items-center gap-1.5 rounded-lg bg-slate-800/60 border border-white/10 px-3 py-1 text-xs text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse" />
              <span>حریف در حال هدف‌گیری است...</span>
            </div>
          )}
        </div>

        {/* Last shot inline banner */}
        {state.lastShot && (
          <div className="w-full pt-1 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">آخرین رویداد نبرد:</span>
            {state.lastShot.sunkShip ? (
              <span className="text-rose-400 font-bold flex items-center gap-1 animate-pulse">
                💥 {state.lastShot.sunkShip.name} دشمن غرق شد!
              </span>
            ) : state.lastShot.isHit ? (
              <span className="text-amber-300 font-bold flex items-center gap-1">
                🔥 اصابت مستقیم به هدف! (نوبت جایزه)
              </span>
            ) : (
              <span className="text-sky-300 flex items-center gap-1">
                🌊 شلیک به آب خورد (خطا)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex md:hidden items-center w-full rounded-lg bg-slate-900/90 p-0.5 border border-white/10">
        <button
          onClick={() => setMobileTab("attack")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-md transition-all ${
            mobileTab === "attack"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Crosshair size={13} />
          <span>آب‌های دشمن (شلیک)</span>
        </button>
        <button
          onClick={() => setMobileTab("defense")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-md transition-all ${
            mobileTab === "defense"
              ? "bg-sky-700 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Shield size={13} />
          <span>ناوگان خودی</span>
        </button>
      </div>

      {/* Playing Area: Dual Boards without scrolling */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 w-full items-center">
        {/* Left/Main Column: Offensive Ocean Grid */}
        <div
          className={`md:col-span-7 flex flex-col items-center w-full ${
            mobileTab !== "attack" ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="w-full rounded-2xl bg-gradient-to-b from-[#0b1c33] via-[#09172a] to-[#06101e] border border-blue-500/25 p-3 shadow-xl relative">
            <div className="flex items-center justify-between mb-2 px-1 text-xs">
              <div className="flex items-center gap-1.5">
                <Crosshair size={14} className="text-amber-400" />
                <span className="font-bold text-white">آب‌های دشمن ({enemyName})</span>
              </div>
              <span className="text-[10px] text-slate-400">
                {canFire ? "کلیک کنید تا شلیک شود" : "در انتظار نوبت"}
              </span>
            </div>

            {/* Column letters A-H */}
            <div className="grid grid-cols-8 gap-1 mb-1 text-center pr-5">
              {COLS_LETTERS.map((l) => (
                <span key={l} className="text-[10px] font-mono font-semibold text-sky-400/70">
                  {l}
                </span>
              ))}
            </div>

            {/* Ocean Grid 1-8 */}
            <div className="flex flex-col gap-1">
              {Array.from({ length: 8 }).map((_, r) => (
                <div key={`attack-row-${r}`} className="flex items-center gap-1">
                  <span className="w-4 text-[10px] font-mono font-semibold text-sky-400/70 text-center">
                    {r + 1}
                  </span>

                  <div className="grid grid-cols-8 gap-1 flex-1">
                    {Array.from({ length: 8 }).map((_, c) => {
                      const cellVal = myPlayer?.radarGrid[r][c] ?? 0;
                      const isHovered = hoverCell?.r === r && hoverCell?.c === c;

                      return (
                        <button
                          key={`attack-cell-${r}-${c}`}
                          type="button"
                          disabled={!canFire || cellVal !== 0}
                          onMouseEnter={() => canFire && setHoverCell({ r, c })}
                          onMouseLeave={() => setHoverCell(null)}
                          onClick={() => handleCellClick(r, c)}
                          className={`aspect-square max-h-[36px] rounded-md sm:rounded-lg flex items-center justify-center transition-all relative overflow-hidden ${
                            cellVal === 0 && canFire
                              ? "cursor-pointer bg-blue-950/60 hover:bg-blue-600/30 border border-blue-500/20 hover:border-amber-400 hover:shadow-[0_0_10px_rgba(251,191,36,0.35)] active:scale-95"
                              : cellVal === 1
                              ? "bg-slate-900/80 border border-sky-500/20"
                              : cellVal === 2
                              ? "bg-gradient-to-tr from-rose-700 via-rose-600 to-amber-500 border border-amber-300 shadow-[0_0_10px_rgba(244,63,94,0.6)] animate-pulse"
                              : "bg-blue-950/30 border border-white/5 opacity-70"
                          }`}
                        >
                          {cellVal === 2 ? (
                            <Flame size={16} className="text-amber-200 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]" />
                          ) : cellVal === 1 ? (
                            <div className="flex items-center justify-center">
                              <span className="h-2 w-2 rounded-full bg-sky-400/70 shadow-[0_0_4px_#38bdf8]" />
                            </div>
                          ) : isHovered && canFire ? (
                            <div className="h-2.5 w-2.5 rounded-full border-2 border-amber-400 animate-ping" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Defensive Ocean & Fog-of-War Enemy Ships Status */}
        <div
          className={`md:col-span-5 flex flex-col gap-2.5 w-full ${
            mobileTab !== "defense" ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Defensive Mini-Map: Own Ships */}
          <div className="w-full rounded-xl bg-gradient-to-b from-[#0a182b] to-[#071221] border border-blue-500/20 p-2.5 shadow-lg">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <div className="flex items-center gap-1.5">
                <Shield size={13} className="text-sky-400" />
                <span className="text-[11px] font-bold text-white">ناوگان شما (پدافند)</span>
              </div>
              <span className="text-[10px] text-slate-400">شلیک‌های حریف</span>
            </div>

            <div className="grid grid-cols-8 gap-0.5 mb-0.5 text-center pr-4">
              {COLS_LETTERS.map((l) => (
                <span key={`def-col-${l}`} className="text-[8px] font-mono text-slate-400">
                  {l}
                </span>
              ))}
            </div>

            <div className="flex flex-col gap-0.5">
              {Array.from({ length: 8 }).map((_, r) => (
                <div key={`def-row-${r}`} className="flex items-center gap-0.5">
                  <span className="w-3.5 text-[8px] font-mono text-slate-400 text-center">
                    {r + 1}
                  </span>

                  <div className="grid grid-cols-8 gap-0.5 flex-1">
                    {Array.from({ length: 8 }).map((_, c) => {
                      const shipId = myPlayer?.shipGrid?.[r]?.[c] ?? 0;
                      const enemyRadarShot = enemyPlayer?.radarGrid?.[r]?.[c] ?? 0;
                      const hasShip = shipId !== 0;

                      return (
                        <div
                          key={`def-cell-${r}-${c}`}
                          className={`aspect-square max-h-[22px] rounded-xs flex items-center justify-center relative border transition-all ${
                            enemyRadarShot === 2
                              ? "bg-rose-600 border-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.7)]"
                              : enemyRadarShot === 1
                              ? "bg-slate-900 border-sky-400/20"
                              : hasShip
                              ? "bg-blue-600/80 border-blue-400/60 shadow-xs"
                              : "bg-blue-950/20 border-white/5"
                          }`}
                        >
                          {enemyRadarShot === 2 ? (
                            <Flame size={10} className="text-amber-200" />
                          ) : enemyRadarShot === 1 ? (
                            <div className="h-1 w-1 rounded-full bg-sky-400/40" />
                          ) : hasShip ? (
                            <div className="h-1.5 w-1.5 rounded-xs bg-sky-200/90 shadow-xs" />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enemy Fleet Status (Strict Fog-of-War) */}
          <div className="w-full rounded-xl bg-gradient-to-b from-[#0a182b] to-[#071221] border border-white/10 p-2.5 shadow-lg">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-bold text-slate-300">
                ناوگان دشمن ({enemyName}):
              </span>
              <span className="text-[10px] text-amber-400 font-semibold">
                {enemyTotalShips - enemySunkCount} فعال / {enemySunkCount} غرق شده
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              {enemyPlayer?.fleet?.map((ship) => (
                <div
                  key={ship.id}
                  className={`flex items-center justify-between rounded-lg p-2 border transition-all ${
                    ship.sunk
                      ? "bg-rose-950/40 border-rose-500/40 text-rose-300 opacity-60"
                      : "bg-slate-800/60 border-white/5 text-white"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{ship.icon}</span>
                    <span className="font-bold text-[11px]">{ship.name} ({ship.size} خانه)</span>
                  </div>

                  <div>
                    {ship.sunk ? (
                      <span className="text-[9px] font-bold text-rose-400 px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/30">
                        غرق شد 💥
                      </span>
                    ) : (
                      <span className="text-[9px] font-medium text-sky-300/80 px-2 py-0.5 rounded-md bg-blue-900/30 border border-blue-400/20">
                        پنهان در دریا 🌊
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
