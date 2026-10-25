import { getDB } from "./db.js";
import crypto from "crypto";

export function getRoomMovies(roomId) {
  const db = getDB();

  const movies = db
    .prepare(
      `SELECT m.*, 
        COUNT(r.id) as ratingsCount,
        COALESCE(AVG(r.rating), 0) as avgRating
       FROM room_movies m
       LEFT JOIN room_movie_ratings r ON m.id = r.movieId AND m.roomId = r.roomId
       WHERE m.roomId = ?
       GROUP BY m.id
       ORDER BY m.createdAt DESC`
    )
    .all(roomId);

  return movies.map((m) => {
    let upvotes = [];
    try {
      upvotes = JSON.parse(m.upvotes || "[]");
    } catch {
      upvotes = [];
    }

    return {
      ...m,
      avgRating: Number(Number(m.avgRating || 0).toFixed(1)),
      ratingsCount: Number(m.ratingsCount || 0),
      upvotes,
      upvotesCount: upvotes.length,
    };
  });
}

export function addRoomMovie(roomId, data, user = {}) {
  const db = getDB();
  const id = crypto.randomUUID();
  const title = (data.title || "").trim();
  if (!title) {
    throw new Error("Movie title is required");
  }

  const type = data.type === "series" ? "series" : "movie";
  const poster = data.poster || "";
  const genre = data.genre || "";
  const year = data.year || "";
  const sourceUrl = data.sourceUrl || "";
  const status = ["wishlist", "watching", "watched"].includes(data.status) ? data.status : "wishlist";
  const addedBy = user.userId || "anonymous";
  const addedByName = user.userName || user.username || "کاربر";

  db.prepare(
    `INSERT INTO room_movies (id, roomId, title, type, poster, genre, year, sourceUrl, status, addedBy, addedByName, upvotes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, roomId, title, type, poster, genre, year, sourceUrl, status, addedBy, addedByName, JSON.stringify([]));

  return getRoomMovies(roomId).find((m) => m.id === id);
}

export function toggleUpvoteRoomMovie(roomId, movieId, user = {}) {
  const db = getDB();
  const userId = user.userId;
  if (!userId) throw new Error("User required for upvoting");

  const movie = db.prepare("SELECT * FROM room_movies WHERE id = ? AND roomId = ?").get(movieId, roomId);
  if (!movie) throw new Error("Movie not found");

  let upvotes = [];
  try {
    upvotes = JSON.parse(movie.upvotes || "[]");
  } catch {
    upvotes = [];
  }

  const index = upvotes.indexOf(userId);
  let hasUpvoted = false;
  if (index > -1) {
    upvotes.splice(index, 1);
    hasUpvoted = false;
  } else {
    upvotes.push(userId);
    hasUpvoted = true;
  }

  db.prepare("UPDATE room_movies SET upvotes = ? WHERE id = ? AND roomId = ?").run(
    JSON.stringify(upvotes),
    movieId,
    roomId
  );

  return { movieId, upvotes, upvotesCount: upvotes.length, hasUpvoted };
}

export function updateRoomMovieStatus(roomId, movieId, status, user = {}) {
  const db = getDB();
  if (!["wishlist", "watching", "watched"].includes(status)) {
    throw new Error("Invalid status");
  }

  db.prepare("UPDATE room_movies SET status = ? WHERE id = ? AND roomId = ?").run(status, movieId, roomId);

  return getRoomMovies(roomId).find((m) => m.id === movieId);
}

export function rateRoomMovie(roomId, movieId, { rating, review, tags }, user = {}) {
  const db = getDB();
  const userId = user.userId;
  if (!userId) throw new Error("User required to rate");

  const numRating = Number(rating);
  if (isNaN(numRating) || numRating < 1 || numRating > 10) {
    throw new Error("Rating must be between 1 and 10");
  }

  const id = crypto.randomUUID();
  const userName = user.userName || user.username || "کاربر";
  const userAvatar = user.avatar || "👤";
  const safeReview = (review || "").trim();
  const safeTags = Array.isArray(tags) ? JSON.stringify(tags) : typeof tags === "string" ? tags : "[]";

  db.prepare(
    `INSERT INTO room_movie_ratings (id, roomId, movieId, userId, userName, userAvatar, rating, review, tags, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(roomId, movieId, userId) DO UPDATE SET
       rating = excluded.rating,
       review = excluded.review,
       tags = excluded.tags,
       userName = excluded.userName,
       userAvatar = excluded.userAvatar,
       updatedAt = datetime('now')`
  ).run(id, roomId, movieId, userId, userName, userAvatar, numRating, safeReview, safeTags);

  // Return updated movie stats and all ratings for this movie
  const updatedMovie = getRoomMovies(roomId).find((m) => m.id === movieId);
  const ratings = getMovieRatings(roomId, movieId);

  return {
    movie: updatedMovie,
    ratings,
    userRating: { rating: numRating, review: safeReview, tags: safeTags },
  };
}

export function getMovieRatings(roomId, movieId) {
  const db = getDB();
  const rows = db
    .prepare(
      `SELECT * FROM room_movie_ratings 
       WHERE roomId = ? AND movieId = ?
       ORDER BY createdAt DESC`
    )
    .all(roomId, movieId);

  return rows.map((r) => {
    let parsedTags = [];
    try {
      parsedTags = JSON.parse(r.tags || "[]");
    } catch {
      parsedTags = [];
    }
    return {
      ...r,
      tags: parsedTags,
    };
  });
}

export function deleteRoomMovie(roomId, movieId) {
  const db = getDB();
  db.prepare("DELETE FROM room_movies WHERE id = ? AND roomId = ?").run(movieId, roomId);
  return { success: true, movieId };
}
