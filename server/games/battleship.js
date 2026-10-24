const GRID_SIZE = 8;

export const SHIPS_CONFIG = [
  { id: "carrier", name: "ناو هواپیمابر", size: 4, icon: "🚢" },
  { id: "battleship", name: "رزم‌ناو", size: 3, icon: "🛳️" },
  { id: "submarine", name: "زیردریایی", size: 2, icon: "🚤" },
  { id: "destroyer", name: "ناوشکن", size: 2, icon: "🛥️" },
];

export function createEmptyGrid() {
  const grid = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    grid.push(new Array(GRID_SIZE).fill(0));
  }
  return grid;
}

export function generateRandomFleet() {
  const grid = createEmptyGrid();
  const ships = [];

  for (const ship of SHIPS_CONFIG) {
    let placed = false;
    let attempts = 0;

    while (!placed && attempts < 200) {
      attempts++;
      const isHorizontal = Math.random() < 0.5;
      const maxRow = isHorizontal ? GRID_SIZE : GRID_SIZE - ship.size;
      const maxCol = isHorizontal ? GRID_SIZE - ship.size : GRID_SIZE;

      const r = Math.floor(Math.random() * maxRow);
      const c = Math.floor(Math.random() * maxCol);

      // Check collision
      let canPlace = true;
      const coordinates = [];

      for (let s = 0; s < ship.size; s++) {
        const cr = isHorizontal ? r : r + s;
        const cc = isHorizontal ? c + s : c;

        // Check cell and adjacent cells for separation
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = cr + dr;
            const nc = cc + dc;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
              if (grid[nr][nc] !== 0) {
                canPlace = false;
                break;
              }
            }
          }
          if (!canPlace) break;
        }

        if (!canPlace) break;
        coordinates.push([cr, cc]);
      }

      if (canPlace) {
        for (const [cr, cc] of coordinates) {
          grid[cr][cc] = ship.id;
        }
        ships.push({
          id: ship.id,
          name: ship.name,
          size: ship.size,
          icon: ship.icon,
          coordinates,
          hits: 0,
          sunk: false,
        });
        placed = true;
      }
    }
  }

  return { grid, ships };
}

export function validateFleet(fleet) {
  if (!Array.isArray(fleet) || fleet.length !== 4) {
    return { valid: false, error: "باید دقیقاً ۴ ناو مستقر شوند" };
  }

  const expectedSizes = { carrier: 4, battleship: 3, submarine: 2, destroyer: 2 };
  const occupied = new Set();
  const validShips = [];
  const grid = createEmptyGrid();

  for (const ship of fleet) {
    const expectedSize = expectedSizes[ship.id];
    if (!expectedSize) {
      return { valid: false, error: `شناسه ناو نامعتبر است: ${ship.id}` };
    }
    if (!Array.isArray(ship.coordinates) || ship.coordinates.length !== expectedSize) {
      return { valid: false, error: `طول ناو ${ship.name || ship.id} باید ${expectedSize} خانه باشد` };
    }

    const coords = ship.coordinates;
    const isHorizontal = coords.every(([r]) => r === coords[0][0]);
    const isVertical = coords.every(([, c]) => c === coords[0][1]);

    if (!isHorizontal && !isVertical) {
      return { valid: false, error: `ناو ${ship.name || ship.id} باید در یک خط مستقیم افقی یا عمودی قرار گیرد` };
    }

    // Sort coordinates to verify continuity
    const sorted = [...coords].sort((a, b) => (isHorizontal ? a[1] - b[1] : a[0] - b[0]));
    for (let i = 0; i < sorted.length; i++) {
      const [r, c] = sorted[i];
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
        return { valid: false, error: "مختصات خارج از محدوده مجاز نقشه ۸×۸ است" };
      }
      if (i > 0) {
        const [prevR, prevC] = sorted[i - 1];
        if (isHorizontal && c !== prevC + 1) {
          return { valid: false, error: "خانه‌های ناو باید پیوسته و متصل باشند" };
        }
        if (isVertical && r !== prevR + 1) {
          return { valid: false, error: "خانه‌های ناو باید پیوسته و متصل باشند" };
        }
      }
      const key = `${r},${c}`;
      if (occupied.has(key)) {
        return { valid: false, error: "ناوها نباید روی یکدیگر همپوشانی داشته باشند" };
      }
      occupied.add(key);
      grid[r][c] = ship.id;
    }

    const config = SHIPS_CONFIG.find((sc) => sc.id === ship.id);
    validShips.push({
      id: ship.id,
      name: config?.name || ship.name || ship.id,
      size: expectedSize,
      icon: config?.icon || ship.icon || "🚢",
      coordinates: sorted,
      hits: 0,
      sunk: false,
    });
  }

  return { valid: true, ships: validShips, grid };
}

export function createBattleshipState(hostId) {
  const hostFleet = generateRandomFleet();

  return {
    size: GRID_SIZE,
    status: "placement", // "placement" | "active" | "finished"
    players: [
      {
        userId: hostId,
        score: 0,
        fleet: hostFleet.ships,
        shipGrid: hostFleet.grid,
        radarGrid: createEmptyGrid(), // 0: unshot, 1: miss, 2: hit
        ready: false,
      },
    ],
    currentPlayerIndex: 0,
    winnerId: null,
    isDraw: false,
    lastShot: null,
  };
}

