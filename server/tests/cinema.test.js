import test from "node:test";
import assert from "node:assert/strict";
import {
  getVideoState,
  setVideoSource,
  playVideo,
  pauseVideo,
  seekVideo,
  updateVideoConfig,
  resetCinema,
} from "../cinema.js";

test("Cinema module tests", async (t) => {
  const roomId = "test-cinema-room-1";

  await t.test("default state initialized correctly", () => {
    resetCinema(roomId);
    const state = getVideoState(roomId);
    assert.equal(state.roomId, roomId);
    assert.equal(state.type, "none");
    assert.equal(state.status, "idle");
    assert.equal(state.currentTime, 0);
  });

  await t.test("set direct URL source", () => {
    const updated = setVideoSource(
      roomId,
      {
        type: "url",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        title: "Big Buck Bunny",
        duration: 596,
        hostOnly: true,
      },
      { userId: "u1", userName: "Amir" }
    );

    assert.equal(updated.type, "url");
    assert.equal(updated.title, "Big Buck Bunny");
    assert.equal(updated.duration, 596);
    assert.equal(updated.status, "paused");
    assert.equal(updated.hostOnly, true);
    assert.equal(updated.updatedByName, "Amir");
  });

  await t.test("play and pause video with drift calculation", async () => {
    playVideo(roomId, { currentTime: 10 }, { userId: "u1", userName: "Amir" });
    let state = getVideoState(roomId);
    assert.equal(state.status, "playing");
    assert.ok(state.calculatedCurrentTime >= 10);

    // Short sleep to test drift
    await new Promise((res) => setTimeout(res, 50));
    state = getVideoState(roomId);
    assert.ok(state.calculatedCurrentTime > 10.03);

    // Pause
    pauseVideo(roomId, { currentTime: 15 }, { userId: "u1", userName: "Amir" });
    state = getVideoState(roomId);
    assert.equal(state.status, "paused");
    assert.equal(state.currentTime, 15);
  });

  await t.test("seek video to timestamp", () => {
    const seeked = seekVideo(roomId, { currentTime: 120 }, { userId: "u2", userName: "Ali" });
    assert.equal(seeked.currentTime, 120);
    assert.equal(seeked.updatedByName, "Ali");
  });

  await t.test("set local file sync source", () => {
    const local = setVideoSource(
      roomId,
      {
        type: "local",
        title: "Interstellar.1080p.mp4",
        duration: 7200,
      },
      { userId: "u1", userName: "Amir" }
    );

    assert.equal(local.type, "local");
    assert.equal(local.title, "Interstellar.1080p.mp4");
    assert.equal(local.status, "paused");
    assert.equal(local.currentTime, 0);
  });
});
