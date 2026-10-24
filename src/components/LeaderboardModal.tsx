"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Trophy,
  X,
  Medal,
  Crown,
  ChevronDown,
  Check,
} from "lucide-react";
import { sounds } from "@/lib/sounds";

export type LeaderboardUser = {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  status?: string;
  xp: number;
  level: number;
  wins: number;
  totalWins?: number;
  gameType?: string;
  badges: string[];
  tags: string[];
  favoriteGames: string[];
};

type LeaderboardModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  socket?: any;
};

const CATEGORIES = [
  { id: "overall", label: "همه بازی‌ها (کلی)", icon: "🌟" },
  { id: "Connect 4", label: "دوز ۴تایی (Connect 4)", icon: "🟡" },
  { id: "Battleship", label: "نبرد کشتی‌ها (Battleship)", icon: "🚢" },
  { id: "Chess", label: "شطرنج (Chess)", icon: "♟️" },
  { id: "Uno", label: "اونو (Uno)", icon: "🃏" },
  { id: "Dots & Boxes", label: "نقطه خط (Dots & Boxes)", icon: "🔲" },
  { id: "Tic Tac Toe", label: "دوز کلاسیک (Tic Tac Toe)", icon: "❌" },
  { id: "LockPick", label: "قفل‌بازکن (LockPick)", icon: "🔒" },
];

