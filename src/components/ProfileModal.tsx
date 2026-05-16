"use client";

import { useState, useRef } from "react";
import { X, User, Camera, Plus, LogOut } from "lucide-react";

type ProfileModalProps = {
  user: { id: string; name: string; avatar: string; xp?: number; level?: number; wins?: number; badges?: string[] };
  apiUrl: string;
  onClose: () => void;
  onLogout: () => void;
  onProfileUpdate: (profile: any) => void;
};

export default function ProfileModal({ user, apiUrl, onClose, onLogout, onProfileUpdate }: ProfileModalProps) {
  const [newPass, setNewPass] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(user.badges ?? []);
  const [tagLoading, setTagLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleChangePassword = async () => {
    if (!newPass.trim()) {
      setMsg("پسورد جدید رو وارد کن");
      return;
    }
    setLoading(true);
    setMsg("");
    const res = await fetch(`${apiUrl}/auth/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, newPassword: newPass.trim() }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) {
      setMsg("خطا در تغییر پسورد");
      return;
    }
    setMsg("پسورد با موفقیت عوض شد");
    setNewPass("");
  };

  const handleAddTag = async () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (tags.length >= 3) return;
    if (tags.includes(trimmed)) return;
    const newTags = [...tags, trimmed];
    await saveTags(newTags);
  };

  const handleRemoveTag = async (index: number) => {
    const newTags = tags.filter((_, i) => i !== index);
    await saveTags(newTags);
  };

  const saveTags = async (newTags: string[]) => {
    setTagLoading(true);
    const res = await fetch(`${apiUrl}/profile/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, tags: newTags }),
    });
    const data = await res.json();
    setTagLoading(false);
    if (data.profile) {
      setTags(data.profile.tags ?? []);
      setTagInput("");
      onProfileUpdate(data.profile);
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    const formData = new FormData();
    formData.append("avatar", file);
    formData.append("userId", user.id);
    const res = await fetch(`${apiUrl}/profile/avatar`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setAvatarLoading(false);
    if (data.profile) {
      onProfileUpdate(data.profile);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="w-full max-w-md rounded-2xl border border-outline bg-panel p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-on-surface">پروفایل من</h2>
          <button onClick={onClose} className="rounded-lg bg-panel-deep p-2 text-muted transition-all hover:brightness-110">
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-4 rounded-xl bg-panel-soft p-4">
          <div
            onClick={() => fileRef.current?.click()}
            className="relative cursor-pointer"
            title="تغییر عکس پروفایل"
          >
            {user.avatar && user.avatar.startsWith("http") ? (
              <img src={user.avatar} alt="avatar" className="h-12 w-12 rounded-full object-cover ring-2 ring-accent" />
            ) : user.avatar && user.avatar.startsWith("/avatars") ? (
              <img src={user.avatar} alt="avatar" className="h-12 w-12 rounded-full object-cover ring-2 ring-accent" />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-lg text-accent ring-2 ring-accent">
                <User size={20} />
              </span>
            )}
            {avatarLoading && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 text-xs text-white">
                ...
              </span>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          <div>
            <p className="text-lg font-semibold text-on-surface">{user.name}</p>
            <p className="text-xs text-muted">Level {user.level ?? 1} • XP {user.xp ?? 0}</p>
          </div>
        </div>

        <div className="mt-4 text-xs text-muted">
          <p>بردها: {user.wins ?? 0}</p>
        </div>

        <div className="mt-4 border-t border-outline pt-4">
          <h3 className="text-sm font-semibold text-on-surface">تگ‌های من</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((tag, i) => (
              <span key={i} className="flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-[13px] text-accent font-medium">
                {tag}
                <button onClick={() => handleRemoveTag(i)} className="text-muted/50 hover:text-white transition-colors"><X size={12} /></button>
              </span>
            ))}
          </div>
          {tags.length < 3 && (
            <div className="mt-2 flex gap-2">
              <input
                className="flex-1 rounded-xl bg-panel-deep px-3 py-2 text-xs text-on-surface placeholder:text-muted"
                placeholder="تگ جدید (حداکثر ۳)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                maxLength={20}
              />
              <button
                onClick={handleAddTag}
                disabled={tagLoading || !tagInput.trim()}
                className="rounded-lg bg-accent-bright px-4 py-2 text-[13px] font-bold text-panel-deep disabled:opacity-50 transition-all hover:brightness-110 flex items-center gap-1"
              >
                <Plus size={14} strokeWidth={2.5} />
                {tagLoading ? "..." : ""}
              </button>
            </div>
          )}
        </div>

        <div className="mt-5 border-t border-outline pt-4">
          <h3 className="text-sm font-semibold text-on-surface">عوض کردن پسورد</h3>
          <input
            className="mt-2 w-full h-12 rounded-xl bg-panel-deep px-4 text-[14px] text-on-surface placeholder:text-muted/60 outline-none focus:ring-1 focus:ring-accent/30"
            placeholder="پسورد جدید"
            type="password"
            value={newPass}
            onChange={(event) => setNewPass(event.target.value)}
          />
          {msg && <p className="mt-2 text-[13px] text-emerald-400">{msg}</p>}
          <button
            onClick={handleChangePassword}
            disabled={loading}
            className="mt-3 w-full h-11 rounded-xl bg-accent-bright text-panel-deep text-[15px] font-bold disabled:opacity-50 transition-all duration-200 hover:brightness-110"
          >
            {loading ? "صبر کن..." : "عوض کن"}
          </button>
        </div>

        <button
          onClick={onLogout}
          className="mt-5 w-full h-11 rounded-xl bg-red-500/10 px-4 text-[14px] font-semibold text-red-400 transition-all duration-200 hover:brightness-110 flex items-center justify-center gap-2"
        >
          <LogOut size={16} />
          خروج از اکانت
        </button>
      </div>
    </div>
  );
}
