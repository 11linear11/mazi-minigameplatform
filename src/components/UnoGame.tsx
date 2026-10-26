import { useEffect, useRef, useState } from "react";
import { Hand, ChevronUp, Zap } from "lucide-react";
import { sounds } from "@/lib/sounds";

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
  const [pendingWildIndex, setPendingWildIndex] = useState<number | null>(null);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [topCardTilt, setTopCardTilt] = useState(-2);
  const handScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window);
  }, []);

  useEffect(() => {
    setTopCardTilt(Math.floor(Math.random() * 12) - 6);
  }, [state.currentColor, state.currentValue]);

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
      setPendingWildIndex(index);
    } else {
      sounds.playCardPlay();
      onAction({ type: "play", cardIndex: index });
    }
  };

  const handleDraw = () => {
    sounds.playCardDraw();
    onAction({ type: "draw" });
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
    <div className="relative h-full w-full arena-surface flex flex-col justify-between overflow-hidden select-none p-3 sm:p-4">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-44 w-44 rounded-full bg-yellow-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 -bottom-20 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl" />

      {/* TOP ZONE: Opponents Bar & Game Status */}
      <div className="relative z-10 flex-none flex items-center justify-between border-b border-white/10 pb-2 px-1">
        {/* Turn Status */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 text-xs font-bold transition-all shadow-lg backdrop-blur-md ${
              isMyTurn
                ? "bg-primary-container text-on-primary-container gold-glow ring-2 ring-primary-container/60 animate-pulse"
                : "bg-white/10 text-white/80"
            }`}
          >
            {isMyTurn && <span className="h-2 w-2 rounded-full bg-panel-deep animate-ping" />}
            <span>
              {isMyTurn
                ? "نوبت شماست! (کارت بازی کن یا بکش)"
                : `نوبت: ${currentPlayer ? displayName(currentPlayer.userId) : "..."}`}
            </span>
          </div>
        </div>

        {/* Opponents List */}
        <div className="flex items-center gap-2 sm:gap-3">
          {opponentPlayers.map((player, idx) => {
            const isCurrent = player.userId === currentPlayer?.userId;
            const color = playerColors[idx % playerColors.length];
            const name = displayName(player.userId);
            return (
              <div
                key={player.userId}
                className={`flex items-center gap-1.5 sm:gap-2 rounded-2xl px-2 sm:px-3 py-1 transition-all ${
                  isCurrent
                    ? "bg-white/20 ring-2 ring-accent gold-glow scale-105"
                    : "bg-white/5 opacity-80"
                }`}
              >
                <div
                  className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full font-black text-xs shadow-md"
                  style={{ backgroundColor: color, color: "#0D1117" }}
                >
                  {name[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[11px] font-bold text-white leading-tight">
                    {name.length > 7 ? name.slice(0, 7) + ".." : name}
                  </span>
                  <span className="text-[10px] text-accent font-semibold">
                    {player.hand.length} کارت {player.hand.length === 1 && "🔥 UNO!"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CENTER ZONE: Draw Pile & Discard Pile (Play Table) */}
      <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center my-auto">
        <div className="flex items-center gap-6 sm:gap-12">
          {/* Draw Pile */}
          <button
            onClick={handleDraw}
            disabled={!isMyTurn || isWaiting}
            className="group relative flex flex-col items-center cursor-pointer transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="relative w-20 h-28 sm:w-28 sm:h-40 rounded-2xl bg-surface-container-highest border-2 border-outline/40 shadow-2xl flex flex-col items-center justify-center overflow-hidden transition-all group-hover:scale-105 group-hover:border-accent">
              <div className="w-14 h-22 sm:w-20 sm:h-32 border-2 border-primary-container/30 rounded-xl flex items-center justify-center">
                <span className="font-black text-primary-container text-sm sm:text-lg italic tracking-wider">
                  MAZI
                </span>
              </div>
            </div>
            <span className="mt-2 rounded-full bg-white/10 px-3 py-0.5 text-[10px] sm:text-xs font-bold text-white/90 group-hover:bg-accent group-hover:text-panel-deep transition-colors">
              کارت بکش
            </span>
          </button>

          {/* Current Discard Card */}
          <div className="relative flex flex-col items-center">
            {(topCard.value === "draw2" || topCard.value === "wild_draw4") && (
              <div className="absolute -inset-3 rounded-2xl border-2 border-red-500/80 animate-ping pointer-events-none" />
            )}
            <div
              className={`w-20 h-28 sm:w-28 sm:h-40 rounded-2xl border-[3px] sm:border-[4px] border-white shadow-2xl flex flex-col items-center justify-between p-2 relative overflow-hidden transition-all duration-300 ${
                topCard.color ? CARD_BG[topCard.color] : "bg-surface-container-highest"
              }`}
              style={
                !topCard.color
                  ? { background: "conic-gradient(red 0deg 90deg, yellow 90deg 180deg, green 180deg 270deg, blue 270deg 360deg)" }
                  : { transform: `rotate(${topCardTilt}deg)` }
              }
            >
              {topCard.color ? (
                <>
                  <span className="self-start text-xs sm:text-lg font-black text-white leading-none">
                    {cardSymbol(topCard.value)}
                  </span>
                  <div className="w-9 h-9 sm:w-14 sm:h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/40">
                    <span className="text-sm sm:text-2xl font-black text-white italic">
                      {cardSymbol(topCard.value)}
                    </span>
                  </div>
                  <span className="self-end text-xs sm:text-lg font-black text-white leading-none rotate-180">
                    {cardSymbol(topCard.value)}
                  </span>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <span className="text-xs sm:text-base font-black text-white drop-shadow">Wild</span>
                </div>
              )}
            </div>

            <div className="mt-2 flex items-center gap-1.5 text-[10px] sm:text-xs text-white/70">
              <span>رنگ فعال:</span>
              <span
                className="inline-block h-3.5 w-3.5 rounded-full border border-white shadow"
                style={{
                  backgroundColor:
                    topCard.color === "red"
                      ? "#ef4444"
                      : topCard.color === "yellow"
                      ? "#eab308"
                      : topCard.color === "green"
                      ? "#22c55e"
                      : topCard.color === "blue"
                      ? "#3b82f6"
                      : "#ffffff",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM ZONE: Hand Bar & Cards */}
      <div className="relative z-10 flex-none flex flex-col items-center gap-1 w-full max-w-4xl mx-auto pb-1">
        {/* Hand Status & UNO button */}
        <div className="w-full flex items-center justify-between px-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80">
              دست شما: {myPlayer.hand.length} کارت
            </span>
          </div>

          <div className="flex items-center gap-2">
            {myPlayer.hand.length === 2 && isMyTurn && (
              <button
                className="flex items-center gap-1 rounded-full bg-gradient-to-r from-red-600 to-rose-500 px-3.5 py-1 font-black text-white text-[11px] shadow-lg shadow-red-500/40 animate-bounce active:scale-95"
              >
                🔥 UNO!
              </button>
            )}
          </div>
        </div>

        {/* Horizontal Cards Scrollable Tray */}
        <div className="w-full overflow-x-auto scrollbar-hidden py-2 px-2" style={{ touchAction: "pan-x" }}>
          <div className="flex -space-x-3 sm:-space-x-4 lg:-space-x-5 items-end justify-center min-w-max pb-2 pt-3">
            {myPlayer.hand.map((card, index) => {
              const playable = canPlayCard(card);
              const isHov = hoveredCard === index;
              return (
                <button
                  key={`${card.color}-${card.value}-${index}`}
                  onClick={() => handleCardClick(index, card)}
                  disabled={!playable}
                  onMouseEnter={() => setHoveredCard(index)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className={`relative flex flex-col items-center justify-center transition-all duration-200 select-none ${
                    isHov && playable ? "-translate-y-4 scale-110 z-30" : "z-10"
                  }`}
                  style={{ zIndex: isHov ? 50 : index }}
                >
                  <div
                    className={`w-14 h-22 sm:w-18 sm:h-28 lg:w-20 lg:h-32 rounded-xl border-2 sm:border-[3px] border-white/90 shadow-xl flex flex-col items-center justify-between p-1.5 transition-all ${
                      !playable ? "opacity-40 cursor-not-allowed grayscale-[40%]" : "cursor-pointer hover:border-yellow-300"
                    } ${card.color ? CARD_BG[card.color] : "bg-surface-container-highest"}`}
                    style={
                      !card.color
                        ? { background: "conic-gradient(red 0deg 90deg, yellow 90deg 180deg, green 180deg 270deg, blue 270deg 360deg)" }
                        : undefined
                    }
                  >
                    {card.color ? (
                      <>
                        <span className="self-start text-[11px] sm:text-sm font-black text-white leading-none">
                          {cardSymbol(card.value)}
                        </span>
                        <span className="text-base sm:text-2xl font-black text-white drop-shadow">
                          {cardSymbol(card.value)}
                        </span>
                        <span className="self-end text-[11px] sm:text-sm font-black text-white leading-none rotate-180">
                          {cardSymbol(card.value)}
                        </span>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <span className="text-[10px] sm:text-xs font-black text-white">
                          {card.type === "wild_draw4" ? "+4" : "★"}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Wild Color Selection Modal */}
      {pendingWildIndex !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-xs rounded-2xl border border-outline bg-panel-dim p-5 text-center shadow-2xl">
            <h3 className="text-base font-bold text-on-surface mb-2">رنگ کارت را انتخاب کن</h3>
            <p className="text-xs text-muted mb-5">رنگ مورد نظر برای ادامه بازی چیست؟</p>
            <div className="grid grid-cols-2 gap-3">
              {(["red", "blue", "yellow", "green"] as const).map((color) => {
                const colorNames: Record<string, string> = {
                  red: "قرمز",
                  blue: "آبی",
                  yellow: "زرد",
                  green: "سبز",
                };
                return (
                  <button
                    key={color}
                    onClick={() => {
                      sounds.playCardPlay();
                      onAction({ type: "play", cardIndex: pendingWildIndex, chosenColor: color });
                      setPendingWildIndex(null);
                    }}
                    className={`flex items-center justify-center py-2.5 px-3 rounded-xl font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 ${
                      color === "red"
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : color === "blue"
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : color === "yellow"
                        ? "bg-yellow-400 text-black hover:bg-yellow-500"
                        : "bg-green-500 text-white hover:bg-green-600"
                    }`}
                  >
                    {colorNames[color]}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPendingWildIndex(null)}
              className="mt-4 text-xs text-muted hover:text-white transition-colors"
            >
              انصراف
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
