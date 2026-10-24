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

// 2-player reverse acts as skip (returns turn to player)
{
  const state2 = createUnoState("p1");
  addUnoPlayer(state2, "p2");
  startUnoGame(state2);
  state2.players[0].hand = [{ color: "red", value: "reverse", type: "reverse" }];
  state2.currentColor = "red";
  state2.currentValue = 5;
  state2.currentPlayerIndex = 0;

  const result = applyUnoMove(state2, { userId: "p1", type: "play", cardIndex: 0 });
  assert.equal(result.error, null);
  // Hand is empty, player 1 wins!
  assert.equal(state2.status, "finished");
  assert.equal(state2.winnerId, "p1");
}