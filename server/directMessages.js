import crypto from "node:crypto";
import { getDB } from "./db.js";
import { getProfile, ensureProfile } from "./profiles.js";

function rowToMessage(row) {
  if (!row) return null;
  let metadata = {};
  try {
    metadata = JSON.parse(row.metadata || "{}");
  } catch {
    metadata = {};
  }
  return {
    id: row.id,
    senderId: row.senderId,
    receiverId: row.receiverId,
    content: row.content,
    type: row.type || "text",
    metadata,
    isRead: Boolean(row.isRead),
    createdAt: row.createdAt,
  };
}

export function sendDirectMessage({ senderId, receiverId, content, type = "text", metadata = {} }) {
  if (!senderId || !receiverId || !content) {
    return { error: "INVALID_PAYLOAD" };
  }
  if (senderId === receiverId) {
    return { error: "CANNOT_MESSAGE_SELF" };
  }

  ensureProfile({ userId: senderId });
  ensureProfile({ userId: receiverId });

  const db = getDB();
  const id = `dm-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const metadataStr = JSON.stringify(metadata || {});

  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO direct_messages (id, senderId, receiverId, content, type, metadata, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, 0, ?)"
  ).run(id, senderId, receiverId, content, type, metadataStr, now);

  const row = db.prepare("SELECT * FROM direct_messages WHERE id = ?").get(id);
  return { message: rowToMessage(row), error: null };
}

export function getDirectHistory({ userId1, userId2, limit = 60 }) {
  if (!userId1 || !userId2) return [];
  const db = getDB();
  const rows = db.prepare(
    `SELECT * FROM direct_messages 
     WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
     ORDER BY createdAt ASC LIMIT ?`
  ).all(userId1, userId2, userId2, userId1, limit);

  return rows.map(rowToMessage);
}

export function markDirectMessagesAsRead({ userId, senderId }) {
  if (!userId || !senderId) return 0;
  const db = getDB();
  const result = db.prepare(
    "UPDATE direct_messages SET isRead = 1 WHERE receiverId = ? AND senderId = ? AND isRead = 0"
  ).run(userId, senderId);
  return result.changes;
}

export function getTotalUnreadDirectMessagesCount(userId) {
  if (!userId) return 0;
  const db = getDB();
  const row = db.prepare("SELECT COUNT(*) as count FROM direct_messages WHERE receiverId = ? AND isRead = 0").get(userId);
  return row?.count ?? 0;
}

export function getDirectConversations(userId) {
  if (!userId) return [];
  const db = getDB();
  
  // Find all distinct partner IDs
  const partnerRows = db.prepare(
    `SELECT DISTINCT 
      CASE WHEN senderId = ? THEN receiverId ELSE senderId END as partnerId
     FROM direct_messages
     WHERE senderId = ? OR receiverId = ?`
  ).all(userId, userId, userId);

  const conversations = [];

  for (const { partnerId } of partnerRows) {
    const lastRow = db.prepare(
      `SELECT * FROM direct_messages
       WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
       ORDER BY createdAt DESC LIMIT 1`
    ).get(userId, partnerId, partnerId, userId);

    const unreadRow = db.prepare(
      "SELECT COUNT(*) as count FROM direct_messages WHERE receiverId = ? AND senderId = ? AND isRead = 0"
    ).get(userId, partnerId);

    const partnerProfile = getProfile(partnerId);

    conversations.push({
      partnerId,
      partnerName: partnerProfile?.username || partnerId,
      partnerAvatar: partnerProfile?.avatar || "👤",
      partnerStatus: partnerProfile?.status || "offline",
      lastMessage: lastRow ? rowToMessage(lastRow) : null,
      unreadCount: unreadRow?.count ?? 0,
      updatedAt: lastRow?.createdAt || null,
    });
  }

  // Sort by latest message descending
  conversations.sort((a, b) => {
    const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return timeB - timeA;
  });

  return conversations;
}

export function updateInviteStatus({ messageId, userId, status }) {
  if (!messageId || !status) return { error: "INVALID_PAYLOAD" };
  const db = getDB();
  const row = db.prepare("SELECT * FROM direct_messages WHERE id = ?").get(messageId);
  if (!row) return { error: "MESSAGE_NOT_FOUND" };

  let meta = {};
  try {
    meta = JSON.parse(row.metadata || "{}");
  } catch {
    meta = {};
  }

  // Verify only receiver can accept/decline
  if (status === "accepted" || status === "declined") {
    if (row.receiverId !== userId) {
      return { error: "NOT_INVITE_RECIPIENT" };
    }
  }

  meta.status = status;
  db.prepare("UPDATE direct_messages SET metadata = ? WHERE id = ?").run(JSON.stringify(meta), messageId);
  const updatedRow = db.prepare("SELECT * FROM direct_messages WHERE id = ?").get(messageId);
  return { message: rowToMessage(updatedRow), error: null };
}
