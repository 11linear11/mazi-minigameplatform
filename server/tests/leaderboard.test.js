import assert from "node:assert/strict";
import { initDB } from "../db.js";
import { ensureProfile, recordWin, getLeaderboard } from "../profiles.js";

initDB();

// Test 1: Overall Leaderboard returns array of ranked players
const overall = getLeaderboard("overall", 10);
assert.ok(Array.isArray(overall));
assert.ok(overall.length > 0);
assert.equal(overall[0].rank, 1);
assert.ok("wins" in overall[0]);
assert.ok("username" in overall[0]);
assert.ok("level" in overall[0]);

// Test 2: Per-game leaderboard
ensureProfile({ userId: "lb-user-test-1", username: "PlayerOne" });
ensureProfile({ userId: "lb-user-test-2", username: "PlayerTwo" });

recordWin("lb-user-test-1", "Connect 4");
recordWin("lb-user-test-1", "Connect 4");
recordWin("lb-user-test-2", "Connect 4");

const connect4Lb = getLeaderboard("Connect 4", 10);
assert.ok(Array.isArray(connect4Lb));
assert.ok(connect4Lb.length >= 2);
assert.equal(connect4Lb[0].userId, "lb-user-test-1");
assert.ok(connect4Lb[0].wins >= 2);
