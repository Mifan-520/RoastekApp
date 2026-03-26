import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp, formatShanghaiIso, resolveDeviceLastActive, resolveDeviceStatus } from "../src/app.js";
import { seedDevices } from "../src/data/devices.js";
import { createSeedUsers } from "../src/data/users.js";
import { config } from "../src/config.js";

async function buildIsolatedApp() {
  const devices = structuredClone(seedDevices);
  const users = createSeedUsers(config);
  const groups = [];

  return createApp({
    loadDevices: async () => structuredClone(devices),
    saveDevices: async (nextDevices) => {
      devices.splice(0, devices.length, ...structuredClone(nextDevices));
    },
    loadUsers: async () => structuredClone(users),
    saveUsers: async () => {},
    loadGroups: async () => structuredClone(groups),
    saveGroups: async () => {},
  });
}

async function loginAs(app, username, password) {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ username, password });

  assert.equal(response.status, 200);
  return response.body;
}

test("formatShanghaiIso always returns a +08:00 timestamp", () => {
  const source = new Date("2026-03-16T04:00:00.000Z");

  assert.equal(formatShanghaiIso(source), "2026-03-16T12:00:00+08:00");
});

test("resolveDeviceLastActive ignores placeholder values and falls back to updatedAt", () => {
  const lastActive = resolveDeviceLastActive({
    lastSeenAt: null,
    lastActive: "-",
    updatedAt: "2026-03-16T12:00:00+08:00",
  });

  assert.equal(lastActive, "2026-03-16T12:00:00+08:00");
});

test("resolveDeviceStatus marks stale online device as offline after timeout", () => {
  const status = resolveDeviceStatus(
    {
      status: "online",
      lastSeenAt: "2026-03-16T11:59:40+08:00",
    },
    new Date("2026-03-16T12:00:00+08:00"),
    15000,
  );

  assert.equal(status, "offline");
});

test("resolveDeviceStatus keeps fresh online device as online within timeout", () => {
  const status = resolveDeviceStatus(
    {
      status: "online",
      lastSeenAt: "2026-03-16T11:59:50+08:00",
    },
    new Date("2026-03-16T12:00:00+08:00"),
    15000,
  );

  assert.equal(status, "online");
});

test("claim response returns a canonical lastActive timestamp", async () => {
  const app = await buildIsolatedApp();
  const adminSession = await loginAs(app, "admin", "admin");
  const session = await loginAs(app, "user", "user");

  const releaseResponse = await request(app)
    .delete("/api/devices/SD-001")
    .set("Authorization", `Bearer ${adminSession.token}`);

  assert.equal(releaseResponse.status, 204);

  const claimResponse = await request(app)
    .post("/api/devices/claim")
    .set("Authorization", `Bearer ${session.token}`)
    .send({ claimCode: "BEAN0001", name: "无历史活跃时间设备" });

  assert.equal(claimResponse.status, 201);
  assert.match(claimResponse.body.device.updatedAt, /\+08:00$/);
  assert.equal(claimResponse.body.device.lastActive, claimResponse.body.device.updatedAt);
});

test("re-claim after delete does not reuse the previous owner's last active time", async () => {
  const app = await buildIsolatedApp();
  const adminSession = await loginAs(app, "admin", "admin");

  const deleteResponse = await request(app)
    .delete("/api/devices/SD-001")
    .set("Authorization", `Bearer ${adminSession.token}`);

  assert.equal(deleteResponse.status, 204);

  const userSession = await loginAs(app, "user", "user");
  const claimResponse = await request(app)
    .post("/api/devices/claim")
    .set("Authorization", `Bearer ${userSession.token}`)
    .send({ claimCode: "BEAN0001", name: "重新认领设备" });

  assert.equal(claimResponse.status, 201);
  assert.equal(claimResponse.body.device.lastSeenAt, null);
  assert.equal(claimResponse.body.device.lastActive, claimResponse.body.device.updatedAt);
  assert.notEqual(claimResponse.body.device.lastActive, "2026-03-12T08:00:00+08:00");
});
