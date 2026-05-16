export type Room = {
  id: string;
  name: string;
  icon: string;
  topic: string;
  onlineCount: number;
  privacy: "public" | "private" | "temporary";
  ownerId?: string | null;
  avatar?: string | null;
};

export type Message = {
  id: string;
  userId?: string;
  user: string;
  avatar: string;
  content: string;
  time: string;
  isSystem?: boolean;
  isGameCard?: boolean;
  gameTitle?: string;
  players?: string;
  sessionId?: string;
  gameStatus?: "waiting" | "active" | "ended";
};

export type Member = {
  id: string;
  name: string;
  avatar: string;
  status: "online" | "idle" | "in-game";
  role?: "owner" | "moderator" | "member";
};

export type Game = {
  id: string;
  name: string;
  status: "ready" | "active";
  kind: "internal" | "external";
  icon?: string;
  avatar?: string | null;
  description?: string;
  minPlayers?: number;
  maxPlayers?: number;
};

export type Profile = {
  id: string;
  name: string;
  avatar: string;
  xp: number;
  level: number;
  wins: number;
  badges: string[];
  favoriteGames: string[];
  isAdmin?: boolean;
};
