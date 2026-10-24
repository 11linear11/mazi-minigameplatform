const ROWS = 6;
const COLS = 7;

function createEmptyGrid() {
  const grid = [];
  for (let r = 0; r < ROWS; r++) {
    grid.push(new Array(COLS).fill(0));
  }
  return grid;
}

export function createConnect4State(hostId) {
  return {
    rows: ROWS,
    cols: COLS,
    grid: createEmptyGrid(),
    players: [{ userId: hostId, score: 0 }],
    currentPlayerIndex: 0,
    status: "waiting",
    winnerId: null,
    isDraw: false,
    winningCells: [],
    lastMove: null,
  };
}

export function addConnect4Player(state, userId) {
  if (state.players.length >= 2) return;
  if (state.players.some((p) => p.userId === userId)) return;
  state.players.push({ userId, score: 0 });
}

export function startConnect4Game(state) {
  state.status = "active";
}

function checkWin(grid, r, c, playerNum) {
  const directions = [
    [0, 1],  // Horizontal
    [1, 0],  // Vertical
    [1, 1],  // Diagonal \
    [-1, 1], // Diagonal /
  ];

  for (const [dr, dc] of directions) {
    const cells = [[r, c]];

    // Check forward
    for (let step = 1; step < 4; step++) {
      const nr = r + dr * step;
      const nc = c + dc * step;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] === playerNum) {
        cells.push([nr, nc]);
      } else {
        break;
      }
    }

    // Check backward
    for (let step = 1; step < 4; step++) {
      const nr = r - dr * step;
      const nc = c - dc * step;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] === playerNum) {
        cells.push([nr, nc]);
      } else {
        break;
      }
    }

    if (cells.length >= 4) {
      return cells;
    }
  }

  return null;
}

function isGridFull(grid) {
  for (let c = 0; c < COLS; c++) {
    if (grid[0][c] === 0) return false;
  }
  return true;
}

export function applyConnect4Move(state, { userId, col }) {
  if (state.players.length < 2) {
    return { state, error: "WAITING_FOR_PLAYERS" };
  }
  if (state.winnerId || state.isDraw || state.status === "finished") {
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

  const c = Number(col);
  if (isNaN(c) || c < 0 || c >= COLS) {
    return { state, error: "INVALID_COLUMN" };
  }

  // Find lowest empty row in column c
  let row = -1;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (state.grid[r][c] === 0) {
      row = r;
      break;
    }
  }

  if (row === -1) {
    return { state, error: "COLUMN_FULL" };
  }

  const playerNum = playerIndex + 1; // 1 or 2
  state.grid[row][c] = playerNum;
  state.lastMove = { row, col: c, player: playerNum };

  // Check win
  const winningCells = checkWin(state.grid, row, c, playerNum);
  if (winningCells) {
    state.status = "finished";
    state.winnerId = userId;
    state.winningCells = winningCells;
    state.players[playerIndex].score++;
    return { state, error: null };
  }

  // Check draw
  if (isGridFull(state.grid)) {
    state.status = "finished";
    state.isDraw = true;
    return { state, error: null };
  }

  // Switch turn
  state.currentPlayerIndex = state.currentPlayerIndex === 0 ? 1 : 0;
  return { state, error: null };
}
