import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "mazi.db");

let _db = null;

export function initDB() {
  if (_db) return _db;

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      userId TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      passwordHash TEXT,
      avatar TEXT DEFAULT '👤',
      status TEXT DEFAULT 'online',
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      wins INTEGER DEFAULT 0,
      badges TEXT DEFAULT '["Rookie"]',
      tags TEXT DEFAULT '[]',
      favoriteGames TEXT DEFAULT '[]',
      isAdmin INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rooms (
      roomId TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '💬',
      topic TEXT DEFAULT '',
      privacy TEXT DEFAULT 'public',
      isTemporary INTEGER DEFAULT 0,
      avatar TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS room_members (
      roomId TEXT NOT NULL REFERENCES rooms(roomId),
      userId TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      PRIMARY KEY (roomId, userId)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      roomId TEXT NOT NULL REFERENCES rooms(roomId),
      userId TEXT,
      userName TEXT,
      userAvatar TEXT,
      content TEXT NOT NULL,
      time TEXT,
      isSystem INTEGER DEFAULT 0,
      isGameCard INTEGER DEFAULT 0,
      gameTitle TEXT,
      gamePlayers TEXT,
      sessionId TEXT,
      gameStatus TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invites (
      code TEXT PRIMARY KEY,
      roomId TEXT NOT NULL REFERENCES rooms(roomId),
      createdBy TEXT NOT NULL,
      expiresAt REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_wins (
      userId TEXT NOT NULL,
      gameType TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      PRIMARY KEY (userId, gameType)
    );

    CREATE TABLE IF NOT EXISTS game_configs (
      gameId TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '🎮',
      avatar TEXT,
      description TEXT DEFAULT '',
      minPlayers INTEGER DEFAULT 2,
      maxPlayers INTEGER DEFAULT 4,
      active INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(roomId, createdAt);
    CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members(userId);
    CREATE INDEX IF NOT EXISTS idx_invites_room ON invites(roomId);
  `);

  // migrations
  try {
    _db.exec("ALTER TABLE rooms ADD COLUMN avatar TEXT");
  } catch { /* column already exists */ }
  try {
    _db.exec("ALTER TABLE users ADD COLUMN isAdmin INTEGER DEFAULT 0");
  } catch { /* column already exists */ }

  // seed default game configs
  const seed = _db.prepare("INSERT OR IGNORE INTO game_configs (gameId, name, icon, description, minPlayers, maxPlayers) VALUES (?, ?, ?, ?, ?, ?)");
  seed.run("uno", "Uno", "🃏", "بازی ورق کلاسیک Uno", 2, 4);
  seed.run("tic-tac-toe", "Tic Tac Toe", "❌", "بازی سنتی تیک تاک تو", 2, 2);
  seed.run("chess", "Chess", "♟️", "شاهکار شطرنج", 2, 2);
  seed.run("lockpick", "LockPick", "🔒", "قفل باز کن!", 2, 2);
  seed.run("dots-and-boxes", "Dots & Boxes", "🔲", "نقطه‌بازی — هر خط بکش، جعبه‌ها رو بگیر!", 2, 2);

  return _db;
}

export function getDB() {
  if (!_db) {
    throw new Error("Database not initialized. Call initDB() first.");
  }
  return _db;
}
