import assert from "node:assert/strict";
import {
  createDotsAndBoxesState,
  addDotsAndBoxesPlayer,
  startDotsAndBoxesGame,
  applyDotsAndBoxesMove,
} from "../games/dotsAndBoxes.js";

// Test 1: Bounds validation
{
  const state = createDotsAndBoxesState("p1");
  addDotsAndBoxesPlayer(state, "p2");
  startDotsAndBoxesGame(state);

  // Horizontal line at col 5 (when COLS=5, max col is 4) -> OUT_OF_BOUNDS
  const resHOut = applyDotsAndBoxesMove(state, { userId: "p1", row: 0, col: 5, orientation: "h" });
  assert.equal(resHOut.error, "OUT_OF_BOUNDS");

  // Vertical line at row 5 (when ROWS=5, max row is 4) -> OUT_OF_BOUNDS
  const resVOut = applyDotsAndBoxesMove(state, { userId: "p1", row: 5, col: 0, orientation: "v" });
  assert.equal(resVOut.error, "OUT_OF_BOUNDS");

  // Valid horizontal move at row 0, col 0
  const resValid = applyDotsAndBoxesMove(state, { userId: "p1", row: 0, col: 0, orientation: "h" });
  assert.equal(resValid.error, null);
  assert.equal(state.grid[0][0].h, 1);
  // Turn passes to player 2 because no box was scored
  assert.equal(state.currentPlayerIndex, 1);

  // Trying same line again -> LINE_ALREADY_DRAWN
  const resRepeat = applyDotsAndBoxesMove(state, { userId: "p2", row: 0, col: 0, orientation: "h" });
  assert.equal(resRepeat.error, "LINE_ALREADY_DRAWN");
}

// Test 2: Scoring a box keeps the turn for the scorer
{
  const state = createDotsAndBoxesState("p1");
  addDotsAndBoxesPlayer(state, "p2");
  startDotsAndBoxesGame(state);

  // Box (0,0) edges:
  // Top: (0,0) h
  // Left: (0,0) v
  // Right: (0,1) v
  // Bottom: (1,0) h
  applyDotsAndBoxesMove(state, { userId: "p1", row: 0, col: 0, orientation: "h" }); // p1
  applyDotsAndBoxesMove(state, { userId: "p2", row: 0, col: 0, orientation: "v" }); // p2
  applyDotsAndBoxesMove(state, { userId: "p1", row: 0, col: 1, orientation: "v" }); // p1

  // p2 finishes box (0,0) with bottom edge
  const finishRes = applyDotsAndBoxesMove(state, { userId: "p2", row: 1, col: 0, orientation: "h" });
  assert.equal(finishRes.error, null);
  assert.equal(state.players[1].score, 1);
  assert.equal(state.grid[0][0].p, 2);
  // p2 scored, so p2 retains the turn!
  assert.equal(state.currentPlayerIndex, 1);
}
