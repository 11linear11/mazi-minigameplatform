import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Hash,
  Lock,
  TimerIcon,
  Users,
  Gamepad2,
  Copy,
  Settings,
  Film,
  Play,
  LayoutGrid,
  List,
  Search,
  X,
  Info,
  ChevronLeft,
} from "lucide-react";
import type { Game, Member } from "@/data/mock";

type RoomInfoPanelProps = {
  members: Member[];
  games: Game[];
  activeSession?: {
    gameType: string;
    status: string;
    meta?: { roomCode?: string };
    players?: Array<{ userId: string }>;
    minPlayers?: number;
  } | null;
  onStartGame: (gameType: string) => void;
  roomName: string;
  roomTopic: string;
  roomPrivacy: "public" | "private" | "temporary";
  inviteCode?: string | null;
  onJoinActive: () => void;
  hasActiveGame: boolean;
  onCreateInvite?: () => void;
  onOpenSettings?: () => void;
  isAdmin?: boolean;
  currentUserId?: string | null;
  ownerId?: string | null;
  roomAvatar?: string | null;
  roomIcon?: string;
  onOpenDM?: (userId: string, username: string, avatar: string) => void;
  onOpenCinema?: () => void;
  activeTab?: "games" | "info";
  onTabChange?: (tab: "games" | "info") => void;
};

const privacyIcon: Record<string, React.ReactNode> = {
  public: <Hash size={13} />,
  private: <Lock size={13} />,
  temporary: <TimerIcon size={13} />,
};

const privacyLabel: Record<string, string> = {
  public: "عمومی",
  private: "خصوصی",
  temporary: "موقت",
};

