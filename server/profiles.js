import crypto from "node:crypto";
import { getDB } from "./db.js";

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function verifyPassword(password, hash) {
  return crypto.createHash("sha256").update(password).digest("hex") === hash;
}

function rowToProfile(row) {
  if (!row) return null;
  return {
    userId: row.userId,
    username: row.username,
    avatar: row.avatar,
    status: row.status,
    xp: row.xp,
    level: row.level,
    wins: row.wins,
    badges: JSON.parse(row.badges || "[]"),
    tags: JSON.parse(row.tags || "[]"),
    favoriteGames: JSON.parse(row.favoriteGames || "[]"),
    isAdmin: !!row.isAdmin,
    passwordHash: row.passwordHash,
  };
}

export function ensureProfile({ userId, username = "Guest", avatar = "👤", password = null }) {
  const db = getDB();
  let row = db.prepare("SELECT * FROM users WHERE userId = ?").get(userId);

  if (row) {
    const updates = [];
    const params = [];
    if (username !== "Guest") {
      updates.push("username = ?");
      params.push(username);
    }
    if (avatar !== "👤") {
      updates.push("avatar = ?");
      params.push(avatar);
    }
    if (password) {
      updates.push("passwordHash = ?");
      params.push(hashPassword(password));
    }
    if (updates.length > 0) {
      params.push(userId);
      db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE userId = ?`).run(...params);
    }
  } else {
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
    const isAdmin = userCount.count === 0 ? 1 : 0;
    const hash = password ? hashPassword(password) : null;
    db.prepare(
      "INSERT INTO users (userId, username, avatar, passwordHash, xp, level, wins, badges, tags, favoriteGames, status, isAdmin) VALUES (?, ?, ?, ?, 0, 1, 0, '[\"Rookie\"]', '[]', '[]', 'online', ?)"
    ).run(userId, username, avatar, hash, isAdmin);
  }

  return rowToProfile(db.prepare("SELECT * FROM users WHERE userId = ?").get(userId));
}

export function findProfileByUsername(username) {
  const db = getDB();
  const row = db.prepare("SELECT * FROM users WHERE LOWER(username) = LOWER(?)").get(username);
  return rowToProfile(row);
}

export function authenticate(username, password) {
  const profile = findProfileByUsername(username);
  if (!profile || !profile.passwordHash) {
    return { error: "INVALID_CREDENTIALS" };
  }
  if (!verifyPassword(password, profile.passwordHash)) {
    return { error: "INVALID_CREDENTIALS" };
  }
  return { profile, error: null };
}

export function changePassword(userId, newPassword) {
  const db = getDB();
  const result = db.prepare("UPDATE users SET passwordHash = ? WHERE userId = ?").run(hashPassword(newPassword), userId);
  if (result.changes === 0) {
    return { error: "USER_NOT_FOUND" };
  }
  const row = db.prepare("SELECT * FROM users WHERE userId = ?").get(userId);
  return { profile: rowToProfile(row), error: null };
}

export function updateStatus(userId, status) {
  const db = getDB();
  db.prepare("UPDATE users SET status = ? WHERE userId = ?").run(status, userId);
  const row = db.prepare("SELECT * FROM users WHERE userId = ?").get(userId);
  return rowToProfile(row) || ensureProfile({ userId });
}

export function awardXp(userId, amount) {
  const db = getDB();
  db.prepare("UPDATE users SET xp = xp + ?, level = MAX(1, FLOOR((xp + ?) / 10) + 1), status = status WHERE userId = ?").run(amount, amount, userId);
  const row = db.prepare("SELECT * FROM users WHERE userId = ?").get(userId);
  return rowToProfile(row);
}

export function recordWin(userId, gameType) {
  const db = getDB();
  db.prepare("UPDATE users SET wins = wins + 1 WHERE userId = ?").run(userId);
  db.prepare("INSERT INTO user_wins (userId, gameType, count) VALUES (?, ?, 1) ON CONFLICT(userId, gameType) DO UPDATE SET count = count + 1").run(userId, gameType);

  const row = db.prepare("SELECT * FROM users WHERE userId = ?").get(userId);
  if (row) {
    const fav = JSON.parse(row.favoriteGames || "[]");
    if (!fav.includes(gameType)) {
      fav.push(gameType);
      db.prepare("UPDATE users SET favoriteGames = ? WHERE userId = ?").run(JSON.stringify(fav), userId);
    }
  }
  return rowToProfile(db.prepare("SELECT * FROM users WHERE userId = ?").get(userId));
}

export function getProfile(userId) {
  const db = getDB();
  const row = db.prepare("SELECT * FROM users WHERE userId = ?").get(userId);
  return rowToProfile(row);
}

export function updateTags(userId, tags) {
  if (!Array.isArray(tags) || tags.length > 3) {
    return { error: "MAX_3_TAGS" };
  }
  const db = getDB();
  const result = db.prepare("UPDATE users SET tags = ? WHERE userId = ?").run(JSON.stringify(tags), userId);
  if (result.changes === 0) {
    return { error: "USER_NOT_FOUND" };
  }
  const row = db.prepare("SELECT * FROM users WHERE userId = ?").get(userId);
  return { profile: rowToProfile(row), error: null };
}
