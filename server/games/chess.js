export function createChessState(hostId) {
  const board = initialBoard();
  return {
    board,
    currentPlayer: "white",
    players: [{ userId: hostId, color: "white" }],
    isCheck: false,
    isCheckmate: false,
    winner: null,
    isDraw: false,
    moveHistory: [],
  };
}

export function addChessPlayer(state, userId) {
  if (state.players.length >= 2) {
    return state;
  }
  if (state.players.some((p) => p.userId === userId)) {
    return state;
  }
  state.players.push({ userId, color: "black" });
  return state;
}

export function getPlayerColor(state, userId) {
  const player = state.players.find((p) => p.userId === userId);
  return player?.color ?? null;
}

export function applyChessMove(state, { userId, fromRow, fromCol, toRow, toCol }) {
  if (state.winner || state.isCheckmate || state.isDraw) {
    return { state, error: "GAME_OVER" };
  }
  if (state.players.length < 2) {
    return { state, error: "WAITING_FOR_PLAYERS" };
  }
  const color = getPlayerColor(state, userId);
  if (!color) {
    return { state, error: "NOT_A_PLAYER" };
  }
  if (color !== state.currentPlayer) {
    return { state, error: "NOT_YOUR_TURN" };
  }
  if (
    fromRow < 0 || fromRow > 7 || fromCol < 0 || fromCol > 7 ||
    toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7
  ) {
    return { state, error: "INVALID_MOVE" };
  }
  const piece = state.board[fromRow][fromCol];
  if (!piece || piece.color !== color) {
    return { state, error: "INVALID_PIECE" };
  }

  const legalMoves = getLegalMoves(state, fromRow, fromCol);
  if (!legalMoves.some((m) => m.row === toRow && m.col === toCol)) {
    return { state, error: "INVALID_MOVE" };
  }

  // Make move
  const captured = state.board[toRow][toCol];
  state.board[toRow][toCol] = piece;
  state.board[fromRow][fromCol] = null;

  // Pawn promotion (auto-queen)
  if (piece.type === "pawn" && (toRow === 0 || toRow === 7)) {
    state.board[toRow][toCol] = { type: "queen", color: piece.color };
  }

  state.moveHistory.push({ fromRow, fromCol, toRow, toCol, piece: piece.type, captured: captured?.type });

  // Check if opponent in check or checkmate
  const opponentColor = color === "white" ? "black" : "white";
  const opponentKing = findKing(state.board, opponentColor);
  if (isSquareAttacked(state.board, opponentKing.row, opponentKing.col, color)) {
    state.isCheck = true;
    if (isCheckmate(state, opponentColor)) {
      state.isCheckmate = true;
      state.winner = color;
    }
  } else {
    state.isCheck = false;
    // Check for stalemate
    if (isStalemate(state, opponentColor)) {
      state.isDraw = true;
    }
  }

  state.currentPlayer = opponentColor;
  return { state, error: null };
}

function initialBoard() {
  return [
    [
      { type: "rook", color: "black" },
      { type: "knight", color: "black" },
      { type: "bishop", color: "black" },
      { type: "queen", color: "black" },
      { type: "king", color: "black" },
      { type: "bishop", color: "black" },
      { type: "knight", color: "black" },
      { type: "rook", color: "black" },
    ],
    [
      { type: "pawn", color: "black" },
      { type: "pawn", color: "black" },
      { type: "pawn", color: "black" },
      { type: "pawn", color: "black" },
      { type: "pawn", color: "black" },
      { type: "pawn", color: "black" },
      { type: "pawn", color: "black" },
      { type: "pawn", color: "black" },
    ],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [
      { type: "pawn", color: "white" },
      { type: "pawn", color: "white" },
      { type: "pawn", color: "white" },
      { type: "pawn", color: "white" },
      { type: "pawn", color: "white" },
      { type: "pawn", color: "white" },
      { type: "pawn", color: "white" },
      { type: "pawn", color: "white" },
    ],
    [
      { type: "rook", color: "white" },
      { type: "knight", color: "white" },
      { type: "bishop", color: "white" },
      { type: "queen", color: "white" },
      { type: "king", color: "white" },
      { type: "bishop", color: "white" },
      { type: "knight", color: "white" },
      { type: "rook", color: "white" },
    ],
  ];
}

function getLegalMoves(state, row, col) {
  const piece = state.board[row][col];
  if (!piece) return [];

  const moves = [];
  const { type, color } = piece;
  const opponent = color === "white" ? "black" : "white";

  switch (type) {
    case "pawn":
      return getPawnMoves(state, row, col, color);
    case "rook":
      return getSlidingMoves(state, row, col, color, [
        [0, 1], [0, -1], [1, 0], [-1, 0],
      ]);
    case "bishop":
      return getSlidingMoves(state, row, col, color, [
        [1, 1], [1, -1], [-1, 1], [-1, -1],
      ]);
    case "queen":
      return getSlidingMoves(state, row, col, color, [
        [0, 1], [0, -1], [1, 0], [-1, 0],
        [1, 1], [1, -1], [-1, 1], [-1, -1],
      ]);
    case "knight":
      return getKnightMoves(state, row, col, color);
    case "king":
      return getKingMoves(state, row, col, color);
    default:
      return [];
  }
}

