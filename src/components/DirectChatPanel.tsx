"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Send,
  Smile,
  Swords,
  Gamepad2,
  Clock,
  Sparkles,
  CheckCheck,
} from "lucide-react";
import EmojiPicker, { type EmojiClickData, Theme as EmojiTheme, EmojiStyle } from "emoji-picker-react";
import { sounds } from "@/lib/sounds";
import type { DMMessage } from "@/components/DirectMessagesDrawer";

const CHALLENGE_GAMES = [
  { id: "connect4", title: "Connect 4", faTitle: "دوز چهارتایی", icon: "🟡" },
  { id: "battleship", title: "Battleship", faTitle: "نبرد کشتی‌ها", icon: "🚢" },
  { id: "chess", title: "Chess", faTitle: "شطرنج", icon: "♟️" },
  { id: "dots-and-boxes", title: "Dots & Boxes", faTitle: "نقطه خط", icon: "🔲" },
  { id: "uno", title: "Uno", faTitle: "اونو", icon: "🃏" },
  { id: "tic-tac-toe", title: "Tic Tac Toe", faTitle: "دوز کلاسیک", icon: "❌" },
  { id: "lockpick", title: "LockPick", faTitle: "قفل‌بازکن", icon: "🔒" },
];

type DirectChatPanelProps = {
  partner: { userId: string; username: string; avatar: string; status?: string };
  currentUserId: string;
  socket: any;
  onBackToRoom: () => void;
  roomName: string;
};

