import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp, formatShanghaiIso, resolveDeviceLastActive } from "../src/app.js";

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

test("claim response returns a canonical lastActive timestamp", async () => {
  const app = createApp();
  const session = await loginAs(app, "user", "user");

  const claimResponse = await request(app)
    .post("/api/devices/claim")
    .set("Authorization", `Bearer ${session.token}`)
    .send({ claimCode: "V6B3L8Q4", name: "无历史活跃时间设备" });

  assert.equal(claimResponse.status, 201);
  assert.match(claimResponse.body.device.updatedAt, /\+08:00$/);
  assert.equal(claimResponse.body.device.lastActive, claimResponse.body.device.updatedAt);
});

test("re-claim after delete does not reuse the previous owner's last active time", async () => {
  const app = createApp();
  const adminSession = await loginAs(app, "admin", "admin");

  const deleteResponse = await request(app)
    .delete("/api/devices/dev-fz-001")
    .set("Authorization", `Bearer ${adminSession.token}`);

  assert.equal(deleteResponse.status, 204);

  const userSession = await loginAs(app, "user", "user");
  const claimResponse = await request(app)
    .post("/api/devices/claim")
    .set("Authorization", `Bearer ${userSession.token}`)
    .send({ claimCode: "H7K2M4Q9", name: "重新认领设备" });

  assert.equal(claimResponse.status, 201);
  assert.equal(claimResponse.body.device.lastSeenAt, null);
  assert.equal(claimResponse.body.device.lastActive, claimResponse.body.device.updatedAt);
  assert.notEqual(claimResponse.body.device.lastActive, "2026-03-12T08:00:00+08:00");
});
