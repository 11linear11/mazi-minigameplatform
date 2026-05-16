import { getDB } from "./db.js";
import { getProfile } from "./profiles.js";

const roomCache = new Map();

function upsertRoomRow({ roomId, name, icon, topic, privacy, isTemporary, ownerId, avatar }) {
  const db = getDB();
  db.prepare(
    `INSERT INTO rooms (roomId, name, icon, topic, privacy, isTemporary, avatar)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(roomId) DO UPDATE SET
       name = excluded.name,
       icon = excluded.icon,
       topic = excluded.topic,
       privacy = excluded.privacy,
       avatar = COALESCE(excluded.avatar, rooms.avatar)`
  ).run(roomId, name, icon || "💬", topic || "", privacy, isTemporary ? 1 : 0, avatar ?? null);
  if (ownerId) {
    db.prepare("INSERT OR IGNORE INTO room_members (roomId, userId, role) VALUES (?, ?, 'owner')").run(roomId, ownerId);
  }
}

function rowToMessage(row) {
  const msg = {
    id: row.id,
    user: row.userName,
    avatar: row.userAvatar,
    content: row.content,
    time: row.time,
  };
  if (row.isSystem) msg.isSystem = true;
  if (row.isGameCard) {
    msg.isGameCard = true;
    msg.gameTitle = row.gameTitle;
    msg.players = row.gamePlayers ? JSON.parse(row.gamePlayers) : undefined;
    msg.sessionId = row.sessionId;
    msg.gameStatus = row.gameStatus;
  }
  return msg;
}

function loadRoomFromDB(roomId) {
  const db = getDB();
  const row = db.prepare("SELECT * FROM rooms WHERE roomId = ?").get(roomId);
  if (!row) return null;

  const room = {
    id: row.roomId,
    name: row.name,
    icon: row.icon,
    avatar: row.avatar ?? null,
    topic: row.topic,
    privacy: row.privacy,
    isTemporary: !!row.isTemporary,
    members: new Set(),
    messages: [],
    roles: new Map(),
  };

  const memberships = db.prepare("SELECT userId, role FROM room_members WHERE roomId = ?").all(roomId);
  for (const m of memberships) {
    room.roles.set(m.userId, m.role);
  }

  const msgs = db.prepare("SELECT * FROM messages WHERE roomId = ? ORDER BY rowid DESC LIMIT 50").all(roomId);
  for (const msg of msgs.reverse()) {
    room.messages.push(rowToMessage(msg));
  }

  roomCache.set(roomId, room);
  return room;
}

export function createRoom({ roomId, name, icon, topic, privacy = "public", isTemporary = false, ownerId, avatar }) {
  upsertRoomRow({ roomId, name, icon, topic, privacy, isTemporary, ownerId, avatar });

  const room = {
    id: roomId,
    name,
    icon: icon || "💬",
    avatar: avatar ?? null,
    topic: topic || "",
    privacy,
    isTemporary,
    members: new Set(),
    messages: [],
    roles: new Map(),
  };
  if (ownerId) {
    room.members.add(ownerId);
    room.roles.set(ownerId, "owner");
  }
  roomCache.set(roomId, room);
  return room;
}

export function getRoom(roomId) {
  if (roomCache.has(roomId)) return roomCache.get(roomId);
  return loadRoomFromDB(roomId);
}

export function ensureRoom(roomId) {
  let room = getRoom(roomId);
  if (!room) {
    createRoom({ roomId, name: "روم عمومی", icon: "🎮", topic: "چت آزاد", privacy: "public" });
    room = roomCache.get(roomId);
  }
  return room;
}

export function joinRoom({ roomId, userId, inviteCode }) {
  const room = ensureRoom(roomId);
  if (room.privacy === "private") {
    if (room.members.has(userId)) {
      // allow existing members to rejoin without invite
    } else {
      const invite = inviteCode ? getInvite(inviteCode) : null;
      if (!invite || invite.roomId !== roomId || invite.expiresAt <= Date.now()) {
        return { room, error: "INVITE_REQUIRED" };
      }
    }
  }
  room.members.add(userId);
  if (!room.roles.has(userId)) {
    room.roles.set(userId, "member");
    const db = getDB();
    db.prepare("INSERT OR IGNORE INTO room_members (roomId, userId, role) VALUES (?, ?, 'member')").run(roomId, userId);
  }
  return { room, error: null };
}

export function leaveRoom({ roomId, userId }) {
  const room = roomCache.get(roomId);
  if (!room) {
    return { room: null, removed: false };
  }
  room.members.delete(userId);
  if (room.members.size === 0 && room.isTemporary) {
    roomCache.delete(roomId);
    const db = getDB();
    db.prepare("DELETE FROM invites WHERE roomId = ?").run(roomId);
    db.prepare("DELETE FROM messages WHERE roomId = ?").run(roomId);
    db.prepare("DELETE FROM room_members WHERE roomId = ?").run(roomId);
    db.prepare("DELETE FROM rooms WHERE roomId = ?").run(roomId);
    return { room: null, removed: true };
  }
  return { room, removed: false };
}

