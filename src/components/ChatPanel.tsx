"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Smile, Banana, Gamepad2, Users, Hash, X } from "lucide-react";
import EmojiPicker, { type EmojiClickData, Theme as EmojiTheme, EmojiStyle } from "emoji-picker-react";
import type { Message } from "@/data/mock";

type ChatPanelProps = {
  messages: Message[];
  onSend: (content: string) => void;
  onJoinGame: (sessionId?: string) => void;
  onOpenGame: () => void;
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
    <section className="flex h-full flex-col overflow-hidden bg-panel-dim">
      <header className="sticky top-0 z-20 hidden shrink-0 items-center justify-between border-b border-outline bg-panel-dim/80 px-8 py-4 backdrop-blur-md lg:flex">
        <div className="flex items-center gap-4">
          <Hash size={20} className="text-accent shrink-0" />
          <div>
            <h1 className="text-lg font-bold text-on-surface leading-none">{roomName}</h1>
            <p className="text-[13px] text-muted mt-0.5">{roomTopic}</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-outline bg-panel px-3 py-1">
            <div className="h-2 w-2 rounded-full bg-accent pulse-online" />
            <span className="text-label-sm text-accent">{onlineCount} آنلاین</span>
          </div>
          <div className="rounded-md border border-accent/20 bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">REALTIME</div>
        </div>
      </header>

      <div ref={scrollRef} className="scrollbar-hidden flex-1 min-h-0 space-y-6 overflow-y-auto p-4 lg:p-8" dir="ltr">
        {messages.map((message) => {
          const isMine = message.userId === currentUserId;
          return message.isSystem ? (
            <div key={message.id} className="msg-enter text-center my-10">
              <span className="inline-block rounded-full border border-outline bg-panel-soft px-4 py-1.5 text-[12px] text-muted">
                {message.content}
              </span>
            </div>
          ) : (
            <div key={message.id} className={`msg-enter flex ${isMine ? "justify-end" : "items-start gap-4"}`}>
              {!isMine && (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-outline bg-panel-soft text-base">
                  {message.avatar &&
                  (message.avatar.startsWith("/avatars/") || message.avatar.startsWith("http")) ? (
                    <img src={message.avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-base">{message.avatar}</span>
                  )}
                </div>
              )}
              <div className={`min-w-0 ${isMine ? "max-w-[75%]" : "flex-1"}`}>
                {!isMine && (
                  <div className="mb-1 flex items-center gap-2">
                    <p className="text-[13px] font-bold text-on-surface">{message.user}</p>
                    <span className="text-[10px] text-muted/60">{message.time}</span>
                  </div>
                )}

                {!message.isGameCard ? (
                  <div className={`inline-block max-w-full px-4 py-2.5 text-[14px] leading-relaxed text-on-surface border border-outline ${
                    isMine
                      ? "rounded-2xl rounded-tr-none bg-panel"
                      : "rounded-2xl rounded-tl-none bg-panel-soft"
                  }`}>
                    {message.content}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-outline bg-panel-soft glow-accent">
                    <div className="flex h-[150px]">
                      <div className="flex w-[120px] shrink-0 items-center justify-center bg-gradient-to-br from-accent/20 to-accent/5">
                        <Gamepad2 size={44} className="text-accent/40" />
                      </div>
                      <div className="flex flex-1 flex-col justify-between p-4">
                        <div>
                          <p className="text-[16px] font-bold text-on-surface">{message.gameTitle}</p>
                          <p className="mt-0.5 text-[12px] text-muted">
                            {message.content}
                          </p>
                          <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-muted">
                            <Users size={13} />
                            <span>{message.players ?? "?"} بازیکن</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {message.gameStatus === "ended" ? (
                            <button
                              className="rounded-lg bg-panel-deep px-4 py-2 text-[13px] font-medium text-muted/60"
                              disabled
                            >
                              تموم شده
                            </button>
                          ) : userInActiveGame &&
                            (message as any).sessionId === activeSessionId ? (
                            <button
                              onClick={onOpenGame}
                              className="rounded-lg border border-accent/20 bg-accent/15 px-5 py-2 text-[13px] font-bold text-accent transition-all duration-200 hover:brightness-110"
                            >
                              باز کردن بازی
                            </button>
                          ) : (message as any).sessionId ? (
                            <button
                              onClick={() => onJoinGame((message as any).sessionId)}
                              className="rounded-lg bg-accent-bright px-5 py-2 text-[13px] font-bold text-panel-deep transition-all duration-200 hover:brightness-110"
                            >
                              ورود به بازی
                            </button>
                          ) : (
                            <button
                              className="rounded-lg bg-panel-deep px-4 py-2 text-[13px] font-medium text-muted/60"
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
        })}
      </div>

      <footer className="shrink-0 border-t border-outline bg-panel-dim/80 p-4 lg:p-6 backdrop-blur-md" ref={emojiRef}>
        {showEmoji && (
          <div className="absolute bottom-full right-0 mb-3 z-50" dir="ltr">
            <EmojiPicker
              onEmojiClick={handleEmojiSelect}
              theme={EmojiTheme.DARK}
              emojiStyle={EmojiStyle.NATIVE}
              width={300}
              height={350}
              searchPlaceHolder="جستجوی ایموجی..."
              previewConfig={{ showPreview: false }}
            />
          </div>
        )}
        <div className="relative mx-auto max-w-4xl">
          <div className="absolute right-4 top-1/2 z-10 -translate-y-1/2 flex items-center gap-2">
            <button
              onClick={() => setShowEmoji((prev) => !prev)}
              className="text-muted hover:text-accent transition-colors"
            >
              {showEmoji ? (
                <X size={20} className="text-accent" />
              ) : (
                <Smile size={20} />
              )}
            </button>
          </div>
          <input
            className="w-full rounded-2xl border border-outline bg-panel-deep py-4 pl-14 pr-16 text-[14px] text-on-surface placeholder:text-muted/60 outline-none transition-all focus:border-accent"
            placeholder="چی میخوای بگی؟"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={handleSend}
            disabled={!value.trim()}
            className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-bright text-panel-deep transition-all duration-200 hover:brightness-110 active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed glow-accent"
          >
            <Banana size={18} />
          </button>
        </div>
      </footer>
    </section>
  );
}
