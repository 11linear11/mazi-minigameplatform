import assert from "node:assert/strict";
import {
  createBattleshipState,
  addBattleshipPlayer,
  startBattleshipGame,
  applyBattleshipMove,
  sanitizeBattleshipStateForUser,
  validateFleet,
} from "../games/battleship.js";

// Test 1: Initialization & Fleet Generation
const state = createBattleshipState("p1");
assert.equal(state.size, 8);
assert.equal(state.players.length, 1);
assert.equal(state.players[0].fleet.length, 4);

addBattleshipPlayer(state, "p2");
assert.equal(state.players.length, 2);
assert.equal(state.players[1].fleet.length, 4);
assert.equal(state.status, "placement");

// Players ready up
applyBattleshipMove(state, { userId: "p1", action: "ready" });
assert.equal(state.status, "placement");
applyBattleshipMove(state, { userId: "p2", action: "ready" });
assert.equal(state.status, "active");

// Test 2: Custom Fleet Validation
{
  const customFleet = [
    { id: "carrier", coordinates: [[0, 0], [0, 1], [0, 2], [0, 3]] },
    { id: "battleship", coordinates: [[2, 0], [2, 1], [2, 2]] },
    { id: "submarine", coordinates: [[4, 0], [4, 1]] },
    { id: "destroyer", coordinates: [[6, 0], [6, 1]] },
  ];
  const val = validateFleet(customFleet);
  assert.equal(val.valid, true);

  // Overlapping fleet should fail
  const overlapping = [
    { id: "carrier", coordinates: [[0, 0], [0, 1], [0, 2], [0, 3]] },
    { id: "battleship", coordinates: [[0, 2], [0, 3], [0, 4]] },
    { id: "submarine", coordinates: [[4, 0], [4, 1]] },
    { id: "destroyer", coordinates: [[6, 0], [6, 1]] },
  ];
  const valOverlap = validateFleet(overlapping);
  assert.equal(valOverlap.valid, false);
}

// Test 3: Fog of War Sanitization & Hits Secrecy
{
  const sanitized = sanitizeBattleshipStateForUser(state, "p1");
  assert.ok(sanitized.players[0].shipGrid); // P1 sees own ships
  assert.equal(sanitized.players[1].shipGrid, undefined); // P1 cannot see P2 ships

  // Find a ship of P2 and hit 1 tile of it
  const p2Ship = state.players[1].fleet[0];
  const [hitR, hitC] = p2Ship.coordinates[0];
  state.currentPlayerIndex = 0;
  applyBattleshipMove(state, { userId: "p1", row: hitR, col: hitC });

  // P1 views sanitized state: unsunk P2 ship hits MUST be 0
  const sanitizedAfterHit = sanitizeBattleshipStateForUser(state, "p1");
  const p2SanitizedShip = sanitizedAfterHit.players[1].fleet.find((s) => s.id === p2Ship.id);
  assert.equal(p2SanitizedShip.hits, 0); // Hits are secretly hidden from P1!
  assert.equal(p2SanitizedShip.sunk, false);
}

// Test 4: Miss shot
{
  let emptyR = -1, emptyC = -1;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (state.players[1].shipGrid[r][c] === 0 && state.players[0].radarGrid[r][c] === 0) {
        emptyR = r;
        emptyC = c;
        break;
      }
    }
    if (emptyR !== -1) break;
  }

  state.currentPlayerIndex = 0;
  const res = applyBattleshipMove(state, { userId: "p1", row: emptyR, col: emptyC });
  assert.equal(res.error, null);
  assert.equal(state.players[0].radarGrid[emptyR][emptyC], 1); // 1 = miss
  assert.equal(state.currentPlayerIndex, 1); // Turn switched to p2
}

// Test 5: Sinking all ships ends game
{
  const s = createBattleshipState("u1");
  addBattleshipPlayer(s, "u2");
  startBattleshipGame(s, true); // force active for quick test

  // u1 targets all coordinates of u2 fleet
  for (const ship of s.players[1].fleet) {
    for (const [r, c] of ship.coordinates) {
      s.currentPlayerIndex = 0;
      applyBattleshipMove(s, { userId: "u1", row: r, col: c });
    }
  }

  assert.equal(s.status, "finished");
  assert.equal(s.winnerId, "u1");
}
