const COLORS = ["red", "yellow", "blue"];
const NUM_POSITIONS = 8;
const TIMER_SECONDS = 45;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(arr, n) {
  return shuffle(arr).slice(0, n);
}

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function isRotationValid(ring, rotation) {
  if (!ring.slotPositions || ring.slotPositions.length === 0) return false;
  for (const slotPos of ring.slotPositions) {
    const ballAtPos = (slotPos - rotation + NUM_POSITIONS) % NUM_POSITIONS;
    if (!ring.ballPositions.includes(ballAtPos)) {
      return false;
    }
    if (ring.labels[ballAtPos] !== ring.labels[slotPos]) {
      return false;
    }
  }
  return true;
}

function generateRing() {
  const labels = Array.from({ length: NUM_POSITIONS }, () => COLORS[Math.floor(Math.random() * 3)]);

  const numSlots = randInt(2, 3);
  const slotPositions = pickRandom([0, 1, 2, 3, 4, 5, 6, 7], numSlots);

  const numBalls = randInt(numSlots, 5);
  const ballPositions = pickRandom([0, 1, 2, 3, 4, 5, 6, 7], numBalls);

  const dummyRing = { labels, ballPositions, slotPositions };
  const validRotations = [];
  for (let R = 0; R < NUM_POSITIONS; R++) {
    if (isRotationValid(dummyRing, R)) {
      validRotations.push(R);
    }
  }

  if (validRotations.length === 0 || validRotations.length >= 7) {
    return generateRing();
  }

  const solutionRotation = validRotations[0];
  const invalidRotations = [];
  for (let R = 0; R < NUM_POSITIONS; R++) {
    if (!validRotations.includes(R)) {
      invalidRotations.push(R);
    }
  }
  const initialRotation = invalidRotations[randInt(0, invalidRotations.length - 1)];

  return { labels, ballPositions, slotPositions, initialRotation };
}

export function createLockPickState(hostId) {
  const rings = Array.from({ length: 5 }, () => generateRing());
  return {
    rings,
    players: [{
      userId: hostId,
      currentRotations: rings.map((r) => r.initialRotation),
      locked: rings.map(() => false),
    }],
    status: "waiting",
    winnerId: null,
    winnerName: null,
    isDraw: false,
    startedAt: null,
    timerDuration: TIMER_SECONDS,
  };
}

export function addLockPickPlayer(state, userId) {
  if (state.players.length >= 2) return;
  if (state.players.some((p) => p.userId === userId)) return;
  state.players.push({
    userId,
    currentRotations: state.rings.map((r) => r.initialRotation),
    locked: state.rings.map(() => false),
  });
}

export function applyLockPickMove(state, { userId, payload }) {
  if (state.status !== "active") return { state, error: "GAME_NOT_ACTIVE" };
  const playerIdx = state.players.findIndex((p) => p.userId === userId);
  if (playerIdx === -1) return { state, error: "NOT_A_PLAYER" };

  const player = state.players[playerIdx];

  if (state.startedAt) {
    const elapsed = (Date.now() - state.startedAt) / 1000;
    if (elapsed >= state.timerDuration) {
      finishGame(state);
      return { state, error: "TIME_UP" };
    }
  }

  if (payload.type === "rotate") {
    const ringIndex = payload.ringIndex;
    if (ringIndex < 0 || ringIndex >= state.rings.length) return { state, error: "INVALID_RING" };
    if (player.locked[ringIndex]) return { state, error: "RING_LOCKED" };
    const dir = payload.direction === -1 ? -1 : 1;
    player.currentRotations[ringIndex] = (player.currentRotations[ringIndex] + dir + NUM_POSITIONS) % NUM_POSITIONS;
    return { state, error: null };
  }

  if (payload.type === "lock") {
    const ringIndex = payload.ringIndex;
    if (ringIndex < 0 || ringIndex >= state.rings.length) return { state, error: "INVALID_RING" };
    if (player.locked[ringIndex]) return { state, error: "RING_LOCKED" };

    const ring = state.rings[ringIndex];
    const rotation = player.currentRotations[ringIndex];

    if (isRotationValid(ring, rotation)) {
      player.locked[ringIndex] = true;
      if (player.locked.every(Boolean)) {
        const winnerProfile = getProfile ? getProfile(userId) : null;
        state.winnerId = userId;
        state.winnerName = winnerProfile?.username ?? userId;
        state.status = "finished";
      }
      return { state, error: null };
    } else {
      return { state, error: "LOCK_FAILED" };
    }
  }

  return { state, error: "INVALID_PAYLOAD" };
}

export function finishGame(state) {
  if (state.status === "finished") return;
  state.status = "finished";

  const p0 = state.players[0];
  const p1 = state.players[1];
  const count0 = p0?.locked?.filter(Boolean).length ?? 0;
  const count1 = p1?.locked?.filter(Boolean).length ?? 0;

  if (p0 && (!p1 || count0 > count1)) {
    state.winnerId = p0.userId;
    const profile = getProfile ? getProfile(p0.userId) : null;
    state.winnerName = profile?.username ?? p0.userId;
    state.isDraw = false;
  } else if (p1 && count1 > count0) {
    state.winnerId = p1.userId;
    const profile = getProfile ? getProfile(p1.userId) : null;
    state.winnerName = profile?.username ?? p1.userId;
    state.isDraw = false;
  } else {
    state.winnerId = null;
    state.winnerName = null;
    state.isDraw = true;
  }
}

let getProfile = null;
export function setProfileGetter(fn) {
  getProfile = fn;
}
