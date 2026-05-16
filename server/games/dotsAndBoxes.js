const ROWS = 5;
const COLS = 5;

function createEmptyGrid(rows, cols) {
  const grid = [];
  for (let r = 0; r <= rows; r++) {
    const row = [];
    for (let c = 0; c <= cols; c++) {
      row.push({ h: 0, v: 0, p: 0 });
    }
    grid.push(row);
  }
  return grid;
}

function isBoxComplete(grid, r, c) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
  return (
    grid[r][c].h !== 0 &&
    grid[r][c].v !== 0 &&
    grid[r][c + 1].v !== 0 &&
    grid[r + 1][c].h !== 0
  );
}

export function createDotsAndBoxesState(hostId) {
  return {
    rows: ROWS,
    cols: COLS,
    grid: createEmptyGrid(ROWS, COLS),
    players: [{ userId: hostId, score: 0 }],
    currentPlayerIndex: 0,
    status: "waiting",
    winnerId: null,
    isDraw: false,
    totalBoxes: ROWS * COLS,
  };
}

export function addDotsAndBoxesPlayer(state, userId) {
  if (state.players.length >= 2) return;
  if (state.players.some((p) => p.userId === userId)) return;
  state.players.push({ userId, score: 0 });
}

export function startDotsAndBoxesGame(state) {
  state.status = "active";
}

export function applyDotsAndBoxesMove(state, { userId, row, col, orientation }) {
  if (state.players.length < 2) {
    return { state, error: "WAITING_FOR_PLAYERS" };
  }
  if (state.winnerId || state.isDraw) {
    return { state, error: "GAME_OVER" };
  }
  if (state.status !== "active") {
    return { state, error: "GAME_NOT_ACTIVE" };
  }

  const playerIndex = state.players.findIndex((p) => p.userId === userId);
  if (playerIndex === -1) {
    return { state, error: "NOT_A_PLAYER" };
  }
  if (playerIndex !== state.currentPlayerIndex) {
    return { state, error: "NOT_YOUR_TURN" };
  }

  if (row < 0 || row > ROWS || col < 0 || col > COLS) {
    return { state, error: "OUT_OF_BOUNDS" };
  }
  if (orientation !== "h" && orientation !== "v") {
    return { state, error: "INVALID_ORIENTATION" };
  }
  if (orientation === "h" && row > ROWS) {
    return { state, error: "INVALID_MOVE" };
  }
  if (orientation === "v" && col > COLS) {
    return { state, error: "INVALID_MOVE" };
  }

  const grid = state.grid;
  const cell = grid[row][col];
  const lineKey = orientation === "h" ? "h" : "v";

  if (cell[lineKey] !== 0) {
    return { state, error: "LINE_ALREADY_DRAWN" };
  }

  const playerNum = playerIndex + 1;
  cell[lineKey] = playerNum;

  let scored = false;

  if (orientation === "h") {
    if (row > 0 && isBoxComplete(grid, row - 1, col)) {
      grid[row - 1][col].p = playerNum;
      state.players[playerIndex].score++;
      scored = true;
    }
    if (row < ROWS && isBoxComplete(grid, row, col)) {
      grid[row][col].p = playerNum;
      state.players[playerIndex].score++;
      scored = true;
    }
  } else {
    if (col > 0 && isBoxComplete(grid, row, col - 1)) {
      grid[row][col - 1].p = playerNum;
      state.players[playerIndex].score++;
      scored = true;
    }
    if (col < COLS && isBoxComplete(grid, row, col)) {
      grid[row][col].p = playerNum;
      state.players[playerIndex].score++;
      scored = true;
    }
  }

  if (!scored) {
    state.currentPlayerIndex = state.currentPlayerIndex === 0 ? 1 : 0;
  }

  const claimedBoxes = grid
    .slice(0, ROWS)
    .reduce((sum, row) => sum + row.slice(0, COLS).filter((c) => c.p !== 0).length, 0);

  if (claimedBoxes >= state.totalBoxes) {
    const s0 = state.players[0].score;
    const s1 = state.players[1].score;
    if (s0 > s1) {
      state.winnerId = state.players[0].userId;
    } else if (s1 > s0) {
      state.winnerId = state.players[1].userId;
    } else {
      state.isDraw = true;
    }
  }

  return { state, error: null };
}