export function addBattleshipPlayer(state, userId) {
  if (state.players.length >= 2) return;
  if (state.players.some((p) => p.userId === userId)) return;

  const guestFleet = generateRandomFleet();
  state.players.push({
    userId,
    score: 0,
    fleet: guestFleet.ships,
    shipGrid: guestFleet.grid,
    radarGrid: createEmptyGrid(),
    ready: false,
  });
  state.status = "placement";
}

export function startBattleshipGame(state, forceActive = false) {
  if (forceActive || (state.players.length === 2 && state.players.every((p) => p.ready))) {
    state.status = "active";
    state.players.forEach((p) => (p.ready = true));
  } else {
    state.status = "placement";
  }
}

// Strip hidden enemy ship coordinates & live hit counts so players can't cheat or know which ship is being hit!
export function sanitizeBattleshipStateForUser(state, userId) {
  const copy = {
    size: state.size,
    status: state.status,
    currentPlayerIndex: state.currentPlayerIndex,
    winnerId: state.winnerId,
    isDraw: state.isDraw,
    lastShot: state.lastShot,
    players: state.players.map((p) => {
      const isMe = p.userId === userId;
      return {
        userId: p.userId,
        score: p.score,
        ready: p.ready,
        // Only disclose full ship positions to the owner
        shipGrid: isMe ? p.shipGrid : undefined,
        radarGrid: p.radarGrid,
        fleet: p.fleet.map((s) => ({
          id: s.id,
          name: s.name,
          size: s.size,
          icon: s.icon,
          // CRITICAL FOG-OF-WAR: Hide hits on enemy ships unless they are completely sunk!
          hits: isMe || s.sunk ? s.hits : 0,
          sunk: s.sunk,
          // Hide exact coordinates of enemy unsunk ships
          coordinates: isMe || s.sunk ? s.coordinates : undefined,
        })),
      };
    }),
  };
  return copy;
}

export function applyBattleshipMove(state, payload) {
  const { userId, action, row, col } = payload;
  if (state.players.length < 2) {
    return { state, error: "WAITING_FOR_PLAYERS" };
  }
  if (state.winnerId || state.status === "finished") {
    return { state, error: "GAME_OVER" };
  }

  const playerIndex = state.players.findIndex((p) => p.userId === userId);
  if (playerIndex === -1) {
    return { state, error: "NOT_A_PLAYER" };
  }
  const myPlayer = state.players[playerIndex];

  // 1. Placement Phase Actions
  if (action === "randomize_fleet") {
    const newFleet = generateRandomFleet();
    myPlayer.fleet = newFleet.ships;
    myPlayer.shipGrid = newFleet.grid;
    myPlayer.ready = false;
    return { state, error: null };
  }

  if (action === "set_fleet") {
    const validation = validateFleet(payload.fleet);
    if (!validation.valid) {
      return { state, error: validation.error };
    }
    myPlayer.fleet = validation.ships;
    myPlayer.shipGrid = validation.grid;
    myPlayer.ready = false;
    return { state, error: null };
  }

  if (action === "ready") {
    if (payload.fleet) {
      const validation = validateFleet(payload.fleet);
      if (!validation.valid) {
        return { state, error: validation.error };
      }
      myPlayer.fleet = validation.ships;
      myPlayer.shipGrid = validation.grid;
    }
    myPlayer.ready = true;
    if (state.players.length === 2 && state.players.every((p) => p.ready)) {
      state.status = "active";
    }
    return { state, error: null };
  }

  if (action === "unready") {
    myPlayer.ready = false;
    if (state.status === "active") {
      state.status = "placement";
    }
    return { state, error: null };
  }

  // 2. Battle Actions (Shooting missiles)
  if (state.status !== "active") {
    return { state, error: "GAME_NOT_ACTIVE" };
  }

  if (playerIndex !== state.currentPlayerIndex) {
    return { state, error: "NOT_YOUR_TURN" };
  }

  const r = Number(row);
  const c = Number(col);
  if (isNaN(r) || isNaN(c) || r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
    return { state, error: "OUT_OF_BOUNDS" };
  }

  const enemyIndex = playerIndex === 0 ? 1 : 0;
  const enemyPlayer = state.players[enemyIndex];

  // Check if cell has already been targeted
  if (myPlayer.radarGrid[r][c] !== 0) {
    return { state, error: "ALREADY_FIRED" };
  }

  const targetShipId = enemyPlayer.shipGrid[r][c];
  let isHit = false;
  let sunkShip = null;

  if (targetShipId !== 0) {
    // HIT!
    isHit = true;
    myPlayer.radarGrid[r][c] = 2; // 2: hit

    // Find ship and increment hits
    const ship = enemyPlayer.fleet.find((s) => s.id === targetShipId);
    if (ship) {
      ship.hits++;
      if (ship.hits >= ship.size) {
        ship.sunk = true;
        sunkShip = ship;
        myPlayer.score += ship.size * 10;
      }
    }
  } else {
    // MISS!
    myPlayer.radarGrid[r][c] = 1; // 1: miss
  }

  state.lastShot = {
    shooterId: userId,
    row: r,
    col: c,
    isHit,
    sunkShip: sunkShip ? { id: sunkShip.id, name: sunkShip.name } : null,
  };

  // Check if all enemy ships are sunk
  const allSunk = enemyPlayer.fleet.every((s) => s.sunk);
  if (allSunk) {
    state.status = "finished";
    state.winnerId = userId;
    myPlayer.score += 100;
    return { state, error: null };
  }

  // If hit, player gets another shot! If miss, turn passes to enemy
  if (!isHit) {
    state.currentPlayerIndex = enemyIndex;
  }

  return { state, error: null };
}
