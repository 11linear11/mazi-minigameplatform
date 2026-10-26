"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Smile, Send, Gamepad2, Users, Hash, X, Film, Sparkles, Star, CheckSquare, Settings } from "lucide-react";
import EmojiPicker, { type EmojiClickData, Theme as EmojiTheme, EmojiStyle } from "emoji-picker-react";
import type { Message } from "@/data/mock";

type ChatPanelProps = {
  messages: Message[];
  onSend: (content: string) => void;
  onJoinGame: (sessionId?: string) => void;
  onOpenGame: () => void;
  onOpenCinema?: () => void;
  onOpenCinemaHub?: () => void;
  onOpenTodos?: () => void;
  onOpenSettings?: () => void;
  isOwner?: boolean;
  isAdmin?: boolean;
  activeSessionId?: string | null;
  userInActiveGame: boolean;
  roomName: string;
  roomTopic: string;
  onlineCount: number;
  currentUserId?: string | null;
};

export default function ChatPanel({
  messages,
  onSend,
  onJoinGame,
  onOpenGame,
  onOpenCinema,
  onOpenCinemaHub,
  onOpenTodos,
  onOpenSettings,
  isOwner,
  isAdmin,
  activeSessionId,
  roomName,
  roomTopic,
  onlineCount,
  userInActiveGame,
  currentUserId,
}: ChatPanelProps) {
  const [value, setValue] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!showEmoji) return;
    const handleClick = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showEmoji]);

  const handleEmojiSelect = useCallback((emoji: EmojiClickData) => {
    setValue((prev) => prev + emoji.emoji);
  }, []);

  const handleSend = () => {
    if (!value.trim()) return;
    onSend(value.trim());
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <section className="flex h-full flex-col overflow-hidden bg-panel-dim/95">
      {/* Desktop Header */}
      <header className="sticky top-0 z-20 hidden shrink-0 items-center justify-between border-b border-outline bg-panel-dim/80 px-6 py-3.5 backdrop-blur-xl lg:flex">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 border border-accent/20 text-accent shadow-sm">
            <Hash size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-on-surface leading-none">{roomName}</h1>
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-online" />
                {onlineCount} آنلاین
              </span>
            </div>
            <p className="text-[12px] text-muted mt-1 max-w-md truncate">{roomTopic}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenCinemaHub && (
            <button
              type="button"
              onClick={onOpenCinemaHub}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-400/30 text-xs font-bold transition-all shadow-sm hover:scale-105 active:scale-95"
              title="سینماتک، ویش‌لیست و نمره‌دهی به فیلم‌ها"
            >
              <Star size={14} className="text-amber-400 fill-amber-400" />
              <span>فیلم‌ها و ویش‌لیست 🎬</span>
            </button>
          )}

          {onOpenTodos && (
            <button
              type="button"
              onClick={onOpenTodos}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-400/30 text-xs font-bold transition-all shadow-sm hover:scale-105 active:scale-95"
              title="مدیریت کارهای گروهی روم"
            >
              <CheckSquare size={14} className="text-emerald-400" />
              <span>کارهای روم 📋</span>
            </button>
          )}

          {onOpenCinema && (
            <button
              type="button"
              onClick={onOpenCinema}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-panel-soft hover:bg-panel-high text-muted hover:text-on-surface border border-outline text-xs font-bold transition-all shadow-sm hover:scale-105 active:scale-95"
              title="سینما روم (تماشای همزمان فیلم)"
            >
              <Film size={14} className="text-purple-400" />
              <span>پخش زنده</span>
            </button>
          )}

          {(isOwner || isAdmin) && onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center justify-center h-9 w-9 rounded-xl bg-panel-soft hover:bg-panel-high text-muted hover:text-on-surface border border-outline transition-all shadow-sm hover:scale-105 active:scale-95"
              title="تنظیمات روم"
            >
              <Settings size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Messages Feed (RTL) */}
      <div ref={scrollRef} className="scrollbar-hidden flex-1 min-h-0 space-y-4 overflow-y-auto p-4 lg:p-6" dir="rtl">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center opacity-60">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-panel-soft border border-outline">
              <Sparkles size={24} className="text-accent" />
            </div>
            <p className="text-sm font-semibold text-on-surface">هنوز پیامی ارسال نشده است</p>
            <p className="text-xs text-muted">اولین پیامت رو بفرست تا گفتگو شروع بشه!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isMine = message.userId === currentUserId;
            return message.isSystem ? (
              <div key={message.id} className="msg-enter text-center my-6">
                <span className="inline-block rounded-full border border-outline bg-panel-soft/60 px-4 py-1.5 text-[12px] text-muted backdrop-blur-sm">
                  {message.content}
                </span>
              </div>
            ) : (
              <div
                key={message.id}
                className={`msg-enter flex items-end gap-2.5 ${
                  isMine ? "justify-start flex-row-reverse" : "justify-start"
                }`}
              >
                {!isMine && (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-outline bg-panel-soft text-sm shadow-sm">
                    {message.avatar &&
                    (message.avatar.startsWith("/avatars/") || message.avatar.startsWith("http")) ? (
                      <Image src={message.avatar} alt="" width={36} height={36} unoptimized className="h-full w-full object-cover" />
                    ) : (
                      <span>{message.avatar}</span>
                    )}
                  </div>
                )}
                <div className={`min-w-0 ${isMine ? "max-w-[78%]" : "max-w-[78%]"}`}>
                  {!isMine && (
                    <div className="mb-1 flex items-center gap-2">
                      <p className="text-[12px] font-bold text-accent">{message.user}</p>
                      <span className="text-[10px] text-muted/60">{message.time}</span>
                    </div>
                  )}

                  {!message.isGameCard ? (
                    <div
                      className={`inline-block px-4 py-2.5 text-[14px] leading-relaxed break-words shadow-sm ${
                        isMine
                          ? "rounded-2xl rounded-bl-sm bg-gradient-to-l from-amber-500/25 to-amber-600/15 border border-amber-400/30 text-white"
                          : "rounded-2xl rounded-br-sm bg-panel-soft/90 border border-outline text-slate-100 backdrop-blur-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      {isMine && (
                        <div className="mt-1 flex justify-end">
                          <span className="text-[9px] text-amber-200/50">{message.time}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-accent/30 bg-panel-soft/90 shadow-lg glow-accent max-w-sm">
                      <div className="flex h-[130px]">
                        <div className="flex w-[110px] shrink-0 items-center justify-center bg-gradient-to-br from-accent/20 to-accent/5 border-l border-outline">
                          <Gamepad2 size={40} className="text-accent animate-pulse-soft" />
                        </div>
                        <div className="flex flex-1 flex-col justify-between p-3.5">
                          <div>
                            <p className="text-[15px] font-bold text-on-surface">{message.gameTitle}</p>
                            <p className="mt-0.5 text-[11px] text-muted line-clamp-1">{message.content}</p>
                            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
                              <Users size={12} />
                              <span>{message.players ?? "?"} بازیکن</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {message.gameStatus === "ended" ? (
                              <button
                                className="rounded-lg bg-panel-deep px-3.5 py-1.5 text-xs font-medium text-muted/60"
                                disabled
                              >
                                پایان یافته
                              </button>
                            ) : userInActiveGame &&
                              (message as any).sessionId === activeSessionId ? (
                              <button
                                onClick={onOpenGame}
                                className="rounded-lg border border-accent/30 bg-accent/20 px-4 py-1.5 text-xs font-bold text-accent transition-all duration-200 hover:brightness-125"
                              >
                                باز کردن بازی
                              </button>
                            ) : (message as any).sessionId ? (
                              <button
                                onClick={() => onJoinGame((message as any).sessionId)}
                                className="rounded-lg bg-accent-bright px-4 py-1.5 text-xs font-bold text-panel-deep transition-all duration-200 hover:brightness-110 shadow-sm"
                              >
                                ورود به بازی
                              </button>
                            ) : (
                              <button
                                className="rounded-lg bg-panel-deep px-3.5 py-1.5 text-xs font-medium text-muted/60"
                                disabled
                              >
                                ورود به بازی
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input bar */}
      <footer
        className="shrink-0 border-t border-outline bg-panel-dim p-3 lg:p-4 backdrop-blur-xl relative z-10"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 12px))" }}
        ref={emojiRef}
      >
        {showEmoji && (
          <div className="absolute bottom-full right-4 mb-3 z-50 shadow-2xl rounded-2xl overflow-hidden border border-outline" dir="ltr">
            <EmojiPicker
              onEmojiClick={handleEmojiSelect}
              theme={EmojiTheme.DARK}
              emojiStyle={EmojiStyle.NATIVE}
              width={320}
              height={360}
              searchPlaceHolder="جستجوی ایموجی..."
              previewConfig={{ showPreview: false }}
            />
          </div>
        )}
        <div className="relative mx-auto max-w-4xl">
          <div className="absolute right-3.5 top-1/2 z-10 -translate-y-1/2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEmoji((prev) => !prev)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-accent hover:bg-panel-soft transition-all"
              title="انتخاب ایموجی"
            >
              {showEmoji ? <X size={18} className="text-accent" /> : <Smile size={18} />}
            </button>
          </div>
          <input
            className="w-full rounded-2xl border border-outline bg-panel-deep/90 py-3.5 pl-14 pr-12 text-[14px] text-on-surface placeholder:text-muted/50 outline-none transition-all duration-200 focus:border-accent/40 focus:ring-1 focus:ring-accent/30 shadow-inner"
            placeholder="پیامی بنویسید... (Enter برای ارسال)"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!value.trim()}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-xl bg-accent-bright text-panel-deep transition-all duration-200 hover:brightness-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed glow-accent shadow-md"
            title="ارسال پیام"
          >
            <Send size={15} className="rotate-180" />
          </button>
        </div>
      </footer>
    </section>
  );
}
