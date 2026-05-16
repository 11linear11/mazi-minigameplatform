"use client";

import { useEffect, useRef, useState } from "react";
import { Hand, ChevronUp } from "lucide-react";

type UnoCard = {
  color: string | null;
  value: string | number;
  type: string;
};

type UnoPlayer = {
  userId: string;
  hand: UnoCard[];
};

type PlayerMeta = {
  userId: string;
  username?: string;
};

type UnoGameProps = {
  state: {
    players: UnoPlayer[];
    currentPlayerIndex: number;
    direction: number;
    currentColor: string | null;
    currentValue: string | number | null;
    status: string;
    winnerId: string | null;
  };
  currentUserId: string;
  isMyTurn: boolean;
  isWaiting: boolean;
  onAction: (payload: { type: "draw" | "play"; cardIndex?: number; chosenColor?: string }) => void;
  playersMeta?: PlayerMeta[];
};

const CARD_BG: Record<string, string> = {
  red: "bg-red-500 border-red-300",
  yellow: "bg-yellow-500 border-yellow-300",
  green: "bg-green-500 border-green-300",
  blue: "bg-blue-500 border-blue-300",
};

const playerColors = ["#e9c400", "#ff6b6b", "#51cf66", "#339af0", "#cc5de8", "#ff922b"];

function cardSymbol(value: string | number | null) {
  if (value == null) return "";
  if (typeof value === "number") return String(value);
  if (value === "skip") return "⊘";
  if (value === "reverse") return "⟳";
  if (value === "draw2") return "+2";
  if (value === "wild") return "★";
  if (value === "wild_draw4") return "+4";
  return value;
}

function getOpponentPosition(index: number, total: number) {
  if (total === 2) return "top-center";
  if (total === 3) return ["left", "top-center", "right"][index];
  if (total === 4) return ["left", "left-center", "right-center", "right"][index];
  return ["left", "left-mid", "right-mid", "right", "top-center"][index] ?? "top-center";
}

