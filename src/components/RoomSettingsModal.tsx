"use client";

import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { ROOM_ICONS } from "@/data/icons";

type RoomSettingsModalProps = {
  roomId: string;
  initialName: string;
  initialTopic: string;
  initialIcon: string;
  initialPrivacy: "public" | "private";
  initialAvatar?: string | null;
  apiUrl: string;
  userId: string;
  onClose: () => void;
  onSave: (payload: { name: string; topic: string; icon: string; privacy: "public" | "private" }) => void;
  onRefresh?: () => void;
  onDeleteRoom?: () => void;
};

export default function RoomSettingsModal({
  roomId,
  initialName,
  initialTopic,
  initialIcon,
  initialPrivacy,
  initialAvatar,
  apiUrl,
  userId,
  onClose,
  onSave,
  onRefresh,
  onDeleteRoom,
}: RoomSettingsModalProps) {
  const [name, setName] = useState(initialName);
  const [topic, setTopic] = useState(initialTopic);
  const [icon, setIcon] = useState(initialIcon);
  const [privacy, setPrivacy] = useState<"public" | "private">(initialPrivacy);
  const [avatarPreview, setAvatarPreview] = useState(initialAvatar ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("avatar", file);
    formData.append("roomId", roomId);
    formData.append("userId", userId);
    const res = await fetch(`${apiUrl}/room/avatar`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (data.avatar) {
      setAvatarPreview(data.avatar);
      onRefresh?.();
    }
  };

  const handleSave = () => {
    onSave({ name: name.trim(), topic: topic.trim(), icon, privacy });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="w-full max-w-md rounded-2xl border border-outline bg-panel p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-on-surface">تنظیمات روم</h2>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Avatar upload */}
        <div className="mb-4 flex items-center gap-3">
          <div
            onClick={() => fileRef.current?.click()}
            className="flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-panel-deep transition-all duration-200 hover:ring-2 hover:ring-accent"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <Camera size={24} className="text-muted/60" />
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <p className="text-[13px] text-muted">عکس روم (اختیاری)</p>
        </div>

        {/* Icon picker */}
        <div className="mb-3">
          <p className="mb-2 text-[13px] text-muted">آیکون روم</p>
          <div className="flex flex-wrap gap-2">
            {ROOM_ICONS.map((item) => (
              <button
                key={item}
                onClick={() => setIcon(item)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg transition-all duration-200 ${
                  icon === item
                    ? "bg-accent/15 ring-2 ring-accent"
                    : "bg-panel-deep hover:bg-panel-deep"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <input
          className="mt-3 w-full h-12 rounded-xl bg-panel-deep px-4 text-[14px] text-on-surface placeholder:text-muted/60 outline-none focus:ring-1 focus:ring-accent/30"
          placeholder="اسم روم"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="mt-3 w-full h-12 rounded-xl bg-panel-deep px-4 text-[14px] text-on-surface placeholder:text-muted/60 outline-none focus:ring-1 focus:ring-accent/30"
          placeholder="موضوع"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />

        <div className="mt-4 flex gap-2 text-[13px]">
          {(["public", "private"] as const).map((item) => (
            <button
              key={item}
              onClick={() => setPrivacy(item)}
              className={`rounded-lg px-5 py-2 font-bold ${privacy === item ? "bg-accent-bright text-panel-deep" : "bg-panel-deep text-muted"}`}
            >
              {item === "public" ? "عمومی" : "خصوصی"}
            </button>
          ))}
        </div>

        {onDeleteRoom && (
          <div className="mt-6 border-t border-outline pt-4">
            <button
              onClick={() => {
                if (window.confirm("آیا مطمئنی؟ روم برای همیشه پاک میشه!")) {
                  onDeleteRoom();
                }
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 py-3 text-[13px] font-semibold text-red-400 transition-all duration-200 hover:bg-red-500/20 hover:brightness-110"
            >
              حذف روم
            </button>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <button onClick={onClose} className="rounded-lg bg-panel-deep px-4 py-2.5 text-[13px] text-muted transition-all hover:brightness-110">
            بیخیال
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-accent-bright px-5 py-2.5 text-[13px] font-bold text-panel-deep transition-all duration-200 hover:brightness-110"
          >
            ذخیره
          </button>
        </div>
      </div>
    </div>
  );
}
