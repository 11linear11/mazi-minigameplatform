import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  addTicTacToePlayer,
  applyTicTacToeMove,
  createTicTacToeState,
} from "./games/ticTacToe.js";
import { addUnoPlayer, applyUnoMove, createUnoState, startUnoGame } from "./games/uno.js";
import { addChessPlayer, applyChessMove, computeAllLegalMoves, createChessState } from "./games/chess.js";
import {
  addLockPickPlayer,
  applyLockPickMove,
  createLockPickState,
  finishGame,
  setProfileGetter as setLockPickProfileGetter,
} from "./games/lockpick.js";
import {
  addDotsAndBoxesPlayer,
  applyDotsAndBoxesMove,
  createDotsAndBoxesState,
  startDotsAndBoxesGame,
} from "./games/dotsAndBoxes.js";
import {
  addMessage,
  createInvite,
  createRoom,
  deleteRoom,
  getInvite,
  getRoomSnapshot,
  listRooms,
  updateGameMessage,
  updateRoom,
  joinRoom,
  leaveRoom,
} from "./rooms.js";
import { listGameConfigs, updateGameConfig } from "./games.js";
import { awardXp, ensureProfile, getProfile, recordWin, updateStatus, authenticate, changePassword, updateTags } from "./profiles.js";
import { initDB } from "./db.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const avatarsDir = path.join(__dirname, "public", "avatars");
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}
app.use("/avatars", express.static(avatarsDir));

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: avatarsDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".png";
      cb(null, `avatar-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const sessions = new Map();
const gameStates = new Map();
const disconnectTimers = new Map();
const gameAllLeftTimers = new Map();
const endGameRequests = new Map();
const externalGames = ["Among Us", "Minecraft", "Valorant", "Ludo"];
const gameRequirements = {
  "Tic Tac Toe": { minPlayers: 2, maxPlayers: 2 },
  Uno: { minPlayers: 2, maxPlayers: 4 },
  Chess: { minPlayers: 2, maxPlayers: 2 },
  LockPick: { minPlayers: 2, maxPlayers: 2 },
  "Dots & Boxes": { minPlayers: 2, maxPlayers: 2 },
};
setLockPickProfileGetter(getProfile);
initDB();

createRoom({
  roomId: "room-1",
  name: "کافه گیمرها",
  icon: "🎮",
  topic: "چت و بازی آزاد",
  privacy: "public",
});

function createSession({ roomId, gameType, hostId }) {
  const requirements = gameRequirements[gameType] ?? { minPlayers: 2, maxPlayers: 8 };
  const sessionId = `session-${Date.now()}`;
  const hostProfile = getProfile(hostId);
  const session = {
    id: sessionId,
    roomId,
    gameType,
    status: "waiting",
    hostId,
    players: [{ userId: hostId, ready: false, connected: true, username: hostProfile?.username ?? hostId, gameClosed: false }],
    minPlayers: requirements.minPlayers,
    maxPlayers: requirements.maxPlayers,
    createdAt: new Date().toISOString(),
  };
  sessions.set(sessionId, session);
  if (gameType === "Tic Tac Toe") {
    gameStates.set(sessionId, createTicTacToeState(hostId));
  }
  if (gameType === "Uno") {
    gameStates.set(sessionId, createUnoState(hostId));
  }
  if (gameType === "Chess") {
    gameStates.set(sessionId, createChessState(hostId));
  }
  if (gameType === "LockPick") {
    gameStates.set(sessionId, createLockPickState(hostId));
  }
  if (gameType === "Dots & Boxes") {
    gameStates.set(sessionId, createDotsAndBoxesState(hostId));
  }
  if (externalGames.includes(gameType)) {
    session.meta = { roomCode: Math.random().toString(36).slice(2, 8).toUpperCase() };
  }
  return session;
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

function buildRoomPayload(roomId) {
  const snapshot = getRoomSnapshot(roomId);
  const memberProfiles = (snapshot.members ?? []).map((memberId) =>
    getProfile(memberId) ?? { userId: memberId, username: memberId, avatar: "👤" }
  );
  return { ...snapshot, memberProfiles };
}

app.get("/profile/:userId", (req, res) => {
  const profile = getProfile(req.params.userId);
  if (!profile) {
    res.status(404).json({ error: "USER_NOT_FOUND" });
    return;
  }
  const { passwordHash, ...safeProfile } = profile;
  res.json({ profile: safeProfile });
});

app.get("/rooms", (_req, res) => {
  res.json({ rooms: listRooms() });
});

app.post("/auth/guest", (req, res) => {
  const { userId, username, avatar, password } = req.body ?? {};
  if (!userId || !username) {
    res.status(400).json({ error: "INVALID_PAYLOAD" });
    return;
  }
  const profile = ensureProfile({ userId, username, avatar, password });
  res.json({ profile });
});

app.post("/auth/login", (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    res.status(400).json({ error: "INVALID_PAYLOAD" });
    return;
  }
  const { profile, error } = authenticate(username, password);
  if (error) {
    res.status(401).json({ error });
    return;
  }
  res.json({ profile });
});

app.get("/games/config", (_req, res) => {
  res.json({ games: listGameConfigs() });
});

app.put("/games/config/:gameId", (req, res) => {
  const { userId, name, icon, description, minPlayers, maxPlayers, active } = req.body ?? {};
  const profile = getProfile(userId);
  if (!profile?.isAdmin) {
    res.status(403).json({ error: "FORBIDDEN" });
    return;
  }
  const result = updateGameConfig({ gameId: req.params.gameId, name, icon, description, minPlayers, maxPlayers, active });
  if (result.error) {
    res.status(400).json(result);
    return;
  }
  res.json({ success: true });
});

app.post("/games/config/avatar/:gameId", avatarUpload.single("avatar"), (req, res) => {
  const { gameId } = req.params;
  const { userId } = req.body ?? {};
  const profile = getProfile(userId);
  if (!profile?.isAdmin) {
    res.status(403).json({ error: "FORBIDDEN" });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: "NO_FILE" });
    return;
  }
  const avatarUrl = `/avatars/${req.file.filename}`;
  updateGameConfig({ gameId, avatar: avatarUrl });
  res.json({ avatar: avatarUrl });
});

app.post("/profile/avatar", avatarUpload.single("avatar"), (req, res) => {
  const { userId } = req.body ?? {};
  if (!userId || !req.file) {
    res.status(400).json({ error: "INVALID_PAYLOAD" });
    return;
  }
  const avatarUrl = `/avatars/${req.file.filename}`;
  const profile = ensureProfile({ userId });
  profile.avatar = avatarUrl;
  const { passwordHash, ...safeProfile } = profile;
  res.json({ profile: safeProfile });
});

app.post("/profile/tags", (req, res) => {
  const { userId, tags } = req.body ?? {};
  if (!userId || !Array.isArray(tags)) {
    res.status(400).json({ error: "INVALID_PAYLOAD" });
    return;
  }
  const { profile, error } = updateTags(userId, tags);
  if (error) {
    res.status(400).json({ error });
    return;
  }
  const { passwordHash, ...safeProfile } = profile;
  res.json({ profile: safeProfile });
});

app.post("/room/avatar", avatarUpload.single("avatar"), (req, res) => {
  const { roomId, userId } = req.body ?? {};
  if (!roomId || !userId || !req.file) {
    res.status(400).json({ error: "INVALID_PAYLOAD" });
    return;
  }
  const avatarUrl = `/avatars/${req.file.filename}`;
  const result = updateRoom({ roomId, userId, avatar: avatarUrl });
  if (result.error) {
    res.status(403).json({ error: result.error });
    return;
  }
  res.json({ avatar: avatarUrl });
});

app.post("/auth/change-password", (req, res) => {
  const { userId, newPassword } = req.body ?? {};
  if (!userId || !newPassword) {
    res.status(400).json({ error: "INVALID_PAYLOAD" });
    return;
  }
  const { profile, error } = changePassword(userId, newPassword);
  if (error) {
    res.status(400).json({ error });
    return;
  }
  res.json({ profile });
});

io.on("connection", (socket) => {
  socket.on("create_room", ({ roomId, name, icon, topic, privacy, isTemporary, ownerId }) => {
    const room = createRoom({ roomId, name, icon, topic, privacy, isTemporary, ownerId });
    socket.join(roomId);
    socket.data.userId = ownerId;
    io.emit("room_created", buildRoomPayload(room.id));
    const payload = buildRoomPayload(room.id);
    payload.joiningUserId = ownerId;
    socket.emit("room_joined", payload);
  });

  socket.on("join_room", ({ roomId, userId, username, avatar, inviteCode }) => {
    ensureProfile({ userId, username, avatar });
    const result = joinRoom({ roomId, userId, inviteCode });
    if (result.error) {
      socket.emit("room_join_error", { roomId, error: result.error });
      return;
    }
    socket.join(roomId);
    socket.data.userId = userId;
    const payload = buildRoomPayload(roomId);
    payload.joiningUserId = userId;
    socket.emit("room_joined", payload);
    socket.to(roomId).emit("member_update", payload);
  });

  socket.on("leave_room", ({ roomId, userId }) => {
    socket.leave(roomId);
    const { room, removed } = leaveRoom({ roomId, userId });
    if (removed) {
      io.emit("room_removed", { roomId });
      return;
    }
    if (room) {
      socket.to(roomId).emit("member_update", buildRoomPayload(roomId));
    }
  });

  socket.on("delete_room", ({ roomId, userId }) => {
    const result = deleteRoom(roomId, userId);
    if (result.error) {
      socket.emit("delete_room_error", { error: result.error });
      return;
    }
    io.emit("room_removed", { roomId });
    socket.emit("room_deleted", { roomId });
  });

  socket.on("update_room", ({ roomId, userId, name, icon, topic, privacy }) => {
    const result = updateRoom({ roomId, userId, name, icon, topic, privacy });
    if (result.error) {
      socket.emit("update_room_error", { error: result.error });
      return;
    }
    io.emit("room_updated", buildRoomPayload(roomId));
  });

  socket.on("send_message", ({ roomId, message, userId }) => {
    addMessage(roomId, message);
    io.to(roomId).emit("message_received", message);
    io.emit("room_new_message", { roomId });
  });

  socket.on("create_invite", ({ roomId, userId, ttlMinutes }) => {
    const invite = createInvite({ roomId, createdBy: userId, ttlMinutes });
    socket.emit("invite_created", invite);
  });

  socket.on("resolve_invite", ({ code }) => {
    const invite = getInvite(code);
    socket.emit("invite_resolved", invite ?? null);
  });

  socket.on("update_status", ({ userId, status }) => {
    const profile = updateStatus(userId, status);
    socket.emit("status_updated", profile);
  });

  socket.on("start_game", ({ roomId, gameType, hostId }) => {
    const session = createSession({ roomId, gameType, hostId });
    io.to(roomId).emit("game_started", session);
    const hostProfile = getProfile(hostId);
    const hostName = hostProfile?.username ?? hostId;
    const gameMessage = {
      id: `game-${Date.now()}`,
      user: "GameBot",
      avatar: "🎮",
      content: `${gameType} شروع شد توسط ${hostName}`,
      time: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
      isGameCard: true,
      gameTitle: gameType,
      players: `1/${session.minPlayers}`,
      sessionId: session.id,
      gameStatus: "waiting",
    };
    addMessage(roomId, gameMessage);
    io.to(roomId).emit("message_received", gameMessage);
    const gameState = gameStates.get(session.id);
    if (gameState) {
      const legalMoves = session.gameType === "Chess" ? computeAllLegalMoves(gameState) : undefined;
      io.to(roomId).emit("game_state", { sessionId: session.id, state: gameState, legalMoves, error: null });
    }
  });


  socket.on("join_game", ({ sessionId, userId }) => {
    const session = sessions.get(sessionId);
    if (!session || session.status !== "waiting") {
      return;
    }
    const alreadyJoined = session.players.some((player) => player.userId === userId);
    if (alreadyJoined) {
      const player = session.players.find((p) => p.userId === userId);
      if (player && (!player.connected || player.gameClosed)) {
        player.connected = true;
        player.disconnectedAt = null;
        player.gameClosed = false;
        io.to(session.roomId).emit("game_joined", session);
        io.to(session.roomId).emit("player_reconnected", { sessionId, userId, username: getProfile(userId)?.username ?? userId });
      }
      return;
    }
    if (session.players.length >= session.maxPlayers) {
      return;
    }
    const joiningProfile = getProfile(userId);
    session.players.push({ userId, ready: false, connected: true, username: joiningProfile?.username ?? userId, gameClosed: false });
    const gameState = gameStates.get(sessionId);
    if (gameState && session.gameType === "Tic Tac Toe") {
      addTicTacToePlayer(gameState, userId);
    }
    if (gameState && session.gameType === "Uno") {
      addUnoPlayer(gameState, userId);
    }
    if (gameState && session.gameType === "Chess") {
      addChessPlayer(gameState, userId);
    }
    if (gameState && session.gameType === "LockPick") {
      addLockPickPlayer(gameState, userId);
    }
    if (gameState && session.gameType === "Dots & Boxes") {
      addDotsAndBoxesPlayer(gameState, userId);
    }
    if (session.players.length >= session.minPlayers) {
      io.to(session.roomId).emit("game_status", session);
    }
    io.to(session.roomId).emit("game_joined", session);
    io.to(session.roomId).emit("game_players", {
      sessionId,
      players: session.players.length,
      maxPlayers: session.minPlayers,
    });
    const updatedMessage = updateGameMessage(session.roomId, sessionId, {
      players: `${session.players.length}/${session.minPlayers}`,
    });
    if (updatedMessage) {
      io.to(session.roomId).emit("message_updated", updatedMessage);
    }
    const updatedState = gameStates.get(sessionId);
    if (updatedState) {
      const legalMoves = session.gameType === "Chess" ? computeAllLegalMoves(updatedState) : undefined;
      io.to(session.roomId).emit("game_state", { sessionId, state: updatedState, legalMoves, error: null });
    }
  });

  socket.on("game_move", ({ sessionId, userId, payload }) => {
    const session = sessions.get(sessionId);
    const gameState = gameStates.get(sessionId);
    if (!session || !gameState) {
      return;
    }
    if (session.status !== "active") {
      io.to(session.roomId).emit("game_state", {
        sessionId,
        state: gameState,
        error: "WAITING_FOR_PLAYERS",
      });
      return;
    }
    let result = { state: gameState, error: null };
    if (session.gameType === "Tic Tac Toe") {
      result = applyTicTacToeMove(gameState, { userId, position: payload?.position });
    } else if (session.gameType === "Uno") {
      result = applyUnoMove(gameState, { ...payload, userId });
    } else if (session.gameType === "Chess") {
      result = applyChessMove(gameState, { userId, ...payload });
    } else if (session.gameType === "LockPick") {
      result = applyLockPickMove(gameState, { userId, payload });
    } else if (session.gameType === "Dots & Boxes") {
      result = applyDotsAndBoxesMove(gameState, { userId, ...payload });
    }
    const legalMoves = session.gameType === "Chess" ? computeAllLegalMoves(gameState) : undefined;
    io.to(session.roomId).emit("game_state", {
      sessionId,
      state: gameState,
      legalMoves,
      error: result.error,
    });
    if (gameState.winner || gameState.isDraw || gameState.winnerId) {
      session.status = "finished";
      let winnerUserId = null;
      let winnerName = null;
      if (gameState.winnerId) {
        recordWin(gameState.winnerId, session.gameType);
        awardXp(gameState.winnerId, 1);
        winnerUserId = gameState.winnerId;
        const winnerProfile = getProfile(gameState.winnerId);
        winnerName = winnerProfile?.username ?? gameState.winnerId;
      } else if (gameState.winner && Array.isArray(gameState.players)) {
        const winner = gameState.players.find((player) => player.symbol === gameState.winner || player.color === gameState.winner);
        if (winner) {
          recordWin(winner.userId, session.gameType);
          awardXp(winner.userId, 1);
          winnerUserId = winner.userId;
          const winnerProfile = getProfile(winner.userId);
          winnerName = winnerProfile?.username ?? winner.userId;
        }
      }
      io.to(session.roomId).emit("game_ended", {
        sessionId,
        result: {
          winner: winnerUserId,
          draw: gameState.isDraw,
          winnerName,
        },
      });
      const winnerChatMsg = winnerName
        ? {
            id: `sys-${Date.now()}`,
            user: "GameBot",
            avatar: "🎉",
            content: `${winnerName} ${session.gameType} رو بُرد! +1 XP`,
            time: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
            isSystem: true,
          }
        : gameState.isDraw
        ? {
            id: `sys-${Date.now()}`,
            user: "GameBot",
            avatar: "🤝",
            content: `${session.gameType} مساوی شد!`,
            time: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
            isSystem: true,
          }
        : null;
      if (winnerChatMsg) {
        addMessage(session.roomId, winnerChatMsg);
        io.to(session.roomId).emit("message_received", winnerChatMsg);
      }
      const endedMessage = updateGameMessage(session.roomId, sessionId, { gameStatus: "ended" });
      if (endedMessage) {
        io.to(session.roomId).emit("message_updated", endedMessage);
      }
      endGameRequests.delete(sessionId);
      const allLeftTimer = gameAllLeftTimers.get(sessionId);
      if (allLeftTimer) {
        clearTimeout(allLeftTimer);
        gameAllLeftTimers.delete(sessionId);
      }
      sessions.delete(sessionId);
      gameStates.delete(sessionId);
    }
  });

  socket.on("start_session", ({ sessionId, userId }) => {
    const session = sessions.get(sessionId);
    if (!session || session.hostId !== userId) {
      return;
    }
    if (session.players.length < session.minPlayers) {
      return;
    }
    const gameState = gameStates.get(sessionId);
    if (gameState && session.gameType === "Uno") {
      startUnoGame(gameState);
    }
    if (gameState && session.gameType === "Dots & Boxes") {
      startDotsAndBoxesGame(gameState);
    }
    if (gameState && session.gameType === "LockPick") {
      gameState.startedAt = Date.now();
      gameState.status = "active";
      const timerId = setTimeout(() => {
        const gs = gameStates.get(sessionId);
        if (gs && gs.status === "active") {
          finishGame(gs);
          session.status = "finished";
          io.to(session.roomId).emit("game_ended", {
            sessionId,
            result: {
              winner: gs.winnerId,
              draw: gs.isDraw,
              winnerName: gs.winnerName,
              reason: "timeout",
            },
          });
        }
        gameAllLeftTimers.delete(sessionId);
      }, gameState.timerDuration * 1000);
      gameAllLeftTimers.set(sessionId, timerId);
    }
    session.status = "active";
    io.to(session.roomId).emit("game_status", session);
    if (gameState) {
      const legalMoves = session.gameType === "Chess" ? computeAllLegalMoves(gameState) : undefined;
      io.to(session.roomId).emit("game_state", { sessionId: session.id, state: gameState, legalMoves, error: null });
    }
    const activeMessage = updateGameMessage(session.roomId, sessionId, { gameStatus: "active" });
    if (activeMessage) {
      io.to(session.roomId).emit("message_updated", activeMessage);
    }
  });

  socket.on("leave_game", ({ sessionId, userId }) => {
    const session = sessions.get(sessionId);
    if (!session || session.status === "finished") return;
    const player = session.players.find((p) => p.userId === userId);
    if (!player) return;
    player.gameClosed = true;

    const allClosed = session.players.every((p) => p.gameClosed);
    if (allClosed) {
      const timer = setTimeout(() => {
        const currentSession = sessions.get(sessionId);
        if (!currentSession) return;
        const stillAllClosed = currentSession.players.every((p) => p.gameClosed);
        if (!stillAllClosed) return;

        currentSession.status = "finished";
        const gameState = gameStates.get(sessionId);
        if (gameState) {
          gameState.isDraw = true;
        }
        io.to(currentSession.roomId).emit("game_ended", {
          sessionId,
          result: { draw: true, reason: "all_left" },
        });
        const endedMessage = updateGameMessage(currentSession.roomId, sessionId, { gameStatus: "ended" });
        if (endedMessage) {
          io.to(currentSession.roomId).emit("message_updated", endedMessage);
        }
        const chatMsg = {
          id: `sys-${Date.now()}`,
          user: "System",
          avatar: "⏳",
          content: "بازی بدون بازیکن مونده بود — کنسل شد",
          time: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
          isSystem: true,
        };
        addMessage(currentSession.roomId, chatMsg);
        io.to(currentSession.roomId).emit("message_received", chatMsg);
        endGameRequests.delete(sessionId);
        gameAllLeftTimers.delete(sessionId);
        sessions.delete(sessionId);
        gameStates.delete(sessionId);
      }, 60000);
      gameAllLeftTimers.set(sessionId, timer);
    }

    const userProfile = getProfile(userId);
    const userName = userProfile?.username ?? userId;
    io.to(session.roomId).emit("player_left_game", { sessionId, userId, username: userName, allClosed: session.players.every((p) => p.gameClosed) });
  });

  socket.on("reopen_game", ({ sessionId, userId }) => {
    const session = sessions.get(sessionId);
    if (!session || session.status === "finished") return;
    const player = session.players.find((p) => p.userId === userId);
    if (!player) return;
    player.gameClosed = false;

    const timer = gameAllLeftTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      gameAllLeftTimers.delete(sessionId);
    }
  });

  socket.on("request_end_game", ({ sessionId, userId }) => {
    const session = sessions.get(sessionId);
    if (!session || session.status !== "active") return;
    const player = session.players.find((p) => p.userId === userId);
    if (!player) return;

    if (!endGameRequests.has(sessionId)) {
      endGameRequests.set(sessionId, new Set());
    }
    const requests = endGameRequests.get(sessionId);
    if (requests.has(userId)) return;
    requests.add(userId);

    const totalPlayers = session.players.length;
    const userProfile = getProfile(userId);
    const userName = userProfile?.username ?? userId;
    io.to(session.roomId).emit("end_game_requested", {
      sessionId,
      userId,
      username: userName,
      totalRequests: requests.size,
      totalPlayers,
    });

    if (requests.size >= totalPlayers) {
      session.status = "finished";
      const gameState = gameStates.get(sessionId);
      if (gameState) {
        gameState.isDraw = true;
      }
      io.to(session.roomId).emit("game_ended", {
        sessionId,
        result: { draw: true, reason: "voted_end" },
      });
      const endedMessage = updateGameMessage(session.roomId, sessionId, { gameStatus: "ended" });
      if (endedMessage) {
        io.to(session.roomId).emit("message_updated", endedMessage);
      }
      const chatMsg = {
        id: `sys-${Date.now()}`,
        user: "System",
        avatar: "🤝",
        content: "همه بازیکن‌ها درخواست پایان دادن — بازی مساوی تموم شد",
        time: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
        isSystem: true,
      };
      addMessage(session.roomId, chatMsg);
      io.to(session.roomId).emit("message_received", chatMsg);
      endGameRequests.delete(sessionId);
      const allLeftTimer = gameAllLeftTimers.get(sessionId);
      if (allLeftTimer) {
        clearTimeout(allLeftTimer);
        gameAllLeftTimers.delete(sessionId);
      }
      sessions.delete(sessionId);
      gameStates.delete(sessionId);
    }
  });

  socket.on("disconnect", () => {
    const userId = socket.data?.userId;
    if (!userId) return;
    const activeSessions = [];
    for (const [sessionId, session] of sessions) {
      const player = session.players.find((p) => p.userId === userId);
      if (player) {
        player.connected = false;
        player.disconnectedAt = Date.now();
        activeSessions.push(sessionId);
        const userProfile = getProfile(userId);
        const userName = userProfile?.username ?? userId;
        io.to(session.roomId).emit("player_disconnected", {
          sessionId,
          userId,
          username: userName,
          gameType: session.gameType,
        });
        const chatMsg = {
          id: `sys-${Date.now()}`,
          user: "System",
          avatar: "⏳",
          content: `${userName} رفت بیرون — ۶۰ ثانیه وقت داره برگرده`,
          time: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
          isSystem: true,
        };
        addMessage(session.roomId, chatMsg);
        io.to(session.roomId).emit("message_received", chatMsg);
      }
    }
    if (activeSessions.length > 0) {
      const timer = setTimeout(() => {
        for (const sessionId of activeSessions) {
          const session = sessions.get(sessionId);
          if (!session) continue; // already cleaned up
          const player = session.players.find((p) => p.userId === userId);
          if (player && !player.connected) {
            handlePlayerForfeit(sessionId, userId, session.gameType, io, sessions, gameStates, updateGameMessage, addMessage, recordWin, awardXp, getProfile);
          }
        }
        disconnectTimers.delete(userId);
      }, 60000);
      disconnectTimers.set(userId, timer);
    }
  });

  socket.on("identify", ({ userId }) => {
    socket.data.userId = userId;
    const timer = disconnectTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      disconnectTimers.delete(userId);
    }
    for (const [sessionId, session] of sessions) {
      const player = session.players.find((p) => p.userId === userId);
      if (player && !player.connected) {
        player.connected = true;
        player.disconnectedAt = null;
        const gameState = gameStates.get(sessionId);
        if (gameState) {
          const legalMoves = session.gameType === "Chess" ? computeAllLegalMoves(gameState) : undefined;
          socket.emit("game_state", { sessionId, state: gameState, legalMoves, error: null });
        }
        socket.emit("game_status", session);
        io.to(session.roomId).emit("player_reconnected", { sessionId, userId, username: getProfile(userId)?.username ?? userId });
        const reconnectedProfile = getProfile(userId);
        const reconnectedName = reconnectedProfile?.username ?? userId;
        const chatMsg = {
          id: `sys-${Date.now()}`,
          user: "System",
          avatar: "✅",
          content: `${reconnectedName} برگشت — اوضاع خوبه 👍`,
          time: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
          isSystem: true,
        };
        addMessage(session.roomId, chatMsg);
        io.to(session.roomId).emit("message_received", chatMsg);
      }
    }
  });

  socket.on("reconnect_game", ({ sessionId, userId }) => {
    const session = sessions.get(sessionId);
    if (!session) return;
    const player = session.players.find((p) => p.userId === userId);
    if (!player) return;
    player.connected = true;
    player.disconnectedAt = null;
    const gameState = gameStates.get(sessionId);
    if (gameState) {
      const legalMoves = session.gameType === "Chess" ? computeAllLegalMoves(gameState) : undefined;
      socket.emit("game_state", { sessionId, state: gameState, legalMoves, error: null });
    }
    socket.emit("game_status", session);
    io.to(session.roomId).emit("player_reconnected", { sessionId, userId });
  });
});

const PORT = process.env.PORT || 4000;

function handlePlayerForfeit(sessionId, userId, gameType, io, sessions, gameStates, updateGameMessage, addMessage, recordWin, awardXp, getProfile) {
  const session = sessions.get(sessionId);
  const gameState = gameStates.get(sessionId);
  if (!session || !gameState) return;

  const otherPlayer = session.players.find((p) => p.userId !== userId);
  let winnerUserId = null;
  let winnerName = null;
  if (otherPlayer) {
    gameState.winnerId = otherPlayer.userId;
    recordWin(otherPlayer.userId, gameType);
    awardXp(otherPlayer.userId, 1);
    winnerUserId = otherPlayer.userId;
    const winnerProfile = getProfile(otherPlayer.userId);
    winnerName = winnerProfile?.username ?? otherPlayer.userId;
  }

  const forfeitedProfile = getProfile(userId);
  const forfeitedName = forfeitedProfile?.username ?? userId;

  session.status = "finished";
  io.to(session.roomId).emit("game_ended", {
    sessionId,
    result: {
      winner: winnerUserId,
      draw: !otherPlayer,
      winnerName,
      reason: "forfeit",
      forfeitedBy: userId,
    },
  });
  const endedMessage = updateGameMessage(session.roomId, sessionId, { gameStatus: "ended" });
  if (endedMessage) {
    io.to(session.roomId).emit("message_updated", endedMessage);
  }
  const chatMsg = {
    id: `sys-${Date.now()}`,
    user: "System",
    avatar: "⏰",
    content: otherPlayer ? `وقت ${forfeitedName} تموم شد — ${winnerName} برنده شد!` : "وقت تموم شد — بازی کنسل شد",
    time: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
    isSystem: true,
  };
  addMessage(session.roomId, chatMsg);
  io.to(session.roomId).emit("message_received", chatMsg);
      endGameRequests.delete(sessionId);
      const lockPickTimer = gameAllLeftTimers.get(sessionId);
      if (lockPickTimer && session.gameType === "LockPick") {
        clearTimeout(lockPickTimer);
        gameAllLeftTimers.delete(sessionId);
      }
      const allLeftTimer = gameAllLeftTimers.get(sessionId);
  if (allLeftTimer) {
    clearTimeout(allLeftTimer);
    gameAllLeftTimers.delete(sessionId);
  }
  sessions.delete(sessionId);
  gameStates.delete(sessionId);
}

server.listen(PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`GameChat server running on port ${PORT}`);
});
