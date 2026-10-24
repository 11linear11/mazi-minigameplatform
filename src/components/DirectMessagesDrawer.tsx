"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import {
  MessageSquare,
  X,
  Send,
  Smile,
  Swords,
  ChevronRight,
  Search,
  CheckCheck,
  Gamepad2,
  Clock,
  Sparkles,
} from "lucide-react";
import EmojiPicker, { type EmojiClickData, Theme as EmojiTheme, EmojiStyle } from "emoji-picker-react";
import { sounds } from "@/lib/sounds";

export type DMMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: "text" | "game_invite";
  metadata?: {
    gameId?: string;
    gameTitle?: string;
    status?: "pending" | "accepted" | "declined" | "expired";
  };
  isRead: boolean;
  createdAt: string;
};

export type DMConversation = {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string;
  partnerStatus: string;
  lastMessage: DMMessage | null;
  unreadCount: number;
  updatedAt: string | null;
};

const CHALLENGE_GAMES = [
  { id: "chess", title: "Chess", faTitle: "شطرنج", icon: "♟️" },
  { id: "dots-and-boxes", title: "Dots & Boxes", faTitle: "نقطه خط", icon: "🔲" },
  { id: "uno", title: "Uno", faTitle: "اونو", icon: "🃏" },
  { id: "tic-tac-toe", title: "Tic Tac Toe", faTitle: "دوز کلاسیک", icon: "❌" },
  { id: "lockpick", title: "LockPick", faTitle: "قفل‌بازکن", icon: "🔒" },
];

type DirectMessagesDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string;
  socket: any;
  targetUser?: { userId: string; username: string; avatar: string } | null;
  onClearTargetUser?: () => void;
  roomMembers?: Array<{ id: string; name: string; avatar?: string; status?: string }>;
};

