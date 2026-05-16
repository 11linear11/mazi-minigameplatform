"use client";

import { useState, useRef } from "react";
import { Camera, User } from "lucide-react";

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
    const res = await fetch(`${apiUrl}/profile/avatar`, {
      method: "POST",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="w-full max-w-md rounded-2xl border border-outline bg-panel p-6">
        <div className="mb-5 flex items-center gap-2">
          <button
            onClick={() => { setMode("register"); setError(""); }}
            className={`rounded-lg px-5 py-2 text-[13px] font-bold ${
              mode === "register" ? "bg-accent-bright text-panel-deep" : "bg-panel-deep text-muted"
            }`}
          >
            ثبت‌نام کن
          </button>
          <button
            onClick={() => { setMode("login"); setError(""); }}
            className={`rounded-lg px-5 py-2 text-[13px] font-bold ${
              mode === "login" ? "bg-accent-bright text-panel-deep" : "bg-panel-deep text-muted"
            }`}
          >
            وارد شو
          </button>
        </div>
        <p className="mb-2 text-[13px] text-muted">
          {mode === "register" ? "حساب جدید بساز" : "با اکانت قبلی وارد شو"}
        </p>
        {mode === "register" && (
          <div className="mb-4 flex items-center gap-3">
            <div
              onClick={() => fileRef.current?.click()}
              className="flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-panel-deep transition-all duration-200 hover:ring-2 hover:ring-accent/50"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="preview" className="h-full w-full object-cover" />
              ) : (
                <Camera size={24} className="text-muted/60" />
              )}
            </div>
            <div>
              <p className="text-[13px] text-muted">عکس پروفایل (اختیاری)</p>
              <button
                onClick={() => fileRef.current?.click()}
                className="mt-1 rounded-lg bg-panel-deep px-3 py-1 text-[11px] text-muted hover:brightness-110 transition-all"
              >
                انتخاب عکس
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
        )}
        <input
          className="mt-3 w-full h-12 rounded-xl bg-panel-deep px-4 text-[14px] text-on-surface placeholder:text-muted/60 outline-none focus:ring-1 focus:ring-accent/30"
          placeholder="نام کاربری"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
        <input
          className="mt-3 w-full h-12 rounded-xl bg-panel-deep px-4 text-[14px] text-on-surface placeholder:text-muted/60 outline-none focus:ring-1 focus:ring-accent/30"
          placeholder="پسورد"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-5 w-full h-12 rounded-xl bg-accent-bright text-panel-deep text-[15px] font-bold disabled:opacity-50 transition-all duration-200 hover:brightness-110"
        >
          {loading ? "صبر کن..." : mode === "register" ? "ثبت‌نام کن" : "وارد شو"}
        </button>
      </div>
    </div>
  );
}
