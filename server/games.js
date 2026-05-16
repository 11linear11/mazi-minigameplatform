import { getDB } from "./db.js";

export function listGameConfigs() {
  const db = getDB();
  const rows = db.prepare("SELECT * FROM game_configs ORDER BY createdAt ASC").all();
  return rows.map((row) => ({
    gameId: row.gameId,
    name: row.name,
    icon: row.icon,
    avatar: row.avatar ?? null,
    description: row.description,
    minPlayers: row.minPlayers,
    maxPlayers: row.maxPlayers,
    active: !!row.active,
  }));
}

export function updateGameConfig({ gameId, name, icon, description, minPlayers, maxPlayers, active, avatar }) {
  const db = getDB();
  const existing = db.prepare("SELECT * FROM game_configs WHERE gameId = ?").get(gameId);
  if (!existing) {
    return { error: "GAME_NOT_FOUND" };
  }
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (icon !== undefined) updates.icon = icon;
  if (description !== undefined) updates.description = description;
  if (minPlayers !== undefined) updates.minPlayers = minPlayers;
  if (maxPlayers !== undefined) updates.maxPlayers = maxPlayers;
  if (active !== undefined) updates.active = active ? 1 : 0;
  if (avatar !== undefined) updates.avatar = avatar;
  if (Object.keys(updates).length > 0) {
    const setClauses = Object.keys(updates).map((key) => `${key} = ?`).join(", ");
    const values = Object.values(updates);
    db.prepare(`UPDATE game_configs SET ${setClauses} WHERE gameId = ?`).run(...values, gameId);
  }
  return { error: null };
}