export default function RoomInfoPanel({
  members,
  games,
  activeSession,
  onStartGame,
  roomName,
  roomTopic,
  roomPrivacy,
  inviteCode,
  onJoinActive,
  hasActiveGame,
  onCreateInvite,
  onOpenSettings,
  isAdmin,
  currentUserId,
  ownerId,
  roomAvatar,
  roomIcon,
  onOpenDM,
  onOpenCinema,
  activeTab: controlledTab,
  onTabChange,
}: RoomInfoPanelProps) {
  const [internalTab, setInternalTab] = useState<"games" | "info">("games");
  const activeTab = controlledTab ?? internalTab;
  const setTab = (tab: "games" | "info") => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  useEffect(() => {
    if (controlledTab) {
      setInternalTab(controlledTab);
    }
  }, [controlledTab]);

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const getPlayerCountLabel = (game: Game) => {
    if (game.minPlayers && game.maxPlayers) {
      if (game.minPlayers === game.maxPlayers) {
        return `${game.minPlayers} نفره`;
      }
      return `${game.minPlayers}-${game.maxPlayers} نفره`;
    }
    return "۲ نفره";
  };

  const filteredGames = games.filter((game) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      game.name.toLowerCase().includes(q) ||
      (game.description && game.description.toLowerCase().includes(q))
    );
  });

  return (
    <aside className="flex h-full flex-col gap-0 overflow-hidden border-x border-outline bg-panel-deep p-4">
      {/* Top Tab Switcher */}
      <div className="flex items-center rounded-xl bg-panel-soft p-1 border border-outline/60 mb-3.5 shrink-0">
        <button
          onClick={() => setTab("games")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === "games"
              ? "bg-accent-bright text-panel-deep shadow-sm"
              : "text-muted hover:text-on-surface"
          }`}
        >
          <Gamepad2 size={16} />
          <span>بازی‌ها</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === "games"
                ? "bg-panel-deep/20 text-panel-deep"
                : "bg-panel-highest text-muted"
            }`}
          >
            {games.length}
          </span>
        </button>

        <button
          onClick={() => setTab("info")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === "info"
              ? "bg-accent-bright text-panel-deep shadow-sm"
              : "text-muted hover:text-on-surface"
          }`}
        >
          <Users size={16} />
          <span>روم و اعضا</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === "info"
                ? "bg-panel-deep/20 text-panel-deep"
                : "bg-panel-highest text-muted"
            }`}
          >
            {members.length}
          </span>
        </button>
      </div>

      {/* TAB 1: GAMES */}
      {activeTab === "games" && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Active Session Notification Banner if active */}
          {hasActiveGame && activeSession ? (
            <div className="mb-3 rounded-xl border border-accent/40 bg-accent/10 p-3 shadow-sm shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-accent pulse-online" />
                  <p className="text-xs font-bold text-accent">بازی در حال اجرا</p>
                </div>
                <span className="text-[11px] text-muted">
                  {activeSession.players?.length ?? 1}/{activeSession.minPlayers ?? 2} بازیکن
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-on-surface">{activeSession.gameType}</p>
                  {activeSession.meta?.roomCode && (
                    <p className="text-[11px] text-muted">کد روم: {activeSession.meta.roomCode}</p>
                  )}
                </div>
                <button
                  onClick={onJoinActive}
                  className="rounded-lg bg-accent-bright px-3.5 py-1.5 text-xs font-bold text-panel-deep transition-all hover:brightness-110 active:scale-95 shadow-sm"
                >
                  ورود به بازی
                </button>
              </div>
            </div>
          ) : (
            /* Subtle quick status & online shortcut */
            <div className="mb-3 flex items-center justify-between rounded-xl border border-outline/50 bg-panel-soft/60 px-3 py-2 text-xs text-muted shrink-0">
              <button
                onClick={() => setTab("info")}
                className="flex items-center gap-1.5 hover:text-accent transition-colors text-right"
                title="مشاهده کاربران آنلاین"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400 pulse-online" />
                <span className="font-medium">{members.length} نفر آنلاین</span>
                <ChevronLeft size={13} className="text-muted/60" />
              </button>
              {onOpenCinema && (
                <button
                  type="button"
                  onClick={onOpenCinema}
                  className="flex items-center gap-1 text-[11px] font-bold text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <Film size={13} />
                  <span>سینما روم</span>
                </button>
              )}
            </div>
          )}

          {/* Games Controls Header */}
          <div className="flex items-center justify-between mb-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-on-surface">انتخاب مینی‌گیم</p>
              <span className="text-[11px] text-muted">({filteredGames.length})</span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Search Toggle */}
              <button
                onClick={() => {
                  setIsSearching(!isSearching);
                  if (isSearching) setSearchQuery("");
                }}
                className={`p-1.5 rounded-lg text-muted hover:text-on-surface transition-colors ${
                  isSearching ? "bg-panel-highest text-accent" : "hover:bg-panel-soft"
                }`}
                title="جستجوی بازی"
              >
                <Search size={14} />
              </button>

              {/* View Toggle */}
              <div className="flex items-center rounded-lg bg-panel-soft p-0.5 border border-outline/50">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === "grid"
                      ? "bg-panel-highest text-accent shadow-sm"
                      : "text-muted hover:text-on-surface"
                  }`}
                  title="نمایش شبکه‌ای"
                >
                  <LayoutGrid size={13} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === "list"
                      ? "bg-panel-highest text-accent shadow-sm"
                      : "text-muted hover:text-on-surface"
                  }`}
                  title="نمایش لیستی"
                >
                  <List size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Search Input */}
          {isSearching && (
            <div className="relative mb-3 shrink-0">
              <input
                type="text"
                placeholder="جستجوی بازی..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full rounded-xl border border-outline/70 bg-panel-soft py-1.5 pr-3 pl-8 text-xs text-on-surface placeholder:text-muted/50 focus:border-accent focus:outline-none"
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-on-surface"
                >
                  <X size={13} />
                </button>
              ) : null}
            </div>
          )}

          {/* Games List/Grid - Dedicated Scrollable View */}
          <div className="flex-1 min-h-0 overflow-y-auto pl-1 pr-0.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15 hover:[&::-webkit-scrollbar-thumb]:bg-white/30">
            {filteredGames.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted">
                هیچ بازی‌ای پیدا نشد
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 gap-2.5 pb-3">
                {filteredGames.map((game) => (
                  <div
                    key={game.id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-outline/70 bg-panel-soft/70 p-3 hover:bg-panel-high hover:border-accent/50 transition-all duration-200 text-right shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-panel-highest text-base ring-1 ring-outline/60 group-hover:scale-105 transition-transform">
                          {game.avatar ? (
                            <Image
                              src={game.avatar}
                              alt=""
                              width={36}
                              height={36}
                              unoptimized
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            game.icon || "🎮"
                          )}
                        </span>
                        <span className="rounded-md bg-panel-deep/90 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                          {getPlayerCountLabel(game)}
                        </span>
                      </div>
                      <p className="mt-2.5 text-xs font-bold text-on-surface truncate group-hover:text-accent transition-colors">
                        {game.name}
                      </p>
                      <p className="text-[10px] text-muted line-clamp-1 mt-0.5" title={game.description}>
                        {game.description || (game.kind === "external" ? "بیرونی" : "داخلی")}
                      </p>
                    </div>

                    <button
                      onClick={() => onStartGame(game.name)}
                      disabled={hasActiveGame}
                      className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-bold transition-all duration-150 active:scale-95 ${
                        hasActiveGame
                          ? "bg-panel-deep text-muted/50 cursor-not-allowed"
                          : "bg-accent-bright text-panel-deep hover:brightness-110 shadow-sm"
                      }`}
                    >
                      {hasActiveGame ? (
                        "فعال"
                      ) : (
                        <>
                          <Play size={11} className="fill-current" />
                          شروع
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 pb-3">
                {filteredGames.map((game) => (
                  <div
                    key={game.id}
                    className="flex items-center justify-between rounded-xl border border-outline/70 bg-panel-soft/70 p-2.5 hover:bg-panel-high hover:border-accent/40 transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-panel-highest text-base ring-1 ring-outline/60">
                        {game.avatar ? (
                          <Image
                            src={game.avatar}
                            alt=""
                            width={36}
                            height={36}
                            unoptimized
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          game.icon || "🎮"
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-on-surface truncate">{game.name}</p>
                          <span className="text-[9px] text-muted bg-panel-deep px-1.5 py-0.5 rounded font-medium">
                            {getPlayerCountLabel(game)}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted truncate mt-0.5">
                          {game.description || (game.kind === "external" ? "بیرونی" : "داخلی")}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => onStartGame(game.name)}
                      disabled={hasActiveGame}
                      className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all duration-150 active:scale-95 ${
                        hasActiveGame
                          ? "bg-panel-deep text-muted/50 cursor-not-allowed"
                          : "bg-accent-bright text-panel-deep hover:brightness-110 shadow-sm"
                      }`}
                    >
                      {hasActiveGame ? "فعال" : "شروع"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ROOM INFO & MEMBERS */}
      {activeTab === "info" && (
        <div className="flex-1 min-h-0 overflow-y-auto pl-1 pr-0.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15 hover:[&::-webkit-scrollbar-thumb]:bg-white/30 space-y-4 pb-4">
          {/* Room Details Card */}
          <div className="rounded-2xl border border-outline/70 bg-panel-soft/60 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted/70">مشخصات روم</span>
              {(isAdmin || (currentUserId && ownerId && currentUserId === ownerId)) && (
                <button
                  onClick={onOpenSettings}
                  className="text-muted hover:text-accent transition-colors p-1 rounded-lg hover:bg-panel-highest"
                  title="تنظیمات روم"
                >
                  <Settings size={16} />
                </button>
              )}
            </div>

            <div className="mt-3 flex items-center gap-3">
              <div className="flex w-12 h-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-panel-highest text-2xl ring-1 ring-outline/60">
                {roomAvatar ? (
                  <Image src={roomAvatar} alt="" width={48} height={48} unoptimized className="h-full w-full object-cover" />
                ) : (
                  roomIcon || "💬"
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-on-surface truncate">{roomName}</p>
                <p className="text-xs text-muted truncate mt-0.5">{roomTopic}</p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 rounded-full bg-panel px-2.5 py-1 text-xs text-muted border border-outline/50">
                {privacyIcon[roomPrivacy]}
                {privacyLabel[roomPrivacy]}
              </span>

              {roomPrivacy === "private" && inviteCode ? (
                <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs text-accent border border-accent/20">
                  <Copy size={11} />
                  {inviteCode}
                </span>
              ) : roomPrivacy === "private" ? (
                <button
                  onClick={onCreateInvite}
                  className="flex items-center gap-1 rounded-full bg-accent-bright px-2.5 py-1 text-xs font-semibold text-panel-deep transition-all duration-200 hover:brightness-110"
                >
                  <Copy size={11} />
                  لینک دعوت
                </button>
              ) : null}
            </div>
          </div>

          {/* Cinema Banner */}
          {onOpenCinema && (
            <div>
              <button
                type="button"
                onClick={onOpenCinema}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-purple-950/70 via-purple-900/40 to-panel-soft border border-purple-500/30 hover:border-purple-400/60 transition-all group shadow-md text-right active:scale-98"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 group-hover:scale-105 transition-transform">
                    <Film size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-on-surface">سینما روم</p>
                    <p className="text-[10px] text-muted">تماشای همزمان ویدیو و فیلم</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/30 group-hover:bg-purple-500/30 transition-colors">
                  ورود 🎬
                </span>
              </button>
            </div>
          )}

          {/* Active Game Details */}
          <div className="rounded-2xl border border-outline/70 bg-panel-soft/60 p-3.5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted/70">وضعیت بازی</p>
            {hasActiveGame && activeSession ? (
              <div className="mt-2.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-on-surface">{activeSession.gameType}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {activeSession.players?.length ?? 1}/{activeSession.minPlayers ?? 2} بازیکن
                  </p>
                </div>
                <button
                  onClick={onJoinActive}
                  className="rounded-xl bg-accent-bright px-3.5 py-1.5 text-xs font-bold text-panel-deep transition-all hover:brightness-110 active:scale-95 shadow-sm"
                >
                  پیوستن
                </button>
              </div>
            ) : (
              <div className="mt-2.5 flex items-center justify-between text-xs text-muted">
                <span>بازی فعالی در جریان نیست</span>
                <button
                  onClick={() => setTab("games")}
                  className="text-accent hover:underline font-bold"
                >
                  شروع بازی
                </button>
              </div>
            )}
          </div>

          {/* Online Members Full List */}
          <div className="rounded-2xl border border-outline/70 bg-panel-soft/60 p-3.5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-on-surface">کاربران آنلاین</h3>
              <span className="text-xs text-muted font-medium">{members.length} نفر</span>
            </div>

            <div className="space-y-2">
              {members.map((member) => (
                <button
                  key={member.id}
                  onClick={() => onOpenDM?.(member.id, member.name, member.avatar || "👤")}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-panel-high border border-transparent hover:border-outline/50 transition-all group text-right"
                  title={`${member.name} — کلیک برای پیام خصوصی (PV)`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative w-8 h-8 shrink-0">
                      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-panel-highest text-sm ring-1 ring-outline/60 group-hover:ring-accent transition-all">
                        {member.avatar &&
                        (member.avatar.startsWith("/avatars/") ||
                          member.avatar.startsWith("http")) ? (
                          <Image
                            src={member.avatar}
                            alt=""
                            width={32}
                            height={32}
                            unoptimized
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-muted">{member.avatar}</span>
                        )}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-panel-deep ${
                          member.status === "online"
                            ? "bg-accent pulse-online"
                            : member.status === "idle"
                              ? "bg-outline"
                              : "bg-panel-highest"
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-on-surface truncate group-hover:text-accent transition-colors">
                        {member.name}
                      </p>
                      <p className="text-[10px] text-muted">
                        {member.status === "online" ? "آنلاین" : member.status === "idle" ? "بیکار" : "در بازی"}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold text-accent/80 opacity-0 group-hover:opacity-100 transition-opacity">
                    پیام خصوصی
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
