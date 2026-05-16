"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AuthModal from "@/components/AuthModal";
import CreateRoomModal from "@/components/CreateRoomModal";
import PrivateRoomModal from "@/components/PrivateRoomModal";
import ChatPanel from "@/components/ChatPanel";
import GameAdminModal from "@/components/GameAdminModal";
import GameModal from "@/components/GameModal";
import ProfileModal from "@/components/ProfileModal";
import RoomSettingsModal from "@/components/RoomSettingsModal";
import RoomInfoPanel from "@/components/RoomInfoPanel";
import RoomList from "@/components/RoomList";
import LoadingScreen from "@/components/LoadingScreen";
import { Hash, Menu, Banana, Users } from "lucide-react";
import { getSocket } from "@/lib/socket";

const API_URL = "";

export default function HomePage() {
  const socket = useMemo(() => getSocket(), []);
  const [messages, setMessages] = useState([] as any[]);
  const [members, setMembers] = useState([] as any[]);
  const [games, setGames] = useState([] as any[]);
  const [showGameAdmin, setShowGameAdmin] = useState(false);
  const [rooms, setRooms] = useState([] as any[]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const selectedRoomIdRef = useRef(selectedRoomId);
  selectedRoomIdRef.current = selectedRoomId;
  const [roomSessions, setRoomSessions] = useState<Record<string, any>>({});
  const [gameStateBySession, setGameStateBySession] = useState<Record<string, any>>({});
  const [user, setUser] = useState<null | { id: string; name: string; avatar: string }>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [isGameOpen, setIsGameOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [privateRoomTarget, setPrivateRoomTarget] = useState<any | null>(null);
  const [privateAccess, setPrivateAccess] = useState<string[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [endGameRequests, setEndGameRequests] = useState<Record<string, string[]>>({});
  const [showLoading, setShowLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const loadingStartRef = useRef(Date.now());
  const loadingDoneRef = useRef(false);
  const handleLoadingComplete = useCallback(() => {
    setShowLoading(false);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("gamechat-user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
    const access = localStorage.getItem("gamechat-private-access");
    if (access) {
      setPrivateAccess(JSON.parse(access));
    }
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }
    socket.connect();
    socket.emit("identify", { userId: user.id });

    const handleMessage = (message: any) => {
      setMessages((prev) => [...prev, message]);
      if (isGameOpenRef.current && message.userId !== user?.id && !message.isSystem) {
        const bubbleId = message.id;
        setMiniChatBubbles((prev) => {
          const next = [...prev, { id: bubbleId, user: message.user, content: message.content, isMine: false }];
          return next.slice(-5);
        });
        setTimeout(() => {
          setMiniChatBubbles((prev) => prev.filter((b) => b.id !== bubbleId));
        }, 3000);
      }
    };
    const handleMessageUpdated = (message: any) => {
      setMessages((prev) => prev.map((item) => (item.id === message.id ? message : item)));
    };
    const handleRoomJoined = (snapshot: any) => {
      if (!snapshot.joiningUserId || snapshot.joiningUserId === user?.id) {
        setMessages(snapshot.messages ?? []);
        const mappedMembers = (snapshot.memberProfiles ?? []).map((profile: any) => ({
          id: profile.userId,
          name: profile.username,
          avatar: profile.avatar ?? "👤",
          status: "online",
        }));
        setMembers(mappedMembers);
        setSelectedRoomId(snapshot.id);
        if (snapshot.privacy === "private") {
          setPrivateAccess((prev) => {
            if (prev.includes(snapshot.id)) {
              return prev;
            }
            const nextAccess = [...prev, snapshot.id];
            localStorage.setItem("gamechat-private-access", JSON.stringify(nextAccess));
            return nextAccess;
          });
        }
      }
    };
    const handleMemberUpdate = (snapshot: any) => {
      if (snapshot.id !== selectedRoomIdRef.current) return;
      const mappedMembers = (snapshot.memberProfiles ?? []).map((profile: any) => ({
        id: profile.userId,
        name: profile.username,
        avatar: profile.avatar ?? "👤",
        status: "online",
      }));
      setMembers(mappedMembers);
    };
        const handleJoinError = (payload: any) => {
          const room = rooms.find((item) => item.id === payload.roomId);
          if (room && room.privacy === "private") {
            setPrivateRoomTarget(room);
          }
        };
    const handleRoomCreated = () => {
      fetchRooms();
    };
    const handleRoomRemoved = (payload: any) => {
      if (payload.roomId === selectedRoomIdRef.current) {
        socket.emit("leave_room", { roomId: payload.roomId, userId: user?.id });
        setSelectedRoomId(null);
        setMessages([]);
        setMembers([]);
      }
      fetchRooms();
    };
    const handleRoomUpdated = (_payload: any) => {
      fetchRooms();
    };
    const handleGameStarted = (session: any) => {
      setRoomSessions((prev) => ({ ...prev, [session.roomId]: session }));
      if (session.hostId === user.id) {
        setIsGameOpen(true);
      }
    };
    const handleGameJoined = (session: any) => {
      setRoomSessions((prev) => ({ ...prev, [session.roomId]: session }));
      setMessages((prev) =>
        prev.map((message) =>
          message.sessionId === session.id
            ? { ...message, gameStatus: session.status }
            : message
        )
      );
    };
    const handleGameStatus = (session: any) => {
      setRoomSessions((prev) => ({ ...prev, [session.roomId]: session }));
      setMessages((prev) =>
        prev.map((message) =>
          message.sessionId === session.id
            ? { ...message, gameStatus: session.status }
            : message
        )
      );
    };
    const handleGamePlayers = (payload: any) => {
      setMessages((prev) =>
        prev.map((message) =>
          message.sessionId === payload.sessionId
            ? { ...message, players: `${payload.players}/${payload.maxPlayers}` }
            : message
        )
      );
    };
    const handleGameState = (payload: any) => {
      setGameStateBySession((prev) => ({ ...prev, [payload.sessionId]: payload }));
    };
    const handleGameEnded = (payload: any) => {
      setGameStateBySession((prev) => {
        const existing = prev[payload.sessionId];
        return {
          ...prev,
          [payload.sessionId]: {
            ...existing,
            ...payload,
            state: existing?.state ?? payload.state,
          },
        };
      });
      setMessages((prev) =>
        prev.map((message) =>
          message.sessionId === payload.sessionId ? { ...message, gameStatus: "ended" } : message
        )
      );
      setRoomSessions((prev) => {
        const updated = { ...prev };
        for (const [roomId, session] of Object.entries(updated)) {
          if ((session as any).id === payload.sessionId) {
            updated[roomId] = { ...(session as any), status: "finished" };
          }
        }
        return updated;
      });
      setEndGameRequests((prev) => {
        const updated = { ...prev };
        delete updated[payload.sessionId];
        return updated;
      });
      fetch(`${API_URL}/profile/${user?.id}`).then(res => res.json()).then(data => {
        if (data.profile) setUserProfile(data.profile);
      }).catch(() => {});
    };
    const handleInviteCreated = (invite: any) => {
      setInviteCode(invite?.code ?? null);
    };
    const handlePlayerDisconnected = (payload: any) => {
      setRoomSessions((prev) => {
        const updated = { ...prev };
        for (const [roomId, session] of Object.entries(updated)) {
          if ((session as any).id === payload.sessionId) {
            const sessionPlayers = [...((session as any).players ?? [])];
            const playerIdx = sessionPlayers.findIndex((p: any) => p.userId === payload.userId);
            if (playerIdx >= 0) {
              sessionPlayers[playerIdx] = { ...sessionPlayers[playerIdx], connected: false };
            }
            updated[roomId] = { ...(session as any), players: sessionPlayers };
          }
        }
        return updated;
      });
    };
    const handlePlayerReconnected = (payload: any) => {
      setRoomSessions((prev) => {
        const updated = { ...prev };
        for (const [roomId, session] of Object.entries(updated)) {
          if ((session as any).id === payload.sessionId) {
            const sessionPlayers = [...((session as any).players ?? [])];
            const playerIdx = sessionPlayers.findIndex((p: any) => p.userId === payload.userId);
            if (playerIdx >= 0) {
              sessionPlayers[playerIdx] = { ...sessionPlayers[playerIdx], connected: true };
            }
            updated[roomId] = { ...(session as any), players: sessionPlayers };
          }
        }
        return updated;
      });
    };

    socket.off("message_received", handleMessage);
    socket.off("room_joined", handleRoomJoined);
    socket.off("room_created", handleRoomCreated);
    socket.off("game_started", handleGameStarted);
    socket.off("game_joined", handleGameJoined);
    socket.off("game_status", handleGameStatus);
    socket.off("game_players", handleGamePlayers);
    socket.off("game_state", handleGameState);
    socket.off("game_ended", handleGameEnded);
    socket.off("invite_created", handleInviteCreated);
    socket.off("room_join_error", handleJoinError);
    socket.off("message_updated", handleMessageUpdated);
    socket.off("room_removed", handleRoomRemoved);
    socket.off("room_updated", handleRoomUpdated);
    socket.off("member_update", handleMemberUpdate);
    socket.off("player_disconnected", handlePlayerDisconnected);
    socket.off("player_reconnected", handlePlayerReconnected);

    const handleEndGameRequested = (payload: any) => {
      setEndGameRequests((prev) => ({
        ...prev,
        [payload.sessionId]: [...(prev[payload.sessionId] ?? []).filter(uid => uid !== payload.userId), payload.userId],
      }));
    };
    const handlePlayerLeftGame = (_payload: any) => {
      // notification is handled via chat/system messages
    };

    socket.off("end_game_requested", handleEndGameRequested);
    socket.off("player_left_game", handlePlayerLeftGame);

    socket.on("message_received", handleMessage);
    socket.on("room_joined", handleRoomJoined);
    socket.on("room_created", handleRoomCreated);
    socket.on("game_started", handleGameStarted);
    socket.on("game_joined", handleGameJoined);
    socket.on("game_status", handleGameStatus);
    socket.on("game_players", handleGamePlayers);
    socket.on("game_state", handleGameState);
    socket.on("game_ended", handleGameEnded);
    socket.on("invite_created", handleInviteCreated);
    socket.on("room_join_error", handleJoinError);
    socket.on("message_updated", handleMessageUpdated);
    socket.on("room_removed", handleRoomRemoved);
    socket.on("room_updated", handleRoomUpdated);
    socket.on("member_update", handleMemberUpdate);
    socket.on("player_disconnected", handlePlayerDisconnected);
    socket.on("player_reconnected", handlePlayerReconnected);
    socket.on("end_game_requested", handleEndGameRequested);
    socket.on("player_left_game", handlePlayerLeftGame);

    return () => {
      socket.off("end_game_requested", handleEndGameRequested);
      socket.off("player_left_game", handlePlayerLeftGame);
      socket.off("message_received", handleMessage);
      socket.off("room_joined", handleRoomJoined);
      socket.off("room_created", handleRoomCreated);
      socket.off("game_started", handleGameStarted);
      socket.off("game_joined", handleGameJoined);
      socket.off("game_status", handleGameStatus);
      socket.off("game_players", handleGamePlayers);
      socket.off("game_state", handleGameState);
      socket.off("game_ended", handleGameEnded);
      socket.off("invite_created", handleInviteCreated);
      socket.off("room_join_error", handleJoinError);
      socket.off("message_updated", handleMessageUpdated);
      socket.off("room_removed", handleRoomRemoved);
      socket.off("member_update", handleMemberUpdate);
      socket.off("player_disconnected", handlePlayerDisconnected);
      socket.off("player_reconnected", handlePlayerReconnected);
      socket.disconnect();
    };
  }, [rooms, socket, user]);

  useEffect(() => {
    if (!socket || !user) return;
    const handleRoomNewMessage = (payload: { roomId: string }) => {
      if (payload.roomId !== selectedRoomIdRef.current) {
        setUnreadRoomIds((prev) => new Set(prev).add(payload.roomId));
      }
    };
    socket.on("room_new_message", handleRoomNewMessage);
    return () => {
      socket.off("room_new_message", handleRoomNewMessage);
    };
  }, [socket, user]);

  const joinRoom = useCallback((roomId: string, inviteCode?: string) => {
    if (!user) {
      return;
    }
    socket.emit("join_room", {
      roomId,
      userId: user.id,
      username: user.name,
      avatar: user.avatar,
      inviteCode,
    });
  }, [socket, user]);

  const fetchRooms = async () => {
    const response = await fetch(`${API_URL}/rooms`);
    const data = await response.json();
    setRooms(data.rooms ?? []);
  };

  const fetchGames = async () => {
    try {
      const response = await fetch(`${API_URL}/games/config`);
      const data = await response.json();
      const configGames = (data.games ?? []).map((g: any) => ({
        id: g.gameId,
        name: g.name,
        status: "ready",
        kind: "internal" as const,
        icon: g.icon,
        avatar: g.avatar ?? null,
        description: g.description,
        minPlayers: g.minPlayers,
        maxPlayers: g.maxPlayers,
      }));
      setGames(configGames);
    } catch {
      // use fallback defaults
    }
  };

  useEffect(() => {
    if (user) {
      fetchRooms();
      fetchGames();
    }
  }, [user]);

  const handleSendMessage = (content: string) => {
    if (!user || !selectedRoomId) {
      return;
    }
    const message = {
      id: `msg-${Date.now()}`,
      userId: user.id,
      user: user.name,
      avatar: user.avatar,
      content,
      time: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
    };
    socket.emit("send_message", { roomId: selectedRoomId, message, userId: user.id });
  };

  const handleStartGame = (gameType: string) => {
    if (!user || !selectedRoomId) {
      return;
    }
    socket.emit("start_game", { roomId: selectedRoomId, gameType, hostId: user.id });
  };

  const handleJoinGame = (sessionId?: string) => {
    if (!user) {
      return;
    }
    const targetSessionId = sessionId ?? (selectedRoomId ? roomSessions[selectedRoomId]?.id : undefined);
    if (!targetSessionId) {
      return;
    }
    socket.emit("join_game", { sessionId: targetSessionId, userId: user.id });
    socket.emit("reopen_game", { sessionId: targetSessionId, userId: user.id });
    setIsGameOpen(true);
  };

  const handleMove = (payload: { position: number }) => {
    if (!selectedRoomId) return;
    const activeSession = roomSessions[selectedRoomId];
    if (!activeSession?.id || !user) {
      return;
    }
    socket.emit("game_move", { sessionId: activeSession.id, userId: user.id, payload });
  };

  const handleCloseModal = () => {
    if (!selectedRoomId) return;
    const activeSession = roomSessions[selectedRoomId];
    if (activeSession?.id && user && activeSession.status === "active") {
      socket.emit("leave_game", { sessionId: activeSession.id, userId: user.id });
    }
    setIsGameOpen(false);
  };

  const handleStartFromModal = () => {
    if (!selectedRoomId) return;
    const activeSession = roomSessions[selectedRoomId];
    if (!activeSession?.id || !user) {
      return;
    }
    socket.emit("start_session", { sessionId: activeSession.id, userId: user.id });
    socket.emit("reopen_game", { sessionId: activeSession.id, userId: user.id });
  };

  const handleUnoAction = (payload: { type: "draw" | "play"; cardIndex?: number; chosenColor?: string }) => {
    if (!selectedRoomId) return;
    const activeSession = roomSessions[selectedRoomId];
    if (!activeSession?.id || !user) {
      return;
    }
    socket.emit("game_move", { sessionId: activeSession.id, userId: user.id, payload });
  };

  const handleChessMove = (payload: { fromRow: number; fromCol: number; toRow: number; toCol: number }) => {
    if (!selectedRoomId) return;
    const activeSession = roomSessions[selectedRoomId];
    if (!activeSession?.id || !user) {
      return;
    }
    socket.emit("game_move", { sessionId: activeSession.id, userId: user.id, payload });
  };

  const handleLockPickAction = (payload: any) => {
    if (!selectedRoomId) return;
    const activeSession = roomSessions[selectedRoomId];
    if (!activeSession?.id || !user) {
      return;
    }
    socket.emit("game_move", { sessionId: activeSession.id, userId: user.id, payload });
  };

  const handleDotsAndBoxesMove = (payload: { row: number; col: number; orientation: "h" | "v" }) => {
    if (!selectedRoomId) return;
    const activeSession = roomSessions[selectedRoomId];
    if (!activeSession?.id || !user) return;
    socket.emit("game_move", { sessionId: activeSession.id, userId: user.id, payload });
  };

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/profile/${user.id}`);
      const data = await res.json();
      if (data.profile) {
        setUserProfile(data.profile);
      }
    } catch {
      // ignore
    }
  }, [user]);

  const handleRequestEndGame = useCallback(() => {
    if (!selectedRoomId) return;
    const activeSession = roomSessions[selectedRoomId];
    if (!activeSession?.id || !user) return;
    socket.emit("request_end_game", { sessionId: activeSession.id, userId: user.id });
  }, [socket, user, roomSessions, selectedRoomId]);

  const selectedRoom = selectedRoomId ? rooms.find((room) => room.id === selectedRoomId) : undefined;
  const activeSession = selectedRoomId ? (roomSessions[selectedRoomId] ?? null) : null;
  const activeGameState = activeSession ? gameStateBySession[activeSession.id] : null;
  const userInActiveGame = Boolean(
    activeSession?.players?.some((player: any) => player.userId === user?.id)
  );

  const handleAuth = async ({ username, avatar, userId }: { username: string; avatar: string; userId: string }) => {
    const nextUser = { id: userId, name: username, avatar };
    localStorage.setItem("gamechat-user", JSON.stringify(nextUser));
    setUser(nextUser);
    try {
      const res = await fetch(`${API_URL}/profile/${userId}`);
      const data = await res.json();
      if (data.profile) {
        setUserProfile(data.profile);
      }
    } catch {
      // ignore fetch error
    }
  };

  const handleLogin = async ({ username, password }: { username: string; password: string }) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.error || !data.profile) {
      return;
    }
    const nextUser = {
      id: data.profile.userId,
      name: data.profile.username,
      avatar: data.profile.avatar,
    };
    localStorage.setItem("gamechat-user", JSON.stringify(nextUser));
    setUser(nextUser);
    setUserProfile(data.profile);
  };

  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [unreadRoomIds, setUnreadRoomIds] = useState<Set<string>>(new Set());
  const [showRoomDrawer, setShowRoomDrawer] = useState(false);
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const isGameOpenRef = useRef(isGameOpen);
  isGameOpenRef.current = isGameOpen;
  const [miniChatValue, setMiniChatValue] = useState("");
  const [miniChatBubbles, setMiniChatBubbles] = useState<Array<{id: string; user: string; content: string; isMine: boolean}>>([]);

  const handleCreateRoom = (payload: { name: string; topic: string; icon: string; privacy: "public" | "private" }) => {
    if (!user || !payload.name) {
      return;
    }
    const roomId = `room-${Date.now()}`;
    socket.emit("create_room", {
      roomId,
      name: payload.name,
      icon: payload.icon || "🎮",
      topic: payload.topic || "روم جدید",
      privacy: payload.privacy,
      isTemporary: false,
      ownerId: user.id,
    });
    setSelectedRoomId(roomId);
    setShowCreateRoom(false);
  };

  useEffect(() => {
    const start = loadingStartRef.current;
    const timer = setInterval(() => {
      if (loadingDoneRef.current) {
        clearInterval(timer);
        return;
      }
      const elapsed = Date.now() - start;
      const pct = Math.min(90, (elapsed / 3000) * 90);
      setLoadingProgress(pct);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hasUser = user !== null;
    const dataReady = !hasUser || rooms.length > 0;
    if (!dataReady) return;

    const elapsed = Date.now() - loadingStartRef.current;
    const delay = Math.max(0, 3000 - elapsed);

    const timer = setTimeout(() => {
      loadingDoneRef.current = true;
      setLoadingProgress(100);
    }, delay);

    return () => clearTimeout(timer);
  }, [user, rooms]);

  const handleSelectRoom = (roomId: string) => {
    setShowRoomDrawer(false);
    setUnreadRoomIds((prev) => {
      const next = new Set(prev);
      next.delete(roomId);
      return next;
    });
    const room = rooms.find((item) => item.id === roomId);
    if (!room) {
      return;
    }
    setIsGameOpen(false);
    if (room.privacy !== "private") {
      setInviteCode(null);
    }
    if (selectedRoomId !== null && selectedRoomId !== roomId && user) {
      socket.emit("leave_room", { roomId: selectedRoomId, userId: user.id });
    }
    if (room.privacy === "private") {
      if (privateAccess.includes(room.id)) {
        joinRoom(roomId);
      } else {
        setPrivateRoomTarget(room);
      }
      return;
    }
    joinRoom(roomId);
  };

  const handlePrivateJoin = ({ inviteCode: code }: { inviteCode?: string }) => {
    if (!privateRoomTarget) {
      return;
    }
    joinRoom(privateRoomTarget.id, code);
    setPrivateRoomTarget(null);
  };

  const handleCreateInvite = () => {
    if (!user || !selectedRoom) {
      return;
    }
    socket.emit("create_invite", { roomId: selectedRoom.id, userId: user.id, ttlMinutes: 120 });
  };

  const handleDeleteRoom = () => {
    if (!user || !selectedRoom) return;
    socket.emit("delete_room", { roomId: selectedRoom.id, userId: user.id });
    setShowRoomSettings(false);
  };

  const handleUpdateRoom = (payload: { name: string; topic: string; icon: string; privacy: "public" | "private" }) => {
    if (!user || !selectedRoom) return;
    socket.emit("update_room", { roomId: selectedRoom.id, userId: user.id, ...payload });
    setShowRoomSettings(false);
  };

  const closeDrawers = useCallback(() => {
    setShowRoomDrawer(false);
    setShowInfoDrawer(false);
  }, []);

  const handleMiniChatSend = useCallback(() => {
    const content = miniChatValue.trim();
    if (!content || !selectedRoomId) return;
    handleSendMessage(content);
    const bubbleId = `mini-${Date.now()}`;
    setMiniChatBubbles((prev) => {
      const next = [...prev, { id: bubbleId, user: "شما", content, isMine: true }];
      return next.slice(-5);
    });
    setMiniChatValue("");
    setTimeout(() => {
      setMiniChatBubbles((prev) => prev.filter((b) => b.id !== bubbleId));
    }, 3000);
  }, [miniChatValue, selectedRoomId, handleSendMessage]);

  return (
    <>
      {showLoading ? (
        <LoadingScreen progress={loadingProgress} onComplete={handleLoadingComplete} />
      ) : (
      <main className="h-screen flex flex-col overflow-hidden">
      {/* Mobile Header */}
      <header className="shrink-0 flex items-center justify-between border-b border-outline bg-panel-dim/80 px-4 py-3 backdrop-blur-md lg:hidden">
        <button
          onClick={() => setShowRoomDrawer(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:text-accent transition-colors"
        >
          <Menu size={22} />
        </button>
        {selectedRoomId ? (
          <div className="flex items-center gap-2">
            <Hash size={16} className="text-accent shrink-0" />
            <p className="text-[15px] font-bold text-on-surface">{selectedRoom?.name ?? "-"}</p>
          </div>
        ) : (
          <p className="text-[15px] font-bold text-accent">MazI</p>
        )}
        <button
          onClick={() => selectedRoomId ? setShowInfoDrawer(true) : setShowRoomDrawer(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:text-accent transition-colors"
        >
          <Users size={20} />
        </button>
      </header>

      {/* Desktop 3-column grid */}
      <div className="hidden flex-1 min-h-0 gap-0 overflow-hidden lg:grid lg:grid-cols-[320px_1fr_288px]">
        <RoomList
          rooms={rooms}
          selectedRoomId={selectedRoomId ?? undefined}
          onSelect={handleSelectRoom}
          onCreateRoom={() => setShowCreateRoom(true)}
          isAdmin={userProfile?.isAdmin ?? false}
          onAdminGames={() => setShowGameAdmin(true)}
          currentUser={user ? {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            xp: userProfile?.xp ?? 0,
            level: userProfile?.level ?? 1,
            wins: userProfile?.wins ?? 0,
            badges: userProfile?.tags ?? userProfile?.badges ?? [],
            favoriteGames: userProfile?.favoriteGames ?? [],
            isAdmin: userProfile?.isAdmin ?? false,
          } : null}
          onOpenProfile={() => setShowProfileModal(true)}
          unreadRoomIds={unreadRoomIds}
        />
        {selectedRoomId ? (
          <ChatPanel
            messages={messages}
            onSend={handleSendMessage}
            onJoinGame={handleJoinGame}
            onOpenGame={() => setIsGameOpen(true)}
            activeSessionId={activeSession?.id}
            userInActiveGame={userInActiveGame}
            roomName={selectedRoom?.name ?? "-"}
            roomTopic={selectedRoom?.topic ?? "-"}
            onlineCount={selectedRoom?.onlineCount ?? members.length}
            currentUserId={user?.id}
          />
        ) : (
          <section className="flex h-full flex-col items-center justify-center bg-panel-dim">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-outline bg-panel-soft">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e9c400" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <p className="text-lg font-bold text-on-surface">یک روم انتخاب کن</p>
              <p className="text-[13px] text-muted">از لیست روم‌ها رو انتخاب کن تا چت شروع بشه</p>
            </div>
          </section>
        )}
        <RoomInfoPanel
          members={members}
          games={games}
          activeSession={activeSession}
          onStartGame={handleStartGame}
          roomName={selectedRoom?.name ?? "-"}
          roomTopic={selectedRoom?.topic ?? "-"}
          roomPrivacy={selectedRoom?.privacy ?? "public"}
          inviteCode={selectedRoom?.privacy === "private" ? inviteCode : null}
          onJoinActive={() => handleJoinGame(activeSession?.id)}
          hasActiveGame={Boolean(activeSession) && activeSession?.status !== "finished"}
          onCreateInvite={handleCreateInvite}
          onOpenSettings={() => setShowRoomSettings(true)}
          isAdmin={userProfile?.isAdmin ?? false}
          currentUserId={user?.id ?? null}
          ownerId={selectedRoom?.ownerId ?? null}
          roomAvatar={selectedRoom?.avatar ?? null}
          roomIcon={selectedRoom?.icon ?? "💬"}
        />
      </div>

      {/* Mobile Chat Area */}
      <div className="flex-1 min-h-0 overflow-hidden lg:hidden">
        {selectedRoomId ? (
          <ChatPanel
            messages={messages}
            onSend={handleSendMessage}
            onJoinGame={handleJoinGame}
            onOpenGame={() => setIsGameOpen(true)}
            activeSessionId={activeSession?.id}
            userInActiveGame={userInActiveGame}
            roomName={selectedRoom?.name ?? "-"}
            roomTopic={selectedRoom?.topic ?? "-"}
            onlineCount={selectedRoom?.onlineCount ?? members.length}
            currentUserId={user?.id}
          />
        ) : (
          <section className="flex h-full flex-col items-center justify-center bg-panel-dim">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-outline bg-panel-soft">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e9c400" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <p className="text-lg font-bold text-on-surface">یک روم انتخاب کن</p>
              <p className="text-[13px] text-muted">از لیست روم‌ها رو انتخاب کن تا چت شروع بشه</p>
            </div>
          </section>
        )}
      </div>

      {/* Overlay */}
      {(showRoomDrawer || showInfoDrawer) && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={closeDrawers} />
      )}

      {/* Room Drawer (right side in RTL) */}
      <aside className={`fixed inset-y-0 right-0 z-50 w-[320px] border-l border-outline transition-transform duration-300 ease-in-out lg:hidden ${showRoomDrawer ? "translate-x-0" : "translate-x-full"}`}>
        <RoomList
          rooms={rooms}
          selectedRoomId={selectedRoomId ?? undefined}
          onSelect={handleSelectRoom}
          onCreateRoom={() => { setShowCreateRoom(true); setShowRoomDrawer(false); }}
          isAdmin={userProfile?.isAdmin ?? false}
          onAdminGames={() => { setShowGameAdmin(true); setShowRoomDrawer(false); }}
          currentUser={user ? {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            xp: userProfile?.xp ?? 0,
            level: userProfile?.level ?? 1,
            wins: userProfile?.wins ?? 0,
            badges: userProfile?.tags ?? userProfile?.badges ?? [],
            favoriteGames: userProfile?.favoriteGames ?? [],
            isAdmin: userProfile?.isAdmin ?? false,
          } : null}
          onOpenProfile={() => { setShowProfileModal(true); setShowRoomDrawer(false); }}
          unreadRoomIds={unreadRoomIds}
        />
      </aside>

      {/* Info Drawer (left side in RTL) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[288px] border-r border-outline transition-transform duration-300 ease-in-out lg:hidden ${showInfoDrawer ? "translate-x-0" : "-translate-x-full"}`}>
        <RoomInfoPanel
          members={members}
          games={games}
          activeSession={activeSession}
          onStartGame={handleStartGame}
          roomName={selectedRoom?.name ?? "-"}
          roomTopic={selectedRoom?.topic ?? "-"}
          roomPrivacy={selectedRoom?.privacy ?? "public"}
          inviteCode={selectedRoom?.privacy === "private" ? inviteCode : null}
          onJoinActive={() => handleJoinGame(activeSession?.id)}
          hasActiveGame={Boolean(activeSession) && activeSession?.status !== "finished"}
          onCreateInvite={handleCreateInvite}
          onOpenSettings={() => { setShowRoomSettings(true); setShowInfoDrawer(false); }}
          isAdmin={userProfile?.isAdmin ?? false}
          currentUserId={user?.id ?? null}
          ownerId={selectedRoom?.ownerId ?? null}
          roomAvatar={selectedRoom?.avatar ?? null}
          roomIcon={selectedRoom?.icon ?? "💬"}
        />
      </aside>

      {isGameOpen && (
        <>
        <GameModal
          session={activeSession}
          gameState={activeGameState}
          onMove={handleMove}
          onClose={handleCloseModal}
          onStart={handleStartFromModal}
          currentUserId={user?.id}
          onUnoAction={handleUnoAction}
          onChessMove={handleChessMove}
          onLockPickAction={handleLockPickAction}
          onDotsAndBoxesMove={handleDotsAndBoxesMove}
          onRequestEnd={handleRequestEndGame}
          endGameRequests={activeSession ? (endGameRequests[activeSession.id] ?? []) : []}
          votedToEnd={activeSession && user ? (endGameRequests[activeSession.id] ?? []).includes(user.id) : false}
        />
        {/* Mini Chat (mobile + desktop when game is open) */}
        <div className="fixed bottom-0 left-0 right-0 lg:bottom-4 lg:left-4 lg:right-auto lg:w-80 z-[60] pointer-events-none">
          {miniChatBubbles.length > 0 && (
            <div className="pointer-events-auto mb-2 flex flex-col gap-2 px-4 lg:px-0">
              {miniChatBubbles.map((bubble) => (
                <div key={bubble.id} className={`flex ${bubble.isMine ? "justify-start" : "justify-end"}`}>
                  <div className={`animate-mini-chat-bubble max-w-[75%] rounded-2xl border px-4 py-2 shadow-lg ${
                    bubble.isMine ? "rounded-tr-none border-outline bg-panel" : "rounded-tl-none border-outline bg-panel-soft"
                  }`}>
                    {!bubble.isMine && <span className="text-[11px] text-accent font-bold">{bubble.user}</span>}
                    <p className="text-[14px] text-on-surface">{bubble.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="pointer-events-auto flex items-center gap-2 border-t border-outline lg:border lg:border-outline bg-panel-deep/95 lg:bg-panel-deep/90 px-3 py-2 lg:rounded-xl lg:shadow-2xl backdrop-blur-md">
            <input
              className="flex-1 rounded-xl border border-outline bg-panel-deep px-3 py-2.5 text-[13px] text-on-surface placeholder:text-muted/60 outline-none transition-colors focus:border-accent"
              placeholder="پیام..."
              value={miniChatValue}
              onChange={(e) => setMiniChatValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleMiniChatSend(); }}
            />
            <button
              onClick={handleMiniChatSend}
              disabled={!miniChatValue.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-bright text-panel-deep transition-all hover:brightness-110 active:scale-90 disabled:opacity-40"
            >
              <Banana size={16} />
            </button>
          </div>
        </div>
        </>
      )}
      {!user && <AuthModal onSubmit={handleAuth} onSubmitLogin={handleLogin} apiUrl={API_URL} />}
      {showCreateRoom && <CreateRoomModal onClose={() => setShowCreateRoom(false)} onCreate={handleCreateRoom} />}
      {showProfileModal && (
        <ProfileModal
          user={{
            id: user?.id ?? "",
            name: user?.name ?? "",
            avatar: user?.avatar ?? "👤",
            xp: userProfile?.xp ?? 0,
            level: userProfile?.level ?? 1,
            wins: userProfile?.wins ?? 0,
            badges: userProfile?.tags ?? userProfile?.badges ?? [],
          }}
          apiUrl={API_URL}
          onClose={() => setShowProfileModal(false)}
          onProfileUpdate={(profile) => {
            setUserProfile(profile);
            if (profile.avatar && user) {
              const updatedUser = { ...user, avatar: profile.avatar };
              localStorage.setItem("gamechat-user", JSON.stringify(updatedUser));
              setUser(updatedUser);
            }
          }}
          onLogout={() => {
            if (user && selectedRoomId) {
              socket.emit("leave_room", { roomId: selectedRoomId, userId: user.id });
            }
            localStorage.removeItem("gamechat-user");
            localStorage.removeItem("gamechat-private-access");
            setUser(null);
            setUserProfile(null);
            setShowProfileModal(false);
            setRoomSessions({});
            setGameStateBySession({});
            socket.disconnect();
          }}
        />
      )}
      {privateRoomTarget && (
        <PrivateRoomModal
          roomName={privateRoomTarget.name}
          onClose={() => setPrivateRoomTarget(null)}
          onSubmit={handlePrivateJoin}
        />
      )}
      {showGameAdmin && (
        <GameAdminModal
          games={games}
          apiUrl={API_URL}
          userId={user?.id ?? ""}
          onClose={() => setShowGameAdmin(false)}
          onUpdate={fetchGames}
        />
      )}
      {showRoomSettings && selectedRoom && (
        <RoomSettingsModal
          roomId={selectedRoom.id}
          initialName={selectedRoom.name}
          initialTopic={selectedRoom.topic}
          initialIcon={selectedRoom.icon}
          initialPrivacy={selectedRoom.privacy}
          initialAvatar={selectedRoom.avatar}
          apiUrl={API_URL}
          userId={user?.id ?? ""}
          onClose={() => setShowRoomSettings(false)}
          onSave={handleUpdateRoom}
          onRefresh={fetchRooms}
          onDeleteRoom={handleDeleteRoom}
        />
      )}
    </main>
      )}
    </>
  );
}