export default function DirectMessagesDrawer({
  isOpen,
  onClose,
  currentUserId,
  socket,
  targetUser,
  onClearTargetUser,
  roomMembers = [],
}: DirectMessagesDrawerProps) {
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<{
    userId: string;
    username: string;
    avatar: string;
  } | null>(null);
  const [history, setHistory] = useState<DMMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGamePicker, setShowGamePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const selectedPartnerRef = useRef(selectedPartner);
  selectedPartnerRef.current = selectedPartner;

  // Fetch conversations list
  const loadConversations = useCallback(() => {
    if (!currentUserId) return;
    fetch(`/dm/conversations?userId=${encodeURIComponent(currentUserId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.conversations) {
          setConversations(data.conversations);
        }
      })
      .catch(() => {});
  }, [currentUserId]);

  // Handle targetUser prop changes (opening PV directly with someone)
  useEffect(() => {
    if (targetUser && targetUser.userId !== currentUserId) {
      setSelectedPartner({
        userId: targetUser.userId,
        username: targetUser.username,
        avatar: targetUser.avatar,
      });
      if (onClearTargetUser) onClearTargetUser();
    }
  }, [targetUser, currentUserId, onClearTargetUser]);

  // Load conversations when drawer opens
  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen, loadConversations]);

  // Fetch message history when selectedPartner changes
  useEffect(() => {
    if (!selectedPartner || !currentUserId) {
      setHistory([]);
      return;
    }
    setLoadingHistory(true);
    fetch(
      `/dm/history?userId=${encodeURIComponent(currentUserId)}&partnerId=${encodeURIComponent(
        selectedPartner.userId
      )}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.history) {
          setHistory(data.history);
          // Mark as read
          socket.emit("dm:mark_read", { partnerId: selectedPartner.userId });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [selectedPartner, currentUserId, socket]);

  // Socket event listeners for incoming DMs
  useEffect(() => {
    if (!socket) return;

    const handleDMMessage = (msg: DMMessage) => {
      const activePartnerId = selectedPartnerRef.current?.userId;
      if (
        (msg.senderId === activePartnerId && msg.receiverId === currentUserId) ||
        (msg.senderId === currentUserId && msg.receiverId === activePartnerId)
      ) {
        setHistory((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (msg.senderId === activePartnerId) {
          socket.emit("dm:mark_read", { partnerId: activePartnerId });
          sounds.playPop();
        }
      }
      loadConversations();
    };

    const handleInviteUpdated = (msg: DMMessage) => {
      setHistory((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, metadata: msg.metadata } : m))
      );
    };

    socket.on("dm:message", handleDMMessage);
    socket.on("dm:invite_updated", handleInviteUpdated);

    return () => {
      socket.off("dm:message", handleDMMessage);
      socket.off("dm:invite_updated", handleInviteUpdated);
    };
  }, [socket, currentUserId, loadConversations]);

  // Scroll to bottom on new history
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  // Close emoji picker on click outside
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

  const handleSendMessage = () => {
    if (!inputText.trim() || !selectedPartner) return;
    sounds.playPop();
    socket.emit("dm:send", {
      receiverId: selectedPartner.userId,
      content: inputText.trim(),
      type: "text",
    });
    setInputText("");
    setShowEmoji(false);
  };

  const handleSendGameChallenge = (game: typeof CHALLENGE_GAMES[0]) => {
    if (!selectedPartner) return;
    sounds.playBoxClaim();
    socket.emit("dm:send", {
      receiverId: selectedPartner.userId,
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

  const handleEmojiSelect = (emoji: EmojiClickData) => {
    setInputText((prev) => prev + emoji.emoji);
  };

  if (!isOpen) return null;

  // Filter conversations
  const filteredConvos = conversations.filter((c) =>
    c.partnerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Available other online users to start a chat with
  const availableUsers = roomMembers.filter(
    (m) =>
      m.id !== currentUserId &&
      !conversations.some((c) => c.partnerId === m.id) &&
      m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative flex h-full w-full max-w-md flex-col bg-panel border-r border-white/10 shadow-2xl transition-all duration-300">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-panel-deep/80">
          <div className="flex items-center gap-3">
            {selectedPartner ? (
              <button
                onClick={() => setSelectedPartner(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-colors"
                title="بازگشت به لیست گفتگوها"
              >
                <ChevronRight size={18} />
              </button>
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/20 text-accent">
                <MessageSquare size={18} />
              </div>
            )}
            <div>
              <h2 className="text-sm font-bold text-on-surface">
                {selectedPartner ? selectedPartner.username : "پیام‌های خصوصی (PV)"}
              </h2>
              <p className="text-[11px] text-muted">
                {selectedPartner ? "چت و دوئل دو نفره" : "گفتگوهای زنده و چالش‌های دوستان"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        {!selectedPartner ? (
          /* CONVERSATIONS LIST VIEW */
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Search */}
            <div className="p-4 border-b border-white/5 bg-panel-deep/40">
              <div className="relative flex items-center">
                <Search size={15} className="absolute right-3 text-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="جستجوی کاربر یا گفتگو..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl bg-black/30 border border-white/10 pr-9 pl-4 py-2 text-xs text-white placeholder-muted/60 focus:border-accent/50 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* Recent Conversations */}
              <div>
                <span className="text-[11px] font-semibold text-muted px-2 uppercase tracking-wider">
                  گفتگوهای اخیر ({filteredConvos.length})
                </span>
                <div className="mt-2 space-y-1">
                  {filteredConvos.length > 0 ? (
                    filteredConvos.map((convo) => (
                      <button
                        key={convo.partnerId}
                        onClick={() =>
                          setSelectedPartner({
                            userId: convo.partnerId,
                            username: convo.partnerName,
                            avatar: convo.partnerAvatar,
                          })
                        }
                        className="flex w-full items-center justify-between gap-3 rounded-xl p-3 text-right hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-panel-highest text-base font-bold ring-1 ring-white/10 overflow-hidden">
                            {convo.partnerAvatar &&
                            (convo.partnerAvatar.startsWith("/avatars/") ||
                              convo.partnerAvatar.startsWith("http")) ? (
                              <Image
                                src={convo.partnerAvatar}
                                alt=""
                                width={40}
                                height={40}
                                unoptimized
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              convo.partnerAvatar || "👤"
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-on-surface truncate group-hover:text-accent transition-colors">
                                {convo.partnerName}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted truncate mt-0.5">
                              {convo.lastMessage
                                ? convo.lastMessage.type === "game_invite"
                                  ? `⚔️ چالش ${convo.lastMessage.metadata?.gameTitle || "بازی"}`
                                  : convo.lastMessage.content
                                : "شروع گفتگو..."}
                            </p>
                          </div>
                        </div>

                        {convo.unreadCount > 0 && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-black text-black shadow-lg shadow-accent/30 animate-pulse">
                            {convo.unreadCount}
                          </span>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-muted/60">
                      هیچ گفتگویی یافت نشد.
                    </div>
                  )}
                </div>
              </div>

              {/* Online Users to start chatting */}
              {availableUsers.length > 0 && (
                <div className="pt-2 border-t border-white/5">
                  <span className="text-[11px] font-semibold text-muted px-2 uppercase tracking-wider">
                    سایر افراد آنلاین در روم ({availableUsers.length})
                  </span>
                  <div className="mt-2 space-y-1">
                    {availableUsers.map((member) => (
                      <button
                        key={member.id}
                        onClick={() =>
                          setSelectedPartner({
                            userId: member.id,
                            username: member.name,
                            avatar: member.avatar || "👤",
                          })
                        }
                        className="flex w-full items-center justify-between gap-3 rounded-xl p-2.5 text-right hover:bg-white/5 border border-transparent hover:border-white/5 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-panel-highest text-sm ring-1 ring-white/10">
                            {member.avatar || "👤"}
                          </div>
                          <span className="text-xs font-medium text-on-surface">{member.name}</span>
                        </div>
                        <span className="text-[11px] text-accent font-semibold flex items-center gap-1">
                          <MessageSquare size={12} />
                          پیام
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ACTIVE 1-ON-1 CHAT WINDOW */
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Top Bar Actions */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-panel-deep/50 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-panel-highest text-sm">
                  {selectedPartner.avatar?.startsWith("/avatars/") ? (
                    <Image
                      src={selectedPartner.avatar}
                      alt=""
                      width={32}
                      height={32}
                      unoptimized
                      className="h-full w-full object-cover rounded-lg"
                    />
                  ) : (
                    selectedPartner.avatar || "👤"
                  )}
                </div>
                <div>
                  <span className="text-xs font-bold text-on-surface block">
                    {selectedPartner.username}
                  </span>
                  <span className="text-[10px] text-accent flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                    آنلاین
                  </span>
                </div>
              </div>

              {/* Challenge Button */}
              <div className="relative">
                <button
                  onClick={() => setShowGamePicker((prev) => !prev)}
                  className="flex items-center gap-1.5 rounded-xl bg-accent/20 px-3 py-1.5 text-xs font-bold text-accent ring-1 ring-accent/40 hover:bg-accent/30 transition-all shadow-md shadow-accent/10"
                >
                  <Swords size={14} />
                  <span>دعوت به بازی</span>
                </button>

                {/* Challenge Dropdown */}
                {showGamePicker && (
                  <div className="absolute left-0 top-10 z-20 w-48 rounded-xl bg-panel-deep border border-white/10 p-2 shadow-2xl backdrop-blur-xl animate-fade-in space-y-1">
                    <span className="block px-2 py-1 text-[10px] font-bold text-muted uppercase">
                      انتخاب بازی برای چالش:
                    </span>
                    {CHALLENGE_GAMES.map((game) => (
                      <button
                        key={game.id}
                        onClick={() => handleSendGameChallenge(game)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-right text-xs font-medium text-on-surface hover:bg-white/10 transition-colors"
                      >
                        <span className="text-base">{game.icon}</span>
                        <span>{game.faTitle}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Chat Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingHistory ? (
                <div className="flex h-full items-center justify-center text-xs text-muted">
                  در حال دریافت پیام‌ها...
                </div>
              ) : history.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center p-6 text-muted/60 space-y-2">
                  <Sparkles size={24} className="text-accent/60" />
                  <p className="text-xs">هنوز پیامی رد و بدل نشده است.</p>
                  <p className="text-[11px]">یک پیام بنویسید یا حریف را به یک دوئل هیجان‌انگیز دعوت کنید!</p>
                </div>
              ) : (
                history.map((msg) => {
                  const isMine = msg.senderId === currentUserId;

                  if (msg.type === "game_invite") {
                    const status = msg.metadata?.status || "pending";
                    return (
                      <div
                        key={msg.id}
                        className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div className="max-w-[85%] rounded-2xl bg-gradient-to-br from-panel-highest to-panel-deep border border-accent/30 p-3.5 shadow-xl">
                          <div className="flex items-center gap-2 text-accent text-xs font-bold mb-1.5">
                            <Gamepad2 size={16} />
                            <span>چالش دو نفره {msg.metadata?.gameTitle}</span>
                          </div>
                          <p className="text-xs text-on-surface mb-3">{msg.content}</p>

                          {/* Action Buttons */}
                          {status === "pending" ? (
                            !isMine ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleRespondInvite(msg.id, "accepted")}
                                  className="flex-1 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-black hover:brightness-110 shadow-md shadow-accent/20 transition-all"
                                >
                                  پذیرش چالش ⚔️
                                </button>
                                <button
                                  onClick={() => handleRespondInvite(msg.id, "declined")}
                                  className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-medium text-muted hover:text-white transition-all"
                                >
                                  رد
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-[11px] text-muted font-medium">
                                <Clock size={12} className="animate-spin" />
                                <span>در انتظار پاسخ حریف...</span>
                              </div>
                            )
                          ) : status === "accepted" ? (
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                              <span>✓ چالش پذیرفته شد — شروع بازی!</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[11px] font-medium text-rose-400/80">
                              <span>✗ چالش رد شد.</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-md break-words ${
                          isMine
                            ? "bg-accent-bright text-panel-deep font-medium rounded-br-none"
                            : "bg-panel-highest text-on-surface border border-white/5 rounded-bl-none"
                        }`}
                      >
                        <p className="leading-relaxed">{msg.content}</p>
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                            isMine ? "text-panel-deep/70" : "text-muted"
                          }`}
                        >
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString("fa-IR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isMine && <CheckCheck size={11} className={msg.isRead ? "text-sky-800" : ""} />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-panel-deep/80 border-t border-white/10 relative">
              {showEmoji && (
                <div ref={emojiRef} className="absolute bottom-16 right-4 z-30 shadow-2xl">
                  <EmojiPicker
                    onEmojiClick={handleEmojiSelect}
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
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-colors"
                >
                  <Smile size={18} />
                </button>

                <input
                  type="text"
                  placeholder="پیام خصوصی شما..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-xs text-white placeholder-muted/60 focus:border-accent/50 focus:outline-none transition-colors"
                />

                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!inputText.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-black disabled:opacity-30 disabled:hover:brightness-100 hover:brightness-110 shadow-lg shadow-accent/20 transition-all"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
