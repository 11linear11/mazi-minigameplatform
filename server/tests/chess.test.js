import assert from "node:assert/strict";
import { applyChessMove, createChessState, addChessPlayer, getPlayerColor } from "../games/chess.js";

const state = createChessState("player-white");
addChessPlayer(state, "player-black");

// Verify players
{
  assert.equal(getPlayerColor(state, "player-white"), "white");
  assert.equal(getPlayerColor(state, "player-black"), "black");
}

// White pawn e2-e4
{
  const result = applyChessMove(state, {
    userId: "player-white",
    fromRow: 6,
    fromCol: 4,
    toRow: 4,
    toCol: 4,
  });
  assert.equal(result.error, null);
  assert.equal(state.board[4][4]?.type, "pawn");
  assert.equal(state.board[6][4], null);
  assert.equal(state.currentPlayer, "black");
}

// Wrong turn
{
  const result = applyChessMove(state, {
    userId: "player-white",
    fromRow: 6,
    fromCol: 3,
    toRow: 4,
    toCol: 3,
  });
  assert.equal(result.error, "NOT_YOUR_TURN");
}

// Black pawn e7-e5
{
  const result = applyChessMove(state, {
    userId: "player-black",
    fromRow: 1,
    fromCol: 4,
    toRow: 3,
    toCol: 4,
  });
  assert.equal(result.error, null);
  assert.equal(state.currentPlayer, "white");
}

// White knight b1-c3
{
  const result = applyChessMove(state, {
    userId: "player-white",
    fromRow: 7,
    fromCol: 1,
    toRow: 5,
    toCol: 2,
  });
  assert.equal(result.error, null);
  assert.equal(state.board[5][2]?.type, "knight");
}

// Black bishop f8-c5
{
  const result = applyChessMove(state, {
    userId: "player-black",
    fromRow: 0,
    fromCol: 5,
    toRow: 4,
    toCol: 1,
  });
  assert.equal(result.error, null);
  assert.equal(state.board[4][1]?.type, "bishop");
}

// Invalid move - knight tries to move like rook
{
  const result = applyChessMove(state, {
    userId: "player-white",
    fromRow: 5,
    fromCol: 2,
    toRow: 5,
    toCol: 4,
  });
  assert.equal(result.error, "INVALID_MOVE");
}

// Quick checkmate: Fool's mate style
const state2 = createChessState("p1");
addChessPlayer(state2, "p2");

// f2-f3
applyChessMove(state2, { userId: "p1", fromRow: 6, fromCol: 5, toRow: 5, toCol: 5 });
// e7-e5
applyChessMove(state2, { userId: "p2", fromRow: 1, fromCol: 4, toRow: 3, toCol: 4 });
// g2-g4
applyChessMove(state2, { userId: "p1", fromRow: 6, fromCol: 6, toRow: 4, toCol: 6 });
// d8-h4# checkmate
{
  const result = applyChessMove(state2, { userId: "p2", fromRow: 0, fromCol: 3, toRow: 4, toCol: 7 });
  assert.equal(result.error, null);
  assert.equal(state2.isCheckmate, true);
  assert.equal(state2.winner, "black");
}