/**
 * Cinema / Watch Together synchronized playback module
 * Handles room video state, drift calculations, and access control.
 */

const cinemaRooms = new Map();

function defaultState(roomId) {
  return {
    roomId,
    type: "none", // 'none' | 'url' | 'local' | 'youtube' | 'stream'
    url: "",
    title: "",
    duration: 0,
    status: "idle", // 'idle' | 'playing' | 'paused'
    currentTime: 0,
    updatedAt: Date.now(),
    playbackRate: 1.0,
    hostOnly: false,
    updatedBy: null,
    updatedByName: "سیستم",
    streamerId: null,
    streamerName: null,
  };
}

export function getVideoState(roomId) {
  let state = cinemaRooms.get(roomId);
  if (!state) {
    state = defaultState(roomId);
    cinemaRooms.set(roomId, state);
  }

  // Calculate live current time with elapsed drift
  let calculatedCurrentTime = state.currentTime;
  if (state.status === "playing" && state.updatedAt) {
    const elapsed = (Date.now() - state.updatedAt) / 1000;
    calculatedCurrentTime += elapsed * (state.playbackRate || 1.0);
    if (state.duration > 0 && calculatedCurrentTime > state.duration) {
      calculatedCurrentTime = state.duration;
    }
  }

  return {
    ...state,
    calculatedCurrentTime: Math.max(0, calculatedCurrentTime),
    serverTime: Date.now(),
  };
}

export function setVideoSource(roomId, { type, url, title, duration = 0, hostOnly = false, autoPlay = false }, user = {}) {
  const current = cinemaRooms.get(roomId) || defaultState(roomId);

  const isStream = type === "stream";
  const newState = {
    ...current,
    roomId,
    type: type || "url",
    url: url || "",
    title: title || (isStream ? `پخش زنده فیلم توسط ${user.userName || "میزبان"}` : type === "local" ? "فایل محلی سیستم" : "ویدیو استریم"),
    duration: typeof duration === "number" ? duration : 0,
    status: autoPlay ? "playing" : "paused",
    currentTime: 0,
    updatedAt: Date.now(),
    hostOnly: Boolean(hostOnly),
    updatedBy: user.userId || null,
    updatedByName: user.userName || "کاربر",
    streamerId: isStream ? (user.userId || null) : null,
    streamerName: isStream ? (user.userName || null) : null,
  };

  cinemaRooms.set(roomId, newState);
  return getVideoState(roomId);
}

export function playVideo(roomId, { currentTime = 0 } = {}, user = {}) {
  const current = cinemaRooms.get(roomId) || defaultState(roomId);

  const newState = {
    ...current,
    status: "playing",
    currentTime: typeof currentTime === "number" ? Math.max(0, currentTime) : current.currentTime,
    updatedAt: Date.now(),
    updatedBy: user.userId || null,
    updatedByName: user.userName || "کاربر",
  };

  cinemaRooms.set(roomId, newState);
  return getVideoState(roomId);
}

export function pauseVideo(roomId, { currentTime = 0 } = {}, user = {}) {
  const current = cinemaRooms.get(roomId) || defaultState(roomId);

  const newState = {
    ...current,
    status: "paused",
    currentTime: typeof currentTime === "number" ? Math.max(0, currentTime) : current.currentTime,
    updatedAt: Date.now(),
    updatedBy: user.userId || null,
    updatedByName: user.userName || "کاربر",
  };

  cinemaRooms.set(roomId, newState);
  return getVideoState(roomId);
}

export function seekVideo(roomId, { currentTime = 0 } = {}, user = {}) {
  const current = cinemaRooms.get(roomId) || defaultState(roomId);

  const newState = {
    ...current,
    currentTime: typeof currentTime === "number" ? Math.max(0, currentTime) : 0,
    updatedAt: Date.now(),
    updatedBy: user.userId || null,
    updatedByName: user.userName || "کاربر",
  };

  cinemaRooms.set(roomId, newState);
  return getVideoState(roomId);
}

export function updateVideoConfig(roomId, { hostOnly }, user = {}) {
  const current = cinemaRooms.get(roomId) || defaultState(roomId);

  const newState = {
    ...current,
    hostOnly: Boolean(hostOnly),
    updatedAt: Date.now(),
    updatedBy: user.userId || null,
    updatedByName: user.userName || "کاربر",
  };

  cinemaRooms.set(roomId, newState);
  return getVideoState(roomId);
}

export function resetCinema(roomId) {
  const state = defaultState(roomId);
  cinemaRooms.set(roomId, state);
  return state;
}
