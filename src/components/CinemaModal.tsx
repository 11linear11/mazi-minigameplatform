"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Film,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Upload,
  Link as LinkIcon,
  Subtitles,
  Lock,
  Unlock,
  RefreshCw,
  X,
  Sparkles,
  Radio,
  FileVideo,
  Info,
} from "lucide-react";
import { sounds } from "@/lib/sounds";

function YouTubeIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export interface CinemaState {
  roomId: string;
  type: "none" | "url" | "local" | "youtube";
  url: string;
  title: string;
  duration: number;
  status: "idle" | "playing" | "paused";
  currentTime: number;
  calculatedCurrentTime?: number;
  serverTime?: number;
  updatedAt: number;
  playbackRate?: number;
  hostOnly: boolean;
  updatedBy?: string | null;
  updatedByName?: string;
}

interface CinemaModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
  currentUserId: string;
  isRoomOwner: boolean;
  socket: any;
}

// Extract 11-char YouTube Video ID from any URL format or direct ID
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const regExp =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = trimmed.match(regExp);
  return match ? match[1] : null;
}

// Convert an .srt text string to WebVTT format for native HTML5 video <track>
function srtToWebVtt(srtText: string): string {
  let vtt = "WEBVTT\n\n";
  const normalized = srtText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const converted = normalized.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
  return vtt + converted;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const PRESET_DEMO_YOUTUBE = [
  {
    title: "این خرید احمقانه برای کیه؟ (ویدیوی شما)",
    url: "https://www.youtube.com/watch?v=3J5g3oSJAQ0",
  },
  {
    title: "Big Buck Bunny (انیمیشن یوتیوب)",
    url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
  },
  {
    title: "Tears of Steel (علمی تخیلی یوتیوب)",
    url: "https://www.youtube.com/watch?v=R6MlUcmOul8",
  },
];

const PRESET_DEMO_DIRECT = [
  {
    title: "Big Buck Bunny (لینک مستقیم MP4)",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  },
  {
    title: "Tears of Steel (لینک مستقیم MP4)",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  },
];

export default function CinemaModal({
  isOpen,
  onClose,
  roomId,
  roomName,
  currentUserId,
  isRoomOwner,
  socket,
}: CinemaModalProps) {
  const [cinemaState, setCinemaState] = useState<CinemaState | null>(null);
  const [activeTab, setActiveTab] = useState<"youtube" | "local" | "url">("youtube");
  const [inputUrl, setInputUrl] = useState("");
  const [inputTitle, setInputTitle] = useState("");
  const [localVideoFile, setLocalVideoFile] = useState<File | null>(null);
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [subtitleUrl, setSubtitleUrl] = useState<string | null>(null);
  const [subtitleEnabled, setSubtitleEnabled] = useState(true);

  // Player controls state
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "idle">("idle");
  const [lastActionNotice, setLastActionNotice] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const currentVideoIdRef = useRef<string | null>(null);
  const ytMountContainerRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isSeekingRef = useRef<boolean>(false);
  const isProgrammaticYtActionRef = useRef<boolean>(false);

  // Sync refs to avoid stale closures in event listeners without re-subscribing
  const cinemaStateRef = useRef<CinemaState | null>(null);
  cinemaStateRef.current = cinemaState;

  // Permission check
  const canControl = !cinemaState?.hostOnly || isRoomOwner;

  const canControlRef = useRef<boolean>(canControl);
  canControlRef.current = canControl;

  // Load YouTube IFrame API Script once
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!(window as any).YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Cleanup blob URLs and player on unmount
  useEffect(() => {
    return () => {
      if (localVideoUrl) URL.revokeObjectURL(localVideoUrl);
      if (subtitleUrl) URL.revokeObjectURL(subtitleUrl);
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (_) {}
        ytPlayerRef.current = null;
        currentVideoIdRef.current = null;
      }
    };
  }, [localVideoUrl, subtitleUrl]);

  // Clean up player when modal closes
  useEffect(() => {
    if (!isOpen) {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (_) {}
        ytPlayerRef.current = null;
        currentVideoIdRef.current = null;
      }
      if (ytMountContainerRef.current) {
        ytMountContainerRef.current.innerHTML = "";
      }
    }
  }, [isOpen]);

  // Handle local video selection
  const handleSelectLocalVideo = (file: File) => {
    if (localVideoUrl) URL.revokeObjectURL(localVideoUrl);
    const objectUrl = URL.createObjectURL(file);
    setLocalVideoFile(file);
    setLocalVideoUrl(objectUrl);
    sounds.playPop();

    if (socket?.connected && canControl) {
      socket.emit("cinema_set_source", {
        roomId,
        type: "local",
        title: file.name,
        duration: 0,
        hostOnly: cinemaState?.hostOnly ?? false,
      });
    }
  };

  // Handle subtitle file selection
  const handleSelectSubtitle = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      try {
        const vttContent = srtToWebVtt(text);
        const blob = new Blob([vttContent], { type: "text/vtt" });
        if (subtitleUrl) URL.revokeObjectURL(subtitleUrl);
        const vttBlobUrl = URL.createObjectURL(blob);
        setSubtitleFile(file);
        setSubtitleUrl(vttBlobUrl);
        setSubtitleEnabled(true);
        sounds.playPop();
      } catch (err) {
        console.error("Subtitle parse error:", err);
      }
    };
    reader.readAsText(file);
  };

  // Initialize YouTube player when state is 'youtube'
  const initYouTubePlayer = useCallback(
    (videoId: string) => {
      if (!videoId) return;

      // If player already exists and loaded:
      if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === "function") {
        if (currentVideoIdRef.current !== videoId) {
          currentVideoIdRef.current = videoId;
          isProgrammaticYtActionRef.current = true;
          try {
            ytPlayerRef.current.loadVideoById(videoId, 0);
            if (cinemaStateRef.current?.status === "playing") {
              ytPlayerRef.current.playVideo();
            } else {
              ytPlayerRef.current.pauseVideo();
            }
          } catch (e) {
            console.error("Error switching video:", e);
          }
          setTimeout(() => {
            isProgrammaticYtActionRef.current = false;
          }, 800);
        }
        return;
      }

      let attempts = 0;
      const checkAndMount = () => {
        attempts++;
        if (typeof window === "undefined") return;

        const container = ytMountContainerRef.current;
        const ytReady = (window as any).YT && (window as any).YT.Player;

        if (!ytReady || !container) {
          if (attempts < 60) {
            setTimeout(checkAndMount, 100);
          }
          return;
        }

        if (ytPlayerRef.current) return;

        currentVideoIdRef.current = videoId;
        container.innerHTML = '<div id="yt-player-target" style="width:100%;height:100%;"></div>';

        try {
          ytPlayerRef.current = new (window as any).YT.Player("yt-player-target", {
            videoId,
            playerVars: {
              autoplay: 1,
              controls: 1,
              enablejsapi: 1,
              rel: 0,
              modestbranding: 1,
              playsinline: 1,
              origin: window.location.origin,
            },
            events: {
              onReady: (event: any) => {
                setDuration(event.target.getDuration() || 0);
                const curState = cinemaStateRef.current;
                isProgrammaticYtActionRef.current = true;
                if (curState?.status === "playing") {
                  const targetTime = curState.calculatedCurrentTime ?? curState.currentTime ?? 0;
                  if (targetTime > 1) {
                    event.target.seekTo(targetTime, true);
                  }
                  event.target.playVideo();
                }
                setTimeout(() => {
                  isProgrammaticYtActionRef.current = false;
                }, 800);
              },
              onStateChange: (event: any) => {
                if (isProgrammaticYtActionRef.current) return;

                const ytState = event.data;
                const curTime = event.target.getCurrentTime?.() || 0;
                const curState = cinemaStateRef.current;
                const canCtrl = canControlRef.current;

                // 1 = PLAYING
                if (ytState === 1 && canCtrl) {
                  if (curState?.status !== "playing") {
                    socket?.emit("cinema_play", { roomId, currentTime: curTime });
                  }
                }
                // 2 = PAUSED
                else if (ytState === 2 && canCtrl) {
                  if (curState?.status !== "paused") {
                    socket?.emit("cinema_pause", { roomId, currentTime: curTime });
                  }
                }
              },
              onError: (event: any) => {
                console.warn("YouTube Player error:", event.data);
                const code = event.data;
                let msg = "خطا در بارگذاری ویدیوی یوتیوب";
                if (code === 101 || code === 150) {
                  msg = "این ویدیو اجازه پخش درون سایتی (Embed) را به سایت‌های دیگر نمی‌دهد.";
                } else if (code === 100 || code === 2) {
                  msg = "شناسه ویدیو نامعتبر است یا ویدیو خصوصی/حذف شده است.";
                }
                setLastActionNotice(`⚠️ ${msg}`);
                setTimeout(() => setLastActionNotice(null), 5000);
              },
            },
          });
        } catch (err) {
          console.error("Failed to initialize YT.Player:", err);
        }
      };

      checkAndMount();
    },
    [roomId, socket]
  );

  // Sync state listener
  useEffect(() => {
    if (!isOpen || !socket) return;

    const handleCinemaState = (state: CinemaState) => {
      setCinemaState(state);

      if (state.updatedByName && state.status !== "idle") {
        const actionText =
          state.status === "playing"
            ? `▶️ ${state.updatedByName} ویدیو را پخش کرد`
            : `⏸️ ${state.updatedByName} ویدیو را متوقف کرد`;
        setLastActionNotice(actionText);
        setTimeout(() => setLastActionNotice(null), 3000);
      }

      const targetTime = state.calculatedCurrentTime ?? state.currentTime;

      // Handle YouTube Player sync
      if (state.type === "youtube" && ytPlayerRef.current && typeof ytPlayerRef.current.getPlayerState === "function") {
        isProgrammaticYtActionRef.current = true;
        try {
          const curTime = ytPlayerRef.current.getCurrentTime?.() || 0;
          const drift = Math.abs(curTime - targetTime);

          if (state.status === "playing") {
            if (drift > 2.0) {
              ytPlayerRef.current.seekTo(targetTime, true);
            }
            const pState = ytPlayerRef.current.getPlayerState?.();
            if (pState !== 1 && pState !== 3) {
              ytPlayerRef.current.playVideo();
            }
            setSyncStatus("synced");
          } else if (state.status === "paused") {
            if (drift > 1.0) {
              ytPlayerRef.current.seekTo(state.currentTime, true);
            }
            const pState = ytPlayerRef.current.getPlayerState?.();
            if (pState === 1 || pState === 3) {
              ytPlayerRef.current.pauseVideo();
            }
            setSyncStatus("synced");
          }
        } catch (_) {}
        setTimeout(() => {
          isProgrammaticYtActionRef.current = false;
        }, 800);
        return;
      }

      // Handle HTML5 Video Player sync
      const video = videoRef.current;
      if (!video) return;

      if (state.status === "playing") {
        setSyncStatus("syncing");
        const drift = Math.abs(video.currentTime - targetTime);

        if (drift > 1.2 && !isSeekingRef.current) {
          video.currentTime = targetTime;
        }

        if (video.paused) {
          video.play().catch(() => {});
        }
        setSyncStatus("synced");
      } else if (state.status === "paused") {
        const drift = Math.abs(video.currentTime - state.currentTime);
        if (drift > 0.8 && !isSeekingRef.current) {
          video.currentTime = state.currentTime;
        }
        if (!video.paused) {
          video.pause();
        }
        setSyncStatus("synced");
      }
    };

    socket.emit("cinema_get_state", { roomId }, (res: any) => {
      if (res?.state) handleCinemaState(res.state);
    });

    socket.on("cinema_state", handleCinemaState);

    return () => {
      socket.off("cinema_state", handleCinemaState);
    };
  }, [isOpen, socket, roomId]);

  // When cinemaState changes to youtube, mount the player
  useEffect(() => {
    if (cinemaState?.type === "youtube" && cinemaState.url) {
      initYouTubePlayer(cinemaState.url);
    }
  }, [cinemaState?.type, cinemaState?.url, initYouTubePlayer]);

  // Periodic drift check for HTML5 and YouTube
  useEffect(() => {
    if (!isOpen || !cinemaState || cinemaState.status !== "playing") return;

    const interval = setInterval(() => {
      const curState = cinemaStateRef.current;
      if (!curState || curState.status !== "playing") return;

      if (curState.type === "youtube" && ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === "function") {
        try {
          const curTime = ytPlayerRef.current.getCurrentTime() || 0;
          const elapsed = (Date.now() - curState.updatedAt) / 1000;
          const target = curState.currentTime + elapsed * (curState.playbackRate || 1);
          if (Math.abs(curTime - target) > 3.0) {
            isProgrammaticYtActionRef.current = true;
            ytPlayerRef.current.seekTo(target, true);
            setTimeout(() => {
              isProgrammaticYtActionRef.current = false;
            }, 800);
          }
        } catch (_) {}
        return;
      }

      const video = videoRef.current;
      if (!video || video.paused || isSeekingRef.current) return;

      const elapsed = (Date.now() - curState.updatedAt) / 1000;
      const targetTime = curState.currentTime + elapsed * (curState.playbackRate || 1);
      const drift = Math.abs(video.currentTime - targetTime);

      if (drift > 1.8) {
        setSyncStatus("syncing");
        video.currentTime = targetTime;
        setTimeout(() => setSyncStatus("synced"), 400);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, cinemaState]);

  // Play/Pause Action
  const togglePlay = useCallback(() => {
    if (!canControl) return;

    // YouTube Toggle
    if (cinemaState?.type === "youtube" && ytPlayerRef.current) {
      try {
        const cur = ytPlayerRef.current.getCurrentTime() || 0;
        sounds.playPop();
        if (cinemaState.status === "playing") {
          isProgrammaticYtActionRef.current = true;
          ytPlayerRef.current.pauseVideo();
          setTimeout(() => {
            isProgrammaticYtActionRef.current = false;
          }, 800);
          socket?.emit("cinema_pause", { roomId, currentTime: cur });
        } else {
          isProgrammaticYtActionRef.current = true;
          ytPlayerRef.current.playVideo();
          setTimeout(() => {
            isProgrammaticYtActionRef.current = false;
          }, 800);
          socket?.emit("cinema_play", { roomId, currentTime: cur });
        }
      } catch (_) {}
      return;
    }

    // HTML5 Video Toggle
    const video = videoRef.current;
    if (!video) return;

    sounds.playPop();
    const currentTime = video.currentTime;

    if (cinemaState?.status === "playing") {
      socket?.emit("cinema_pause", { roomId, currentTime });
    } else {
      socket?.emit("cinema_play", { roomId, currentTime });
    }
  }, [canControl, cinemaState, roomId, socket]);

  // Seek handler
  const handleSeek = (newTime: number) => {
    if (!canControl) return;

    if (cinemaState?.type === "youtube" && ytPlayerRef.current) {
      try {
        isProgrammaticYtActionRef.current = true;
        ytPlayerRef.current.seekTo(newTime, true);
        setTimeout(() => {
          isProgrammaticYtActionRef.current = false;
        }, 800);
      } catch (_) {}
    } else if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setLocalProgress(newTime);
    }

    socket?.emit("cinema_seek", { roomId, currentTime: newTime });
  };

  // Submit direct or YouTube URL
  const handleSetUrlSource = (urlToSet: string, titleToSet: string) => {
    if (!urlToSet.trim() || !canControl) return;
    sounds.playPop();

    const ytId = extractYouTubeId(urlToSet.trim());
    if (ytId) {
      socket?.emit("cinema_set_source", {
        roomId,
        type: "youtube",
        url: ytId,
        title: titleToSet.trim() || "ویدیو یوتیوب",
        duration: 0,
        hostOnly: cinemaState?.hostOnly ?? false,
        autoPlay: true,
      });
      setInputUrl("");
      setInputTitle("");
    } else {
      socket?.emit("cinema_set_source", {
        roomId,
        type: "url",
        url: urlToSet.trim(),
        title: titleToSet.trim() || "ویدیو استریم",
        duration: 0,
        hostOnly: cinemaState?.hostOnly ?? false,
        autoPlay: true,
      });
      setInputUrl("");
      setInputTitle("");
    }
  };

  // Toggle Host Only mode
  const handleToggleHostOnly = () => {
    if (!isRoomOwner) return;
    sounds.playPop();
    const newHostOnly = !cinemaState?.hostOnly;
    socket?.emit("cinema_config", { roomId, hostOnly: newHostOnly });
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  if (!isOpen) return null;

  // Has active playable source
  const hasVideoSource =
    (cinemaState?.type === "youtube" && !!cinemaState.url) ||
    (cinemaState?.type === "url" && !!cinemaState.url) ||
    (cinemaState?.type === "local" && !!localVideoUrl);

  const isLocalWaitingForFile = cinemaState?.type === "local" && !localVideoUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div
        ref={containerRef}
        className="relative w-full max-w-4xl h-[650px] max-h-[92vh] flex flex-col rounded-3xl bg-panel-deep border border-outline shadow-2xl overflow-hidden"
      >
        {/* 1. Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-outline bg-panel/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-400/30 shadow-sm">
              <Film size={18} className="drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-on-surface leading-tight">
                  سینما روم (Watch Together)
                </h2>
                {cinemaState?.status !== "idle" && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <Radio size={10} className="animate-pulse" />
                    <span>همگام با اتاق ({roomName})</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted truncate max-w-[240px] sm:max-w-md">
                {cinemaState?.title
                  ? `در حال پخش: ${cinemaState.title}`
                  : "پخش همزمان ویدیو با افراد روم"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Host Only Toggle */}
            {isRoomOwner && (
              <button
                type="button"
                onClick={handleToggleHostOnly}
                title={cinemaState?.hostOnly ? "فقط میزبان کنترل می‌کند" : "کنترل آزاد برای همه"}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  cinemaState?.hostOnly
                    ? "bg-amber-500/20 text-amber-300 border-amber-400/40"
                    : "bg-panel text-muted hover:text-on-surface border-outline"
                }`}
              >
                {cinemaState?.hostOnly ? <Lock size={13} /> : <Unlock size={13} />}
                <span className="hidden sm:inline">
                  {cinemaState?.hostOnly ? "کنترل: فقط میزبان" : "کنترل: آزاد"}
                </span>
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={() => {
                sounds.playPop();
                onClose();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-all active:scale-90"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 2. Main Theater / Source Setup Content */}
        <div className="flex-1 min-h-0 bg-black flex flex-col relative overflow-hidden">
          {/* Action Notice Overlay Toast */}
          {lastActionNotice && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 text-xs text-white font-bold animate-fade-in shadow-lg">
              {lastActionNotice}
            </div>
          )}

          {/* A. Playable Video Source (YouTube or HTML5) */}
          {hasVideoSource ? (
            <div className="relative flex-1 w-full h-full flex flex-col justify-center items-center bg-black group">
              {/* YouTube IFrame Player */}
              {cinemaState?.type === "youtube" ? (
                <div className="w-full h-full relative flex items-center justify-center bg-black">
                  <div ref={ytMountContainerRef} className="w-full h-full" />
                </div>
              ) : (
                /* Native HTML5 Video Player */
                <video
                  ref={videoRef}
                  src={cinemaState?.type === "url" ? cinemaState.url : localVideoUrl || undefined}
                  className="w-full h-full object-contain"
                  onTimeUpdate={() => {
                    if (videoRef.current && !isSeekingRef.current) {
                      setLocalProgress(videoRef.current.currentTime);
                    }
                  }}
                  onLoadedMetadata={() => {
                    if (videoRef.current) {
                      setDuration(videoRef.current.duration || 0);
                    }
                  }}
                  onEnded={() => {
                    if (canControl) {
                      socket?.emit("cinema_pause", { roomId, currentTime: duration });
                    }
                  }}
                  playsInline
                >
                  {subtitleUrl && subtitleEnabled && (
                    <track
                      default
                      kind="subtitles"
                      src={subtitleUrl}
                      srcLang="fa"
                      label="زیرنویس فارسی"
                    />
                  )}
                </video>
              )}

              {/* Player Overlay Controls */}
              <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-2 transition-opacity duration-300 opacity-95 group-hover:opacity-100 z-20">
                {/* Timeline Scrubber (Only for local & direct HTML5 videos, YouTube has native controls inside iframe) */}
                {cinemaState?.type !== "youtube" && (
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-[11px] font-mono text-slate-300 min-w-[42px] text-left">
                      {formatTime(localProgress)}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      step={0.1}
                      value={localProgress}
                      disabled={!canControl}
                      onMouseDown={() => {
                        isSeekingRef.current = true;
                      }}
                      onTouchStart={() => {
                        isSeekingRef.current = true;
                      }}
                      onChange={(e) => {
                        setLocalProgress(Number(e.target.value));
                      }}
                      onMouseUp={(e) => {
                        isSeekingRef.current = false;
                        handleSeek(Number((e.target as HTMLInputElement).value));
                      }}
                      onTouchEnd={(e) => {
                        isSeekingRef.current = false;
                        handleSeek(Number((e.target as HTMLInputElement).value));
                      }}
                      className={`flex-1 h-1.5 rounded-lg appearance-none cursor-pointer accent-accent bg-white/20 hover:bg-white/30 transition-all ${
                        !canControl ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    />
                    <span className="text-[11px] font-mono text-slate-400 min-w-[42px] text-right">
                      {formatTime(duration)}
                    </span>
                  </div>
                )}

                {/* Bottom Bar Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={togglePlay}
                      disabled={!canControl}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all shadow-md active:scale-95 ${
                        cinemaState?.status === "playing"
                          ? "bg-amber-500 hover:bg-amber-400 text-panel-deep"
                          : "bg-accent hover:brightness-110 text-panel-deep"
                      } ${!canControl ? "opacity-50 cursor-not-allowed" : ""}`}
                      title={!canControl ? "فقط میزبان اجازه تغییر دارد" : "پخش / توقف"}
                    >
                      {cinemaState?.status === "playing" ? (
                        <Pause size={18} fill="currentColor" />
                      ) : (
                        <Play size={18} fill="currentColor" className="translate-x-0.5" />
                      )}
                    </button>

                    {/* Volume (for HTML5) */}
                    {cinemaState?.type !== "youtube" && (
                      <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => {
                            const nextMute = !isMuted;
                            setIsMuted(nextMute);
                            if (videoRef.current) videoRef.current.muted = nextMute;
                          }}
                          className="text-slate-300 hover:text-white"
                        >
                          {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={isMuted ? 0 : volume}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setVolume(val);
                            setIsMuted(false);
                            if (videoRef.current) {
                              videoRef.current.volume = val;
                              videoRef.current.muted = false;
                            }
                          }}
                          className="w-14 sm:w-20 h-1 rounded-lg appearance-none cursor-pointer accent-accent bg-white/20"
                        />
                      </div>
                    )}

                    {cinemaState?.type === "youtube" && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 text-xs font-bold">
                        <YouTubeIcon size={14} />
                        <span>پخش یوتیوب همگام</span>
                      </span>
                    )}

                    {/* Subtitle Toggle */}
                    {subtitleUrl && cinemaState?.type !== "youtube" && (
                      <button
                        type="button"
                        onClick={() => setSubtitleEnabled((prev) => !prev)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold transition-all border ${
                          subtitleEnabled
                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                            : "bg-white/5 text-muted border-white/10"
                        }`}
                      >
                        <Subtitles size={14} />
                        <span className="hidden sm:inline">زیرنویس</span>
                      </button>
                    )}
                  </div>

                  {/* Right side controls */}
                  <div className="flex items-center gap-2">
                    {/* Add Subtitle Button (HTML5 only) */}
                    {cinemaState?.type !== "youtube" && (
                      <label className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 cursor-pointer transition-all">
                        <Subtitles size={14} />
                        <span className="hidden sm:inline">
                          {subtitleFile ? subtitleFile.name : "افزودن زیرنویس (.srt)"}
                        </span>
                        <input
                          type="file"
                          accept=".srt,.vtt"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleSelectSubtitle(file);
                          }}
                        />
                      </label>
                    )}

                    {/* Change Source Button */}
                    {canControl && (
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playPop();
                          if (ytPlayerRef.current) {
                            try {
                              ytPlayerRef.current.destroy();
                            } catch (_) {}
                            ytPlayerRef.current = null;
                            currentVideoIdRef.current = null;
                          }
                          if (ytMountContainerRef.current) {
                            ytMountContainerRef.current.innerHTML = "";
                          }
                          socket?.emit("cinema_set_source", {
                            roomId,
                            type: "none",
                            url: "",
                            title: "",
                          });
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all"
                        title="تغییر فیلم"
                      >
                        <RefreshCw size={13} />
                        <span className="hidden sm:inline">تغییر فیلم</span>
                      </button>
                    )}

                    {/* Fullscreen Button */}
                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
                      title={isFullscreen ? "خروج از تمام‌صفحه" : "تمام‌صفحه"}
                    >
                      {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : isLocalWaitingForFile ? (
            /* B. Waiting for Local File Selection */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-md mx-auto">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/30">
                <FileVideo size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-on-surface">
                  فیلم با حالت فایل محلی آغاز شده است!
                </h3>
                <p className="text-xs text-muted">
                  میزبان فیلم <strong className="text-accent">{cinemaState.title}</strong> را برای
                  پخش سینک انتخاب کرده است.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-panel-soft/60 border border-outline text-right text-[11px] text-muted space-y-1 w-full">
                <div className="flex items-center gap-1.5 font-bold text-slate-300">
                  <Info size={14} className="text-accent" />
                  <span>راهنمایی پخش سینک (Syncplay):</span>
                </div>
                <p>
                  فایل فیلم مورد نظر را از کامپیوتر خود انتخاب کنید تا مرورگر فوراً با سایر اعضا
                  هماهنگ شود. هیچ فایلی از اینترنت شما آپلود نمی‌شود.
                </p>
              </div>

              <label className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-accent hover:brightness-110 text-panel-deep font-black text-xs cursor-pointer shadow-lg transition-all active:scale-95">
                <Upload size={16} />
                <span>انتخاب فایل فیلم از سیستم</span>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-matroska,.mkv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSelectLocalVideo(file);
                  }}
                />
              </label>
            </div>
          ) : (
            /* C. Setup Tabs: YouTube, Local File, Direct URL */
            <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto max-w-xl mx-auto w-full justify-center">
              <div className="text-center space-y-1.5 mb-5">
                <h3 className="text-base sm:text-lg font-extrabold text-on-surface">
                  آماده‌سازی سینما روم
                </h3>
                <p className="text-xs text-muted">منبع ویدیوی مورد نظر خود را انتخاب کنید:</p>
              </div>

              {/* 3 Tabs: YouTube, Local File, Direct URL */}
              <div className="grid grid-cols-3 p-1 rounded-2xl bg-panel-soft border border-outline mb-5">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playPop();
                    setActiveTab("youtube");
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                    activeTab === "youtube"
                      ? "bg-red-600 text-white shadow-sm"
                      : "text-muted hover:text-white"
                  }`}
                >
                  <YouTubeIcon size={15} />
                  <span>یوتیوب (YouTube)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sounds.playPop();
                    setActiveTab("local");
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                    activeTab === "local"
                      ? "bg-accent text-panel-deep shadow-sm"
                      : "text-muted hover:text-white"
                  }`}
                >
                  <Upload size={14} />
                  <span>فایل محلی</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sounds.playPop();
                    setActiveTab("url");
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                    activeTab === "url"
                      ? "bg-accent text-panel-deep shadow-sm"
                      : "text-muted hover:text-white"
                  }`}
                >
                  <LinkIcon size={14} />
                  <span>لینک مستقیم MP4</span>
                </button>
              </div>

              {/* Tab 1: YouTube */}
              {activeTab === "youtube" && (
                <div className="space-y-4 animate-fade-in">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSetUrlSource(inputUrl, inputTitle);
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 block text-right">
                        لینک ویدیوی یوتیوب (یا شناسه ۱۱ رقمی ویدیو):
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        placeholder="https://www.youtube.com/watch?v=... یا https://youtu.be/... یا 3J5g3oSJAQ0"
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSetUrlSource(inputUrl, inputTitle);
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-panel border border-outline text-xs text-white placeholder-muted focus:outline-none focus:border-red-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 block text-right">
                        عنوان ویدیو (اختیاری):
                      </label>
                      <input
                        type="text"
                        placeholder="مثلاً: موزیک ویدیو جدید یا فیلم تستی"
                        value={inputTitle}
                        onChange={(e) => setInputTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSetUrlSource(inputUrl, inputTitle);
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-panel border border-outline text-xs text-white placeholder-muted focus:outline-none focus:border-red-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!inputUrl.trim()}
                      className="w-full py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-black text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <YouTubeIcon size={16} />
                      <span>شروع پخش همزمان یوتیوب در روم</span>
                    </button>
                  </form>

                  {/* Preset YouTube Demos */}
                  <div className="pt-2 border-t border-outline/50 space-y-1.5">
                    <span className="text-[10px] font-bold text-muted block text-right">
                      یا یکی از ویدیوهای تستی یوتیوب را امتحان کنید:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {PRESET_DEMO_YOUTUBE.map((demo, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setInputUrl(demo.url);
                            setInputTitle(demo.title);
                            handleSetUrlSource(demo.url, demo.title);
                          }}
                          className="flex items-center justify-between p-2 rounded-xl bg-panel-soft hover:bg-white/10 border border-outline text-right text-[11px] font-bold text-slate-300 transition-all"
                        >
                          <span className="truncate">{demo.title}</span>
                          <Play size={12} className="text-red-400 shrink-0 mr-1" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Local File */}
              {activeTab === "local" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3.5 rounded-2xl bg-panel-soft/40 border border-outline text-right text-[11px] text-muted space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-slate-200">
                      <Sparkles size={14} className="text-amber-400" />
                      <span>چرا فایل محلی بهترین انتخاب است؟</span>
                    </div>
                    <p>
                      هر کس همان فیلمی که روی کامپیوتر دارد را در پلیر انتخاب می‌کند. فیلم مستقیماً از
                      روی هارد با کیفیت 4K/1080p و بدون صفر ثانیه بافرینگ یا مصرف اینترنت سرور پخش شده
                      و ثانیه‌ها با هم سینک می‌شوند.
                    </p>
                  </div>

                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-outline hover:border-accent/60 rounded-3xl bg-panel/40 hover:bg-panel/70 cursor-pointer transition-all group">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-accent mb-2 group-hover:scale-110 transition-transform">
                      <Upload size={22} />
                    </div>
                    <span className="text-xs font-bold text-on-surface">
                      کلیک کنید یا فایل فیلم را اینجا بکشید
                    </span>
                    <span className="text-[10px] text-muted mt-1">
                      فرمت‌های پشتیبانی شده: MP4, WebM, MKV
                    </span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-matroska,.mkv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSelectLocalVideo(file);
                      }}
                    />
                  </label>
                </div>
              )}

              {/* Tab 3: Direct URL */}
              {activeTab === "url" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block text-right">
                      لینک مستقیم فایل ویدیو (MP4 / WebM / M3U8):
                    </label>
                    <input
                      type="url"
                      dir="ltr"
                      placeholder="https://example.com/movie.mp4"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-panel border border-outline text-xs text-white placeholder-muted focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block text-right">
                      نام فیلم (اختیاری):
                    </label>
                    <input
                      type="text"
                      placeholder="مثلاً: فیلم سینمایی شوالیه‌تاریکی"
                      value={inputTitle}
                      onChange={(e) => setInputTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-panel border border-outline text-xs text-white placeholder-muted focus:outline-none focus:border-accent"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSetUrlSource(inputUrl, inputTitle)}
                    disabled={!inputUrl.trim()}
                    className="w-full py-2.5 rounded-2xl bg-accent hover:brightness-110 disabled:opacity-40 text-panel-deep font-black text-xs shadow-lg transition-all active:scale-95"
                  >
                    شروع پخش همزمان در روم
                  </button>

                  {/* Preset Demo Videos */}
                  <div className="pt-2 border-t border-outline/50 space-y-1.5">
                    <span className="text-[10px] font-bold text-muted block text-right">
                      ویدیوهای تستی لینک مستقیم:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {PRESET_DEMO_DIRECT.map((demo, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setInputUrl(demo.url);
                            setInputTitle(demo.title);
                            handleSetUrlSource(demo.url, demo.title);
                          }}
                          className="flex items-center justify-between p-2 rounded-xl bg-panel-soft hover:bg-white/10 border border-outline text-right text-[11px] font-bold text-slate-300 transition-all"
                        >
                          <span className="truncate">{demo.title}</span>
                          <Play size={12} className="text-accent shrink-0 mr-1" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