function getPawnMoves(state, row, col, color) {
  const moves = [];
  const direction = color === "white" ? -1 : 1;
  const startRow = color === "white" ? 6 : 1;

  // Single advance
  const fRow = row + direction;
  if (fRow >= 0 && fRow < 8 && !state.board[fRow][col]) {
    moves.push({ row: fRow, col });
    // Double advance from start
    const dRow = row + 2 * direction;
    if (row === startRow && !state.board[dRow][col]) {
      moves.push({ row: dRow, col });
    }
  }

  // Captures
  for (const dc of [-1, 1]) {
    const cCol = col + dc;
    if (cCol >= 0 && cCol < 8) {
      const target = state.board[fRow][cCol];
      if (target && target.color !== color) {
        moves.push({ row: fRow, col: cCol });
      }
    }
  }

  return filterSelfCheck(state, row, col, color, moves);
}

function getKnightMoves(state, row, col, color) {
  const moves = [];
  const deltas = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];
  for (const [dr, dc] of deltas) {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const target = state.board[r][c];
      if (!target || target.color !== color) {
        moves.push({ row: r, col: c });
      }
    }
  }
  return filterSelfCheck(state, row, col, color, moves);
}

function getKingMoves(state, row, col, color) {
  const moves = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const target = state.board[r][c];
        if (!target || target.color !== color) {
          moves.push({ row: r, col: c });
        }
      }
    }
  }
  return filterSelfCheck(state, row, col, color, moves);
}

function getSlidingMoves(state, row, col, color, directions) {
  const moves = [];
  for (const [dr, dc] of directions) {
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const target = state.board[r][c];
      if (!target) {
        moves.push({ row: r, col: c });
      } else {
        if (target.color !== color) {
          moves.push({ row: r, col: c });
        }
        break;
      }
      r += dr;
      c += dc;
    }
  }
  return filterSelfCheck(state, row, col, color, moves);
}

function filterSelfCheck(state, row, col, color, moves) {
  return moves.filter((move) => {
    // Simulate the move
    const piece = state.board[row][col];
    const target = state.board[move.row][move.col];
    state.board[move.row][move.col] = piece;
    state.board[row][col] = null;
    const king = findKing(state.board, color);
    const attacked = king ? isSquareAttacked(state.board, king.row, king.col, color === "white" ? "black" : "white") : true;
    // Undo
    state.board[row][col] = piece;
    state.board[move.row][move.col] = target;
    return !attacked;
  });
}

function isSquareAttacked(board, row, col, byColor) {
  // Check all possible attackers
  // Pawns
  const pawnDir = byColor === "white" ? 1 : -1;
  for (const dc of [-1, 1]) {
    const r = row + pawnDir;
    const c = col + dc;
    if (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const p = board[r][c];
      if (p && p.color === byColor && p.type === "pawn") return true;
    }
  }
  // Knights
  for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const p = board[r][c];
      if (p && p.color === byColor && p.type === "knight") return true;
    }
  }
  // King
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const p = board[r][c];
        if (p && p.color === byColor && p.type === "king") return true;
      }
    }
  }
  // Rook/Queen (straight lines)
  for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const p = board[r][c];
      if (p) {
        if (p.color === byColor && (p.type === "rook" || p.type === "queen")) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }
  // Bishop/Queen (diagonals)
  for (const [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const p = board[r][c];
      if (p) {
        if (p.color === byColor && (p.type === "bishop" || p.type === "queen")) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }
  return false;
}

function findKing(board, color) {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const p = board[row][col];
      if (p && p.type === "king" && p.color === color) {
        return { row, col };
      }
    }
  }
  return null;
}

function isCheckmate(state, color) {
  // Check if any piece of `color` has a legal move
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const p = state.board[row][col];
      if (p && p.color === color) {
        const moves = getLegalMoves(state, row, col);
        if (moves.length > 0) return false;
      }
    }
  }
  return true;
}

function isStalemate(state, color) {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const p = state.board[row][col];
      if (p && p.color === color) {
        const moves = getLegalMoves(state, row, col);
        if (moves.length > 0) return false;
      }
    }
  }
  return true;
}

export function getValidMovesForPiece(state, row, col) {
  const piece = state.board[row]?.[col];
  if (!piece) return [];
  if (piece.color !== state.currentPlayer) return [];
  if (state.winner || state.isCheckmate || state.isDraw) return [];
  return getLegalMoves(state, row, col);
}

function rcToKey(row, col) {
  return String.fromCharCode(97 + col) + (8 - row);
}

export function computeAllLegalMoves(state) {
  if (state.winner || state.isCheckmate || state.isDraw) return {};
  const dests = {};
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = state.board[row][col];
      if (piece && piece.color === state.currentPlayer) {
        const moves = getLegalMoves(state, row, col);
        if (moves.length > 0) {
          const key = rcToKey(row, col);
          dests[key] = moves.map((m) => rcToKey(m.row, m.col));
        }
      }
    }
  }
  return dests;
}