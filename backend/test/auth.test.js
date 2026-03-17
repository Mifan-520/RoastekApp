import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";
import { seedDevices } from "../src/data/devices.js";

function buildApp() {
  return createApp();
}

async function loginAs(app, username, password) {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ username, password });

  assert.equal(response.status, 200);
  return response.body;
}

test("accepts admin login and returns admin role label", async () => {
  const app = buildApp();
  const response = await request(app)
    .post("/api/auth/login")
    .send({ username: "admin", password: "admin" });

  assert.equal(response.status, 200);
  assert.equal(response.body.user.username, "admin");
  assert.equal(response.body.user.role, "admin");
  assert.equal(response.body.user.roleLabel, "管理员");
  assert.equal(typeof response.body.token, "string");
});

test("accepts user login and returns user role label", async () => {
  const app = buildApp();
  const response = await request(app)
    .post("/api/auth/login")
    .send({ username: "user", password: "user" });

  assert.equal(response.status, 200);
  assert.equal(response.body.user.username, "user");
  assert.equal(response.body.user.role, "user");
  assert.equal(response.body.user.roleLabel, "用户");
});

test("rejects unauthenticated device list access", async () => {
  const app = buildApp();
  const response = await request(app).get("/api/devices");

  assert.equal(response.status, 401);
});

test("seeds ten devices and keeps three Fujian Sanxiyan devices bound with configs", async () => {
  const app = buildApp();
  const session = await loginAs(app, "admin", "admin");

  assert.equal(seedDevices.length, 10);

  const response = await request(app)
    .get("/api/devices")
    .set("Authorization", `Bearer ${session.token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.devices.length, 3);
  assert.deepEqual(
    response.body.devices.map((device) => device.name),
    ["福州三喜燕一号线", "福州三喜燕二号线", "福州三喜燕三号线"]
  );
  assert.equal(response.body.devices.every((device) => device.config && device.config.payload), true);
});

test("claims an unbound device with a fixed code and custom name", async () => {
  const app = buildApp();
  const session = await loginAs(app, "user", "user");

  const claimResponse = await request(app)
    .post("/api/devices/claim")
    .set("Authorization", `Bearer ${session.token}`)
    .send({ claimCode: "X9K4M2P7", name: "我的测试设备" });

  assert.equal(claimResponse.status, 201);
  assert.equal(claimResponse.body.device.name, "我的测试设备");
  assert.equal(claimResponse.body.device.claimCode, "X9K4M2P7");
  assert.equal(claimResponse.body.device.config, null);

  const listResponse = await request(app)
    .get("/api/devices")
    .set("Authorization", `Bearer ${session.token}`);

  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.devices.length, 1);
  assert.equal(listResponse.body.devices[0].name, "我的测试设备");
});

test("prevents claiming an already bound device until it is deleted", async () => {
  const app = buildApp();
  const userSession = await loginAs(app, "user", "user");
  const adminSession = await loginAs(app, "admin", "admin");

  const firstClaim = await request(app)
    .post("/api/devices/claim")
    .set("Authorization", `Bearer ${userSession.token}`)
    .send({ claimCode: "C8N6R4T2", name: "用户设备" });

  assert.equal(firstClaim.status, 201);

  const duplicateClaim = await request(app)
    .post("/api/devices/claim")
    .set("Authorization", `Bearer ${adminSession.token}`)
    .send({ claimCode: "C8N6R4T2", name: "管理员设备" });

  assert.equal(duplicateClaim.status, 409);

  const deleteResponse = await request(app)
    .delete(`/api/devices/${firstClaim.body.device.id}`)
    .set("Authorization", `Bearer ${userSession.token}`);

  assert.equal(deleteResponse.status, 204);

  const secondClaim = await request(app)
    .post("/api/devices/claim")
    .set("Authorization", `Bearer ${adminSession.token}`)
    .send({ claimCode: "C8N6R4T2", name: "管理员设备" });

  assert.equal(secondClaim.status, 201);
  assert.equal(secondClaim.body.device.name, "管理员设备");
});

test("updates device fields and its single config name for the owner", async () => {
  const app = buildApp();
  const session = await loginAs(app, "admin", "admin");

  const deviceList = await request(app)
    .get("/api/devices")
    .set("Authorization", `Bearer ${session.token}`);

  assert.equal(deviceList.status, 200);
  const deviceId = deviceList.body.devices[0].id;

  const updateDevice = await request(app)
    .patch(`/api/devices/${deviceId}`)
    .set("Authorization", `Bearer ${session.token}`)
    .send({ name: "已改名设备", type: "自定义类型", location: "测试位置" });

  assert.equal(updateDevice.status, 200);
  assert.equal(updateDevice.body.device.name, "已改名设备");

  const updateConfig = await request(app)
    .patch(`/api/devices/${deviceId}/config`)
    .set("Authorization", `Bearer ${session.token}`)
    .send({ name: "新的组态名" });

  assert.equal(updateConfig.status, 200);
  assert.equal(updateConfig.body.config.name, "新的组态名");
});

test("allows updating device with name and address only for existing frontend payload", async () => {
  const app = buildApp();
  const session = await loginAs(app, "admin", "admin");

  const deviceList = await request(app)
    .get("/api/devices")
    .set("Authorization", `Bearer ${session.token}`);

  assert.equal(deviceList.status, 200);
  const targetDevice = deviceList.body.devices[0];

  const updateDevice = await request(app)
    .patch(`/api/devices/${targetDevice.id}`)
    .set("Authorization", `Bearer ${session.token}`)
    .send({ name: "兼容前端编辑", address: "福州市测试地址" });

  assert.equal(updateDevice.status, 200);
  assert.equal(updateDevice.body.device.name, "兼容前端编辑");
  assert.equal(updateDevice.body.device.address, "福州市测试地址");
  assert.equal(updateDevice.body.device.location, targetDevice.location);
});

test("returns null when the device has no config", async () => {
  const app = buildApp();
  const session = await loginAs(app, "user", "user");

  const claimResponse = await request(app)
    .post("/api/devices/claim")
    .set("Authorization", `Bearer ${session.token}`)
    .send({ claimCode: "V6B3L8Q4", name: "无组态设备" });

  assert.equal(claimResponse.status, 201);

  const configResponse = await request(app)
    .get(`/api/devices/${claimResponse.body.device.id}/config`)
    .set("Authorization", `Bearer ${session.token}`);

  assert.equal(configResponse.status, 200);
  assert.equal(configResponse.body.config, null);
});

test("returns structured config payload for seeded config screens", async () => {
  const app = buildApp();
  const session = await loginAs(app, "admin", "admin");

  const configResponse = await request(app)
    .get("/api/devices/dev-fz-001/config")
    .set("Authorization", `Bearer ${session.token}`);

  assert.equal(configResponse.status, 200);
  assert.equal(Array.isArray(configResponse.body.config.payload.summary), true);
  assert.equal(typeof configResponse.body.config.payload.chart.title, "string");
  assert.equal(Array.isArray(configResponse.body.config.payload.chart.data), true);
  assert.equal(Array.isArray(configResponse.body.config.payload.controls), true);
});
