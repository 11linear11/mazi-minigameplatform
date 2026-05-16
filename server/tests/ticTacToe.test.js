import assert from "node:assert/strict";
import { applyTicTacToeMove, createTicTacToeState, addTicTacToePlayer } from "../games/ticTacToe.js";

const state = createTicTacToeState("player-1");
addTicTacToePlayer(state, "player-2");

{
  const result = applyTicTacToeMove(state, { userId: "player-1", position: 0 });
  assert.equal(result.error, null);
  assert.equal(state.board[0], "X");
}

{
  const result = applyTicTacToeMove(state, { userId: "player-2", position: 4 });
  assert.equal(result.error, null);
  assert.equal(state.board[4], "O");
}

{
  const invalidTurn = applyTicTacToeMove(state, { userId: "player-2", position: 1 });
  assert.equal(invalidTurn.error, "NOT_YOUR_TURN");
}

{
  applyTicTacToeMove(state, { userId: "player-1", position: 1 });
  applyTicTacToeMove(state, { userId: "player-2", position: 8 });
  const winResult = applyTicTacToeMove(state, { userId: "player-1", position: 2 });
  assert.equal(winResult.error, null);
  assert.equal(state.winner, "X");
}
