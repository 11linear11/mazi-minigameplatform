import { useMemo, useState } from "react";
import Image from "next/image";
import { Search, Plus, Hash, Lock, TimerIcon, Users, Settings, Award, Gamepad2, MessageSquare, Trophy } from "lucide-react";
import type { Profile, Room } from "@/data/mock";
import type { DMConversation } from "@/components/DirectMessagesDrawer";

type RoomListProps = {
  rooms: Room[];
  selectedRoomId?: string;
  onSelect: (roomId: string) => void;
  onCreateRoom: () => void;
  isAdmin?: boolean;
  onAdminGames?: () => void;
  onOpenLeaderboard?: () => void;
  currentUser?: (Profile & { avatar: string }) | null;
  onOpenProfile?: () => void;
  unreadRoomIds?: Set<string>;
  activeTab?: "rooms" | "dm";
  onTabChange?: (tab: "rooms" | "dm") => void;
  conversations?: DMConversation[];
  activeDMUserId?: string | null;
  onSelectDM?: (partner: { userId: string; username: string; avatar: string }) => void;
  totalUnreadDMs?: number;
};

const privacyIcon: Record<string, React.ReactNode> = {
  public: <Hash size={14} />,
  private: <Lock size={14} />,
  temporary: <TimerIcon size={14} />,
};

const privacyLabel: Record<string, string> = {
  public: "عمومی",
  private: "خصوصی",
  temporary: "موقت",
};

