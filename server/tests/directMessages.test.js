import assert from "node:assert/strict";
import { initDB } from "../db.js";
import {
  sendDirectMessage,
  getDirectHistory,
  markDirectMessagesAsRead,
  getDirectConversations,
  getTotalUnreadDirectMessagesCount,
  updateInviteStatus,
} from "../directMessages.js";

initDB();

const u1 = "test-user-dm1";
const u2 = "test-user-dm2";

// 1. Send normal message
{
  const res = sendDirectMessage({
    senderId: u1,
    receiverId: u2,
    content: "سلام، میای شطرنج بازی کنیم؟",
  });
  assert.equal(res.error, null);
  assert.equal(res.message.senderId, u1);
  assert.equal(res.message.receiverId, u2);
  assert.equal(res.message.isRead, false);
}

// 2. Unread count check
{
  const count = getTotalUnreadDirectMessagesCount(u2);
  assert.ok(count >= 1);
}

// 3. Send Game Invite message
let inviteMsgId = "";
{
  const res = sendDirectMessage({
    senderId: u1,
    receiverId: u2,
    content: "دعوت به مسابقه شطرنج ♟️",
    type: "game_invite",
    metadata: {
      gameId: "chess",
      gameTitle: "Chess",
      status: "pending",
    },
  });
  assert.equal(res.error, null);
  assert.equal(res.message.type, "game_invite");
  assert.equal(res.message.metadata.status, "pending");
  inviteMsgId = res.message.id;
}

// 4. Update invite status
{
  const res = updateInviteStatus({
    messageId: inviteMsgId,
    userId: u2,
    status: "accepted",
  });
  assert.equal(res.error, null);
  assert.equal(res.message.metadata.status, "accepted");
}

// 5. Get History
{
  const history = getDirectHistory({ userId1: u1, userId2: u2 });
  assert.ok(history.length >= 2);
}

// 6. Mark read
{
  const readCount = markDirectMessagesAsRead({ userId: u2, senderId: u1 });
  assert.ok(readCount >= 1);
}

// 7. Get conversations
{
  const convos = getDirectConversations(u1);
  assert.ok(convos.some((c) => c.partnerId === u2));
}