export function addMessage(roomId, message) {
  const room = ensureRoom(roomId);
  room.messages.push(message);
  const db = getDB();
  db.prepare(
    `INSERT INTO messages (id, roomId, userName, userAvatar, content, time, isSystem, isGameCard, gameTitle, gamePlayers, sessionId, gameStatus)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    message.id,
    roomId,
    message.user ?? null,
    message.avatar ?? null,
    message.content,
    message.time ?? null,
    message.isSystem ? 1 : 0,
    message.isGameCard ? 1 : 0,
    message.gameTitle ?? null,
    message.players ? JSON.stringify(message.players) : null,
    message.sessionId ?? null,
    message.gameStatus ?? null,
  );
  return room.messages;
}

export function updateGameMessage(roomId, sessionId, updates) {
  const room = ensureRoom(roomId);
  const index = room.messages.findIndex((msg) => msg.sessionId === sessionId);
  if (index !== -1) {
    room.messages[index] = { ...room.messages[index], ...updates };
  }
  const db = getDB();
  const allowedFields = ["gameStatus"];
  for (const key of allowedFields) {
    if (key in updates) {
      db.prepare(`UPDATE messages SET ${key} = ? WHERE roomId = ? AND sessionId = ?`).run(updates[key], roomId, sessionId);
    }
  }
  return index !== -1 ? room.messages[index] : null;
}

export function createInvite({ roomId, createdBy, ttlMinutes = 60 }) {
  const code = `invite-${Math.random().toString(36).slice(2, 8)}`;
  const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
  const invite = { code, roomId, createdBy, expiresAt };
  const db = getDB();
  db.prepare("INSERT INTO invites (code, roomId, createdBy, expiresAt) VALUES (?, ?, ?, ?)").run(code, roomId, createdBy, expiresAt);
  return invite;
}

export function getInvite(code) {
  const db = getDB();
  const row = db.prepare("SELECT * FROM invites WHERE code = ?").get(code);
  if (!row) return null;
  return { code: row.code, roomId: row.roomId, createdBy: row.createdBy, expiresAt: row.expiresAt };
}

export function getRoomSnapshot(roomId) {
  const room = ensureRoom(roomId);
  const db = getDB();
  const ownerRow = db.prepare("SELECT userId FROM room_members WHERE roomId = ? AND role = 'owner'").get(roomId);
  return {
    id: room.id,
    name: room.name,
    icon: room.icon,
    avatar: room.avatar ?? null,
    topic: room.topic,
    privacy: room.privacy,
    isTemporary: room.isTemporary,
    ownerId: ownerRow?.userId ?? null,
    members: Array.from(room.members),
    messages: room.messages,
    roles: Array.from(room.roles.entries()),
  };
}

export function listRooms() {
  const db = getDB();
  const rows = db.prepare("SELECT * FROM rooms").all();
  return rows.map((row) => {
    const ownerRow = db.prepare("SELECT userId FROM room_members WHERE roomId = ? AND role = 'owner'").get(row.roomId);
    return {
      id: row.roomId,
      name: row.name,
      icon: row.icon,
      topic: row.topic,
      privacy: row.privacy,
      isTemporary: !!row.isTemporary,
      ownerId: ownerRow?.userId ?? null,
      avatar: row.avatar ?? null,
      onlineCount: (roomCache.get(row.roomId)?.members ?? new Set()).size,
    };
  });
}

export function updateRoom({ roomId, userId, name, icon, topic, privacy, avatar }) {
  const room = roomCache.get(roomId);
  const db = getDB();
  const profile = getProfile(userId);
  const isAdmin = profile?.isAdmin ?? false;
  const ownerRow = db.prepare("SELECT userId FROM room_members WHERE roomId = ? AND role = 'owner'").get(roomId);
  if (!isAdmin && (!ownerRow || ownerRow.userId !== userId)) {
    return { error: "NOT_OWNER" };
  }
  if (room) {
    if (name !== undefined) room.name = name;
    if (icon !== undefined) room.icon = icon;
    if (topic !== undefined) room.topic = topic;
    if (privacy !== undefined) room.privacy = privacy;
    if (avatar !== undefined) room.avatar = avatar;
  }
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (icon !== undefined) updates.icon = icon;
  if (topic !== undefined) updates.topic = topic;
  if (privacy !== undefined) updates.privacy = privacy;
  if (avatar !== undefined) updates.avatar = avatar;
  if (Object.keys(updates).length > 0) {
    const setClauses = Object.keys(updates).map((key) => `${key} = ?`).join(", ");
    const values = Object.values(updates);
    db.prepare(`UPDATE rooms SET ${setClauses} WHERE roomId = ?`).run(...values, roomId);
  }
  return { error: null };
}

export function deleteRoom(roomId, userId) {
  const room = roomCache.get(roomId);
  const db = getDB();
  const profile = getProfile(userId);
  const isAdmin = profile?.isAdmin ?? false;
  const ownerRow = db.prepare("SELECT userId FROM room_members WHERE roomId = ? AND role = 'owner'").get(roomId);
  if (!isAdmin && (!ownerRow || ownerRow.userId !== userId)) {
    return { error: "NOT_OWNER" };
  }
  if (room) {
    roomCache.delete(roomId);
  }
  db.prepare("DELETE FROM invites WHERE roomId = ?").run(roomId);
  db.prepare("DELETE FROM messages WHERE roomId = ?").run(roomId);
  db.prepare("DELETE FROM room_members WHERE roomId = ?").run(roomId);
  db.prepare("DELETE FROM rooms WHERE roomId = ?").run(roomId);
  return { error: null };
}
