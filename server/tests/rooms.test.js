import assert from "node:assert/strict";
import { initDB } from "../db.js";
import { createRoom, createInvite, joinRoom, leaveRoom } from "../rooms.js";

initDB();

const room = createRoom({
  roomId: "room-private",
  name: "Private",
  icon: "🔒",
  topic: "Secret",
  privacy: "private",
  isTemporary: true,
  ownerId: "owner-1",
});

{
  const result = joinRoom({ roomId: room.id, userId: "user-1" });
  assert.equal(result.error, "INVITE_REQUIRED");
}

{
  const invite = createInvite({ roomId: room.id, createdBy: "owner-1", ttlMinutes: 1 });
  const result = joinRoom({ roomId: room.id, userId: "user-1", inviteCode: invite.code });
  assert.equal(result.error, null);
}

{
  // Existing member can rejoin without invite
  const result = joinRoom({ roomId: room.id, userId: "user-1" });
  assert.equal(result.error, null);
}

{
  const invite2 = createInvite({ roomId: room.id, createdBy: "owner-1", ttlMinutes: 1 });
  const result = joinRoom({ roomId: room.id, userId: "user-2", inviteCode: invite2.code });
  assert.equal(result.error, null);
}

{
  const left = leaveRoom({ roomId: room.id, userId: "user-1" });
  assert.equal(left.removed, false);
  leaveRoom({ roomId: room.id, userId: "owner-1" });
  const removed = leaveRoom({ roomId: room.id, userId: "user-2" });
  assert.equal(removed.removed, true);
}
