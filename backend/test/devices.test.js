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

test("seeded devices are all unbound, and user can claim any of them with valid code", async () => {
  const app = await buildApp();
  const adminSession = await loginAs(app, "admin", "admin");

  // All devices should be unbound initially
  const adminDevices = await request(app)
    .get("/api/devices")
    .set("Authorization", `Bearer ${adminSession.token}`);

  assert.equal(adminDevices.status, 200);
  assert.deepEqual(adminDevices.body.devices, []);

  // User can claim any device with valid code
  const userSession = await loginAs(app, "user", "user");
  const claimResponse = await request(app)
    .post("/api/devices/claim")
    .set("Authorization", `Bearer ${userSession.token}`)
    .send({
      claimCode: "ZC44A3J8",
      name: "我的测试设备",
      address: "上海市浦东新区 测试点 6 号",
    });

  assert.equal(claimResponse.status, 201);
  assert.equal(claimResponse.body.device.claimCode, "ZC44A3J8");
  assert.equal(claimResponse.body.device.name, "我的测试设备");
});
