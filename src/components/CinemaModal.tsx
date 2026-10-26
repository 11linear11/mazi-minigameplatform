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
  Tv,
  MessageSquare,
  Send,
  Users,
  Star,
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
  type: "none" | "url" | "local" | "youtube" | "stream";
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
  streamerId?: string | null;
  streamerName?: string | null;
}

interface CinemaModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
  currentUserId: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  isRoomOwner: boolean;
  socket: any;
  roomMessages?: any[];
  onSendMessage?: (content: string) => void;
  onOpenCinemaHub?: () => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const CINEMA_REACTIONS = ["🍿", "❤️", "😂", "😱", "🔥", "👏"];

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
  currentUserName = "کاربر",
  currentUserAvatar = "👤",
  isRoomOwner,
  socket,
  roomMessages = [],
  onSendMessage,
  onOpenCinemaHub,
}: CinemaModalProps) {
  const [cinemaState, setCinemaState] = useState<CinemaState | null>(null);
  const [activeTab, setActiveTab] = useState<"stream" | "youtube" | "local" | "url">("stream");
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

  // WebRTC Live Movie Stream state
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [streamConnecting, setStreamConnecting] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // Live in-cinema chat & reactions state
  const [showCinemaChat, setShowCinemaChat] = useState(true);
  const [isChatInputOpen, setIsChatInputOpen] = useState(false);
  const [isChatInputFocused, setIsChatInputFocused] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [fitMode, setFitMode] = useState<"contain" | "cover">("contain");
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetControlsTimeout = useCallback((keepOpen = false) => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
    setShowControls(true);
    if (!keepOpen) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  }, []);

  const floatingChatInputRef = useRef<HTMLInputElement | null>(null);
  const [chatMessageText, setChatMessageText] = useState("");
  const [floatingReactions, setFloatingReactions] = useState<
    Array<{ id: string; emoji: string; user: string; x: number }>
  >([]);
  const [chatOverlayBubbles, setChatOverlayBubbles] = useState<
    Array<{ id: string; user: string; content: string; isMine: boolean }>
  >([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const viewerPcRef = useRef<RTCPeerConnection | null>(null);

  const ytPlayerRef = useRef<any>(null);
  const currentVideoIdRef = useRef<string | null>(null);
  const ytMountContainerRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const isSeekingRef = useRef<boolean>(false);
  const isProgrammaticYtActionRef = useRef<boolean>(false);

  const cinemaStateRef = useRef<CinemaState | null>(null);
  cinemaStateRef.current = cinemaState;

  const canControl = !cinemaState?.hostOnly || isRoomOwner;
  const canControlRef = useRef<boolean>(canControl);
  canControlRef.current = canControl;

  const isStreamer =
    isScreenSharing ||
    (cinemaState?.type === "stream" && cinemaState?.streamerId === currentUserId);
  const isViewingLiveStream =
    !isStreamer && cinemaState?.type === "stream";

  // Load YouTube script once
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!(window as any).YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      if (localVideoUrl) URL.revokeObjectURL(localVideoUrl);
      if (subtitleUrl) URL.revokeObjectURL(subtitleUrl);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      if (viewerPcRef.current) {
        viewerPcRef.current.close();
        viewerPcRef.current = null;
      }
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (_) {}
        ytPlayerRef.current = null;
        currentVideoIdRef.current = null;
      }
    };
  }, [localVideoUrl, subtitleUrl]);

  // Clean up when modal closes
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
      if (viewerPcRef.current) {
        viewerPcRef.current.close();
        viewerPcRef.current = null;
      }
    }
  }, [isOpen]);

  // Auto scroll cinema chat
  useEffect(() => {
    if (showCinemaChat && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [roomMessages, showCinemaChat]);

  // Listen to new room messages and display floating bubbles in cinema
  const lastMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen && roomMessages.length > 0 && lastMessageIdRef.current === null) {
      lastMessageIdRef.current = roomMessages[roomMessages.length - 1]?.id || null;
    }
    if (!isOpen) {
      lastMessageIdRef.current = null;
      setChatOverlayBubbles([]);
    }
  }, [isOpen, roomMessages]);

  useEffect(() => {
    if (!isOpen || roomMessages.length === 0) return;
    const latest = roomMessages[roomMessages.length - 1];
    if (latest && latest.id && latest.id !== lastMessageIdRef.current && !latest.isSystem) {
      lastMessageIdRef.current = latest.id;
      const bubble = {
        id: latest.id,
        user: latest.user,
        content: latest.content,
        isMine: String(latest.userId) === String(currentUserId),
      };
      setChatOverlayBubbles((prev) => {
        if (prev.some((b) => b.id === latest.id)) return prev;
        return [...prev.slice(-4), bubble];
      });
      setTimeout(() => {
        setChatOverlayBubbles((prev) => prev.filter((b) => b.id !== bubble.id));
      }, 4000);
    }
  }, [roomMessages, isOpen, currentUserId]);

  // WebRTC: Attach stream to video element reliably
  const bindStreamVideo = useCallback(
    (el: HTMLVideoElement | null) => {
      streamVideoRef.current = el;
      if (!el) return;

      if (isStreamer || isScreenSharing) {
        const stream = localStream || localStreamRef.current;
        if (stream) {
          if (el.srcObject !== stream) {
            el.srcObject = stream;
          }
          el.muted = true; // Streamer preview MUST be muted to prevent audio feedback loop
          el.play().catch(() => {});
        }
      } else {
        const stream = remoteStream || remoteStreamRef.current;
        if (stream) {
          if (el.srcObject !== stream) {
            el.srcObject = stream;
          }
          el.muted = isMuted;
          el.volume = volume;
          el.play().catch(() => {});
        }
      }
    },
    [isStreamer, isScreenSharing, localStream, remoteStream, isMuted, volume]
  );

  // Sync stream to video element whenever state updates
  useEffect(() => {
    const el = streamVideoRef.current;
    if (!el) return;

    if (isStreamer || isScreenSharing) {
      const stream = localStream || localStreamRef.current;
      if (stream) {
        if (el.srcObject !== stream) {
          el.srcObject = stream;
        }
        el.muted = true;
        el.play().catch(() => {});
      }
    } else {
      const stream = remoteStream || remoteStreamRef.current;
      if (stream) {
        if (el.srcObject !== stream) {
          el.srcObject = stream;
        }
        el.muted = isMuted;
        el.volume = volume;
        el.play().catch(() => {});
      }
    }
  }, [localStream, remoteStream, isStreamer, isScreenSharing, isMuted, volume, cinemaState?.type]);

  // WebRTC: Start Screen Share / Movie Live Stream
  const handleStartScreenShare = async () => {
    try {
      sounds.playPop();

      const isMobileDevice =
        typeof window !== "undefined" &&
        (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768);
      const hasDisplayMedia =
        typeof navigator !== "undefined" &&
        typeof navigator.mediaDevices?.getDisplayMedia === "function";

      if (isMobileDevice || !hasDisplayMedia) {
        setLastActionNotice(
          "📱 مرورگرهای موبایل (iOS و اندروید) به دلیل امنیت سیستم‌عامل، امکان اشتراک‌گذاری صفحه را بسته‌اند. برای شیر کردن فیلم، لطفاً از کامپیوتر استفاده کنید یا از تب یوتیوب/لینک مستقیم بهره ببرید."
        );
        setTimeout(() => setLastActionNotice(null), 7000);
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
      } catch (err: any) {
        if (err.name === "NotAllowedError" || err.name === "AbortError") {
          return; // User cancelled the screen pick modal
        }
        // Fallback without audio constraint
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsScreenSharing(true);

      // Optimistically switch modal to stream mode
      setCinemaState((prev) => ({
        roomId,
        type: "stream",
        url: "",
        title: `پخش زنده فیلم توسط ${currentUserName}`,
        duration: 0,
        status: "playing",
        currentTime: 0,
        updatedAt: Date.now(),
        hostOnly: false,
        streamerId: currentUserId,
        streamerName: currentUserName,
      }));

      // Bind preview element directly if mounted
      if (streamVideoRef.current) {
        streamVideoRef.current.srcObject = stream;
        streamVideoRef.current.muted = true;
        streamVideoRef.current.play().catch(() => {});
      }

      // Detect when host stops sharing from browser toolbar
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          handleStopScreenShare();
        };
      }

      // Broadcast source to all room members
      socket?.emit("cinema_set_source", {
        roomId,
        type: "stream",
        url: "",
        title: `پخش زنده فیلم توسط ${currentUserName}`,
        duration: 0,
        hostOnly: false,
        autoPlay: true,
        userId: currentUserId,
        userName: currentUserName,
      });

      setLastActionNotice("🔴 پخش زنده فیلم آغاز شد!");
      setTimeout(() => setLastActionNotice(null), 4000);
    } catch (err: any) {
      console.warn("Screen share error:", err);
      if (err.name !== "NotAllowedError" && err.name !== "AbortError") {
        setLastActionNotice("⚠️ خطا در شروع اشتراک تصویر و صدا");
        setTimeout(() => setLastActionNotice(null), 4000);
      }
    }
  };

  // WebRTC: Stop Screen Share
  const handleStopScreenShare = useCallback(() => {
    sounds.playPop();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    setIsScreenSharing(false);

    setCinemaState((prev) => (prev?.type === "stream" ? { ...prev, type: "none" } : prev));

    socket?.emit("cinema_set_source", {
      roomId,
      type: "none",
      url: "",
      title: "",
      userId: currentUserId,
    });

    setLastActionNotice("پخش زنده به پایان رسید");
    setTimeout(() => setLastActionNotice(null), 3000);
  }, [roomId, socket, currentUserId]);

  // WebRTC: Signaling Socket Listeners
  useEffect(() => {
    if (!isOpen || !socket) return;

    // 1. Streamer handles new viewer joining
    const handleViewerJoined = async ({ viewerId }: { viewerId: string }) => {
      const activeStream = localStreamRef.current || localStream;
      if (!activeStream || !viewerId) return;

      try {
        const pc = new RTCPeerConnection(RTC_CONFIG);
        peerConnectionsRef.current.set(viewerId, pc);

        activeStream.getTracks().forEach((track) => {
          pc.addTrack(track, activeStream);
        });

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("cinema_stream_ice", {
              roomId,
              targetUserId: viewerId,
              fromUserId: currentUserId,
              candidate: event.candidate,
            });
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("cinema_stream_signal", {
          roomId,
          targetUserId: viewerId,
          fromUserId: currentUserId,
          signal: offer,
        });
      } catch (err) {
        console.error("Failed to create offer for viewer:", viewerId, err);
      }
    };

    // 2. Handle incoming WebRTC signals (Offers & Answers)
    const handleStreamSignal = async ({ fromUserId, signal }: { fromUserId: string; signal: any }) => {
      try {
        // Viewer receives Offer from Streamer
        if (signal?.type === "offer") {
          setStreamConnecting(true);
          const pc = new RTCPeerConnection(RTC_CONFIG);
          viewerPcRef.current = pc;

          pc.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
              const rStream = event.streams[0];
              remoteStreamRef.current = rStream;
              setRemoteStream(rStream);
              setStreamConnecting(false);
              if (streamVideoRef.current) {
                streamVideoRef.current.srcObject = rStream;
                streamVideoRef.current.muted = isMuted;
                streamVideoRef.current.volume = volume;
                streamVideoRef.current.play().catch(() => {});
              }
            }
          };

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              socket.emit("cinema_stream_ice", {
                roomId,
                targetUserId: fromUserId,
                fromUserId: currentUserId,
                candidate: event.candidate,
              });
            }
          };

          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit("cinema_stream_signal", {
            roomId,
            targetUserId: fromUserId,
            fromUserId: currentUserId,
            signal: answer,
          });
        }
        // Streamer receives Answer from Viewer
        else if (signal?.type === "answer") {
          const pc = peerConnectionsRef.current.get(fromUserId);
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
          }
        }
      } catch (err) {
        console.error("WebRTC signal handling failed:", err);
        setStreamConnecting(false);
      }
    };

    // 3. Handle ICE Candidates
    const handleStreamIce = async ({ fromUserId, candidate }: { fromUserId: string; candidate: any }) => {
      try {
        if (!candidate) return;
        const iceCandidate = new RTCIceCandidate(candidate);
        if (viewerPcRef.current && viewerPcRef.current.remoteDescription) {
          await viewerPcRef.current.addIceCandidate(iceCandidate);
        } else {
          const pc = peerConnectionsRef.current.get(fromUserId);
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(iceCandidate);
          }
        }
      } catch (err) {
        console.warn("ICE candidate add failed:", err);
      }
    };

    // 4. Handle Live Reaction Emojis
    const handleReaction = ({
      userId,
      reaction,
    }: {
      userId: string;
      reaction: string;
    }) => {
      const rx = {
        id: `rx-${Date.now()}-${Math.random()}`,
        emoji: reaction,
        user: userId === currentUserId ? "شما" : "کاربر",
        x: Math.floor(Math.random() * 70) + 15, // 15% to 85% width
      };
      setFloatingReactions((prev) => [...prev.slice(-12), rx]);
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((item) => item.id !== rx.id));
      }, 2500);
    };

    socket.on("cinema_stream_viewer_joined", handleViewerJoined);
    socket.on("cinema_stream_signal", handleStreamSignal);
    socket.on("cinema_stream_ice", handleStreamIce);
    socket.on("cinema_reaction", handleReaction);

    return () => {
      socket.off("cinema_stream_viewer_joined", handleViewerJoined);
      socket.off("cinema_stream_signal", handleStreamSignal);
      socket.off("cinema_stream_ice", handleStreamIce);
      socket.off("cinema_reaction", handleReaction);
    };
  }, [isOpen, socket, roomId, currentUserId, localStream, isMuted, volume]);

  // When viewer sees cinemaState is 'stream', send request to join
  useEffect(() => {
    if (
      isOpen &&
      cinemaState?.type === "stream" &&
      cinemaState.streamerId &&
      cinemaState.streamerId !== currentUserId
    ) {
      setStreamConnecting(true);
      socket?.emit("cinema_stream_join", { roomId, userId: currentUserId });
    }
  }, [isOpen, cinemaState?.type, cinemaState?.streamerId, currentUserId, roomId, socket]);

  // Send Live Reaction
  const sendReaction = (emoji: string) => {
    sounds.playPop();
    socket?.emit("cinema_reaction", { roomId, reaction: emoji });
  };

  // Send Live Chat Message
  const handleSendCinemaMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatMessageText.trim()) return;
    onSendMessage?.(chatMessageText.trim());
    setChatMessageText("");
  };

  // Handle local video selection (Syncplay mode)
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

  // Handle subtitle selection
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

  // Initialize YouTube player
  const initYouTubePlayer = useCallback(
    (videoId: string) => {
      if (!videoId) return;

      if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === "function") {
        if (currentVideoIdRef.current !== videoId) {
          currentVideoIdRef.current = videoId;
          isProgrammaticYtActionRef.current = true;
          try {
            ytPlayerRef.current.loadVideoById(videoId, 0);
            if (cinemaStateRef.current?.status === "playing") {
              ytPlayerRef.current.playVideo();
            }
          } catch (_) {}
          setTimeout(() => {
            isProgrammaticYtActionRef.current = false;
          }, 800);
        }
        return;
      }

      const checkAndMount = () => {
        if (typeof window === "undefined" || !(window as any).YT || !(window as any).YT.Player) {
          setTimeout(checkAndMount, 150);
          return;
        }

        if (!ytMountContainerRef.current) return;

        try {
          currentVideoIdRef.current = videoId;
          ytPlayerRef.current = new (window as any).YT.Player(ytMountContainerRef.current, {
            videoId,
            width: "100%",
            height: "100%",
            playerVars: {
              autoplay: cinemaStateRef.current?.status === "playing" ? 1 : 0,
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

                if (ytState === 1 && canCtrl) {
                  if (curState?.status !== "playing") {
                    socket?.emit("cinema_play", { roomId, currentTime: curTime });
                  }
                } else if (ytState === 2 && canCtrl) {
                  if (curState?.status !== "paused") {
                    socket?.emit("cinema_pause", { roomId, currentTime: curTime });
                  }
                }
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

      if (state.updatedByName && state.status !== "idle" && state.type !== "stream") {
        const actionText =
          state.status === "playing"
            ? `▶️ ${state.updatedByName} ویدیو را پخش کرد`
            : `⏸️ ${state.updatedByName} ویدیو را متوقف کرد`;
        setLastActionNotice(actionText);
        setTimeout(() => setLastActionNotice(null), 3000);
      }

      const targetTime = state.calculatedCurrentTime ?? state.currentTime;

      if (state.type === "youtube" && ytPlayerRef.current && typeof ytPlayerRef.current.getPlayerState === "function") {
        isProgrammaticYtActionRef.current = true;
        try {
          const curTime = ytPlayerRef.current.getCurrentTime?.() || 0;
          const drift = Math.abs(curTime - targetTime);

          if (state.status === "playing") {
            if (drift > 2.0) ytPlayerRef.current.seekTo(targetTime, true);
            const pState = ytPlayerRef.current.getPlayerState?.();
            if (pState !== 1 && pState !== 3) ytPlayerRef.current.playVideo();
            setSyncStatus("synced");
          } else if (state.status === "paused") {
            if (drift > 1.0) ytPlayerRef.current.seekTo(state.currentTime, true);
            const pState = ytPlayerRef.current.getPlayerState?.();
            if (pState === 1 || pState === 3) ytPlayerRef.current.pauseVideo();
            setSyncStatus("synced");
          }
        } catch (_) {}
        setTimeout(() => {
          isProgrammaticYtActionRef.current = false;
        }, 800);
        return;
      }

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

  // When cinemaState changes to youtube
  useEffect(() => {
    if (cinemaState?.type === "youtube" && cinemaState.url) {
      initYouTubePlayer(cinemaState.url);
    }
  }, [cinemaState?.type, cinemaState?.url, initYouTubePlayer]);

  // Play/Pause Action for HTML5 / YouTube
  const togglePlay = useCallback(() => {
    if (!canControl) return;

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

  // Toggle Host Only Control
  const handleToggleHostOnly = () => {
    if (!isRoomOwner) return;
    sounds.playPop();
    const nextState = !cinemaState?.hostOnly;
    socket?.emit("cinema_config", {
      roomId,
      hostOnly: nextState,
    });
  };

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  if (!isOpen) return null;

  const hasVideoSource =
    isScreenSharing ||
    cinemaState?.type === "stream" ||
    (cinemaState?.type === "youtube" && !!cinemaState.url) ||
    (cinemaState?.type === "url" && !!cinemaState.url) ||
    (cinemaState?.type === "local" && !!localVideoUrl);

  const isLocalWaitingForFile = cinemaState?.type === "local" && !localVideoUrl;

  if (hasVideoSource) {
    return (
      <div
        ref={containerRef}
        onMouseMove={() => {
          if (!isChatInputFocused) resetControlsTimeout();
        }}
        onTouchStart={() => {
          if (!isChatInputFocused) resetControlsTimeout();
        }}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button, input, form, a")) return;
          setShowControls((prev) => {
            if (!prev) {
              resetControlsTimeout();
              return true;
            } else {
              if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
              return false;
            }
          });
        }}
        className="fixed inset-0 z-50 w-full h-[100dvh] bg-black overflow-hidden flex flex-col select-none touch-manipulation animate-fade-in"
      >
        {/* 1. Fullscreen / Edge-to-Edge Video Canvas */}
        <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center overflow-hidden">
          {cinemaState?.type === "stream" || isScreenSharing ? (
            <video
              ref={bindStreamVideo}
              autoPlay
              playsInline
              className={`w-full h-full bg-black transition-all duration-300 ${
                fitMode === "cover" ? "object-cover" : "object-contain"
              }`}
            />
          ) : cinemaState?.type === "youtube" ? (
            <div
              ref={ytMountContainerRef}
              className={`transition-transform duration-300 w-full h-full flex items-center justify-center [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0 ${
                fitMode === "cover" ? "scale-[1.28] origin-center" : "scale-100"
              }`}
            />
          ) : (
            <video
              ref={videoRef}
              src={cinemaState?.type === "url" ? cinemaState.url : localVideoUrl || undefined}
              className={`w-full h-full transition-all duration-300 ${
                fitMode === "cover" ? "object-cover" : "object-contain"
              }`}
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
        </div>

        {/* 2. Floating Live Reaction Emojis */}
        <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
          {floatingReactions.map((rx) => (
            <div
              key={rx.id}
              className="absolute bottom-24 text-4xl animate-bounce drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
              style={{
                left: `${rx.x}%`,
                animation: "miniChatBubble 2.5s ease-out forwards",
              }}
            >
              <span>{rx.emoji}</span>
            </div>
          ))}
        </div>

        {/* 3. Toast Action Notice */}
        {lastActionNotice && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 rounded-xl bg-black/85 backdrop-blur-md border border-white/20 text-xs text-white font-bold animate-fade-in shadow-xl pointer-events-none">
            {lastActionNotice}
          </div>
        )}

        {/* 4. Floating Danmaku Live Chat Bubbles (Non-blocking) */}
        {chatOverlayBubbles.length > 0 && (
          <div
            dir="rtl"
            className="absolute bottom-24 right-3 sm:right-6 z-40 max-w-[280px] sm:max-w-xs pointer-events-none flex flex-col gap-2"
          >
            {chatOverlayBubbles.map((bubble) => (
              <div
                key={bubble.id}
                className={`flex ${bubble.isMine ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`animate-mini-chat-bubble max-w-[90%] rounded-2xl border px-3.5 py-2 shadow-2xl backdrop-blur-md ${
                    bubble.isMine
                      ? "rounded-tr-none border-accent/40 bg-black/80 text-white"
                      : "rounded-tl-none border-white/20 bg-black/70 text-white"
                  }`}
                >
                  {!bubble.isMine && (
                    <span className="text-[11px] text-accent font-bold block mb-0.5">
                      {bubble.user}
                    </span>
                  )}
                  <p className="text-xs sm:text-sm leading-relaxed break-words">{bubble.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 5. Streamer / Viewer Live Banners */}
        {isStreamer && (
          <div className="absolute top-16 right-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-600/90 text-white text-xs font-bold shadow-lg backdrop-blur">
            <Radio size={14} className="animate-pulse" />
            <span>شما در حال پخش فیلم هستید</span>
            <button
              type="button"
              onClick={handleStopScreenShare}
              className="mr-2 rounded-lg bg-black/40 hover:bg-black/60 px-2 py-0.5 text-[11px] transition-all"
            >
              توقف
            </button>
          </div>
        )}

        {isViewingLiveStream && (
          <div className="absolute top-16 right-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/70 text-slate-200 border border-white/10 text-xs font-bold backdrop-blur">
            <Radio size={14} className="text-rose-400 animate-pulse" />
            <span>پخش زنده: {cinemaState?.streamerName || "میزبان"}</span>
            {streamConnecting && (
              <span className="text-amber-400 text-[10px]">(در حال اتصال...)</span>
            )}
          </div>
        )}

        {/* 6. Top HUD Overlay (Auto-Hides) */}
        <div
          dir="rtl"
          className={`absolute top-0 inset-x-0 z-30 p-2.5 sm:p-4 bg-gradient-to-b from-black/90 via-black/40 to-transparent flex items-center justify-between pointer-events-auto transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          style={{ paddingTop: "max(0.6rem, env(safe-area-inset-top, 10px))" }}
        >
          {/* Right (RTL): Close + Title & Sync info */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                sounds.playPop();
                onClose();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 hover:bg-black/90 text-white/90 hover:text-white border border-white/20 transition-all active:scale-90 shrink-0 shadow-lg"
              title="خروج از سینما"
            >
              <X size={18} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-[140px] xs:max-w-[200px] sm:max-w-md">
                  {cinemaState?.title || "پخش سینما"}
                </h3>
                {cinemaState?.status === "playing" && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 whitespace-nowrap">
                    <Radio size={8} className="animate-pulse" />
                    <span className="hidden sm:inline">همگام با اتاق ({roomName})</span>
                    <span className="sm:hidden">همگام</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Left: Fit/Fill mode, Review, Change movie, Host only, Fullscreen */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Fit / Fill Aspect Ratio Toggle */}
            <button
              type="button"
              onClick={() => {
                sounds.playPop();
                setFitMode((prev) => (prev === "contain" ? "cover" : "contain"));
                setLastActionNotice(
                  fitMode === "contain"
                    ? "🔲 حالت بدون حاشیه (پر کردن صفحه) فعال شد"
                    : "🔳 حالت نسبت تصویر اصلی فعال شد"
                );
                setTimeout(() => setLastActionNotice(null), 2500);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold border transition-all shadow-md active:scale-95 ${
                fitMode === "cover"
                  ? "bg-accent text-panel-deep border-accent font-black"
                  : "bg-black/60 text-white/90 border-white/20 hover:bg-black/80"
              }`}
              title={fitMode === "cover" ? "برگشت به اندازه اصلی" : "پر کردن کل صفحه (حذف حاشیه‌ها)"}
            >
              {fitMode === "cover" ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span className="text-[11px] hidden xs:inline">
                {fitMode === "cover" ? "اندازه اصلی" : "حذف حاشیه‌ها"}
              </span>
            </button>

            {/* Rating / Review Hub */}
            {onOpenCinemaHub && (
              <button
                type="button"
                onClick={onOpenCinemaHub}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all"
                title="نقد و نمره‌دهی"
              >
                <Star size={13} className="fill-amber-400 text-amber-400" />
                <span className="hidden md:inline">نقد و نمره</span>
              </button>
            )}

            {/* Change Movie */}
            {canControl && (
              <button
                type="button"
                onClick={() => {
                  sounds.playPop();
                  if (cinemaState?.type === "stream") {
                    handleStopScreenShare();
                  } else {
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
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold bg-black/60 hover:bg-black/80 text-white/90 border border-white/20 transition-all active:scale-95 shadow-md"
                title="تغییر فیلم"
              >
                <RefreshCw size={13} />
                <span className="text-[11px] hidden sm:inline">تغییر فیلم</span>
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-all active:scale-95 shadow-md"
              title="تمام‌صفحه مرورگر"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>

        {/* 7. Bottom HUD Overlay (Auto-Hides, Dedicated to Chat & Reactions) */}
        <div
          dir="rtl"
          className={`absolute bottom-0 inset-x-0 z-30 p-2.5 sm:p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-2 pointer-events-auto transition-opacity duration-300 ${
            showControls || isChatInputFocused ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 12px))" }}
        >
          {/* Non-YouTube Controls (HTML5/Direct/Local Timeline + Play/Pause) */}
          {cinemaState?.type !== "youtube" && (
            <div className="flex flex-col gap-2 max-w-3xl mx-auto w-full">
              {/* Timeline for Direct/Local */}
              {cinemaState?.type !== "stream" && (
                <div className="flex items-center gap-3 w-full">
                  <span className="text-[11px] font-mono text-slate-300 min-w-[40px] text-left">
                    {formatTime(localProgress)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.5}
                    disabled={!canControl}
                    value={localProgress}
                    onMouseDown={() => (isSeekingRef.current = true)}
                    onMouseUp={(e) => {
                      isSeekingRef.current = false;
                      handleSeek(Number((e.target as HTMLInputElement).value));
                    }}
                    onTouchStart={() => (isSeekingRef.current = true)}
                    onTouchEnd={(e) => {
                      isSeekingRef.current = false;
                      handleSeek(Number((e.target as HTMLInputElement).value));
                    }}
                    onChange={(e) => setLocalProgress(Number(e.target.value))}
                    className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer accent-accent bg-white/20 focus:outline-none"
                  />
                  <span className="text-[11px] font-mono text-slate-400 min-w-[40px] text-right">
                    {formatTime(duration)}
                  </span>
                </div>
              )}

              {/* Controls row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {cinemaState?.type !== "stream" ? (
                    <button
                      type="button"
                      onClick={togglePlay}
                      disabled={!canControl}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-panel-deep font-bold hover:brightness-110 active:scale-95 shadow"
                    >
                      {cinemaState?.status === "playing" ? (
                        <Pause size={16} fill="currentColor" />
                      ) : (
                        <Play size={16} fill="currentColor" className="translate-x-0.5" />
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold">
                      <Radio size={12} className="animate-pulse" />
                      <span>پخش زنده</span>
                    </div>
                  )}

                  {/* Volume Slider */}
                  <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        const nextMute = !isMuted;
                        setIsMuted(nextMute);
                        if (streamVideoRef.current) streamVideoRef.current.muted = nextMute;
                        if (videoRef.current) videoRef.current.muted = nextMute;
                      }}
                      className="text-slate-300 hover:text-white"
                    >
                      {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
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
                        if (streamVideoRef.current) {
                          streamVideoRef.current.volume = val;
                          streamVideoRef.current.muted = false;
                        }
                        if (videoRef.current) {
                          videoRef.current.volume = val;
                          videoRef.current.muted = false;
                        }
                      }}
                      className="hidden sm:block w-16 h-1 rounded-lg appearance-none cursor-pointer accent-accent bg-white/20"
                    />
                  </div>
                </div>

                {/* Subtitle button */}
                {subtitleUrl && (
                  <button
                    type="button"
                    onClick={() => setSubtitleEnabled((prev) => !prev)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all border ${
                      subtitleEnabled
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                        : "bg-white/5 text-muted border-white/10"
                    }`}
                  >
                    <Subtitles size={13} />
                    <span>زیرنویس</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Floating Dedicated Live Message Bar (Clean & Streamlined) */}
          <div className="flex items-center gap-2 max-w-2xl mx-auto w-full px-1">
            <form
              onSubmit={(e) => {
                handleSendCinemaMessage(e);
                resetControlsTimeout();
              }}
              className="flex-1 flex items-center gap-2 rounded-full border border-white/20 bg-black/70 px-3 py-1.5 backdrop-blur-md shadow-2xl focus-within:border-accent transition-all"
            >
              <MessageSquare size={15} className="text-accent shrink-0" />
              <input
                ref={floatingChatInputRef}
                type="text"
                value={chatMessageText}
                onChange={(e) => setChatMessageText(e.target.value)}
                onFocus={() => {
                  setIsChatInputFocused(true);
                  resetControlsTimeout(true);
                }}
                onBlur={() => {
                  setIsChatInputFocused(false);
                  resetControlsTimeout();
                }}
                placeholder="ارسال پیام روی فیلم... (چت زنده با اعضای اتاق)"
                className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-slate-400 outline-none"
              />
              <button
                type="submit"
                disabled={!chatMessageText.trim()}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-panel-deep transition-all hover:brightness-110 active:scale-90 disabled:opacity-40 shrink-0 shadow-sm"
                title="ارسال پیام"
              >
                <Send size={13} className="rotate-180" />
              </button>
            </form>

            {/* Quick Reactions */}
            <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/60 px-2 py-1 backdrop-blur-md shrink-0 shadow-xl">
              {CINEMA_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => sendReaction(emoji)}
                  className="text-sm sm:text-base hover:scale-125 active:scale-90 transition-transform px-0.5"
                  title={`ری‌اکشن ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div
        ref={containerRef}
        className="relative w-full h-[100dvh] sm:h-[680px] sm:max-h-[94vh] sm:max-w-5xl flex flex-col rounded-none sm:rounded-3xl bg-panel-deep sm:border border-outline shadow-2xl overflow-hidden"
      >
        {/* Floating Reactions across the screen */}
        <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
          {floatingReactions.map((rx) => (
            <div
              key={rx.id}
              className="absolute bottom-16 text-4xl animate-bounce drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
              style={{
                left: `${rx.x}%`,
                animation: "miniChatBubble 2.5s ease-out forwards",
              }}
            >
              <span>{rx.emoji}</span>
            </div>
          ))}
        </div>

        {/* 1. Modal Header (Setup Mode) */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 border-b border-outline bg-panel/95 shrink-0 z-20">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-400/30 shadow-sm">
              <Film size={16} className="drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-xs sm:text-base font-black text-on-surface leading-tight whitespace-nowrap">
                  سینما روم <span className="hidden sm:inline font-normal text-xs text-muted">(Watch Together)</span>
                </h2>
              </div>
              <p className="text-[10px] sm:text-[11px] text-muted truncate max-w-[180px] sm:max-w-md">
                پخش همزمان و لایو استریم در اتاق ({roomName})
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
                  {cinemaState?.hostOnly ? "فقط میزبان" : "آزاد"}
                </span>
              </button>
            )}

            {/* Rating / Movie Hub Button */}
            {onOpenCinemaHub && (
              <button
                type="button"
                onClick={onOpenCinemaHub}
                title="نمره‌دهی و دیدن نقدهای این اثر"
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                <Star size={13} className="fill-amber-400 text-amber-400" />
                <span className="hidden sm:inline">نمره‌دهی و نقد</span>
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

        {/* 2. Setup / Waiting Body */}
        <div className="flex-1 min-h-0 bg-black flex relative overflow-hidden">
          {/* Action Notice Overlay Toast */}
          {lastActionNotice && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 rounded-xl bg-black/85 backdrop-blur-md border border-white/20 text-xs text-white font-bold animate-fade-in shadow-xl">
              {lastActionNotice}
            </div>
          )}

          {isLocalWaitingForFile ? (
              /* B. Waiting for Local File (Syncplay mode) */
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-md mx-auto">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/30">
                  <FileVideo size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-on-surface">
                    فیلم با حالت فایل محلی آغاز شده است
                  </h3>
                  <p className="text-xs text-muted">
                    میزبان فیلم <strong className="text-accent">{cinemaState.title}</strong> را برای
                    پخش سینک انتخاب کرده است.
                  </p>
                </div>
                <label className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-accent hover:brightness-110 text-panel-deep font-black text-xs cursor-pointer shadow-lg transition-all active:scale-95">
                  <Upload size={16} />
                  <span>انتخاب این فایل از روی کامپیوتر</span>
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
              /* C. Source Setup Screen */
              <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto">
                <div className="w-full max-w-xl space-y-5 my-auto">
                  {/* Setup Heading */}
                  <div className="text-center space-y-1">
                    <h3 className="text-base sm:text-lg font-black text-on-surface">
                      انتخاب نحوه پخش فیلم
                    </h3>
                    <p className="text-xs text-muted">
                      می‌توانید فیلم را مستقیماً از سیستم استریم کنید، از یوتیوب بگذارید یا لینک مستقیم بدهید.
                    </p>
                  </div>

                  {/* Mode Tabs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-2xl bg-panel border border-outline">
                    {/* Tab 1: Live Stream (Screen Share) */}
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playPop();
                        setActiveTab("stream");
                      }}
                      className={`flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-black transition-all ${
                        activeTab === "stream"
                          ? "bg-rose-600 text-white shadow-md ring-1 ring-rose-400/50"
                          : "text-muted hover:text-white"
                      }`}
                    >
                      <Radio size={14} className={activeTab === "stream" ? "animate-pulse" : ""} />
                      <span>پخش زنده (شیر فیلم)</span>
                    </button>

                    {/* Tab 2: YouTube */}
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playPop();
                        setActiveTab("youtube");
                      }}
                      className={`flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all ${
                        activeTab === "youtube"
                          ? "bg-red-600 text-white shadow-sm"
                          : "text-muted hover:text-white"
                      }`}
                    >
                      <YouTubeIcon size={14} />
                      <span>یوتیوب</span>
                    </button>

                    {/* Tab 3: Direct URL */}
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playPop();
                        setActiveTab("url");
                      }}
                      className={`flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all ${
                        activeTab === "url"
                          ? "bg-accent text-panel-deep shadow-sm"
                          : "text-muted hover:text-white"
                      }`}
                    >
                      <LinkIcon size={13} />
                      <span>لینک مستقیم</span>
                    </button>

                    {/* Tab 4: Local File */}
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playPop();
                        setActiveTab("local");
                      }}
                      className={`flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all ${
                        activeTab === "local"
                          ? "bg-accent text-panel-deep shadow-sm"
                          : "text-muted hover:text-white"
                      }`}
                    >
                      <Upload size={13} />
                      <span>فایل محلی</span>
                    </button>
                  </div>

                  {/* TAB 1: Live Stream / Screen Share */}
                  {activeTab === "stream" && (
                    <div className="space-y-4 animate-fade-in p-5 rounded-3xl bg-panel-soft/60 border border-rose-500/30 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 mx-auto">
                        <Tv size={28} className="animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-extrabold text-on-surface">
                          پخش زنده فیلم یا پنجره پلیر (Screen Share با صدا)
                        </h4>
                        <p className="text-xs text-muted leading-relaxed max-w-md mx-auto">
                          فیلم را در نرم‌افزار دلخواهتان (مثل VLC، کروم، KMPlayer یا PotPlayer) پخش کنید و با زدن دکمه زیر، پنجره فیلم را با صدای کامل برای تمام اعضای روم استریم کنید.
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl bg-panel-deep/80 border border-outline text-right text-[11px] text-muted space-y-1 max-w-md mx-auto">
                        <div className="flex items-center gap-1.5 font-bold text-amber-300">
                          <Sparkles size={13} />
                          <span>نکته مهم برای صدای فیلم:</span>
                        </div>
                        <p>
                          هنگام انتخاب پنجره یا تب مرورگر، گزینه «اشتراک صدا (Share Audio / Also share system audio)» را تیک بزنید تا صدای فیلم هم برای بقیه پخش شود.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleStartScreenShare}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:brightness-110 text-white font-black text-xs shadow-xl shadow-rose-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Radio size={16} className="animate-pulse" />
                        <span>شروع اشتراک‌گذاری و پخش زنده فیلم برای اتاق</span>
                      </button>
                    </div>
                  )}

                  {/* TAB 2: YouTube */}
                  {activeTab === "youtube" && (
                    <div className="space-y-4 animate-fade-in">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSetUrlSource(inputUrl, inputTitle);
                        }}
                        className="space-y-3.5"
                      >
                        <div className="space-y-1 text-right">
                          <label className="text-xs font-bold text-slate-300">
                            لینک ویدیوی یوتیوب:
                          </label>
                          <input
                            type="text"
                            dir="ltr"
                            placeholder="https://www.youtube.com/watch?v=..."
                            value={inputUrl}
                            onChange={(e) => setInputUrl(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-2xl bg-panel border border-outline text-xs text-white placeholder-muted focus:outline-none focus:border-red-500"
                          />
                        </div>

                        <div className="space-y-1 text-right">
                          <label className="text-xs font-bold text-slate-300">
                            عنوان ویدیو (اختیاری):
                          </label>
                          <input
                            type="text"
                            placeholder="مثلاً: انیمیشن یا موزیک ویدیو"
                            value={inputTitle}
                            onChange={(e) => setInputTitle(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-2xl bg-panel border border-outline text-xs text-white placeholder-muted focus:outline-none focus:border-red-500"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={!inputUrl.trim()}
                          className="w-full py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-black text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          <YouTubeIcon size={16} />
                          <span>شروع پخش همزمان یوتیوب</span>
                        </button>
                      </form>

                      {/* Preset YouTube Demos */}
                      <div className="pt-2 border-t border-outline/50 space-y-1.5">
                        <span className="text-[10px] font-bold text-muted block text-right">
                          ویدیوهای تستی یوتیوب:
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

                  {/* TAB 3: Direct URL */}
                  {activeTab === "url" && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="space-y-1 text-right">
                        <label className="text-xs font-bold text-slate-300">
                          لینک مستقیم فایل ویدیو (MP4 / WebM):
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

                      <div className="space-y-1 text-right">
                        <label className="text-xs font-bold text-slate-300">
                          نام فیلم (اختیاری):
                        </label>
                        <input
                          type="text"
                          placeholder="مثلاً: فیلم سینمایی تستی"
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

                      {/* Preset Direct Demos */}
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

                  {/* TAB 4: Local File (Syncplay mode) */}
                  {activeTab === "local" && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="p-3.5 rounded-2xl bg-panel-soft/40 border border-outline text-right text-[11px] text-muted space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-200">
                          <Sparkles size={14} className="text-amber-400" />
                          <span>سینک فایل مشترک (Syncplay):</span>
                        </div>
                        <p>
                          اگر همه اعضا همین فایل فیلم را روی سیستم خود دارند، با انتخاب این گزینه فیلم بدون نیاز به اینترنتِ استریم و با حداکثر کیفیت ۴K همگام می‌شود.
                        </p>
                      </div>

                      <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-outline hover:border-accent/60 rounded-3xl bg-panel/40 hover:bg-panel/70 cursor-pointer transition-all group">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-accent mb-2 group-hover:scale-110 transition-transform">
                          <Upload size={22} />
                        </div>
                        <span className="text-xs font-bold text-on-surface">
                          انتخاب فایل فیلم از روی کامپیوتر
                        </span>
                        <span className="text-[10px] text-muted mt-1">
                          فرمت‌های MP4, MKV, WebM
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
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
