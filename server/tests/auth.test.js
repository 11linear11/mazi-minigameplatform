import assert from "node:assert/strict";
import { generateToken, verifyToken } from "../auth.js";
import { ensureProfile, authenticate } from "../profiles.js";
import { initDB } from "../db.js";

initDB();

// Test JWT token generation and verification
{
  const payload = { userId: "user-test-jwt", username: "Tester", isAdmin: false };
  const token = generateToken(payload, 3600);
  assert.ok(token);
  assert.equal(token.split(".").length, 3);

  const decoded = verifyToken(token);
  assert.equal(decoded.userId, "user-test-jwt");
  assert.equal(decoded.username, "Tester");
  assert.equal(decoded.isAdmin, false);
  assert.ok(decoded.exp > Math.floor(Date.now() / 1000));
}

// Test JWT tamper protection
{
  const token = generateToken({ userId: "user-1" }, 3600);
  const parts = token.split(".");
  const tamperedPayload = Buffer.from(JSON.stringify({ userId: "admin", exp: 9999999999 })).toString("base64");
  const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
  assert.equal(verifyToken(tamperedToken), null);
}

// Test salted password hashing & authentication
{
  const testUserId = `test-user-${Date.now()}`;
  const testUsername = `user_${Date.now()}`;
  const testPassword = "MyStrongPassword123!";

  const profile = ensureProfile({
    userId: testUserId,
    username: testUsername,
    avatar: "🤖",
    password: testPassword,
  });
  assert.ok(profile);
  assert.equal(profile.userId, testUserId);

  // Successful auth
  const authSuccess = authenticate(testUsername, testPassword);
  assert.equal(authSuccess.error, null);
  assert.equal(authSuccess.profile.userId, testUserId);

  // Failed auth
  const authFail = authenticate(testUsername, "WrongPassword");
  assert.equal(authFail.error, "INVALID_CREDENTIALS");
}
