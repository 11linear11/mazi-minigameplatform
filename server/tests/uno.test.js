import assert from "node:assert/strict";
import { addUnoPlayer, applyUnoMove, createUnoState, startUnoGame } from "../games/uno.js";

const state = createUnoState("p1");
addUnoPlayer(state, "p2");

// Moves before starting should be blocked.
{
  const result = applyUnoMove(state, { userId: "p1", type: "draw" });
  assert.equal(result.error, "NOT_STARTED");
}

// Start the game explicitly.
{
  startUnoGame(state);
  assert.equal(state.status, "active");
}

// After starting, draw should work for the first player.
{
  const result = applyUnoMove(state, { userId: "p1", type: "draw" });
  assert.equal(result.error, null);
}

// Ensure wrong turn is blocked.
{
  const result = applyUnoMove(state, { userId: "p1", type: "draw" });
  assert.equal(result.error, "NOT_YOUR_TURN");
}

// Play a valid card from current player if possible.
{
  const currentPlayer = state.players[state.currentPlayerIndex];
  const playableIndex = currentPlayer.hand.findIndex(
    (card) => card.color === state.currentColor || card.value === state.currentValue || card.type === "wild"
  );
  if (playableIndex >= 0) {
    const result = applyUnoMove(state, { userId: currentPlayer.userId, type: "play", cardIndex: playableIndex, chosenColor: "red" });
    assert.equal(result.error, null);
  }
}