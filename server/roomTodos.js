import { getDB } from "./db.js";
import crypto from "crypto";

export function getRoomTodos(roomId) {
  const db = getDB();
  return db
    .prepare(
      `SELECT * FROM room_todos 
       WHERE roomId = ? 
       ORDER BY 
         CASE WHEN status = 'done' THEN 1 ELSE 0 END ASC,
         CASE priority 
           WHEN 'high' THEN 1 
           WHEN 'medium' THEN 2 
           WHEN 'low' THEN 3 
           ELSE 4 
         END ASC,
         createdAt DESC`
    )
    .all(roomId);
}

export function createRoomTodo(roomId, data, user = {}) {
  const db = getDB();
  const id = crypto.randomUUID();
  const title = (data.title || "").trim();
  if (!title) {
    throw new Error("عنوان تسک الزامی است");
  }

  const description = (data.description || "").trim();
  const priority = ["low", "medium", "high"].includes(data.priority) ? data.priority : "medium";
  const assignedTo = data.assignedTo || null;
  const assignedToName = data.assignedToName || null;
  const dueDate = data.dueDate || null;
  const createdBy = user.userId || "anonymous";
  const createdByName = user.userName || user.username || "کاربر";

  db.prepare(
    `INSERT INTO room_todos (id, roomId, title, description, status, priority, assignedTo, assignedToName, dueDate, createdBy, createdByName)
     VALUES (?, ?, ?, ?, 'todo', ?, ?, ?, ?, ?, ?)`
  ).run(id, roomId, title, description, priority, assignedTo, assignedToName, dueDate, createdBy, createdByName);

  return db.prepare("SELECT * FROM room_todos WHERE id = ?").get(id);
}

export function toggleRoomTodo(roomId, todoId, user = {}) {
  const db = getDB();
  const todo = db.prepare("SELECT * FROM room_todos WHERE id = ? AND roomId = ?").get(todoId, roomId);
  if (!todo) throw new Error("تسک پیدا نشد");

  const newStatus = todo.status === "done" ? "todo" : "done";
  const completedAt = newStatus === "done" ? new Date().toISOString() : null;

  db.prepare(
    `UPDATE room_todos 
     SET status = ?, completedAt = ? 
     WHERE id = ? AND roomId = ?`
  ).run(newStatus, completedAt, todoId, roomId);

  return db.prepare("SELECT * FROM room_todos WHERE id = ?").get(todoId);
}

export function updateRoomTodo(roomId, todoId, data, user = {}) {
  const db = getDB();
  const todo = db.prepare("SELECT * FROM room_todos WHERE id = ? AND roomId = ?").get(todoId, roomId);
  if (!todo) throw new Error("تسک پیدا نشد");

  const title = data.title !== undefined ? (data.title || "").trim() : todo.title;
  const description = data.description !== undefined ? (data.description || "").trim() : todo.description;
  const priority = ["low", "medium", "high"].includes(data.priority) ? data.priority : todo.priority;
  const status = ["todo", "in_progress", "done"].includes(data.status) ? data.status : todo.status;
  const assignedTo = data.assignedTo !== undefined ? data.assignedTo : todo.assignedTo;
  const assignedToName = data.assignedToName !== undefined ? data.assignedToName : todo.assignedToName;
  const dueDate = data.dueDate !== undefined ? data.dueDate : todo.dueDate;
  const completedAt = status === "done" ? (todo.completedAt || new Date().toISOString()) : null;

  db.prepare(
    `UPDATE room_todos 
     SET title = ?, description = ?, priority = ?, status = ?, assignedTo = ?, assignedToName = ?, dueDate = ?, completedAt = ?
     WHERE id = ? AND roomId = ?`
  ).run(title, description, priority, status, assignedTo, assignedToName, dueDate, completedAt, todoId, roomId);

  return db.prepare("SELECT * FROM room_todos WHERE id = ?").get(todoId);
}

export function deleteRoomTodo(roomId, todoId) {
  const db = getDB();
  db.prepare("DELETE FROM room_todos WHERE id = ? AND roomId = ?").run(todoId, roomId);
  return { success: true, todoId };
}
