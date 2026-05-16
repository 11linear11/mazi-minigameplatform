export const TTT_PLAYER_X = "X";
export const TTT_PLAYER_O = "O";

export function createTicTacToeState(hostId) {
  return {
    board: Array(9).fill(null),
    currentPlayer: TTT_PLAYER_X,
    players: [{ userId: hostId, symbol: TTT_PLAYER_X }],
    winner: null,
    isDraw: false,
  };
}

export function addTicTacToePlayer(state, userId) {
  if (state.players.length >= 2) {
    return state;
  }
  if (state.players.some((player) => player.userId === userId)) {
    return state;
  }
  state.players.push({ userId, symbol: TTT_PLAYER_O });
  return state;
}

export function getPlayerSymbol(state, userId) {
  const player = state.players.find((entry) => entry.userId === userId);
  return player?.symbol ?? null;
}

export function applyTicTacToeMove(state, { userId, position }) {
  if (state.players.length < 2) {
    return { state, error: "WAITING_FOR_PLAYERS" };
  }
  if (state.winner || state.isDraw) {
    return { state, error: "GAME_OVER" };
  }
  const symbol = getPlayerSymbol(state, userId);
  if (!symbol) {
    return { state, error: "NOT_A_PLAYER" };
  }
  if (symbol !== state.currentPlayer) {
    return { state, error: "NOT_YOUR_TURN" };
  }
  if (position < 0 || position > 8 || state.board[position]) {
    return { state, error: "INVALID_MOVE" };
  }

  state.board[position] = symbol;
  const winner = checkWinner(state.board);
  if (winner) {
    state.winner = winner;
  } else if (state.board.every(Boolean)) {
    state.isDraw = true;
  } else {
    state.currentPlayer = state.currentPlayer === TTT_PLAYER_X ? TTT_PLAYER_O : TTT_PLAYER_X;
  }

  return { state, error: null };
}

function checkWinner(board) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}
