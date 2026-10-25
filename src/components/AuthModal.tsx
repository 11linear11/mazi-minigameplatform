"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Camera, User } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

type AuthModalProps = {
  onSubmit: (payload: { username: string; avatar: string; userId: string }) => void;
  onSubmitLogin: (payload: { username: string; password: string }) => void;
  apiUrl: string;
};

export default function AuthModal({ onSubmit, onSubmitLogin, apiUrl }: AuthModalProps) {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState<File | string>("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatar(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (userId: string): Promise<string> => {
    if (!(avatar instanceof File)) return "";
    const formData = new FormData();
    formData.append("avatar", avatar);
    formData.append("userId", userId);
    const token = typeof window !== "undefined" ? localStorage.getItem("gamechat-token") : null;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${apiUrl}/profile/avatar`, {
      method: "POST",
      headers,
      body: formData,
    });
    const data = await res.json();
    return data.profile?.avatar ?? "";
  };

  const handleRegister = async () => {
    const cleanUsername = username.trim();
    if (!cleanUsername || !password.trim()) {
      setError("نام کاربری و پسورد رو وارد کن");
      return;
    }
    setLoading(true);
    setError("");
    const userId = `user-${Date.now()}`;
    const initialAvatar = cleanUsername.charAt(0).toUpperCase();

    const res = await fetch(`${apiUrl}/auth/guest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, username: cleanUsername, avatar: initialAvatar, password: password.trim() }),
    });
    const data = await res.json();
    if (data.error) {
      setLoading(false);
      setError(data.error);
      return;
    }
    if (data.token) {
      localStorage.setItem("gamechat-token", data.token);
    }

    let avatarUrl = initialAvatar;
    if (avatar) {
      avatarUrl = await uploadAvatar(userId) || initialAvatar;
    }

    setLoading(false);
    onSubmit({ username: cleanUsername, avatar: avatarUrl, userId });
  };

  const handleLogin = async () => {
    const cleanUsername = username.trim();
    if (!cleanUsername || !password.trim()) {
      setError("نام کاربری و پسورد رو وارد کن");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch(`${apiUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: cleanUsername, password: password.trim() }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) {
      setError("نام کاربری یا پسورد اشتباهه");
      return;
    }
    onSubmitLogin({ username: cleanUsername, password: password.trim() });
  };

  const handleSubmit = mode === "register" ? handleRegister : handleLogin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-outline bg-panel/95 p-6 lg:p-8 shadow-2xl overflow-hidden">
        {/* Glow behind modal */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-accent/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" />

        {/* Logo & Header */}
        <div className="relative mb-6 flex flex-col items-center text-center">
          <BrandLogo size="lg" />
          <p className="mt-3 text-xs text-muted">
            {mode === "register" ? "به جمع بازیکنان MazI بپیوندید" : "ورود به حساب کاربری"}
          </p>
        </div>

        {/* Tab switch */}
        <div className="mb-5 flex rounded-xl bg-panel-deep p-1 border border-outline">
          <button
            onClick={() => { setMode("register"); setError(""); }}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
              mode === "register"
                ? "bg-accent-bright text-panel-deep shadow-sm"
                : "text-muted hover:text-white"
            }`}
          >
            ثبت‌نام جدید
          </button>
          <button
            onClick={() => { setMode("login"); setError(""); }}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
              mode === "login"
                ? "bg-accent-bright text-panel-deep shadow-sm"
                : "text-muted hover:text-white"
            }`}
          >
            ورود به حساب
          </button>
        </div>

        {mode === "register" && (
          <div className="mb-4 flex items-center gap-3.5 p-3 rounded-2xl bg-panel-deep/60 border border-outline">
            <div
              onClick={() => fileRef.current?.click()}
              className="group relative flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-panel-soft border border-outline transition-all duration-200 hover:border-accent hover:scale-105"
            >
              {avatarPreview ? (
                <Image src={avatarPreview} alt="preview" width={56} height={56} unoptimized className="h-full w-full object-cover" />
              ) : (
                <Camera size={22} className="text-muted/60 group-hover:text-accent transition-colors" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-on-surface">آواتار پروفایل (اختیاری)</p>
              <p className="text-[11px] text-muted mt-0.5">یک عکس یا تصویر کارتونی انتخاب کن</p>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-xl bg-panel-soft border border-outline px-3 py-1.5 text-[11px] font-semibold text-muted hover:text-accent hover:border-accent/30 transition-all shrink-0"
            >
              انتخاب
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
        )}

        <div className="space-y-3">
          <input
            className="w-full h-11 rounded-xl bg-panel-deep/90 border border-outline px-4 text-xs text-on-surface placeholder:text-muted/50 outline-none transition-all focus:border-accent/40 focus:ring-1 focus:ring-accent/30"
            placeholder="نام کاربری (مثلاً آرش)"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <input
            className="w-full h-11 rounded-xl bg-panel-deep/90 border border-outline px-4 text-xs text-on-surface placeholder:text-muted/50 outline-none transition-all focus:border-accent/40 focus:ring-1 focus:ring-accent/30"
            placeholder="رمز عبور"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs text-rose-300 text-center animate-shake">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-5 w-full h-11 rounded-xl bg-gradient-to-r from-accent to-accent-bright text-panel-deep text-xs font-bold disabled:opacity-50 transition-all duration-200 hover:brightness-110 active:scale-[0.98] shadow-md glow-accent flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-panel-deep border-t-transparent animate-spin" />
              صبر کنید...
            </span>
          ) : mode === "register" ? (
            "ایجاد حساب و ورود"
          ) : (
            "ورود به حساب کاربری"
          )}
        </button>
      </div>
    </div>
  );
}
