import assert from "node:assert/strict";
import {
  createLockPickState,
  addLockPickPlayer,
  applyLockPickMove,
  isRotationValid,
  finishGame,
} from "../games/lockpick.js";

// Test 1: isRotationValid logic
{
  const ring = {
    labels: ["red", "blue", "yellow", "red", "blue", "yellow", "red", "blue"],
    slotPositions: [0, 2],
    ballPositions: [0, 2],
  };

  // Rotation 0: ball at 0 aligns with slot 0 (red == red), ball at 2 aligns with slot 2 (yellow == yellow)
  assert.equal(isRotationValid(ring, 0), true);

  // Rotation 1: slot 0 looks for ball at (0 - 1 + 8) % 8 = 7. Ball 7 does not exist.
  assert.equal(isRotationValid(ring, 1), false);

  // An empty/uncovered slot should never be valid
  const emptySlotRing = {
    labels: ["red", "red", "red", "red", "red", "red", "red", "red"],
    slotPositions: [1],
    ballPositions: [5],
  };
  // Rotation 0: slot 1 looks for ball at 1. But ball is at 5.
  assert.equal(isRotationValid(emptySlotRing, 0), false);
}

// Test 2: Game flow and locking
{
  const state = createLockPickState("player-1");
  addLockPickPlayer(state, "player-2");
  state.status = "active";
  state.startedAt = Date.now();

  const ring0 = state.rings[0];
  // Find a valid rotation for ring0
  let validRot = -1;
  for (let r = 0; r < 8; r++) {
    if (isRotationValid(ring0, r)) {
      validRot = r;
      break;
    }
  }
  assert.ok(validRot !== -1, "Ring must have at least one valid rotation");

  // Attempt lock before setting valid rotation
  state.players[0].currentRotations[0] = (validRot + 1) % 8;
  if (!isRotationValid(ring0, (validRot + 1) % 8)) {
    const failRes = applyLockPickMove(state, {
      userId: "player-1",
      payload: { type: "lock", ringIndex: 0 },
    });
    assert.equal(failRes.error, "LOCK_FAILED");
    assert.equal(state.players[0].locked[0], false);
  }

  // Rotate to valid rotation and lock
  state.players[0].currentRotations[0] = validRot;
  const succRes = applyLockPickMove(state, {
    userId: "player-1",
    payload: { type: "lock", ringIndex: 0 },
  });
  assert.equal(succRes.error, null);
  assert.equal(state.players[0].locked[0], true);
}

// Test 3: finishGame with timeout
{
  const state = createLockPickState("player-1");
  addLockPickPlayer(state, "player-2");
  state.status = "active";
  state.players[0].locked[0] = true;
  state.players[0].locked[1] = true;
  state.players[1].locked[0] = true;

  finishGame(state);
  assert.equal(state.status, "finished");
  assert.equal(state.winnerId, "player-1");
  assert.equal(state.isDraw, false);
}
