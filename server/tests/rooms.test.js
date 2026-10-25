import assert from "node:assert/strict";
import { initDB, getDB } from "../db.js";
import { createRoom, createInvite, joinRoom, leaveRoom, deleteRoom } from "../rooms.js";
import { addRoomMovie } from "../roomMovies.js";
import { createRoomTodo } from "../roomTodos.js";

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

// Tests for deleteRoom
{
  const delTestRoomId = "room-to-delete-" + Date.now();
  createRoom({
    roomId: delTestRoomId,
    name: "Room to Delete",
    ownerId: "creator-123",
  });

  // Non-owner cannot delete
  const nonOwnerRes = deleteRoom(delTestRoomId, "random-user-456");
  assert.equal(nonOwnerRes.error, "NOT_OWNER");

  // Add movies and todos to room
  addRoomMovie(delTestRoomId, {
    title: "Inception",
    year: 2010,
    addedBy: "creator-123",
  });
  createRoomTodo(delTestRoomId, {
    title: "Prepare snacks",
  }, { userId: "creator-123", userName: "Creator" });

  // Creator can delete room
  const ownerRes = deleteRoom(delTestRoomId, "creator-123");
  assert.equal(ownerRes.error, null);

  // Room and cascades should be deleted
  const db = getDB();
  const roomRow = db.prepare("SELECT * FROM rooms WHERE roomId = ?").get(delTestRoomId);
  assert.equal(roomRow, undefined);
  const moviesRow = db.prepare("SELECT * FROM room_movies WHERE roomId = ?").all(delTestRoomId);
  assert.equal(moviesRow.length, 0);
  const todosRow = db.prepare("SELECT * FROM room_todos WHERE roomId = ?").all(delTestRoomId);
  assert.equal(todosRow.length, 0);
  const membersRow = db.prepare("SELECT * FROM room_members WHERE roomId = ?").all(delTestRoomId);
  assert.equal(membersRow.length, 0);
}
