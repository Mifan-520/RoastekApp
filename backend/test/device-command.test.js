import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";
import { seedDevices } from "../src/data/devices.js";
import { createSeedUsers } from "../src/data/users.js";
import { config } from "../src/config.js";

async function buildAppWithCommandSpy() {
  const devices = structuredClone(seedDevices);
  const users = createSeedUsers(config);
  const groups = [];
  const publishedCommands = [];

  const app = await createApp({
    loadDevices: async () => structuredClone(devices),
    saveDevices: async (nextDevices) => {
      devices.splice(0, devices.length, ...structuredClone(nextDevices));
    },
    loadUsers: async () => structuredClone(users),
    saveUsers: async () => {},
    loadGroups: async () => structuredClone(groups),
    saveGroups: async () => {},
    publishCommandFn: async (deviceId, command) => {
      publishedCommands.push({ deviceId, command });
    },
  });

  return { app, publishedCommands };
}

async function loginAs(app, username, password) {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ username, password });

  assert.equal(response.status, 200);
  return response.body;
}

test("device owner can publish command through api", async () => {
  const { app, publishedCommands } = await buildAppWithCommandSpy();
  const session = await loginAs(app, "admin", "admin");

  const response = await request(app)
    .post("/api/devices/SY-001/command")
    .set("Authorization", `Bearer ${session.token}`)
    .send({ command: "start", params: { mode: 1, fireSec: 540, closeSec: 180 } });

  assert.equal(response.status, 202);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.command.command, "start");
  assert.deepEqual(response.body.command.params, { mode: 1, fireSec: 540, closeSec: 180 });
  assert.equal(publishedCommands.length, 1);
  assert.deepEqual(publishedCommands[0], {
    deviceId: "SY-001",
    command: { command: "start", params: { mode: 1, fireSec: 540, closeSec: 180 } },
  });
  assert.equal(response.body.device.id, "SY-001");
  assert.equal(response.body.config.payload.currentMode, 1);
  assert.equal(response.body.config.payload.countMode, 1);
  assert.equal(response.body.config.payload.restSeconds, 540);
  assert.equal(response.body.config.payload.powerOn, true);
  assert.equal(response.body.device.syncState.expected.currentMode, 1);
  assert.equal(response.body.device.syncState.expected.countMode, 1);
  assert.equal(response.body.device.syncState.expected.baseRestSeconds, 540);
  assert.equal(response.body.device.syncState.status, "pending");
});

test("device command api rejects empty command payload", async () => {
  const { app, publishedCommands } = await buildAppWithCommandSpy();
  const session = await loginAs(app, "admin", "admin");

  const response = await request(app)
    .post("/api/devices/SY-001/command")
    .set("Authorization", `Bearer ${session.token}`)
    .send({ params: { mode: 2 } });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "命令名称不能为空");
  assert.equal(publishedCommands.length, 0);
});

test("device command api only allows owner to send command", async () => {
  const { app, publishedCommands } = await buildAppWithCommandSpy();
  const session = await loginAs(app, "user", "user");

  const response = await request(app)
    .post("/api/devices/SY-001/command")
    .set("Authorization", `Bearer ${session.token}`)
    .send({ command: "reset" });

  assert.equal(response.status, 404);
  assert.equal(response.body.message, "设备不存在");
  assert.equal(publishedCommands.length, 0);
});
