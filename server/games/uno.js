export function createUnoState(hostId) {
  return {
    deck: [],
    discard: [],
    players: [{ userId: hostId, hand: [] }],
    currentPlayerIndex: 0,
    direction: 1,
    currentColor: null,
    currentValue: null,
    status: "waiting",
    winnerId: null,
  };
}

export function addUnoPlayer(state, userId) {
  if (state.players.some((player) => player.userId === userId)) {
    return state;
  }
  state.players.push({ userId, hand: [] });
  return state;
}

export function startUnoGame(state) {
  if (state.status === "active") {
    return state;
  }
  if (state.players.length < 2) {
    return null;
  }
  state.deck = shuffle(createDeck());
  state.players.forEach((player) => {
    player.hand = [];
    drawCards(state, player, 7);
  });
  let topCard = state.deck.pop();
  while (topCard && (topCard.type === "wild" || topCard.type === "wild_draw4")) {
    state.deck.unshift(topCard);
    topCard = state.deck.pop();
  }
  if (topCard) {
    state.discard.push(topCard);
    state.currentColor = topCard.color;
    state.currentValue = topCard.value;
  }
  state.status = "active";
  return state;
}

export function applyUnoMove(state, payload) {
  if (state.status !== "active") {
    return { state, error: "NOT_STARTED" };
  }
  if (state.status === "finished") {
    return { state, error: "GAME_OVER" };
  }

  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.userId !== payload.userId) {
    return { state, error: "NOT_YOUR_TURN" };
  }

  if (payload.type === "draw") {
    drawCards(state, currentPlayer, 1);
    advanceTurn(state, 1);
    return { state, error: null };
  }

  if (payload.type !== "play") {
    return { state, error: "INVALID_ACTION" };
  }

  const card = currentPlayer.hand[payload.cardIndex];
  if (!card) {
    return { state, error: "INVALID_CARD" };
  }

  if (!canPlayCard(card, state.currentColor, state.currentValue)) {
    return { state, error: "CANNOT_PLAY" };
  }

  currentPlayer.hand.splice(payload.cardIndex, 1);
  state.discard.push(card);
  if (card.type === "wild" || card.type === "wild_draw4") {
    state.currentColor = payload.chosenColor ?? "red";
    state.currentValue = card.type;
  } else {
    state.currentColor = card.color;
    state.currentValue = card.value;
  }

  let skipCount = 0;
  if (card.type === "reverse") {
    state.direction *= -1;
  }
  if (card.type === "skip") {
    skipCount = 1;
  }
  if (card.type === "draw2") {
    const nextPlayer = getNextPlayer(state, 1);
    drawCards(state, nextPlayer, 2);
    skipCount = 1;
  }
  if (card.type === "wild_draw4") {
    const nextPlayer = getNextPlayer(state, 1);
    drawCards(state, nextPlayer, 4);
    skipCount = 1;
  }

  if (currentPlayer.hand.length === 0) {
    state.status = "finished";
    state.winnerId = currentPlayer.userId;
    return { state, error: null };
  }

  advanceTurn(state, 1 + skipCount);
  return { state, error: null };
}



function createDeck() {
  const colors = ["red", "yellow", "green", "blue"];
  const deck = [];
  for (const color of colors) {
    for (let value = 0; value <= 9; value += 1) {
      deck.push({ color, value, type: "number" });
      if (value !== 0) {
        deck.push({ color, value, type: "number" });
      }
    }
    ["skip", "reverse", "draw2"].forEach((type) => {
      deck.push({ color, value: type, type });
      deck.push({ color, value: type, type });
    });
  }
  for (let i = 0; i < 4; i += 1) {
    deck.push({ color: null, value: "wild", type: "wild" });
    deck.push({ color: null, value: "wild_draw4", type: "wild_draw4" });
  }
  return deck;
}

function shuffle(deck) {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function canPlayCard(card, currentColor, currentValue) {
  if (card.type === "wild" || card.type === "wild_draw4") {
    return true;
  }
  return card.color === currentColor || card.value === currentValue;
}

function drawCards(state, player, count) {
  for (let i = 0; i < count; i += 1) {
    if (state.deck.length === 0) {
      reshuffle(state);
    }
    const card = state.deck.pop();
    if (card) {
      player.hand.push(card);
    }
  }
}

function reshuffle(state) {
  const top = state.discard.pop();
  state.deck = shuffle(state.discard);
  state.discard = top ? [top] : [];
}

function getNextPlayer(state, step) {
  const count = state.players.length;
  const nextIndex = (state.currentPlayerIndex + state.direction * step + count) % count;
  return state.players[nextIndex];
}

function advanceTurn(state, step) {
  const count = state.players.length;
  state.currentPlayerIndex = (state.currentPlayerIndex + state.direction * step + count) % count;
}
