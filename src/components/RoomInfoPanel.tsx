import {
  Hash,
  Lock,
  TimerIcon,
  Users,
  Gamepad2,
  Copy,
  Settings,
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
};

const privacyIcon: Record<string, React.ReactNode> = {
  public: <Hash size={12} />,
  private: <Lock size={12} />,
  temporary: <TimerIcon size={12} />,
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
}: RoomInfoPanelProps) {
  return (
    <aside className="flex h-full flex-col gap-0 overflow-hidden border-x border-outline bg-panel-deep p-5">
      {/* About room */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="section-title">درباره روم</h2>
          {(isAdmin || (currentUserId && ownerId && currentUserId === ownerId)) && (
            <button
              onClick={onOpenSettings}
              className="text-muted hover:text-accent transition-colors"
            >
              <Settings size={16} />
            </button>
          )}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex w-14 h-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-panel-highest text-xl ring-1 ring-outline">
            {roomAvatar ? (
              <img src={roomAvatar} alt="" className="h-full w-full object-cover" />
            ) : (
              roomIcon
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-on-surface truncate">{roomName}</p>
            <p className="text-[12px] text-muted truncate">{roomTopic}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-panel-deep px-2.5 py-1 text-[11px] text-muted">
            {privacyIcon[roomPrivacy]}
            {privacyLabel[roomPrivacy]}
          </span>
          {roomPrivacy === "private" && inviteCode ? (
            <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] text-accent">
              <Copy size={11} />
              {inviteCode}
            </span>
          ) : roomPrivacy === "private" ? (
            <button
              onClick={onCreateInvite}
              className="flex items-center gap-1 rounded-full bg-accent-bright px-2.5 py-1 text-[11px] font-semibold text-panel-deep transition-all duration-200 hover:brightness-110"
            >
              <Copy size={11} />
              لینک دعوت
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 border-t border-outline pt-6">
        <div className="rounded-xl border border-outline bg-panel-soft p-4">
          <p className="text-[11px] font-semibold tracking-wider text-muted/70 uppercase">وضعیت بازی</p>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-[15px] font-bold text-on-surface">{activeSession?.gameType ?? "بازی نداریم"}</p>
              <p className="mt-0.5 text-[12px] text-muted">
                {activeSession?.meta?.roomCode
                  ? `Room Code: ${activeSession.meta.roomCode}`
                  : activeSession
                    ? `${activeSession.players?.length ?? 1}/${activeSession.minPlayers ?? 2}`
                    : "بازی فعالی نیست"}
              </p>
            </div>
            <button
              onClick={onJoinActive}
              disabled={!hasActiveGame}
              className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition-all duration-200 ${
                hasActiveGame
                  ? "bg-accent-bright text-panel-deep hover:brightness-110"
                  : "bg-panel-deep text-muted/60"
              }`}
            >
              {hasActiveGame ? "Join" : "بدون بازی"}
            </button>
          </div>
        </div>
      </div>

      {/* Online */}
      <div className="mt-6 border-t border-outline pt-6">
        <div className="flex items-center justify-between">
          <h3 className="section-title">آنلاین‌ها</h3>
          <span className="text-[12px] text-muted/60">{members.length} نفر</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {members.slice(0, 6).map((member) => (
            <div key={member.id} className="relative w-10 h-10 shrink-0">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-panel-highest text-sm ring-1 ring-outline">
                {member.avatar &&
                (member.avatar.startsWith("/avatars/") ||
                  member.avatar.startsWith("http")) ? (
                  <img
                    src={member.avatar}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-base text-muted">{member.avatar}</span>
                )}
              </div>
              <span
                className={`absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-panel-deep ${
                  member.status === "online"
                    ? "bg-accent pulse-online"
                    : member.status === "idle"
                      ? "bg-outline"
                      : "bg-panel-highest"
                }`}
              />
            </div>
          ))}
          {members.length > 6 && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-panel-highest text-[12px] text-muted ring-1 ring-outline">
              +{members.length - 6}
            </div>
          )}
        </div>
      </div>

      {/* Games */}
      <div className="mt-6 border-t border-outline pt-6 flex-1 min-h-0 overflow-y-auto scrollbar-hidden">
        <div className="flex items-center justify-between">
          <h3 className="section-title">بازی‌ها</h3>
          <Gamepad2 size={14} className="text-muted/50" />
        </div>
        <div className="mt-3 space-y-2">
          {games.map((game) => (
            <div
              key={game.id}
              className="flex items-center justify-between rounded-xl border border-outline p-3 transition-all duration-200 hover:bg-panel-high"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-panel-highest text-sm ring-1 ring-outline">
                  {game.avatar ? (
                    <img src={game.avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    game.icon || "🎮"
                  )}
                </span>
                <div>
                  <p className="text-[14px] font-semibold text-on-surface">{game.name}</p>
                  <p className="text-[11px] text-muted">
                    {game.description || (game.kind === "external" ? "بیرونی" : "داخلی")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onStartGame(game.name)}
                disabled={hasActiveGame}
                className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition-all duration-200 ${
                  hasActiveGame
                    ? "bg-panel-deep text-muted/60"
                    : "bg-accent-bright text-panel-deep hover:brightness-110"
                }`}
              >
                {hasActiveGame ? "فعال" : "شروع"}
              </button>
            </div>
          ))}
        </div>
      </div>

    </aside>
  );
}
