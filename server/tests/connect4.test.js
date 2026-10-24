import assert from "node:assert/strict";
import {
  createConnect4State,
  addConnect4Player,
  startConnect4Game,
  applyConnect4Move,
} from "../games/connect4.js";

// Test 1: Initialization & players
const state = createConnect4State("host");
assert.equal(state.rows, 6);
assert.equal(state.cols, 7);
assert.equal(state.players.length, 1);

addConnect4Player(state, "guest");
assert.equal(state.players.length, 2);

// Cannot move before active
{
  const res = applyConnect4Move(state, { userId: "host", col: 3 });
  assert.equal(res.error, "GAME_NOT_ACTIVE");
}

startConnect4Game(state);
assert.equal(state.status, "active");

// Test 2: Turn enforcement
{
  const res = applyConnect4Move(state, { userId: "guest", col: 3 });
  assert.equal(res.error, "NOT_YOUR_TURN");
}

// Test 3: Horizontal win for player 1
// Host drops 0, 1, 2, 3 in bottom row
// Guest drops in column 6
{
  const s = createConnect4State("p1");
  addConnect4Player(s, "p2");
  startConnect4Game(s);

  // p1 -> col 0 (row 5)
  applyConnect4Move(s, { userId: "p1", col: 0 });
  // p2 -> col 6 (row 5)
  applyConnect4Move(s, { userId: "p2", col: 6 });
  // p1 -> col 1 (row 5)
  applyConnect4Move(s, { userId: "p1", col: 1 });
  // p2 -> col 6 (row 4)
  applyConnect4Move(s, { userId: "p2", col: 6 });
  // p1 -> col 2 (row 5)
  applyConnect4Move(s, { userId: "p1", col: 2 });
  // p2 -> col 6 (row 3)
  applyConnect4Move(s, { userId: "p2", col: 6 });
  // p1 -> col 3 (row 5) -> WIN!
  const winMove = applyConnect4Move(s, { userId: "p1", col: 3 });

  assert.equal(winMove.error, null);
  assert.equal(s.status, "finished");
  assert.equal(s.winnerId, "p1");
  assert.equal(s.winningCells.length, 4);
}

// Test 4: Vertical win for player 2
{
  const s = createConnect4State("p1");
  addConnect4Player(s, "p2");
  startConnect4Game(s);

  // p1 drops col 0, p2 drops col 1 four times
  applyConnect4Move(s, { userId: "p1", col: 0 });
  applyConnect4Move(s, { userId: "p2", col: 1 }); // row 5

  applyConnect4Move(s, { userId: "p1", col: 0 });
  applyConnect4Move(s, { userId: "p2", col: 1 }); // row 4

  applyConnect4Move(s, { userId: "p1", col: 0 });
  applyConnect4Move(s, { userId: "p2", col: 1 }); // row 3

  applyConnect4Move(s, { userId: "p1", col: 2 });
  const winRes = applyConnect4Move(s, { userId: "p2", col: 1 }); // row 2 -> 4th in vertical!

  assert.equal(winRes.error, null);
  assert.equal(s.status, "finished");
  assert.equal(s.winnerId, "p2");
}

// Test 5: Column full validation
{
  const s = createConnect4State("p1");
  addConnect4Player(s, "p2");
  startConnect4Game(s);

  // Fill column 0 completely (6 discs)
  for (let i = 0; i < 3; i++) {
    applyConnect4Move(s, { userId: "p1", col: 0 });
    applyConnect4Move(s, { userId: "p2", col: 0 });
  }

  // 7th drop in col 0 should return error
  const fullRes = applyConnect4Move(s, { userId: "p1", col: 0 });
  assert.equal(fullRes.error, "COLUMN_FULL");
}
