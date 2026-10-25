"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  Film,
  Star,
  Heart,
  Plus,
  Play,
  X,
  MessageSquare,
  Sparkles,
  Bookmark,
  CheckCircle2,
  Trash2,
  Search,
  Clapperboard,
  Tv,
  Award,
  Flame,
  SlidersHorizontal,
} from "lucide-react";

export type RoomMovie = {
  id: string;
  roomId: string;
  title: string;
  type: "movie" | "series";
  poster?: string;
  genre?: string;
  year?: string;
  sourceUrl?: string;
  status: "wishlist" | "watching" | "watched";
  addedBy: string;
  addedByName?: string;
  upvotes: string[];
  upvotesCount: number;
  avgRating: number;
  ratingsCount: number;
  createdAt: string;
};

export type MovieRating = {
  id: string;
  roomId: string;
  movieId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  review?: string;
  tags: string[];
  createdAt: string;
};

type RoomCinemaHubModalProps = {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
  currentUserId?: string | null;
  currentUserName?: string | null;
  currentUserAvatar?: string | null;
  socket: any;
  onWatchInCinema?: (movie: RoomMovie) => void;
};

const POPULAR_TAGS = [
  "شاهکار 🔥",
  "داستان قوی 💡",
  "پایان غیرمنتظره 🤯",
  "کمدی و خنده‌دار 😂",
  "هیجان‌انگیز ⚡",
  "غم‌انگیز و عمیق 🎭",
  "جلوه‌های ویژه عالی 🚀",
  "ارزش دیدن نداشت 👎",
];

const PRESET_SUGGESTIONS = [
  { title: "Interstellar", type: "movie" as const, genre: "علمی-تخیلی", year: "2014", icon: "🚀", poster: "https://m.media-amazon.com/images/M/MV5BZjdkOTU3MDktN2IxOS00OGEyLWFmMjktY2FiMmZkNWIyODZiXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg" },
  { title: "Inception", type: "movie" as const, genre: "اکشن / هیجان‌انگیز", year: "2010", icon: "🌀", poster: "https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_FMjpg_UX1000_.jpg" },
  { title: "The Dark Knight", type: "movie" as const, genre: "اکشن / ابرقهرمانی", year: "2008", icon: "🦇", poster: "https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_FMjpg_UX1000_.jpg" },
  { title: "Dune: Part Two", type: "movie" as const, genre: "علمی-تخیلی / حماسی", year: "2024", icon: "🏜️", poster: "https://m.media-amazon.com/images/M/MV5BN2QyZGUgkZDktNDVjMC00NDRiLTliYmQtZTZlOTM1YTMzNTQ5XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg" },
  { title: "Breaking Bad", type: "series" as const, genre: "درام / هیجان‌انگیز", year: "2008", icon: "🧪", poster: "https://m.media-amazon.com/images/M/MV5BMzU5ZGYzNmQtMTdhYy00OGRiLTg0NmQtYjVjNzliZTg1ZGE4XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg" },
  { title: "Oppenheimer", type: "movie" as const, genre: "زندگی‌نامه / درام", year: "2023", icon: "⚛️", poster: "https://m.media-amazon.com/images/M/MV5BN2JkMDc5MGQtZjg3YS00NmFiLWIyZmQtZTJmNTM5MjVmYTQ4XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg" },
  { title: "Arcane", type: "series" as const, genre: "انیمیشن / ماجراجویی", year: "2021", icon: "🤖", poster: "https://m.media-amazon.com/images/M/MV5BYzA2Nzk5M2EtNWY4Yi00ZDY4LThkZTgtYjhhNzc4YzliZGU1XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg" },
];

const GENRES = ["اکشن", "درام", "کمدی", "علمی-تخیلی", "ترسناک", "ماجراجویی", "انیمیشن", "عاشقانه", "جنایی", "هیجان‌انگیز"];