export default function LeaderboardModal({
  isOpen,
  onClose,
  currentUserId,
  socket,
}: LeaderboardModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("overall");
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const fetchLeaderboard = useCallback(
    (category: string) => {
      setLoading(true);
      if (socket?.connected) {
        socket.emit("get_leaderboard", { category }, (res: any) => {
          if (res?.leaderboard) {
            setLeaderboard(res.leaderboard);
            setLoading(false);
          }
        });
      }

      fetch(`/leaderboard?category=${encodeURIComponent(category)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.leaderboard) {
            setLeaderboard(data.leaderboard);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    },
    [socket]
  );

  useEffect(() => {
    if (!isOpen) return;
    fetchLeaderboard(selectedCategory);
  }, [isOpen, selectedCategory, fetchLeaderboard]);

  // Live update listener
  useEffect(() => {
    if (!socket || !isOpen) return;
    const handleUpdate = () => fetchLeaderboard(selectedCategory);
    socket.on("leaderboard_updated", handleUpdate);
    return () => socket.off("leaderboard_updated", handleUpdate);
  }, [socket, isOpen, selectedCategory, fetchLeaderboard]);

  const currentCategory = CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];

  // Top 3 Podium and remaining players
  const top1 = leaderboard.find((u) => u.rank === 1);
  const top2 = leaderboard.find((u) => u.rank === 2);
  const top3 = leaderboard.find((u) => u.rank === 3);
  const remainingPlayers = leaderboard.filter((u) => u.rank > 3);

  // Current user's entry
  const myEntry = leaderboard.find((u) => u.userId === currentUserId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg md:max-w-xl h-[560px] max-h-[88vh] flex flex-col rounded-3xl bg-panel-deep border border-outline shadow-2xl overflow-hidden">
        {/* 1. Header (shrink-0) */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline bg-panel/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 shadow-sm">
              <Trophy size={18} className="drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-on-surface leading-tight">جدول برترین‌ها (Leaderboard)</h2>
              <p className="text-[11px] text-muted leading-tight">رتبه‌بندی قهرمانان دارای پیروزی</p>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.playPop();
              onClose();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-all active:scale-90"
          >
            <X size={16} />
          </button>
        </div>

        {/* 2. Clean Category Bar with ZERO Horizontal Scroll (Dropdown + Overall Toggle) */}
        <div className="px-4 py-2.5 border-b border-outline bg-panel-soft/40 flex items-center justify-between gap-2 shrink-0">
          {/* Quick Overall Pill */}
          <button
            type="button"
            onClick={() => {
              sounds.playPop();
              setSelectedCategory("overall");
              setShowDropdown(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedCategory === "overall"
                ? "bg-accent text-panel-deep shadow-sm font-extrabold"
                : "bg-panel text-muted hover:text-on-surface border border-outline hover:border-white/20"
            }`}
          >
            <span>🌟</span>
            <span>همه بازی‌ها (کلی)</span>
          </button>

          {/* Game Dropdown Selector (Zero-scroll, clean overlay) */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => {
                sounds.playPop();
                setShowDropdown((prev) => !prev);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                selectedCategory !== "overall"
                  ? "bg-amber-500/20 text-amber-300 border-amber-400/50 ring-1 ring-amber-400/30 font-black"
                  : "bg-panel text-muted hover:text-on-surface border-outline hover:border-white/20"
              }`}
            >
              <span>{selectedCategory !== "overall" ? currentCategory.icon : "🎮"}</span>
              <span className="truncate max-w-[130px] sm:max-w-[160px]">
                {selectedCategory !== "overall" ? currentCategory.label : "فیلتر بر اساس بازی"}
              </span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 text-muted ${showDropdown ? "rotate-180" : ""}`}
              />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute left-0 top-full mt-1.5 z-50 w-56 rounded-2xl bg-panel-deep border border-outline shadow-2xl p-1.5 backdrop-blur-xl animate-fade-in space-y-0.5">
                <span className="text-[10px] font-bold text-muted px-2.5 py-1 block">
                  انتخاب بازی برای نمایش رتبه‌ها:
                </span>
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        sounds.playPop();
                        setSelectedCategory(cat.id);
                        setShowDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? "bg-accent text-panel-deep font-black shadow-sm"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </div>
                      {isSelected && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 3. Main Content Area (Clean subtle scroll only when needed) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15 hover:[&::-webkit-scrollbar-thumb]:bg-white/25 [&::-webkit-scrollbar-track]:bg-transparent">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2.5">
              <div className="h-7 w-7 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <p className="text-xs text-muted">در حال دریافت برترین‌ها...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-2 text-center">
              <span className="text-3xl">🏆</span>
              <p className="text-xs font-bold text-on-surface">هنوز بردی در این بازی ثبت نشده است!</p>
              <p className="text-[11px] text-muted">با برنده شدن در اولین بازی، نام شما به عنوان صدرنشین ثبت می‌شود.</p>
            </div>
          ) : (
            <>
              {/* Top 3 Podium (Compact, Proportional, Centered) */}
              <div className="grid grid-cols-3 gap-2 items-end pt-3 pb-1 max-w-sm mx-auto">
                {/* #2 Rank (Silver) */}
                <div className="flex flex-col items-center">
                  {top2 ? (
                    <div className="flex flex-col items-center w-full">
                      <div className="relative mb-1">
                        <div className="w-11 h-11 rounded-xl ring-2 ring-slate-300 shadow-md overflow-hidden bg-slate-800 flex items-center justify-center">
                          {top2.avatar?.startsWith("/avatars/") || top2.avatar?.startsWith("http") ? (
                            <Image src={top2.avatar} alt={top2.username} width={44} height={44} className="object-cover w-full h-full" unoptimized />
                          ) : (
                            <span className="text-xl">{top2.avatar || "👤"}</span>
                          )}
                        </div>
                        <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-300 text-slate-900 font-bold text-[10px] shadow-sm ring-1 ring-panel-deep">
                          ۲
                        </div>
                      </div>
                      <span className="font-bold text-[11px] text-on-surface truncate max-w-[75px] text-center">
                        {top2.username}
                      </span>
                      <span className="text-[10px] text-amber-400 font-bold">
                        {top2.wins} برد
                      </span>
                      <div className="w-full h-11 rounded-t-xl bg-gradient-to-t from-slate-800 to-slate-700/60 border-t border-slate-300/60 flex items-center justify-center mt-1">
                        <Medal size={16} className="text-slate-300" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-11 rounded-t-xl bg-slate-800/20" />
                  )}
                </div>

                {/* #1 Rank (Gold - The Leader) */}
                <div className="flex flex-col items-center">
                  {top1 && (
                    <div className="flex flex-col items-center w-full">
                      <div className="relative mb-1">
                        <Crown size={16} className="text-amber-400 absolute -top-4 left-1/2 -translate-x-1/2 drop-shadow-[0_0_6px_#fbbf24] animate-bounce" />
                        <div className="w-14 h-14 rounded-xl ring-2 ring-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)] overflow-hidden bg-slate-800 flex items-center justify-center">
                          {top1.avatar?.startsWith("/avatars/") || top1.avatar?.startsWith("http") ? (
                            <Image src={top1.avatar} alt={top1.username} width={56} height={56} className="object-cover w-full h-full" unoptimized />
                          ) : (
                            <span className="text-2xl">{top1.avatar || "👑"}</span>
                          )}
                        </div>
                        <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-slate-950 font-black text-[10px] shadow-sm ring-1 ring-panel-deep">
                          ۱
                        </div>
                      </div>
                      <span className="font-black text-xs text-amber-300 truncate max-w-[85px] text-center">
                        {top1.username}
                      </span>
                      <span className="text-[11px] text-amber-400 font-black">
                        {top1.wins} برد 👑
                      </span>
                      <div className="w-full h-15 rounded-t-xl bg-gradient-to-t from-amber-950/80 via-amber-900/60 to-amber-700/60 border-t border-amber-400 flex items-center justify-center mt-1 shadow-md">
                        <Trophy size={18} className="text-amber-400 drop-shadow-[0_0_6px_#fbbf24]" />
                      </div>
                    </div>
                  )}
                </div>

                {/* #3 Rank (Bronze) */}
                <div className="flex flex-col items-center">
                  {top3 ? (
                    <div className="flex flex-col items-center w-full">
                      <div className="relative mb-1">
                        <div className="w-11 h-11 rounded-xl ring-2 ring-amber-700 shadow-md overflow-hidden bg-slate-800 flex items-center justify-center">
                          {top3.avatar?.startsWith("/avatars/") || top3.avatar?.startsWith("http") ? (
                            <Image src={top3.avatar} alt={top3.username} width={44} height={44} className="object-cover w-full h-full" unoptimized />
                          ) : (
                            <span className="text-xl">{top3.avatar || "👤"}</span>
                          )}
                        </div>
                        <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-700 text-white font-bold text-[10px] shadow-sm ring-1 ring-panel-deep">
                          ۳
                        </div>
                      </div>
                      <span className="font-bold text-[11px] text-on-surface truncate max-w-[75px] text-center">
                        {top3.username}
                      </span>
                      <span className="text-[10px] text-amber-600 font-bold">
                        {top3.wins} برد
                      </span>
                      <div className="w-full h-9 rounded-t-xl bg-gradient-to-t from-amber-950/50 to-amber-900/30 border-t border-amber-700/50 flex items-center justify-center mt-1">
                        <Medal size={15} className="text-amber-700" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-9 rounded-t-xl bg-slate-800/20" />
                  )}
                </div>
              </div>

              {/* Ranks 4 and beyond */}
              {remainingPlayers.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-muted block px-1">سایر رتبه‌ها:</span>
                  <div className="space-y-1">
                    {remainingPlayers.map((u) => {
                      const isMe = u.userId === currentUserId;
                      return (
                        <div
                          key={u.userId}
                          className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                            isMe
                              ? "bg-accent/15 border-accent shadow-sm ring-1 ring-accent/30"
                              : "bg-panel-soft/60 border-outline hover:bg-panel-soft"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="w-6 text-center font-mono font-bold text-xs text-muted">
                              #{u.rank}
                            </span>

                            <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-panel-deep border border-outline flex items-center justify-center shrink-0">
                              {u.avatar?.startsWith("/avatars/") || u.avatar?.startsWith("http") ? (
                                <Image src={u.avatar} alt={u.username} width={32} height={32} className="object-cover w-full h-full" unoptimized />
                              ) : (
                                <span className="text-sm">{u.avatar || "👤"}</span>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-on-surface truncate">
                                  {u.username}
                                </span>
                                {isMe && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-accent text-panel-deep">
                                    شما
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-muted block leading-tight">
                                Level {u.level} • XP {u.xp}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 pl-1">
                            <span className="text-xs font-bold text-amber-400 font-mono">
                              {u.wins}
                            </span>
                            <span className="text-[10px] text-muted">برد</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 4. Current User Sticky Footer (shrink-0) */}
        {myEntry && (
          <div className="px-4 py-2.5 border-t border-outline bg-panel/95 flex items-center justify-between backdrop-blur-md shrink-0">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/20 text-accent font-bold text-xs border border-accent/30">
                #{myEntry.rank}
              </span>
              <div>
                <span className="text-[11px] font-bold text-on-surface block leading-tight">جایگاه شما در این بخش</span>
                <span className="text-[10px] text-muted leading-tight">
                  {myEntry.wins} برد ثبت شده
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-accent">
                {myEntry.rank === 1
                  ? "🥇 صدرنشین جدول!"
                  : myEntry.rank <= 3
                  ? "🎉 در جمع ۳ برتر!"
                  : `رتبه #${myEntry.rank}`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