export default function DirectChatPanel({
  partner,
  currentUserId,
  socket,
  onBackToRoom,
  roomName,
}: DirectChatPanelProps) {
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGamePicker, setShowGamePicker] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  // Load message history via Socket & HTTP
  const loadHistory = useCallback(() => {
    if (!currentUserId || !partner?.userId) return;
    setLoading(true);

    // Try socket first
    if (socket?.connected) {
      socket.emit("dm:get_history", { partnerId: partner.userId }, (res: any) => {
        if (res?.history) {
          setMessages(res.history);
          setLoading(false);
          socket.emit("dm:mark_read", { partnerId: partner.userId });
        }
      });
    }

    // Fallback fetch
    fetch(`/dm/history?userId=${encodeURIComponent(currentUserId)}&partnerId=${encodeURIComponent(partner.userId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.history) {
          setMessages(data.history);
          setLoading(false);
          socket?.emit("dm:mark_read", { partnerId: partner.userId });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentUserId, partner?.userId, socket]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Realtime socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg: DMMessage) => {
      if (
        (msg.senderId === partner.userId && msg.receiverId === currentUserId) ||
        (msg.senderId === currentUserId && msg.receiverId === partner.userId)
      ) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (msg.senderId === partner.userId) {
          socket.emit("dm:mark_read", { partnerId: partner.userId });
          sounds.playPop();
        }
      }
    };

    const handleInviteUpdated = (msg: DMMessage) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, metadata: msg.metadata } : m))
      );
    };

    socket.on("dm:message", handleMessage);
    socket.on("dm:invite_updated", handleInviteUpdated);

    return () => {
      socket.off("dm:message", handleMessage);
      socket.off("dm:invite_updated", handleInviteUpdated);
    };
  }, [socket, partner.userId, currentUserId]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Close emoji on click outside
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

  const handleSend = () => {
    if (!value.trim() || !partner.userId) return;
    sounds.playPop();
    socket.emit("dm:send", {
      receiverId: partner.userId,
      content: value.trim(),
      type: "text",
    });
    setValue("");
    setShowEmoji(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSendChallenge = (game: typeof CHALLENGE_GAMES[0]) => {
    sounds.playBoxClaim();
    socket.emit("dm:send", {
      receiverId: partner.userId,
      content: `دعوت به چالش ${game.faTitle} ${game.icon}`,
      type: "game_invite",
      metadata: {
        gameId: game.id,
        gameTitle: game.title,
        status: "pending",
      },
    });
    setShowGamePicker(false);
  };

  const handleRespondInvite = (messageId: string, status: "accepted" | "declined") => {
    sounds.playPop();
    socket.emit("dm:respond_invite", { messageId, status });
  };

  return (
    <section className="flex h-full flex-col overflow-hidden bg-panel-dim animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-20 flex shrink-0 items-center justify-between border-b border-outline bg-panel-dim/90 px-6 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToRoom}
            className="flex items-center gap-1.5 rounded-xl bg-panel-soft hover:bg-panel border border-outline px-3 py-1.5 text-xs font-semibold text-muted hover:text-white transition-all group"
            title="بازگشت به چت روم"
          >
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            <span>بازگشت به {roomName}</span>
          </button>

          <div className="h-5 w-px bg-outline" />

          {/* Partner Info */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-panel-soft border border-outline text-base">
              {partner.avatar?.startsWith("/avatars/") || partner.avatar?.startsWith("http") ? (
                <Image
                  src={partner.avatar}
                  alt=""
                  width={36}
                  height={36}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : (
                partner.avatar || "👤"
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-on-surface leading-none">{partner.username}</h1>
                <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent ring-1 ring-accent/30">
                  پیام خصوصی (PV)
                </span>
              </div>
              <span className="text-[11px] text-accent flex items-center gap-1 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                آماده بازی و گفتگو
              </span>
            </div>
          </div>
        </div>

        {/* Challenge Action Button */}
        <div className="relative">
          <button
            onClick={() => setShowGamePicker((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-accent-bright to-accent text-panel-deep px-3.5 py-2 text-xs font-bold shadow-lg shadow-accent/20 hover:brightness-110 active:scale-95 transition-all"
          >
            <Swords size={15} />
            <span>چالش بازی</span>
          </button>

          {/* Challenge dropdown menu */}
          {showGamePicker && (
            <div className="absolute left-0 top-11 z-30 w-52 rounded-2xl bg-panel-deep border border-outline p-2 shadow-2xl backdrop-blur-xl animate-fade-in space-y-1">
              <span className="block px-2.5 py-1 text-[10px] font-bold text-muted uppercase">
                انتخاب بازی دو نفره:
              </span>
              {CHALLENGE_GAMES.map((game) => (
                <button
                  key={game.id}
                  onClick={() => handleSendChallenge(game)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-right text-xs font-medium text-on-surface hover:bg-white/10 transition-colors"
                >
                  <span className="text-lg">{game.icon}</span>
                  <span className="font-semibold">{game.faTitle}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="scrollbar-hidden flex-1 min-h-0 space-y-4 overflow-y-auto p-4 lg:p-6" dir="ltr">
        {loading ? (
          <div className="flex h-full items-center justify-center text-xs text-muted">
            در حال بارگذاری پیام‌ها...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-8 text-muted/60 space-y-2">
            <Sparkles size={28} className="text-accent/60" />
            <p className="text-sm font-bold text-on-surface">آغاز گفتگوی خصوصی با {partner.username}</p>
            <p className="text-xs">پیام بدهید یا با زدن دکمه «چالش بازی» مسابقه دونفره را شروع کنید!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isMine = message.senderId === currentUserId;

            if (message.type === "game_invite") {
              const status = message.metadata?.status || "pending";
              return (
                <div key={message.id} className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[85%] md:max-w-[420px] rounded-2xl bg-gradient-to-br from-panel-soft to-panel border border-accent/40 p-4 shadow-xl">
                    <div className="flex items-center gap-2 text-accent text-xs font-bold mb-2">
                      <Gamepad2 size={18} />
                      <span>چالش دو نفره {message.metadata?.gameTitle}</span>
                    </div>
                    <p className="text-xs text-on-surface mb-3 leading-relaxed">{message.content}</p>

                    {status === "pending" ? (
                      !isMine ? (
                        <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                          <button
                            onClick={() => handleRespondInvite(message.id, "accepted")}
                            className="flex-1 rounded-xl bg-accent px-4 py-2 text-xs font-black text-black hover:brightness-110 shadow-md shadow-accent/20 transition-all"
                          >
                            پذیرش چالش ⚔️
                          </button>
                          <button
                            onClick={() => handleRespondInvite(message.id, "declined")}
                            className="rounded-xl bg-panel-deep px-3 py-2 text-xs font-medium text-muted hover:text-white transition-all"
                          >
                            رد
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-muted font-medium pt-1 border-t border-white/5">
                          <Clock size={13} className="animate-spin text-accent" />
                          <span>منتظر پاسخ {partner.username}...</span>
                        </div>
                      )
                    ) : status === "accepted" ? (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 pt-1 border-t border-white/5">
                        <span>✓ چالش پذیرفته شد — بازی در حال اجراست!</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-rose-400/80 pt-1 border-t border-white/5">
                        <span>✗ چالش رد شد.</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div key={message.id} className={`flex ${isMine ? "justify-end" : "items-start gap-3"}`}>
                {!isMine && (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-outline bg-panel-soft text-sm">
                    {partner.avatar?.startsWith("/avatars/") || partner.avatar?.startsWith("http") ? (
                      <Image src={partner.avatar} alt="" width={36} height={36} unoptimized className="h-full w-full object-cover" />
                    ) : (
                      <span>{partner.avatar || "👤"}</span>
                    )}
                  </div>
                )}
                <div className={`min-w-0 ${isMine ? "max-w-[75%]" : "flex-1"}`}>
                  {!isMine && (
                    <div className="mb-1 flex items-center gap-2">
                      <p className="text-xs font-bold text-on-surface">{partner.username}</p>
                      <span className="text-[10px] text-muted/60">
                        {message.createdAt
                          ? new Date(message.createdAt).toLocaleTimeString("fa-IR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </span>
                    </div>
                  )}

                  <div
                    className={`inline-block max-w-full px-4 py-2.5 text-[14px] leading-relaxed border ${
                      isMine
                        ? "rounded-2xl rounded-tr-none bg-panel border-outline text-on-surface"
                        : "rounded-2xl rounded-tl-none bg-panel-soft border-outline text-on-surface"
                    }`}
                  >
                    <p className="break-words">{message.content}</p>
                    {isMine && (
                      <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-muted">
                        <span>
                          {message.createdAt
                            ? new Date(message.createdAt).toLocaleTimeString("fa-IR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                        <CheckCheck size={12} className={message.isRead ? "text-accent" : "text-muted/60"} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input bar */}
      <div className="sticky bottom-0 z-20 border-t border-outline bg-panel-dim/95 p-4 backdrop-blur-md relative">
        {showEmoji && (
          <div ref={emojiRef} className="absolute bottom-16 right-4 z-30 shadow-2xl">
            <EmojiPicker
              onEmojiClick={(emoji: EmojiClickData) => setValue((prev) => prev + emoji.emoji)}
              theme={EmojiTheme.DARK}
              emojiStyle={EmojiStyle.NATIVE}
              width={300}
              height={360}
              searchPlaceHolder="جستجوی ایموجی..."
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEmoji((prev) => !prev)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-panel-soft hover:bg-panel text-muted hover:text-white border border-outline transition-colors"
          >
            <Smile size={18} />
          </button>

          <input
            type="text"
            placeholder={`پیام به ${partner.username}...`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 rounded-xl border border-outline bg-panel-soft px-4 py-3 text-[14px] text-on-surface placeholder:text-muted/60 outline-none transition-colors focus:border-accent"
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={!value.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-bright text-panel-deep transition-all duration-200 hover:brightness-110 active:scale-90 disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
