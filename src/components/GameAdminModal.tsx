"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import type { Game } from "@/data/mock";
import { GAME_ICONS } from "@/data/icons";

type GameAdminModalProps = {
  games: Game[];
  apiUrl: string;
  userId: string;
  onClose: () => void;
  onUpdate: () => void;
};

export default function GameAdminModal({ games, apiUrl, userId, onClose, onUpdate }: GameAdminModalProps) {
  const [localGames, setLocalGames] = useState(games);

  useEffect(() => {
    setLocalGames(games);
  }, [games]);

  const handleIconChange = async (gameId: string, icon: string) => {
    await fetch(`${apiUrl}/games/config/${gameId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ icon, userId }),
    });
    onUpdate();
  };

  const handleAvatarUpload = async (gameId: string, file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    formData.append("userId", userId);
    await fetch(`${apiUrl}/games/config/avatar/${gameId}`, {
      method: "POST",
      body: formData,
    });
    onUpdate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="w-full max-w-lg rounded-2xl border border-outline bg-panel p-6 max-h-[80vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-on-surface">مدیریت بازی‌ها</h2>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {localGames.map((game) => (
            <GameConfigCard
              key={game.id}
              game={game}
              apiUrl={apiUrl}
              onIconChange={handleIconChange}
              onAvatarUpload={handleAvatarUpload}
            />
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full h-11 rounded-xl bg-panel-deep text-[13px] text-muted transition-all hover:brightness-110"
        >
          بستن
        </button>
      </div>
    </div>
  );
}

function GameConfigCard({
  game,
  apiUrl,
  onIconChange,
  onAvatarUpload,
}: {
  game: Game;
  apiUrl: string;
  onIconChange: (gameId: string, icon: string) => void;
  onAvatarUpload: (gameId: string, file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState(game.avatar ?? "");

  useEffect(() => {
    setAvatarPreview(game.avatar ?? "");
  }, [game.avatar]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    onAvatarUpload(game.id, file);
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-outline bg-panel-soft p-4">
      <div className="relative shrink-0">
        <div
          onClick={() => fileRef.current?.click()}
          className="flex h-14 w-14 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-panel-highest text-xl ring-1 ring-outline transition-all duration-200 hover:ring-2 hover:ring-accent"
        >
          {avatarPreview ? (
            <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
          ) : (
            game.icon || GAME_ICONS[game.name] || "🎮"
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-bright text-[10px] text-panel-deep">
          <Camera size={10} />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold text-on-surface">{game.name}</p>
        <p className="text-[12px] text-muted">{game.description || "بدون توضیحات"}</p>
        <p className="mt-0.5 text-[11px] text-muted/60">
          {game.minPlayers}-{game.maxPlayers} بازیکن
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 max-w-[120px]">
        {Object.entries(GAME_ICONS).map(([name, icon]) => (
          <button
            key={name}
            onClick={() => onIconChange(game.id, icon)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-all ${
              game.icon === icon || (!game.icon && GAME_ICONS[game.name] === icon)
                ? "bg-accent/15 ring-1 ring-accent"
                : "bg-panel-deep hover:bg-panel-deep"
            }`}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}
