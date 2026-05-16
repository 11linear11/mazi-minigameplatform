"use client";

import { useState } from "react";
import { ROOM_ICONS } from "@/data/icons";

type CreateRoomModalProps = {
  onClose: () => void;
  onCreate: (payload: { name: string; topic: string; icon: string; privacy: "public" | "private" }) => void;
};

export default function CreateRoomModal({ onClose, onCreate }: CreateRoomModalProps) {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [icon, setIcon] = useState(ROOM_ICONS[0]);
  const [privacy, setPrivacy] = useState<"public" | "private">("public");

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-6">
      <div className="w-full max-w-md rounded-2xl border border-outline bg-panel p-6">
        <h2 className="text-xl font-bold text-on-surface">روم جدید بساز</h2>

        <div className="mt-4">
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
          className="mt-4 w-full h-12 rounded-xl bg-panel-deep px-4 text-[14px] text-on-surface placeholder:text-muted/60 outline-none focus:ring-1 focus:ring-accent/30"
          placeholder="اسم روم"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <input
          className="mt-3 w-full h-12 rounded-xl bg-panel-deep px-4 text-[14px] text-on-surface placeholder:text-muted/60 outline-none focus:ring-1 focus:ring-accent/30"
          placeholder="موضوع"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
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
        {privacy === "private" && (
          <p className="mt-3 text-xs text-muted">
            روم خصوصی فقط با لینک دعوت باز میشه. بعد از ساخت، لینک دعوت بساز.
          </p>
        )}
        <div className="mt-6 flex items-center justify-between">
          <button onClick={onClose} className="rounded-lg bg-panel-deep px-4 py-2.5 text-[13px] text-muted transition-all hover:brightness-110">بیخیال</button>
          <button
            onClick={() => onCreate({ name: name.trim(), topic: topic.trim(), icon, privacy })}
            className="rounded-lg bg-accent-bright px-5 py-2.5 text-[13px] font-bold text-panel-deep transition-all duration-200 hover:brightness-110"
          >
            بسازش
          </button>
        </div>
      </div>
    </div>
  );
}
