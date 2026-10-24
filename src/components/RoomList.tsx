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
    <aside className="flex h-full flex-col gap-3.5 overflow-hidden border-x border-outline bg-panel-soft p-4">
      {/* Logo & title */}
      <div className="relative shrink-0 pb-1">
        <Image
          src="/assets/images/logo.png"
          alt="MazI"
          width={200}
          height={60}
          priority
          className="mx-auto w-2/3 rounded-xl object-cover"
        />
        {isAdmin && (
          <button
            onClick={onAdminGames}
            title="مدیریت بازی‌ها"
            className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-lg bg-panel-deep text-muted hover:text-accent transition-colors"
          >
            <Gamepad2 size={15} />
          </button>
        )}
        <button
          onClick={onOpenLeaderboard}
          title="جدول برترین‌ها (Leaderboard)"
          className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-lg bg-panel-deep text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 transition-colors shadow-sm border border-amber-400/30"
        >
          <Trophy size={16} className="drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
        </button>
      </div>

      {/* Mode Switcher: Rooms vs Direct Messages */}
      <div className="flex items-center rounded-xl bg-panel-deep p-1 border border-outline shrink-0">
        <button
          onClick={() => onTabChange?.("rooms")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === "rooms"
              ? "bg-panel text-accent shadow-sm"
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
              ? "bg-panel text-accent shadow-sm"
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
          className="flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-accent-bright text-xs font-bold text-panel-deep glow-accent transition-all duration-200 hover:brightness-110"
        >
          <Plus size={16} strokeWidth={2.5} />
          روم جدید
        </button>
      )}

      <div className="relative shrink-0">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted/60"
        />
        <input
          className="h-9 w-full rounded-xl bg-panel-deep pl-8 pr-3 text-xs text-on-surface placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-accent/30"
          placeholder={activeTab === "rooms" ? "جستجوی روم..." : "جستجوی کاربر..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="scrollbar-hidden flex-1 min-h-0 space-y-1.5 overflow-y-auto">
        {activeTab === "rooms" ? (
          filteredRooms.map((room) => {
            const isActive = selectedRoomId === room.id && !activeDMUserId;
            return (
              <button
                key={room.id}
                onClick={() => onSelect(room.id)}
                className={`group flex w-full items-center gap-2.5 rounded-xl p-2.5 text-right transition-all duration-200 ${
                  isActive
                    ? "bg-panel-high border-r-4 border-accent"
                    : "hover:bg-panel"
                }`}
              >
                <span
                  className={`relative flex w-10 h-10 shrink-0 items-center justify-center overflow-hidden rounded-lg text-lg transition-all duration-200 ${
                    isActive
                      ? "bg-accent/15 ring-2 ring-accent"
                      : "bg-panel-soft"
                  }`}
                >
                  {room.avatar ? (
                    <Image src={room.avatar} alt="" width={36} height={36} unoptimized className="h-full w-full object-cover" />
                  ) : (
                    room.icon
                  )}
                  {unreadRoomIds?.has(room.id) && !isActive && (
                    <span className="absolute top-0.5 left-0.5 h-2 w-2 rounded-full bg-accent-bright border-2 border-panel-soft" />
                  )}
                  <span className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full bg-accent pulse-online border-2 border-panel-soft" />
                </span>
                <div className="flex-1 min-w-0 text-right">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-xs font-bold text-on-surface">{room.name}</p>
                    <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-panel-deep px-1.5 py-0.5 text-[9px] text-muted">
                      {privacyIcon[room.privacy]}
                      {privacyLabel[room.privacy]}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-muted">{room.topic}</p>
                </div>
                <span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  isActive ? "bg-accent/15 text-accent" : "bg-panel-deep text-muted"
                }`}>
                  <Users size={11} />
                  {room.onlineCount}
                </span>
              </button>
            );
          })
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
                  className={`group flex w-full items-center gap-2.5 rounded-xl p-2.5 text-right transition-all duration-200 ${
                    isActive
                      ? "bg-panel-high border-r-4 border-accent"
                      : "hover:bg-panel"
                  }`}
                >
                  <span
                    className={`relative flex w-10 h-10 shrink-0 items-center justify-center overflow-hidden rounded-lg text-sm font-bold transition-all duration-200 ${
                      isActive
                        ? "bg-accent/15 ring-2 ring-accent"
                        : "bg-panel-soft"
                    }`}
                  >
                    {convo.partnerAvatar?.startsWith("/avatars/") || convo.partnerAvatar?.startsWith("http") ? (
                      <Image src={convo.partnerAvatar} alt="" width={36} height={36} unoptimized className="h-full w-full object-cover" />
                    ) : (
                      convo.partnerAvatar || "👤"
                    )}
                    <span className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full bg-accent pulse-online border-2 border-panel-soft" />
                  </span>
                  <div className="flex-1 min-w-0 text-right">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-xs font-bold text-on-surface">{convo.partnerName}</p>
                    </div>
                    <p className="truncate text-[11px] text-muted">
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
            <div className="py-8 text-center text-xs text-muted/60">
              هنوز گفتگوی خصوصی ندارید. با کلیک روی هر کاربر در پنل سمت چپ، گفتگوی دو نفره را آغاز کنید!
            </div>
          )
        )}
      </div>

      {/* Profile section */}
      {currentUser && (
        <div className="shrink-0 border-t border-outline pt-4">
          <div className="flex items-center justify-between rounded-xl bg-panel-soft p-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative w-10 h-10 shrink-0">
                {currentUser.avatar &&
                (currentUser.avatar.startsWith("/avatars/") ||
                  currentUser.avatar.startsWith("http")) ? (
                  <Image
                    src={currentUser.avatar}
                    alt=""
                    width={40}
                    height={40}
                    unoptimized
                    className="h-10 w-10 rounded-lg object-cover ring-2 ring-accent"
                  />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-base text-accent ring-2 ring-accent">
                    {currentUser.avatar}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold truncate text-on-surface">{currentUser.name}</p>
                <p className="text-[11px] text-muted">
                  Level {currentUser.level} • XP {currentUser.xp}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {currentUser.badges.slice(0, 3).map((badge) => (
                    <span
                      key={badge}
                      className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent"
                    >
                      {badge}
                    </span>
                  ))}
                  {currentUser.wins > 0 && (
                    <span className="flex items-center gap-0.5 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                      <Award size={10} />
                      {currentUser.wins} برد
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onOpenProfile}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-panel-deep text-muted hover:text-accent transition-colors"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