export default function RoomList({
  rooms,
  selectedRoomId,
  onSelect,
  onCreateRoom,
  isAdmin,
  onAdminGames,
  onOpenLeaderboard,
  currentUser,
  onOpenProfile,
  unreadRoomIds,
  activeTab = "rooms",
  onTabChange,
  conversations = [],
  activeDMUserId,
  onSelectDM,
  totalUnreadDMs = 0,
}: RoomListProps) {
  const [query, setQuery] = useState("");

  const filteredRooms = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rooms;
    return rooms.filter((room) =>
      [room.name, room.topic].some((val) => val.toLowerCase().includes(normalized)),
    );
  }, [query, rooms]);

  const filteredConvos = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return conversations;
    return conversations.filter((c) =>
      c.partnerName.toLowerCase().includes(normalized)
    );
  }, [query, conversations]);

  return (
    <aside className="flex h-full flex-col gap-3 overflow-hidden border-x border-outline bg-panel-dim/95 p-3.5 backdrop-blur-xl">
      {/* Logo & header actions */}
      <div className="relative shrink-0 pt-1 pb-1">
        <div className="flex items-center justify-between px-1">
          {isAdmin ? (
            <button
              onClick={onAdminGames}
              title="مدیریت بازی‌ها"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-panel-soft border border-outline text-muted hover:text-accent hover:border-accent/30 transition-all shadow-sm"
            >
              <Gamepad2 size={16} />
            </button>
          ) : <div className="w-8" />}

          <div className="flex items-center justify-center">
            <Image
              src="/assets/images/logo.png"
              alt="MazI"
              width={140}
              height={42}
              priority
              className="h-9 w-auto object-contain filter drop-shadow-[0_2px_10px_rgba(245,158,11,0.2)]"
            />
          </div>

          <button
            onClick={onOpenLeaderboard}
            title="جدول برترین‌ها (Leaderboard)"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 transition-all shadow-sm border border-amber-400/30 hover:scale-105 active:scale-95"
          >
            <Trophy size={16} className="drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
          </button>
        </div>
      </div>

      {/* Mode Switcher: Rooms vs Direct Messages */}
      <div className="flex items-center rounded-xl bg-panel-deep/90 p-1 border border-outline shrink-0">
        <button
          onClick={() => onTabChange?.("rooms")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === "rooms"
              ? "bg-panel text-accent shadow-sm border border-outline"
              : "text-muted hover:text-white"
          }`}
        >
          <Hash size={13} />
          <span>روم‌ها</span>
        </button>
        <button
          onClick={() => onTabChange?.("dm")}
          className={`relative flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === "dm"
              ? "bg-panel text-accent shadow-sm border border-outline"
              : "text-muted hover:text-white"
          }`}
        >
          <MessageSquare size={13} />
          <span>پیام خصوصی</span>
          {totalUnreadDMs > 0 && (
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white animate-pulse">
              {totalUnreadDMs}
            </span>
          )}
        </button>
      </div>

      {activeTab === "rooms" && (
        <button
          onClick={onCreateRoom}
          className="flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-bright text-xs font-bold text-panel-deep glow-accent transition-all duration-200 hover:brightness-110 active:scale-[0.98] shadow-md"
        >
          <Plus size={16} strokeWidth={2.5} />
          ساخت روم جدید
        </button>
      )}

      {/* Search Bar */}
      <div className="relative shrink-0">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted/50"
        />
        <input
          className="h-9 w-full rounded-xl bg-panel-deep/90 border border-outline pl-8 pr-3 text-xs text-on-surface placeholder:text-muted/50 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/30 transition-all"
          placeholder={activeTab === "rooms" ? "جستجوی روم..." : "جستجوی کاربر..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* List Feed */}
      <div className="scrollbar-hidden flex-1 min-h-0 space-y-1 overflow-y-auto">
        {activeTab === "rooms" ? (
          filteredRooms.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted/60">
              رومی یافت نشد
            </div>
          ) : (
            filteredRooms.map((room) => {
              const isActive = selectedRoomId === room.id && !activeDMUserId;
              return (
                <button
                  key={room.id}
                  onClick={() => onSelect(room.id)}
                  className={`group flex w-full items-center gap-2.5 rounded-xl p-2.5 text-right transition-all duration-200 border ${
                    isActive
                      ? "bg-gradient-to-l from-accent/15 to-panel-soft border-accent/40 shadow-sm"
                      : "border-transparent hover:bg-panel-soft/60 hover:border-outline"
                  }`}
                >
                  <span
                    className={`relative flex w-10 h-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-lg transition-all duration-200 border ${
                      isActive
                        ? "bg-accent/20 border-accent/50 text-accent shadow-sm"
                        : "bg-panel-soft border-outline"
                    }`}
                  >
                    {room.avatar ? (
                      <Image src={room.avatar} alt="" width={38} height={38} unoptimized className="h-full w-full object-cover" />
                    ) : (
                      room.icon
                    )}
                    {unreadRoomIds?.has(room.id) && !isActive && (
                      <span className="absolute top-1 left-1 h-2 w-2 rounded-full bg-accent-bright border-2 border-panel-soft" />
                    )}
                    <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-emerald-400 pulse-online border border-panel-deep" />
                  </span>
                  <div className="flex-1 min-w-0 text-right">
                    <div className="flex items-center gap-1.5">
                      <p className={`truncate text-xs font-bold ${isActive ? "text-accent" : "text-on-surface"}`}>
                        {room.name}
                      </p>
                      <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-panel-deep px-1.5 py-0.5 text-[9px] text-muted border border-outline">
                        {privacyIcon[room.privacy]}
                        {privacyLabel[room.privacy]}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-muted mt-0.5">{room.topic}</p>
                  </div>
                  <span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border ${
                    isActive ? "bg-accent/15 text-accent border-accent/30" : "bg-panel-deep text-muted border-outline"
                  }`}>
                    <Users size={11} />
                    {room.onlineCount}
                  </span>
                </button>
              );
            })
          )
        ) : (
          /* DIRECT MESSAGES CONVERSATIONS TAB */
          filteredConvos.length > 0 ? (
            filteredConvos.map((convo) => {
              const isActive = activeDMUserId === convo.partnerId;
              return (
                <button
                  key={convo.partnerId}
                  onClick={() =>
                    onSelectDM?.({
                      userId: convo.partnerId,
                      username: convo.partnerName,
                      avatar: convo.partnerAvatar,
                    })
                  }
                  className={`group flex w-full items-center gap-2.5 rounded-xl p-2.5 text-right transition-all duration-200 border ${
                    isActive
                      ? "bg-gradient-to-l from-accent/15 to-panel-soft border-accent/40 shadow-sm"
                      : "border-transparent hover:bg-panel-soft/60 hover:border-outline"
                  }`}
                >
                  <span
                    className={`relative flex w-10 h-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-bold transition-all duration-200 border ${
                      isActive
                        ? "bg-accent/20 border-accent/50 text-accent shadow-sm"
                        : "bg-panel-soft border-outline"
                    }`}
                  >
                    {convo.partnerAvatar?.startsWith("/avatars/") || convo.partnerAvatar?.startsWith("http") ? (
                      <Image src={convo.partnerAvatar} alt="" width={38} height={38} unoptimized className="h-full w-full object-cover" />
                    ) : (
                      convo.partnerAvatar || "👤"
                    )}
                    <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-emerald-400 pulse-online border border-panel-deep" />
                  </span>
                  <div className="flex-1 min-w-0 text-right">
                    <div className="flex items-center justify-between">
                      <p className={`truncate text-xs font-bold ${isActive ? "text-accent" : "text-on-surface"}`}>
                        {convo.partnerName}
                      </p>
                    </div>
                    <p className="truncate text-[11px] text-muted mt-0.5">
                      {convo.lastMessage
                        ? convo.lastMessage.type === "game_invite"
                          ? `⚔️ چالش ${convo.lastMessage.metadata?.gameTitle || "بازی"}`
                          : convo.lastMessage.content
                        : "شروع گفتگو..."}
                    </p>
                  </div>
                  {convo.unreadCount > 0 && (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-black text-black shadow-md shadow-accent/20">
                      {convo.unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          ) : (
            <div className="py-12 text-center text-xs text-muted/60 px-2 leading-relaxed">
              هنوز گفتگوی خصوصی ندارید. با کلیک روی هر کاربر در پنل اعضا، گفتگوی دو نفره را آغاز کنید!
            </div>
          )
        )}
      </div>

      {/* Profile footer section with XP Bar */}
      {currentUser && (
        <div className="shrink-0 border-t border-outline pt-3">
          <div className="flex items-center justify-between rounded-xl bg-panel-soft/80 border border-outline p-2.5 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="relative w-9 h-9 shrink-0">
                {currentUser.avatar &&
                (currentUser.avatar.startsWith("/avatars/") ||
                  currentUser.avatar.startsWith("http")) ? (
                  <Image
                    src={currentUser.avatar}
                    alt=""
                    width={36}
                    height={36}
                    unoptimized
                    className="h-9 w-9 rounded-xl object-cover ring-2 ring-accent/60 shadow-sm"
                  />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-sm text-accent ring-2 ring-accent/60 font-bold">
                    {currentUser.avatar}
                  </span>
                )}
                <span className="absolute -bottom-1 -left-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-black text-panel-deep shadow-sm">
                  {currentUser.level}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-bold truncate text-on-surface">{currentUser.name}</p>
                  <span className="text-[10px] text-accent font-semibold">{currentUser.xp} XP</span>
                </div>
                {/* XP Progress Bar */}
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-panel-deep border border-outline">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-accent-bright transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(10, (currentUser.xp % 100)))}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center gap-1">
                  {currentUser.wins > 0 && (
                    <span className="flex items-center gap-0.5 rounded-full bg-accent/10 px-1.5 py-0.2 text-[9px] font-medium text-accent border border-accent/20">
                      <Award size={9} />
                      {currentUser.wins} برد
                    </span>
                  )}
                  {currentUser.badges.slice(0, 2).map((badge) => (
                    <span
                      key={badge}
                      className="rounded-full bg-white/5 px-1.5 py-0.2 text-[9px] text-muted border border-outline truncate max-w-[60px]"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={onOpenProfile}
              title="پروفایل و تنظیمات"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-panel-deep border border-outline text-muted hover:text-accent hover:border-accent/30 transition-all mr-1.5"
            >
              <Settings size={15} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
