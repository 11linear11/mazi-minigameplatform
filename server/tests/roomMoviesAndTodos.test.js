import test from "node:test";
import assert from "node:assert";
import { initDB } from "../db.js";
import { createRoom } from "../rooms.js";
import {
  addRoomMovie,
  getRoomMovies,
  toggleUpvoteRoomMovie,
  rateRoomMovie,
  getMovieRatings,
  updateRoomMovieStatus,
  deleteRoomMovie,
} from "../roomMovies.js";
import {
  createRoomTodo,
  getRoomTodos,
  toggleRoomTodo,
  updateRoomTodo,
  deleteRoomTodo,
} from "../roomTodos.js";

// Ensure DB is initialized
initDB();

test("Room Movies & Wishlist & Ratings suite", async (t) => {
  const roomId = `test-room-${Date.now()}`;
  createRoom({ roomId, name: "اتاق تست سینما", icon: "🎬" });
  const user1 = { userId: "user-1", userName: "علی", avatar: "😎" };
  const user2 = { userId: "user-2", userName: "سارا", avatar: "👩" };

  await t.test("Add movie to room wishlist", () => {
    const movie = addRoomMovie(
      roomId,
      {
        title: "Inception",
        type: "movie",
        genre: "علمی-تخیلی",
        year: "2010",
        status: "wishlist",
      },
      user1
    );

    assert.ok(movie);
    assert.strictEqual(movie.title, "Inception");
    assert.strictEqual(movie.status, "wishlist");
    assert.strictEqual(movie.upvotesCount, 0);
  });

  await t.test("Upvote movie in wishlist", () => {
    const movies = getRoomMovies(roomId);
    const movie = movies[0];

    // User 1 upvotes
    const res1 = toggleUpvoteRoomMovie(roomId, movie.id, user1);
    assert.strictEqual(res1.hasUpvoted, true);
    assert.strictEqual(res1.upvotesCount, 1);

    // User 2 upvotes
    const res2 = toggleUpvoteRoomMovie(roomId, movie.id, user2);
    assert.strictEqual(res2.hasUpvoted, true);
    assert.strictEqual(res2.upvotesCount, 2);

    // User 1 toggles off
    const res3 = toggleUpvoteRoomMovie(roomId, movie.id, user1);
    assert.strictEqual(res3.hasUpvoted, false);
    assert.strictEqual(res3.upvotesCount, 1);
  });

  await t.test("Rate movie and calculate room average", () => {
    const movies = getRoomMovies(roomId);
    const movie = movies[0];

    // Update status to watched
    updateRoomMovieStatus(roomId, movie.id, "watched", user1);

    // User 1 gives score 9
    const rate1 = rateRoomMovie(
      roomId,
      movie.id,
      { rating: 9, review: "شاهکار بی نظیر نولان", tags: ["شاهکار 🔥"] },
      user1
    );
    assert.strictEqual(rate1.movie.avgRating, 9);
    assert.strictEqual(rate1.movie.ratingsCount, 1);

    // User 2 gives score 7
    const rate2 = rateRoomMovie(
      roomId,
      movie.id,
      { rating: 7, review: "خوب بود ولی پیچیده", tags: ["داستان قوی 💡"] },
      user2
    );
    assert.strictEqual(rate2.movie.avgRating, 8); // (9 + 7) / 2 = 8
    assert.strictEqual(rate2.movie.ratingsCount, 2);

    const reviews = getMovieRatings(roomId, movie.id);
    assert.strictEqual(reviews.length, 2);
  });

  await t.test("Delete movie cleans up", () => {
    const movies = getRoomMovies(roomId);
    const movie = movies[0];
    deleteRoomMovie(roomId, movie.id);

    const remaining = getRoomMovies(roomId);
    assert.strictEqual(remaining.length, 0);
  });
});

test("Room To-Do suite", async (t) => {
  const roomId = `test-room-todo-${Date.now()}`;
  createRoom({ roomId, name: "اتاق تست تودو", icon: "📋" });
  const user1 = { userId: "user-1", userName: "علی" };

  await t.test("Create task with priority and assignee", () => {
    const todo = createRoomTodo(
      roomId,
      {
        title: "دانلود فیلم جمعه شب",
        description: "کیفیت 1080p با زیرنویس",
        priority: "high",
        assignedTo: "user-1",
        assignedToName: "علی",
      },
      user1
    );

    assert.ok(todo);
    assert.strictEqual(todo.title, "دانلود فیلم جمعه شب");
    assert.strictEqual(todo.priority, "high");
    assert.strictEqual(todo.status, "todo");
  });

  await t.test("Toggle task completion status", () => {
    const todos = getRoomTodos(roomId);
    const todo = todos[0];

    const completed = toggleRoomTodo(roomId, todo.id, user1);
    assert.strictEqual(completed.status, "done");
    assert.ok(completed.completedAt);

    const reverted = toggleRoomTodo(roomId, todo.id, user1);
    assert.strictEqual(reverted.status, "todo");
    assert.strictEqual(reverted.completedAt, null);
  });

  await t.test("Delete task", () => {
    const todos = getRoomTodos(roomId);
    const todo = todos[0];

    deleteRoomTodo(roomId, todo.id);
    const remaining = getRoomTodos(roomId);
    assert.strictEqual(remaining.length, 0);
  });
});