function MoviePoster({
  poster,
  title,
  type,
  className = "w-24 sm:w-28 h-36",
}: {
  poster?: string;
  title: string;
  type?: "movie" | "series";
  className?: string;
}) {
  return (
    <div
      className={`relative shrink-0 rounded-xl overflow-hidden bg-black/60 border border-outline/70 shadow-md flex items-center justify-center ${className}`}
    >
      {poster ? (
        <>
          <div className="absolute inset-0 opacity-30 filter blur-md scale-125 pointer-events-none">
            <Image src={poster} alt="" fill unoptimized className="object-cover" />
          </div>
          <Image
            src={poster}
            alt={title}
            fill
            unoptimized
            className="object-contain relative z-10 transition-transform duration-300 group-hover:scale-105"
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-2 z-10">
          {type === "series" ? (
            <Tv size={26} className="text-purple-400 mb-1" />
          ) : (
            <Film size={26} className="text-amber-400 mb-1" />
          )}
          <span className="text-[10px] text-muted font-bold line-clamp-2 leading-tight">
            {title}
          </span>
        </div>
      )}
    </div>
  );
}

// Reusable Add Component for both Wishlist & Watched tabs
function MovieAddBar({
  mode,
  onAdd,
  isSubmitting,
  existingTitles,
}: {
  mode: "wishlist" | "watched";
  onAdd: (movie: Partial<RoomMovie>) => void;
  isSubmitting: boolean;
  existingTitles: string[];
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"movie" | "series">("movie");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [genre, setGenre] = useState("اکشن");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [poster, setPoster] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  const isWishlist = mode === "wishlist";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      type,
      status: mode,
      genre: showAdvanced ? genre : "عمومی",
      year: showAdvanced ? year.trim() : new Date().getFullYear().toString(),
      poster: showAdvanced ? poster.trim() : "",
      sourceUrl: showAdvanced ? sourceUrl.trim() : "",
    });
    setTitle("");
    setPoster("");
    setSourceUrl("");
  };

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/60 via-panel-soft to-panel border border-purple-500/40 shadow-lg space-y-3">
      {/* Header & Type selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isWishlist ? (
            <Bookmark size={16} className="text-purple-400" />
          ) : (
            <Star size={16} className="text-amber-400 fill-amber-400" />
          )}
          <h3 className="text-xs font-extrabold text-on-surface">
            {isWishlist
              ? "پیشنهاد فیلم یا سریال برای ویش‌لیست و رأی‌گیری"
              : "افزودن اثر تماشا شده برای ثبت نمره و نقد"}
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setType("movie")}
            className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
              type === "movie" ? "bg-purple-600 text-white" : "bg-panel-deep text-muted hover:text-on-surface"
            }`}
          >
            فیلم 🎬
          </button>
          <button
            type="button"
            onClick={() => setType("series")}
            className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
              type === "series" ? "bg-purple-600 text-white" : "bg-panel-deep text-muted hover:text-on-surface"
            }`}
          >
            سریال 📺
          </button>
        </div>
      </div>

      {/* Main input & buttons */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              isWishlist
                ? "نام اثر پیشنهادی را بنویسید (مثلاً: Interstellar یا برکینگ بد)..."
                : "نام فیلم یا سریالی که دیده‌اید را بنویسید..."
            }
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-panel-deep border border-outline text-xs text-on-surface placeholder-muted focus:outline-none focus:border-purple-500"
          />

          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 ${
              showAdvanced
                ? "bg-purple-600/30 border-purple-400 text-purple-200"
                : "bg-panel-deep border-outline text-muted hover:text-on-surface hover:border-purple-500/50"
            }`}
            title="تنظیمات پیشرفته: تاریخ، ژانر، پوستر و لینک منبع"
          >
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline">{showAdvanced ? "بستن متادیتا" : "متادیتا پیشرفته"}</span>
          </button>

          <button
            type="submit"
            disabled={!title.trim() || isSubmitting}
            className="flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white text-xs font-extrabold shadow-md shadow-purple-600/30 transition-all active:scale-95 shrink-0"
          >
            <Plus size={16} />
            <span>
              {isSubmitting
                ? "در حال ثبت..."
                : isWishlist
                ? "افزودن به ویش‌لیست"
                : "افزودن و نمره‌دهی"}
            </span>
          </button>
        </div>

        {/* Advanced Metadata Drawer */}
        {showAdvanced && (
          <div className="p-3.5 rounded-xl bg-panel-deep/90 border border-purple-500/30 space-y-3 animate-fadeIn">
            <div className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
              <Sparkles size={13} />
              <span>اطلاعات تکمیلی و متادیتا (اختیاری)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-muted mb-1">ژانر اثر</label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-panel border border-outline text-xs text-on-surface focus:outline-none focus:border-purple-500"
                >
                  {GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-muted mb-1">سال انتشار / تاریخ</label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2024"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-panel border border-outline text-xs text-on-surface placeholder-muted focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-muted mb-1">لینک مستقیم پوستر (URL)</label>
                <input
                  type="url"
                  value={poster}
                  onChange={(e) => setPoster(e.target.value)}
                  placeholder="https://... پوستر"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-panel border border-outline text-xs text-on-surface placeholder-muted focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-muted mb-1">لینک ویدیو یا یوتیوب (جهت سینما)</label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://... پخش ویدیو"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-panel border border-outline text-xs text-on-surface placeholder-muted focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Preset Suggestions Chips */}
      <div className="pt-1">
        <div className="text-[11px] text-muted mb-2 font-semibold flex items-center gap-1.5">
          <Flame size={12} className="text-amber-400" />
          <span>یا با یک کلیک از گزینه‌های محبوب اضافه کنید:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_SUGGESTIONS.map((preset) => {
            const alreadyAdded = existingTitles.includes(preset.title.toLowerCase());
            return (
              <button
                key={preset.title}
                type="button"
                onClick={() =>
                  onAdd({
                    ...preset,
                    status: mode,
                  })
                }
                disabled={alreadyAdded}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  alreadyAdded
                    ? "bg-panel-deep/50 text-muted/50 border-outline/40 cursor-not-allowed"
                    : "bg-panel-deep hover:bg-purple-600/20 text-purple-300 hover:text-white border-purple-500/30 hover:border-purple-400 active:scale-95"
                }`}
              >
                <span>{preset.icon}</span>
                <span>{preset.title}</span>
                {alreadyAdded ? (
                  <span className="text-[10px] text-emerald-400 mr-1">✓ اضافه شده</span>
                ) : (
                  <Plus size={12} className="text-purple-400 mr-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function RoomCinemaHubModal({
  isOpen,
  onClose,
  roomId,
  roomName,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  socket,
  onWatchInCinema,
}: RoomCinemaHubModalProps) {
  const [activeTab, setActiveTab] = useState<"wishlist" | "ratings">("wishlist");
  const [movies, setMovies] = useState<RoomMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Rating review modal / panel state
  const [selectedMovieForRating, setSelectedMovieForRating] = useState<RoomMovie | null>(null);
  const [selectedMovieRatings, setSelectedMovieRatings] = useState<MovieRating[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [myRatingScore, setMyRatingScore] = useState<number>(8);
  const [myReviewText, setMyReviewText] = useState("");
  const [mySelectedTags, setMySelectedTags] = useState<string[]>([]);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // Load movies
  const fetchMovies = useCallback(() => {
    if (!socket || !roomId) return;
    setLoading(true);
    socket.emit("room_movies_get", { roomId }, (res: RoomMovie[] | { error: string }) => {
      setLoading(false);
      if (Array.isArray(res)) {
        setMovies(res);
      }
    });
  }, [socket, roomId]);

  useEffect(() => {
    if (!isOpen) return;
    fetchMovies();

    if (!socket) return;
    const handleUpdated = (updatedMovies: RoomMovie[]) => {
      if (Array.isArray(updatedMovies)) {
        setMovies(updatedMovies);
      }
    };

    socket.on("room_movies_updated", handleUpdated);
    return () => {
      socket.off("room_movies_updated", handleUpdated);
    };
  }, [isOpen, socket, roomId, fetchMovies]);

  // Load ratings for specific movie
  const openRatingsModal = (movie: RoomMovie) => {
    setSelectedMovieForRating(movie);
    setLoadingRatings(true);
    socket?.emit(
      "room_movie_ratings_get",
      { roomId, movieId: movie.id },
      (res: { ratings?: MovieRating[] }) => {
        setLoadingRatings(false);
        if (res?.ratings) {
          setSelectedMovieRatings(res.ratings);
          const existing = res.ratings.find((r) => r.userId === currentUserId);
          if (existing) {
            setMyRatingScore(existing.rating);
            setMyReviewText(existing.review || "");
            setMySelectedTags(existing.tags || []);
          } else {
            setMyRatingScore(8);
            setMyReviewText("");
            setMySelectedTags([]);
          }
        }
      }
    );
  };

  // Submit Rating
  const handleRateSubmit = () => {
    if (!selectedMovieForRating || !socket) return;
    setIsSubmittingRating(true);
    socket.emit(
      "room_movie_rate",
      {
        roomId,
        movieId: selectedMovieForRating.id,
        rating: myRatingScore,
        review: myReviewText.trim(),
        tags: mySelectedTags,
        userId: currentUserId,
      },
      (res: any) => {
        setIsSubmittingRating(false);
        if (res?.success) {
          if (res.ratings) {
            setSelectedMovieRatings(res.ratings);
          }
          if (res.movie) {
            setSelectedMovieForRating(res.movie);
          }
          if (res.allMovies) {
            setMovies(res.allMovies);
          }
        }
      }
    );
  };

  // Upvote Wishlist movie
  const handleUpvote = (movieId: string) => {
    if (!currentUserId) return;
    // 1. Immediate optimistic UI update
    setMovies((prev) =>
      prev.map((m) => {
        if (m.id !== movieId) return m;
        const exists = m.upvotes.includes(currentUserId);
        const newUpvotes = exists ? m.upvotes.filter((u) => u !== currentUserId) : [...m.upvotes, currentUserId];
        return {
          ...m,
          upvotes: newUpvotes,
          upvotesCount: newUpvotes.length,
        };
      })
    );
    // 2. Server sync
    socket?.emit("room_movie_upvote", { roomId, movieId, userId: currentUserId }, (res: any) => {
      if (res?.allMovies) setMovies(res.allMovies);
    });
  };

  // Change status (e.g. from wishlist to watched)
  const handleChangeStatus = (movieId: string, status: "wishlist" | "watching" | "watched") => {
    // 1. Immediate optimistic update
    setMovies((prev) => prev.map((m) => (m.id === movieId ? { ...m, status } : m)));
    // 2. Server sync
    socket?.emit("room_movie_status", { roomId, movieId, status }, (res: any) => {
      if (res?.allMovies) setMovies(res.allMovies);
      if (res?.movie && status === "watched") {
        openRatingsModal(res.movie);
      }
    });
  };

  // Delete movie
  const handleDeleteMovie = (movieId: string) => {
    // 1. Immediate optimistic removal!
    setMovies((prev) => prev.filter((m) => m.id !== movieId));
    if (selectedMovieForRating?.id === movieId) {
      setSelectedMovieForRating(null);
    }
    // 2. Server sync
    socket?.emit("room_movie_delete", { roomId, movieId }, (res: any) => {
      if (res?.allMovies) setMovies(res.allMovies);
    });
  };

  // Add Movie handler (used by both Wishlist and Watched)
  const handleAddMovie = (movieData: Partial<RoomMovie>) => {
    const finalTitle = (movieData.title || "").trim();
    if (!finalTitle || !socket || !roomId) return;
    setIsSubmittingAdd(true);

    socket.emit(
      "room_movie_add",
      {
        roomId,
        movie: {
          title: finalTitle,
          type: movieData.type || "movie",
          status: movieData.status || "wishlist",
          genre: movieData.genre || "عمومی",
          year: movieData.year || new Date().getFullYear().toString(),
          poster: movieData.poster || "",
          sourceUrl: movieData.sourceUrl || "",
        },
        userId: currentUserId,
      },
      (res: any) => {
        setIsSubmittingAdd(false);
        if (res?.allMovies) {
          setMovies(res.allMovies);
        }
        if (res?.movie && movieData.status === "watched") {
          openRatingsModal(res.movie);
        }
      }
    );
  };

  // Watch in Cinema
  const handleStartWatch = (movie: RoomMovie) => {
    handleChangeStatus(movie.id, "watching");
    onWatchInCinema?.(movie);
    onClose();
  };

  // Filtered lists
  const watchedMovies = useMemo(() => {
    return movies
      .filter((m) => m.status === "watched" || m.status === "watching")
      .filter((m) => !searchQuery || m.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => b.avgRating - a.avgRating);
  }, [movies, searchQuery]);

  const wishlistMovies = useMemo(() => {
    return movies
      .filter((m) => m.status === "wishlist")
      .filter((m) => !searchQuery || m.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => b.upvotesCount - a.upvotesCount);
  }, [movies, searchQuery]);

  const existingTitles = useMemo(() => {
    return movies.map((m) => m.title.toLowerCase());
  }, [movies]);

  const roomStats = useMemo(() => {
    const totalWatched = movies.filter((m) => m.status === "watched").length;
    const allRatings = movies.filter((m) => m.ratingsCount > 0);
    const avgScore =
      allRatings.length > 0
        ? (allRatings.reduce((sum, m) => sum + m.avgRating, 0) / allRatings.length).toFixed(1)
        : "—";
    const topMovie = watchedMovies.length > 0 && watchedMovies[0].ratingsCount > 0 ? watchedMovies[0] : null;
    return { totalWatched, avgScore, topMovie };
  }, [movies, watchedMovies]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative flex flex-col w-full max-w-4xl h-[92vh] max-h-[880px] bg-panel rounded-2xl border border-outline shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative shrink-0 flex items-center justify-between px-6 py-4 border-b border-outline bg-gradient-to-r from-purple-900/40 via-panel-soft to-panel">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25">
              <Film size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-on-surface">سینماتک، ویش‌لیست و نمره‌دهی روم</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {roomName}
                </span>
              </div>
              <p className="text-xs text-muted">پیشنهاد فیلم برای دورهمی، رأی‌گیری و ثبت نقد و نمرات اعضا</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-panel-dim text-muted hover:text-on-surface hover:bg-panel-high transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 2 Main Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-3 border-b border-outline bg-panel-dim/70">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-panel-deep border border-outline/60">
            <button
              type="button"
              onClick={() => {
                setActiveTab("wishlist");
                setSelectedMovieForRating(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "wishlist"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-muted hover:text-on-surface"
              }`}
            >
              <Bookmark size={15} />
              <span>ویش‌لیست و رأی‌گیری</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40">
                {wishlistMovies.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("ratings");
                setSelectedMovieForRating(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "ratings"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-muted hover:text-on-surface"
              }`}
            >
              <Star size={15} className={activeTab === "ratings" ? "text-amber-300 fill-amber-300" : ""} />
              <span>فیلم‌های دیده‌شده و نمرات</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40">
                {watchedMovies.length}
              </span>
            </button>
          </div>

          <div className="relative">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در فیلم‌ها..."
              className="w-full sm:w-56 pr-9 pl-3 py-1.5 rounded-xl bg-panel-deep border border-outline text-xs text-on-surface placeholder-muted focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-panel/50">
          {/* TAB 1: WISHLIST & VOTING */}
          {activeTab === "wishlist" && (
            <div className="space-y-6">
              {/* Add to Wishlist Bar with Advanced Metadata */}
              <MovieAddBar
                mode="wishlist"
                onAdd={handleAddMovie}
                isSubmitting={isSubmittingAdd}
                existingTitles={existingTitles}
              />

              {/* Wishlist Items List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span className="font-bold text-on-surface">
                    لیست آثار پیشنهادی در انتظار تماشا ({wishlistMovies.length})
                  </span>
                  <span>فیلم با بیشترین رأی در اولویت تماشاست</span>
                </div>

                {wishlistMovies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center bg-panel-soft/30 rounded-2xl border border-outline">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-panel-soft text-purple-400 border border-outline mb-3">
                      <Bookmark size={30} />
                    </div>
                    <h3 className="text-base font-bold text-on-surface">ویش‌لیست روم هنوز خالی است!</h3>
                    <p className="text-xs text-muted max-w-sm mt-1">
                      از کادر بالا نام فیلم دلخواهتان را بنویسید یا با باز کردن «متادیتا پیشرفته» جزئیات سال و کاور را ثبت کنید.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {wishlistMovies.map((movie, index) => {
                      const hasMyUpvote = currentUserId && movie.upvotes.includes(currentUserId);
                      return (
                        <div
                          key={movie.id}
                          className="relative flex gap-3.5 p-3.5 rounded-xl bg-panel-soft/90 border border-outline hover:border-purple-500/50 hover:bg-panel-soft transition-all duration-200"
                        >
                          {/* Rank Badge for top voted - Placed neatly on top right */}
                          {index === 0 && movie.upvotesCount > 0 && (
                            <span className="absolute -top-2.5 right-4 z-10 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold text-[10px] shadow-lg">
                              <Flame size={12} />
                              <span>رتبه ۱ رأی‌ها</span>
                            </span>
                          )}

                          {/* Poster */}
                          <MoviePoster
                            poster={movie.poster}
                            title={movie.title}
                            type={movie.type}
                            className="w-24 sm:w-28 h-36"
                          />

                          {/* Info */}
                          <div className="flex-1 flex flex-col justify-between overflow-hidden">
                            <div>
                              {/* Header row: Title + Genre & Year on right, Type badge + Trash button on left (zero overlap!) */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-sm font-bold text-on-surface truncate">{movie.title}</h4>
                                  <div className="flex items-center gap-1.5 text-[11px] text-muted mt-1">
                                    {movie.genre && <span>{movie.genre}</span>}
                                    {movie.year && <span>• {movie.year}</span>}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300">
                                    {movie.type === "series" ? "سریال" : "فیلم"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMovie(movie.id)}
                                    className="flex h-6 w-6 items-center justify-center rounded-lg text-muted/70 hover:text-red-400 hover:bg-red-500/20 transition-colors"
                                    title="حذف اثر"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>

                              <div className="text-[10px] text-purple-400/90 mt-1">
                                پیشنهاد توسط {movie.addedByName || "کاربر"}
                              </div>
                            </div>

                            {/* Action Row */}
                            <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-outline/40">
                              {/* Prominent Upvote Button */}
                              <button
                                type="button"
                                onClick={() => handleUpvote(movie.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all active:scale-95 ${
                                  hasMyUpvote
                                    ? "bg-red-500/25 text-red-400 border border-red-500/50 shadow-md shadow-red-500/20"
                                    : "bg-panel-deep hover:bg-panel-high text-muted hover:text-white border border-outline"
                                }`}
                                title="رأی مثبت به تماشای این اثر"
                              >
                                <Heart size={15} className={hasMyUpvote ? "fill-red-400 text-red-400" : ""} />
                                <span>{hasMyUpvote ? "رأی دادید" : "رأی بده"}</span>
                                <span className="px-1.5 py-0.2 rounded-md bg-black/40 text-[11px] text-on-surface font-bold">
                                  {movie.upvotesCount}
                                </span>
                              </button>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {/* Direct watch button */}
                                {onWatchInCinema && (
                                  <button
                                    type="button"
                                    onClick={() => handleStartWatch(movie)}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all"
                                    title="شروع پخش در سینما روم"
                                  >
                                    <Play size={13} className="fill-emerald-400" />
                                    <span>پخش</span>
                                  </button>
                                )}

                                {/* Mark as watched & rate */}
                                <button
                                  type="button"
                                  onClick={() => handleChangeStatus(movie.id, "watched")}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all"
                                  title="دیدیم! ثبت امتیاز و نقد"
                                >
                                  <Star size={13} className="fill-amber-400 text-amber-400" />
                                  <span>دیدیم ⭐</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: RATINGS & WATCHED */}
          {activeTab === "ratings" && !selectedMovieForRating && (
            <div className="space-y-6">
              {/* Add to Watched Bar with Advanced Metadata */}
              <MovieAddBar
                mode="watched"
                onAdd={handleAddMovie}
                isSubmitting={isSubmittingAdd}
                existingTitles={existingTitles}
              />

              {/* Room Stats Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-panel-soft border border-outline">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/20">
                    <Star size={18} className="fill-amber-400" />
                  </div>
                  <div>
                    <div className="text-xs text-muted">میانگین نمرات روم</div>
                    <div className="text-base font-bold text-on-surface mt-0.5">{roomStats.avgScore} / ۱۰</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-panel-soft border border-outline">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/20">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <div className="text-xs text-muted">فیلم‌های نمره‌گرفته</div>
                    <div className="text-base font-bold text-on-surface mt-0.5">{roomStats.totalWatched} اثر</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-panel-soft border border-outline">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/20">
                    <Award size={18} />
                  </div>
                  <div className="truncate">
                    <div className="text-xs text-muted">محبوب‌ترین اثر روم</div>
                    <div className="text-sm font-bold text-purple-300 truncate mt-0.5">
                      {roomStats.topMovie ? roomStats.topMovie.title : "هنوز ثبت نشده"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Movies Grid */}
              {loading ? (
                <div className="flex items-center justify-center py-20 text-muted">در حال دریافت فیلم‌ها...</div>
              ) : watchedMovies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center bg-panel-soft/30 rounded-2xl border border-outline">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-panel-soft text-purple-400 border border-outline mb-3">
                    <Clapperboard size={30} />
                  </div>
                  <h3 className="text-base font-bold text-on-surface">هنوز اثری در این روم نمره نگرفته است</h3>
                  <p className="text-xs text-muted max-w-sm mt-1 mb-4">
                    از کادر بالا نام اثر دیده‌شده را وارد کنید یا در تب ویش‌لیست روی «دیدیم ⭐» بزنید تا پنل نمره‌دهی باز شود.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {watchedMovies.map((movie, index) => (
                    <div
                      key={movie.id}
                      className="group relative flex gap-4 p-3.5 rounded-xl bg-panel-soft/80 border border-outline hover:border-purple-500/40 hover:bg-panel-soft transition-all duration-200"
                    >
                      {/* Rank 1 badge */}
                      {index === 0 && (
                        <span className="absolute -top-2.5 right-4 z-10 flex items-center justify-center px-2 py-0.5 rounded-full bg-amber-500 text-black font-extrabold text-[10px] shadow">
                          رتبه ۱ نمرات
                        </span>
                      )}

                      {/* Poster */}
                      <MoviePoster
                        poster={movie.poster}
                        title={movie.title}
                        type={movie.type}
                        className="w-24 sm:w-28 h-36"
                      />

                      {/* Info & Scores */}
                      <div className="flex-1 flex flex-col justify-between overflow-hidden">
                        <div>
                          {/* Header row: Title + Genre & Year, Type badge + Trash button */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-bold text-on-surface truncate group-hover:text-purple-300 transition-colors">
                                {movie.title}
                              </h4>
                              <div className="flex items-center gap-1.5 text-[11px] text-muted mt-1">
                                {movie.genre && <span>{movie.genre}</span>}
                                {movie.year && <span>• {movie.year}</span>}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300">
                                {movie.type === "series" ? "سریال" : "فیلم"}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteMovie(movie.id)}
                                className="flex h-6 w-6 items-center justify-center rounded-lg text-muted/70 hover:text-red-400 hover:bg-red-500/20 transition-colors"
                                title="حذف اثر"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 mt-2 text-xs">
                            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 font-extrabold">
                              <Star size={13} className="fill-amber-400" />
                              <span>{movie.avgRating > 0 ? movie.avgRating : "—"}</span>
                            </div>
                            <span className="text-[11px] text-muted">{movie.ratingsCount} نقد ثبت شده</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-outline/40">
                          <button
                            type="button"
                            onClick={() => openRatingsModal(movie)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-colors"
                          >
                            <MessageSquare size={13} />
                            <span>نقد و نمره‌ها ({movie.ratingsCount})</span>
                          </button>

                          {onWatchInCinema && (
                            <button
                              type="button"
                              onClick={() => handleStartWatch(movie)}
                              title="پخش در سینما روم"
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-colors"
                            >
                              <Play size={14} className="fill-emerald-400" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2 DETAIL: RATING & REVIEWS FOR SELECTED MOVIE */}
          {selectedMovieForRating && (
            <div className="space-y-6">
              {/* Top back button */}
              <div className="flex items-center justify-between pb-3 border-b border-outline">
                <button
                  type="button"
                  onClick={() => setSelectedMovieForRating(null)}
                  className="flex items-center gap-2 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors"
                >
                  ← بازگشت به لیست
                </button>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span>ثبت شده توسط {selectedMovieForRating.addedByName || "کاربر"}</span>
                </div>
              </div>

              {/* Movie Header Card */}
              <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-panel-soft border border-outline">
                <MoviePoster
                  poster={selectedMovieForRating.poster}
                  title={selectedMovieForRating.title}
                  type={selectedMovieForRating.type}
                  className="w-28 sm:w-32 h-44"
                />

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-on-surface">{selectedMovieForRating.title}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/20 text-purple-300">
                        {selectedMovieForRating.type === "series" ? "سریال" : "فیلم"}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-1">
                      ژانر: {selectedMovieForRating.genre || "مشخص نشده"}{" "}
                      {selectedMovieForRating.year && `• سال: ${selectedMovieForRating.year}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                      <Star size={16} className="fill-amber-400" />
                      <span className="text-sm font-bold">{selectedMovieForRating.avgRating}</span>
                      <span className="text-[11px] text-muted">از ۱۰ ({selectedMovieForRating.ratingsCount} رای)</span>
                    </div>

                    {onWatchInCinema && (
                      <button
                        type="button"
                        onClick={() => handleStartWatch(selectedMovieForRating)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all"
                      >
                        <Play size={13} className="fill-emerald-400" />
                        <span>پخش در سینما</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Rate & Review Form */}
              <div className="p-4 rounded-xl bg-panel-deep border border-purple-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <Sparkles size={14} />
                    <span>امتیاز و نقد شما (+۵ XP)</span>
                  </h4>
                  <div className="flex items-center gap-1 text-sm font-extrabold text-amber-400">
                    <span>{myRatingScore}</span>
                    <span className="text-xs text-muted">/ ۱۰</span>
                  </div>
                </div>

                {/* Score Selector (1-10) */}
                <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                    const isSelected = myRatingScore >= num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setMyRatingScore(num)}
                        className={`flex-1 min-w-[28px] h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-amber-500 text-black shadow-md shadow-amber-500/30 font-extrabold scale-105"
                            : "bg-panel-soft text-muted hover:text-on-surface"
                        }`}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>

                {/* Tag Selection */}
                <div>
                  <div className="text-[11px] text-muted mb-2">برچسب‌های توصیفی:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_TAGS.map((tag) => {
                      const isTagSelected = mySelectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (isTagSelected) {
                              setMySelectedTags((prev) => prev.filter((t) => t !== tag));
                            } else {
                              setMySelectedTags((prev) => [...prev, tag]);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                            isTagSelected
                              ? "bg-purple-600 text-white border border-purple-400"
                              : "bg-panel-soft text-muted hover:text-on-surface border border-outline"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Text Review */}
                <div>
                  <textarea
                    rows={2}
                    value={myReviewText}
                    onChange={(e) => setMyReviewText(e.target.value)}
                    placeholder="نظرتان را درباره این اثر بنویسید (اختیاری)..."
                    className="w-full px-3 py-2 rounded-xl bg-panel-soft border border-outline text-xs text-on-surface placeholder-muted focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleRateSubmit}
                    disabled={isSubmittingRating}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/30"
                  >
                    <Star size={14} className="fill-current" />
                    <span>{isSubmittingRating ? "در حال ثبت..." : "ثبت یا بروزرسانی نمره"}</span>
                  </button>
                </div>
              </div>

              {/* Members Reviews List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-on-surface">نظرات و امتیازات اعضای روم ({selectedMovieRatings.length})</h4>

                {loadingRatings ? (
                  <div className="py-6 text-center text-xs text-muted">در حال بارگذاری نظرات...</div>
                ) : selectedMovieRatings.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted bg-panel-soft/40 rounded-xl border border-outline">
                    هنوز نظری برای این اثر ثبت نشده است. اولین نقد را شما بنویسید!
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedMovieRatings.map((ratingItem) => (
                      <div
                        key={ratingItem.id}
                        className="p-3.5 rounded-xl bg-panel-soft border border-outline flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{ratingItem.userAvatar || "👤"}</span>
                            <div>
                              <span className="text-xs font-bold text-on-surface">{ratingItem.userName}</span>
                              <span className="text-[10px] text-muted mr-2">
                                {new Date(ratingItem.createdAt).toLocaleDateString("fa-IR")}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 font-extrabold text-xs">
                            <Star size={12} className="fill-amber-400" />
                            <span>{ratingItem.rating}</span>
                          </div>
                        </div>

                        {ratingItem.review && (
                          <p className="text-xs text-on-surface/90 leading-relaxed pr-8">{ratingItem.review}</p>
                        )}

                        {ratingItem.tags && ratingItem.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pr-8 pt-1">
                            {ratingItem.tags.map((t, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/20 text-purple-300 text-[10px]"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
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
