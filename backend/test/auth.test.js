import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";

async function buildApp() {
  return createApp({
    useInMemoryDb: true,
    config: {
      port: 3001,
      nodeEnv: "test",
      databaseUrl: "pg-mem",
      frontendOrigins: ["http://127.0.0.1:4173"],
      adminUsername: "admin",
      adminPassword: "admin",
      userUsername: "user",
      userPassword: "user",
    },
  });
}

async function loginAs(app, username, password) {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ username, password });

  assert.equal(response.status, 200);
  return response.body;
}

test("accepts admin login and returns admin role label", async () => {
  const app = await buildApp();
  const response = await request(app)
    .post("/api/auth/login")
    .send({ username: "admin", password: "admin" });

  assert.equal(response.status, 200);
  assert.equal(response.body.user.username, "admin");
  assert.equal(response.body.user.role, "admin");
  assert.equal(response.body.user.roleLabel, "管理员");
  assert.equal(typeof response.body.token, "string");
  assert.notEqual(response.body.token, "token-admin");
  assert.equal(response.body.token.length >= 24, true);
});

test("returns current user with issued token and rejects forged predictable token", async () => {
  const app = await buildApp();
  const session = await loginAs(app, "admin", "admin");

  const meResponse = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${session.token}`);

  assert.equal(meResponse.status, 200);
  assert.equal(meResponse.body.user.username, "admin");

  const forgedResponse = await request(app)
    .get("/api/auth/me")
    .set("Authorization", "Bearer token-admin");

  assert.equal(forgedResponse.status, 401);
});

test("invalidates token after logout", async () => {
  const app = await buildApp();
  const session = await loginAs(app, "admin", "admin");

  const logoutResponse = await request(app)
    .post("/api/auth/logout")
    .set("Authorization", `Bearer ${session.token}`);

  assert.equal(logoutResponse.status, 204);

  const meResponse = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${session.token}`);

  assert.equal(meResponse.status, 401);
});

test("accepts user login and returns user role label", async () => {
  const app = await buildApp();
  const response = await request(app)
    .post("/api/auth/login")
    .send({ username: "user", password: "user" });

  assert.equal(response.status, 200);
  assert.equal(response.body.user.username, "user");
  assert.equal(response.body.user.role, "user");
  assert.equal(response.body.user.roleLabel, "用户");
});

test("rejects unauthenticated device list access", async () => {
  const app = await buildApp();
  const response = await request(app).get("/api/devices");

  assert.equal(response.status, 401);
});

test("claims an unbound device with a fixed code and custom name", async () => {
  const app = await buildApp();
  const session = await loginAs(app, "user", "user");

  const claimResponse = await request(app)
    .post("/api/devices/claim")
    .set("Authorization", `Bearer ${session.token}`)
    .send({ claimCode: "Q4R8T2VW", name: "我的测试设备" });

  assert.equal(claimResponse.status, 201);
  assert.equal(claimResponse.body.device.name, "我的测试设备");
  assert.equal(claimResponse.body.device.claimCode, "Q4R8T2VW");

  const listResponse = await request(app)
    .get("/api/devices")
    .set("Authorization", `Bearer ${session.token}`);

  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.devices.length, 1);
  assert.equal(listResponse.body.devices[0].name, "我的测试设备");
});

test("prevents claiming an already bound device until it is deleted", async () => {
  const app = await buildApp();
  const userSession = await loginAs(app, "user", "user");
  const adminSession = await loginAs(app, "admin", "admin");

  const firstClaim = await request(app)
    .post("/api/devices/claim")
    .set("Authorization", `Bearer ${userSession.token}`)
    .send({ claimCode: "M7N5P2LX", name: "用户设备" });

  assert.equal(firstClaim.status, 201);

  const duplicateClaim = await request(app)
    .post("/api/devices/claim")
    .set("Authorization", `Bearer ${adminSession.token}`)
    .send({ claimCode: "M7N5P2LX", name: "管理员设备" });

  assert.equal(duplicateClaim.status, 409);

  const deleteResponse = await request(app)
    .delete(`/api/devices/${firstClaim.body.device.id}`)
    .set("Authorization", `Bearer ${userSession.token}`);

  assert.equal(deleteResponse.status, 204);

  const secondClaim = await request(app)
    .post("/api/devices/claim")
    .set("Authorization", `Bearer ${adminSession.token}`)
    .send({ claimCode: "M7N5P2LX", name: "管理员设备" });

  assert.equal(secondClaim.status, 201);
  assert.equal(secondClaim.body.device.name, "管理员设备");
});