export default function UnoGame({ state, currentUserId, isMyTurn, isWaiting, onAction, playersMeta }: UnoGameProps) {
  const [chosenColor, setChosenColor] = useState("red");
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const handScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window);
  }, []);

  const userNameMap: Record<string, string> = {};
  if (playersMeta) {
    for (const p of playersMeta) {
      userNameMap[p.userId] = p.username ?? p.userId;
    }
  }

  const displayName = (userId: string) => userNameMap[userId] ?? userId;

  const currentPlayer = state.players[state.currentPlayerIndex] ?? null;
  const myPlayer = state.players.find((p) => p.userId === currentUserId);
  const opponentPlayers = state.players.filter((p) => p.userId !== currentUserId);

  const topCard = { color: state.currentColor, value: state.currentValue };

  const canPlayCard = (card: UnoCard) => {
    if (isWaiting) return false;
    if (!isMyTurn) return false;
    if (card.type === "wild" || card.type === "wild_draw4") return true;
    return card.color === state.currentColor || card.value === state.currentValue;
  };

  const handleCardClick = (index: number, card: UnoCard) => {
    if (!canPlayCard(card)) return;

    if (isTouchDevice && selectedCardIndex !== index) {
      setSelectedCardIndex(index);
      return;
    }

    setSelectedCardIndex(null);
    if (card.type === "wild" || card.type === "wild_draw4") {
      onAction({ type: "play", cardIndex: index, chosenColor });
    } else {
      onAction({ type: "play", cardIndex: index });
    }
  };

  if (!myPlayer) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-panel-deep">
        <div className="rounded-2xl border border-outline bg-panel p-6 text-center text-sm text-muted">
          <p>تو این بازی نیستی!</p>
        </div>
      </div>
    );
  }

  const handTotal = myPlayer.hand.length;
  const maxAngle = 10;
  const getRotation = (index: number) => {
    if (handTotal <= 1) return 0;
    const step = (maxAngle * 2) / Math.max(handTotal - 1, 1);
    return -maxAngle + step * index;
  };

  const isCardSelected = (index: number) =>
    isTouchDevice && selectedCardIndex === index;

  const handCardBaseClasses = "w-[72px] h-[112px] lg:w-[130px] lg:h-[200px] rounded-xl lg:rounded-xl border-[3px] lg:border-[4px] border-white/90 card-shadow flex-shrink-0 flex flex-col items-center justify-center transition-all duration-200";

  return (
    <div className="relative h-full w-full arena-surface">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-64 w-64 rounded-full bg-yellow-500/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-yellow-500/5 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-48 w-48 -translate-x-1/2 rounded-full bg-green-500/5 blur-3xl" />

      {/* Gradient overlays */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/40 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/60 to-transparent" />

      {/* Opponents - Desktop */}
      <div className="hidden lg:block absolute inset-0 p-6">
        {opponentPlayers.map((player, idx) => {
          const isCurrent = player.userId === currentPlayer?.userId;
          const color = playerColors[idx % playerColors.length];
          const pos = getOpponentPosition(idx, opponentPlayers.length);
          const name = displayName(player.userId);

          const positionClasses = {
            "left": "left-8 top-1/2 -translate-y-1/4",
            "left-center": "left-12 top-1/3",
            "left-mid": "left-8 top-1/4",
            "right": "right-8 top-1/2 -translate-y-1/4",
            "right-center": "right-12 top-1/3",
            "right-mid": "right-8 top-1/4",
            "top-center": "left-1/2 -translate-x-1/2 top-6",
          }[pos] ?? "top-6 left-1/2 -translate-x-1/2";

          return (
            <div
              key={player.userId}
              className={`absolute flex flex-col items-center gap-2 transition-all ${positionClasses} ${
                isCurrent ? "scale-110 z-10" : "opacity-80"
              }`}
            >
              <div className="relative">
                {isCurrent && (
                  <div className="absolute inset-0 rounded-full gold-glow-strong animate-pulse" />
                )}
                <div
                  className={`relative z-10 flex items-center justify-center rounded-full border-2 font-bold shadow-lg ${
                    isCurrent
                      ? `h-20 w-20 text-xl border-primary-container`
                      : `h-16 w-16 text-base border-outline-variant`
                  }`}
                  style={{ backgroundColor: color, color: "#0D1117" }}
                >
                  {name[0].toUpperCase()}
                </div>
                <div className={`absolute -bottom-2 -right-2 bg-primary-container text-on-primary-container font-bold rounded-full gold-glow ${
                  isCurrent ? "px-2.5 py-1 text-[12px]" : "px-2 py-0.5 text-[10px]"
                }`}>
                  {player.hand.length}
                </div>
              </div>
              <span className={`font-semibold ${isCurrent ? "text-primary-container text-sm" : "text-secondary text-xs"}`}>
                {name.length > 10 ? name.slice(0, 10) + "..." : name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Opponents - Mobile */}
      <div className="lg:hidden relative z-10 flex items-center justify-center gap-2 pt-3 px-4">
        {opponentPlayers.map((player, idx) => {
          const isCurrent = player.userId === currentPlayer?.userId;
          const color = playerColors[idx % playerColors.length];
          const name = displayName(player.userId);
          return (
            <div
              key={player.userId}
              className={`flex flex-col items-center gap-1 transition-all ${isCurrent ? "scale-110" : "opacity-70"}`}
            >
              <div className="relative">
                {isCurrent && (
                  <div className="absolute inset-0 rounded-full gold-glow-strong animate-pulse" />
                )}
                <div
                  className={`relative z-10 flex items-center justify-center rounded-full border-2 font-bold shadow-lg ${
                    isCurrent ? "h-11 w-11 border-primary-container" : "h-9 w-9 border-outline-variant"
                  }`}
                  style={{ backgroundColor: color, color: "#0D1117" }}
                >
                  {name[0].toUpperCase()}
                </div>
                <div className={`absolute -bottom-1.5 -right-1.5 bg-primary-container text-on-primary-container font-bold rounded-full gold-glow ${
                  isCurrent ? "px-1.5 py-0.5 text-[10px]" : "px-1 py-0.5 text-[9px]"
                }`}>
                  {player.hand.length}
                </div>
              </div>
              <span className={`text-[10px] font-semibold ${isCurrent ? "text-primary-container" : "text-secondary"}`}>
                {name.length > 8 ? name.slice(0, 8) + "..." : name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Turn Indicator */}
      {!isWaiting && (
        <div className="absolute left-1/2 top-[15%] lg:top-[12%] -translate-x-1/2 z-20 flex flex-col items-center gap-1 lg:gap-2">
          <div className={`rounded-full shadow-2xl gold-glow border border-primary/20 ${
            isMyTurn
              ? "bg-primary-container text-on-primary-container"
              : "bg-white/10 text-on-surface/60"
          } ${isMyTurn ? "px-4 lg:px-8 py-1.5 lg:py-2" : "px-3 lg:px-5 py-1 lg:py-1.5"}`}>
            <span className={`font-bold ${isMyTurn ? "text-sm lg:text-lg" : "text-[11px] lg:text-sm"}`}>
              {isMyTurn
                ? "نوبت توئه!"
                : `نوبت ${currentPlayer ? displayName(currentPlayer.userId).slice(0, 8) + "..." : "..."}`}
            </span>
          </div>
          {isMyTurn && (
            <div className="flex items-center gap-1.5 text-primary-container/70 text-[10px] lg:text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-container animate-pulse" />
              <span>حرص بده!</span>
            </div>
          )}
        </div>
      )}

      {/* Center Play Zone */}
      <div className="absolute inset-x-0 top-[28%] lg:top-[25%] bottom-[32%] lg:bottom-[28%] flex items-center justify-center">
        <div className="flex items-center gap-6 lg:gap-12">
          {/* Draw Pile */}
          <button
            onClick={() => onAction({ type: "draw" })}
            disabled={!isMyTurn || isWaiting}
            className="relative group cursor-pointer active:scale-95 transition-transform disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="hidden lg:block absolute -bottom-2 -right-2 w-full h-full bg-surface-container rounded-xl -z-10 border border-outline/20" />
            <div className="hidden lg:block absolute -bottom-4 -right-4 w-full h-full bg-surface-container-low rounded-xl -z-20 border border-outline/10" />
            <div className="relative w-24 h-30 lg:w-[140px] lg:h-[210px] bg-surface-container-highest rounded-xl lg:rounded-xl border-2 border-outline/30 card-shadow overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
              <div className="w-[72px] h-[96px] lg:w-[110px] lg:h-[160px] border-[3px] lg:border-4 border-primary-container/20 rounded-lg lg:rounded-lg flex items-center justify-center">
                <span className="font-black text-primary-container/20 text-lg lg:text-2xl italic tracking-tighter">MAZI</span>
              </div>
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-primary-container text-on-primary-container px-2 lg:px-4 py-1 lg:py-2 rounded-lg font-bold text-[10px] lg:text-sm whitespace-nowrap shadow-xl">
                کارت بکش
              </div>
            </div>
          </button>

          {/* Current Card (Discard Pile) */}
          <div className="relative">
            <div
              className={`w-24 h-30 lg:w-[160px] lg:h-[240px] rounded-xl lg:rounded-2xl border-[4px] lg:border-[6px] border-white card-shadow flex flex-col items-center justify-between p-2 lg:p-4 relative overflow-hidden transition-all duration-300 ${
                topCard.color
                  ? `${CARD_BG[topCard.color]}`
                  : "bg-surface-container-highest"
              }`}
              style={!topCard.color ? {
                background: "conic-gradient(red 0deg 90deg, yellow 90deg 180deg, green 180deg 270deg, blue 270deg 360deg)",
              } : undefined}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-white/10 pointer-events-none" />

              {topCard.color ? (
                <>
                  <div className="self-start relative z-10">
                    <span className="text-base lg:text-[40px] leading-none text-white font-black drop-shadow-2xl">
                      {cardSymbol(topCard.value)}
                    </span>
                  </div>
                  <div className="w-10 h-10 lg:w-24 lg:h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30 relative z-10">
                    <span className="text-white font-black italic tracking-tighter text-base lg:text-[32px] drop-shadow-2xl">
                      {cardSymbol(topCard.value)}
                    </span>
                  </div>
                  <div className="self-end rotate-180 relative z-10">
                    <span className="text-base lg:text-[40px] leading-none text-white font-black drop-shadow-2xl">
                      {cardSymbol(topCard.value)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-0.5 lg:gap-1 rotate-45 scale-[0.6] lg:scale-100">
                    <div className="h-3 w-3 lg:h-8 lg:w-8 rounded-tl-lg bg-red-500" />
                    <div className="h-3 w-3 lg:h-8 lg:w-8 rounded-tr-lg bg-yellow-500" />
                    <div className="h-3 w-3 lg:h-8 lg:w-8 rounded-bl-lg bg-green-500" />
                    <div className="h-3 w-3 lg:h-8 lg:w-8 rounded-br-lg bg-blue-500" />
                  </div>
                  <span className="mt-1 text-[9px] lg:text-xs font-bold text-white/70 drop-shadow relative z-10">Wild</span>
                </>
              )}
            </div>
            <div className={`absolute -inset-2 lg:-inset-4 blur-xl lg:blur-2xl -z-10 rounded-full ${
              topCard.color === "red" ? "bg-red-500/20" :
              topCard.color === "yellow" ? "bg-yellow-500/20" :
              topCard.color === "green" ? "bg-green-500/20" :
              topCard.color === "blue" ? "bg-blue-500/20" :
              "bg-white/10"
            }`} />
          </div>

          {/* Color Picker (desktop) */}
          {isMyTurn && !isWaiting && (
            <div className="hidden lg:flex absolute -right-44 flex-col gap-3 p-4 glass-card rounded-2xl">
              <span className="font-semibold text-secondary text-[10px] uppercase tracking-widest text-center">رنگ</span>
              <div className="grid grid-cols-2 gap-3">
                {(["red", "blue", "yellow", "green"] as const).map((color) => (
                  <button
                    key={color}
                    onClick={() => setChosenColor(color)}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      color === "red" ? "bg-red-500" :
                      color === "blue" ? "bg-blue-500" :
                      color === "yellow" ? "bg-yellow-400" :
                      "bg-green-500"
                    } ${
                      chosenColor === color
                        ? "border-white scale-110 gold-glow"
                        : "border-white/20 hover:scale-110 hover:border-white"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Color Picker (mobile) */}
      {isMyTurn && !isWaiting && (
        <div className="lg:hidden absolute left-1/2 -translate-x-1/2 bottom-[26%] z-20 flex items-center gap-2">
          <span className="text-[9px] text-white/50 font-medium">رنگ:</span>
          {(["red", "blue", "yellow", "green"] as const).map((color) => (
            <button
              key={color}
              onClick={() => setChosenColor(color)}
              className={`w-5 h-5 rounded-full border transition-all ${
                chosenColor === color ? "border-white scale-125 ring-1 ring-white" : "border-white/30 opacity-60"
              } ${color === "red" ? "bg-red-500" : color === "blue" ? "bg-blue-500" : color === "yellow" ? "bg-yellow-400" : "bg-green-500"}`}
            />
          ))}
        </div>
      )}

      {/* HUD - Player info (desktop) */}
      <div className="hidden lg:flex absolute bottom-8 left-8 items-center gap-4 z-10">
        <div className="flex flex-col">
          <span className="font-semibold text-secondary text-[10px] uppercase tracking-widest">بازیکن</span>
          <span className="font-bold text-primary-container text-lg">{displayName(currentUserId)}</span>
        </div>
        <div className="h-10 w-[2px] bg-outline-variant/30" />
        <div className="flex flex-col">
          <span className="font-semibold text-secondary text-[10px] uppercase tracking-widest">کارت‌ها</span>
          <span className="font-bold text-lg">{myPlayer.hand.length}</span>
        </div>
      </div>

      {/* Player Hand */}
      <div className="absolute bottom-[6%] lg:bottom-[-60px] left-0 right-0 overflow-x-auto scrollbar-hidden pb-1">
        <div className="flex -space-x-4 lg:-space-x-16 items-end justify-center min-w-max px-4 lg:px-24">
          {myPlayer.hand.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-xs text-white/40">
              کارتی نداری!
            </div>
          ) : (
            myPlayer.hand.map((card, index) => {
              const playable = canPlayCard(card);
              const isHov = !isTouchDevice && hoveredCard === index;
              const isSel = isCardSelected(index);
              const rotation = getRotation(index);

              return (
                <button
                  key={`${card.color}-${card.value}-${index}`}
                  onClick={() => handleCardClick(index, card)}
                  disabled={!playable}
                  onMouseEnter={() => setHoveredCard(index)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className={`relative flex flex-col items-center justify-center z-10 transition-all duration-200 ${
                    isSel ? "-translate-y-6 lg:-translate-y-10" : isHov ? "-translate-y-4 lg:-translate-y-6" : ""
                  }`}
                  style={{
                    zIndex: isSel ? 60 : hoveredCard === index ? 55 : index,
                    transform: `rotate(${rotation}deg)${isSel ? " scale(1.08)" : isHov ? " scale(1.05)" : ""}`,
                  }}
                >
                  <div
                    className={`${handCardBaseClasses} ${
                      !playable
                        ? "opacity-40 cursor-not-allowed"
                        : "cursor-pointer"
                    } ${
                      card.color
                        ? `${CARD_BG[card.color]}`
                        : "bg-surface-container-highest border-white/40"
                    } ${isSel ? "ring-2 lg:ring-4 ring-primary-container/40" : ""}`}
                    style={!card.color ? {
                      background: "conic-gradient(red 0deg 90deg, yellow 90deg 180deg, green 180deg 270deg, blue 270deg 360deg)",
                      borderColor: isSel ? "rgba(255,215,0,0.8)" : "rgba(255,255,255,0.6)",
                    } : undefined}
                  >
                    {card.color ? (
                      <>
                        <span className="text-xl lg:text-[60px] font-black text-white drop-shadow-2xl leading-none">
                          {typeof card.value === "number" && !isNaN(card.value)
                            ? card.value
                            : cardSymbol(card.value)}
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-0.5 rotate-45 scale-[0.5] lg:scale-[0.8]">
                          <div className="h-3 w-3 lg:h-5 lg:w-5 rounded-tl-lg bg-red-500" />
                          <div className="h-3 w-3 lg:h-5 lg:w-5 rounded-tr-lg bg-yellow-500" />
                          <div className="h-3 w-3 lg:h-5 lg:w-5 rounded-bl-lg bg-green-500" />
                          <div className="h-3 w-3 lg:h-5 lg:w-5 rounded-br-lg bg-blue-500" />
                        </div>
                        <span className="text-[10px] lg:text-sm font-bold text-white/80 drop-shadow">
                          {card.type === "wild_draw4" ? "+۴" : "★"}
                        </span>
                      </>
                    )}

                    {playable && (
                      <div className={`absolute -top-1.5 -right-1.5 lg:-top-2 lg:-right-2 h-3 w-3 lg:h-4 lg:w-4 rounded-full transition-all ${
                        isSel ? "bg-white scale-125 ring-2 ring-primary-container" : "bg-primary-container shadow-lg ring-1 ring-primary-container/50"
                      }`} />
                    )}
                  </div>

                  {/* Selection arrow */}
                  {(isSel || (isHov && playable)) && (
                    <div className={`absolute -top-8 lg:-top-12 left-1/2 -translate-x-1/2 rounded-full gold-glow transition-all ${
                      isSel ? "bg-primary-container text-on-primary-container p-0.5 lg:p-1" : "bg-primary-container/60 text-on-primary-container/60 p-0.5 lg:p-1"
                    }`}>
                      <ChevronUp size={14} className="lg:hidden" />
                      <ChevronUp size={22} className="hidden lg:block" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Action Buttons - Desktop */}
      <div className="hidden lg:flex absolute bottom-8 right-8 flex-col gap-4 z-10">
        <button
          onClick={() => onAction({ type: "draw" })}
          disabled={!isMyTurn || isWaiting}
          className="bg-primary-container text-on-primary-container px-10 py-4 rounded-xl font-bold text-lg gold-glow hover:brightness-110 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Hand size={20} />
          کارت بکش
        </button>
        {isMyTurn && myPlayer.hand.length === 2 && (
          <button
            className="flex items-center justify-center h-14 w-14 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-sm font-black text-white shadow-2xl shadow-red-500/30 hover:shadow-red-500/50 hover:scale-105 hover:brightness-110 transition-all active:scale-90 ring-2 ring-red-400/30 mx-auto"
            title="UNO"
          >
            UNO
          </button>
        )}
      </div>

      {/* Action Buttons - Mobile */}
      <div className="lg:hidden absolute bottom-[1%] inset-x-0 flex items-center justify-between px-4 z-10">
        <button
          onClick={() => onAction({ type: "draw" })}
          disabled={!isMyTurn || isWaiting}
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary-container to-accent-bright px-5 py-2.5 text-[12px] font-bold text-panel-deep shadow-lg shadow-yellow-500/20 hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          <Hand size={14} />
          {isMyTurn ? "کارت بکش" : "..."}
        </button>

        {isMyTurn && myPlayer.hand.length === 2 && (
          <button className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 text-[11px] font-black text-white shadow-2xl shadow-red-500/30 ring-2 ring-red-400/30 active:scale-90 transition-all">
            UNO
          </button>
        )}

        {isTouchDevice && selectedCardIndex !== null && (
          <button
            onClick={() => setSelectedCardIndex(null)}
            className="text-[10px] text-white/40 bg-white/10 px-2 py-1 rounded-full"
          >
            لغو
          </button>
        )}
      </div>
    </div>
  );
}
