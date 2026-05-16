import { useMemo, useState } from "react";
import { Search, Plus, Hash, Lock, TimerIcon, Users, Settings, Award, Gamepad2 } from "lucide-react";
import type { Profile, Room } from "@/data/mock";

type RoomListProps = {
  rooms: Room[];
  selectedRoomId?: string;
  onSelect: (roomId: string) => void;
  onCreateRoom: () => void;
  isAdmin?: boolean;
  onAdminGames?: () => void;
  currentUser?: (Profile & { avatar: string }) | null;
  onOpenProfile?: () => void;
  unreadRoomIds?: Set<string>;
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
  currentUser,
  onOpenProfile,
  unreadRoomIds,
}: RoomListProps) {
  const [query, setQuery] = useState("");

  const filteredRooms = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rooms;
    return rooms.filter((room) =>
      [room.name, room.topic].some((val) => val.toLowerCase().includes(normalized)),
    );
  }, [query, rooms]);

  return (
    <aside className="flex h-full flex-col gap-4 overflow-hidden border-x border-outline bg-panel-soft p-5">
      {/* Logo & title */}
      <div className="relative shrink-0 pb-3">
        <img
          src="/assets/images/logo.png"
          alt="MazI"
          className="mx-auto w-2/3 rounded-xl object-cover"
        />
        {isAdmin && (
          <button
            onClick={onAdminGames}
            className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-lg bg-panel-deep text-muted hover:text-accent transition-colors"
          >
            <Gamepad2 size={16} />
          </button>
        )}
      </div>

      <button
        onClick={onCreateRoom}
        className="flex h-[52px] w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-accent-bright text-[15px] font-bold text-panel-deep glow-accent transition-all duration-200 hover:brightness-110"
      >
        <Plus size={20} strokeWidth={2.5} />
        روم جدید
      </button>

      <div className="relative shrink-0">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted/60"
        />
        <input
          className="h-11 w-full rounded-xl bg-panel-deep pl-9 pr-4 text-[14px] text-on-surface placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-accent/30"
          placeholder="دنبال چی میگردی؟"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="scrollbar-hidden flex-1 min-h-0 space-y-2 overflow-y-auto">
        {filteredRooms.map((room) => {
          const isActive = selectedRoomId === room.id;
          return (
            <button
              key={room.id}
              onClick={() => onSelect(room.id)}
              className={`group flex w-full items-center gap-3 rounded-lg p-3 text-right transition-all duration-200 ${
                isActive
                  ? "bg-panel-high border-r-4 border-accent"
                  : "hover:bg-panel"
              }`}
            >
              <span
                className={`relative flex w-12 h-12 shrink-0 items-center justify-center overflow-hidden rounded-lg text-xl transition-all duration-200 ${
                  isActive
                    ? "bg-accent/15 ring-2 ring-accent"
                    : "bg-panel-soft"
                }`}
              >
                {room.avatar ? (
                  <img src={room.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  room.icon
                )}
                {unreadRoomIds?.has(room.id) && !isActive && (
                  <span className="absolute top-0.5 left-0.5 h-2.5 w-2.5 rounded-full bg-accent-bright border-2 border-panel-soft" />
                )}
                <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-accent pulse-online border-2 border-panel-soft" />
              </span>
              <div className="flex-1 min-w-0 text-right">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[15px] font-bold text-on-surface">{room.name}</p>
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-panel-deep px-2 py-0.5 text-[10px] text-muted">
                    {privacyIcon[room.privacy]}
                    {privacyLabel[room.privacy]}
                  </span>
                </div>
                <p className="truncate text-[12px] text-muted">{room.topic}</p>
              </div>
              <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium ${
                isActive ? "bg-accent/15 text-accent" : "bg-panel-deep text-muted"
              }`}>
                <Users size={12} />
                {room.onlineCount}
              </span>
            </button>
          );
        })}
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
                  <img
                    src={currentUser.avatar}
                    alt=""
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