test("allows only one successful claim in concurrent requests", async () => {
  const app = await buildApp();
  const adminSession = await loginAs(app, "admin", "admin");
  const userSession = await loginAs(app, "user", "user");

  const [first, second] = await Promise.all([
    request(app)
      .post("/api/devices/claim")
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({ claimCode: "Q4R8T2VW", name: "管理员并发设备" }),
    request(app)
      .post("/api/devices/claim")
      .set("Authorization", `Bearer ${userSession.token}`)
      .send({ claimCode: "Q4R8T2VW", name: "用户并发设备" }),
  ]);

  const statuses = [first.status, second.status].sort((a, b) => a - b);
  assert.deepEqual(statuses, [201, 409]);
});

test("updates only device name and address for the owner", async () => {
  const app = await buildApp();
  const session = await loginAs(app, "admin", "admin");

  const deviceList = await request(app)
    .get("/api/devices")
    .set("Authorization", `Bearer ${session.token}`);

  assert.equal(deviceList.status, 200);
  const deviceId = deviceList.body.devices[0].id;

  const updateDevice = await request(app)
    .patch(`/api/devices/${deviceId}`)
    .set("Authorization", `Bearer ${session.token}`)
    .send({ name: "已改名设备", address: "上海市闵行区 测试地址 88 号" });

  assert.equal(updateDevice.status, 200);
  assert.equal(updateDevice.body.device.name, "已改名设备");
  assert.equal(updateDevice.body.device.address, "上海市闵行区 测试地址 88 号");
  assert.equal(updateDevice.body.device.type, "农业传感器");
  assert.equal(updateDevice.body.device.location, "1号大棚");

  const updateConfig = await request(app)
    .patch(`/api/devices/${deviceId}/config`)
    .set("Authorization", `Bearer ${session.token}`)
    .send({ name: "新的组态名" });

  assert.equal(updateConfig.status, 200);
  assert.equal(updateConfig.body.config.name, "新的组态名");
});

test("returns null when the device has no config", async () => {
  const app = await buildApp();
  const session = await loginAs(app, "user", "user");

  const claimResponse = await request(app)
    .post("/api/devices/claim")
    .set("Authorization", `Bearer ${session.token}`)
    .send({ claimCode: "Z8C6V4BN", name: "无组态设备" });

  assert.equal(claimResponse.status, 201);

  const configResponse = await request(app)
    .get(`/api/devices/${claimResponse.body.device.id}/config`)
    .set("Authorization", `Bearer ${session.token}`);

  assert.equal(configResponse.status, 200);
  assert.equal(configResponse.body.config, null);
});

test("updates profile and password with backend persistence", async () => {
  const app = await buildApp();
  const session = await loginAs(app, "admin", "admin");

  const profileResponse = await request(app)
    .patch("/api/auth/profile")
    .set("Authorization", `Bearer ${session.token}`)
    .send({ displayName: "Admin Renamed" });

  assert.equal(profileResponse.status, 200);
  assert.equal(profileResponse.body.user.displayName, "Admin Renamed");

  const passwordResponse = await request(app)
    .patch("/api/auth/password")
    .set("Authorization", `Bearer ${session.token}`)
    .send({ oldPassword: "admin", newPassword: "admin-123" });

  assert.equal(passwordResponse.status, 204);

  const reloginResponse = await request(app)
    .post("/api/auth/login")
    .send({ username: "admin", password: "admin-123" });

  assert.equal(reloginResponse.status, 200);
});
