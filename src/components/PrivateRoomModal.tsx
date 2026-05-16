"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

type PrivateRoomModalProps = {
  roomName: string;
  onClose: () => void;
  onSubmit: (payload: { inviteCode?: string }) => void;
};

export default function PrivateRoomModal({ roomName, onClose, onSubmit }: PrivateRoomModalProps) {
  const [inviteCode, setInviteCode] = useState("");

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-6">
      <div className="w-full max-w-md rounded-2xl border border-outline bg-panel p-6">
        <div className="flex items-center gap-2">
          <Lock size={20} className="text-accent" />
          <h2 className="text-xl font-bold text-on-surface">ورود به روم خصوصی</h2>
        </div>
        <p className="mt-2 text-[13px] text-muted">{roomName}</p>
        <p className="mt-1 text-[13px] text-muted">این روم قفله! فقط با لینک دعوت میتونی وارد بشی.</p>
        <input
          className="mt-4 w-full h-12 rounded-xl bg-panel-deep px-4 text-[14px] text-on-surface placeholder:text-muted/60 outline-none focus:ring-1 focus:ring-accent/30"
          placeholder="کد دعوت"
          value={inviteCode}
          onChange={(event) => setInviteCode(event.target.value)}
        />
        <div className="mt-6 flex items-center justify-between">
          <button onClick={onClose} className="rounded-lg bg-panel-deep px-4 py-2.5 text-[13px] text-muted transition-all hover:brightness-110">لغو</button>
          <button
            onClick={() => onSubmit({ inviteCode: inviteCode.trim() })}
            className="rounded-lg bg-accent-bright px-5 py-2.5 text-[13px] font-bold text-panel-deep transition-all duration-200 hover:brightness-110"
          >
            ورود
          </button>
        </div>
      </div>
    </div>
  );
}
