import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";
import { seedDevices } from "../src/data/devices.js";

async function buildApp(options = {}) {
  return createApp(options);
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

test("seeds eleven devices with four pre-bound for Fujian Sanxiyan", async () => {
  const app = await buildApp();
  const session = await loginAs(app, "admin", "admin");

  assert.equal(seedDevices.length, 11);

  const response = await request(app)
    .get("/api/devices")
    .set("Authorization", `Bearer ${session.token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.devices.length, 4);
  assert.deepEqual(
    response.body.devices.map((device) => device.name),
    ["Z字梯", "生豆处理站", "智能仓储", "三元催化"]
  );
  assert.equal(response.body.devices.every((device) => device.config && device.config.payload), true);
});

test("claims an unbound device with a fixed code and custom name", async () => {
  const app = await buildApp();
  const adminSession = await loginAs(app, "admin", "admin");
  const session = await loginAs(app, "user", "user");

  const releaseResponse = await request(app)
    .delete("/api/devices/SD-001")
    .set("Authorization", `Bearer ${adminSession.token}`);

  assert.equal(releaseResponse.status, 204);

  const claimResponse = await request(app)
    .post("/api/devices/claim")
    .set("Authorization", `Bearer ${session.token}`)
    .send({ claimCode: "BEAN0001", name: "我的测试设备" });

  assert.equal(claimResponse.status, 201);
  assert.equal(claimResponse.body.device.name, "我的测试设备");
  assert.equal(claimResponse.body.device.claimCode, "BEAN0001");
  assert.equal(claimResponse.body.device.config, null);

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

  const releaseResponse = await request(app)
    .delete("/api/devices/SD-001")
    .set("Authorization", `Bearer ${adminSession.token}`);

  assert.equal(releaseResponse.status, 204);

  const firstClaim = await request(app)
    .post("/api/devices/claim")
    .set("Authorization", `Bearer ${userSession.token}`)
    .send({ claimCode: "BEAN0001", name: "用户设备" });

  assert.equal(firstClaim.status, 201);

  const duplicateClaim = await request(app)
    .post("/api/devices/claim")
    .set("Authorization", `Bearer ${adminSession.token}`)
    .send({ claimCode: "BEAN0001", name: "管理员设备" });

  assert.equal(duplicateClaim.status, 409);

  const deleteResponse = await request(app)
    .delete(`/api/devices/${firstClaim.body.device.id}`)
    .set("Authorization", `Bearer ${userSession.token}`);

  assert.equal(deleteResponse.status, 204);

  const secondClaim = await request(app)
    .post("/api/devices/claim")
    .set("Authorization", `Bearer ${adminSession.token}`)
    .send({ claimCode: "BEAN0001", name: "管理员设备" });

  assert.equal(secondClaim.status, 201);
  assert.equal(secondClaim.body.device.name, "管理员设备");
});

test("updates device fields and its single config name for the owner", async () => {
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
  const app = await buildApp();
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
  const app = await buildApp();
  const adminSession = await loginAs(app, "admin", "admin");
  const session = await loginAs(app, "user", "user");

  const releaseResponse = await request(app)
    .delete("/api/devices/SD-001")
    .set("Authorization", `Bearer ${adminSession.token}`);

  assert.equal(releaseResponse.status, 204);

  const claimResponse = await request(app)
    .post("/api/devices/claim")
    .set("Authorization", `Bearer ${session.token}`)
    .send({ claimCode: "BEAN0001", name: "无组态设备" });

  assert.equal(claimResponse.status, 201);

  const configResponse = await request(app)
    .get(`/api/devices/${claimResponse.body.device.id}/config`)
    .set("Authorization", `Bearer ${session.token}`);

  assert.equal(configResponse.status, 200);
  assert.equal(configResponse.body.config, null);
});

test("returns structured config payload for seeded config screens", async () => {
  const app = await buildApp();
  const session = await loginAs(app, "admin", "admin");

  const configResponse = await request(app)
    .get("/api/devices/ZZ-001/config")
    .set("Authorization", `Bearer ${session.token}`);

  assert.equal(configResponse.status, 200);
  assert.equal(Array.isArray(configResponse.body.config.payload.summary), true);
  assert.equal(typeof configResponse.body.config.payload.chart.title, "string");
  assert.equal(Array.isArray(configResponse.body.config.payload.chart.data), true);
  assert.equal(Array.isArray(configResponse.body.config.payload.controls), true);
});

test("updates profile for authenticated user", async () => {
  const app = await buildApp();
  const session = await loginAs(app, "admin", "admin");

  const response = await request(app)
    .patch("/api/auth/profile")
    .set("Authorization", `Bearer ${session.token}`)
    .send({ displayName: "管理员A" });

  assert.equal(response.status, 200);
  assert.equal(response.body.user.displayName, "管理员A");
});

test("updates password and allows login with new password", async () => {
  const app = await buildApp();
  const session = await loginAs(app, "user", "user");

  const updateResponse = await request(app)
    .patch("/api/auth/password")
    .set("Authorization", `Bearer ${session.token}`)
    .send({ oldPassword: "user", newPassword: "user-new" });

  assert.equal(updateResponse.status, 204);

  const loginResponse = await request(app)
    .post("/api/auth/login")
    .send({ username: "user", password: "user-new" });

  assert.equal(loginResponse.status, 200);
});

test("invalidates current token after password change", async () => {
  const app = await buildApp();
  const session = await loginAs(app, "user", "user");

  const updateResponse = await request(app)
    .patch("/api/auth/password")
    .set("Authorization", `Bearer ${session.token}`)
    .send({ oldPassword: "user", newPassword: "user-new" });

  assert.equal(updateResponse.status, 204);

  const oldTokenResponse = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${session.token}`);

  assert.equal(oldTokenResponse.status, 401);
});

test("logout endpoint responds successfully for authenticated user", async () => {
  const app = await buildApp();
  const session = await loginAs(app, "admin", "admin");

  const response = await request(app)
    .post("/api/auth/logout")
    .set("Authorization", `Bearer ${session.token}`);

  assert.equal(response.status, 204);

  const meResponse = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${session.token}`);

  assert.equal(meResponse.status, 401);
});

test("keeps in-memory device state unchanged when persistence fails", async () => {
  const app = await buildApp({
    saveDevices: async () => {
      throw new Error("disk full");
    },
  });
  const session = await loginAs(app, "admin", "admin");

  const beforeResponse = await request(app)
    .get("/api/devices/SD-001")
    .set("Authorization", `Bearer ${session.token}`);

  assert.equal(beforeResponse.status, 200);
  const beforeName = beforeResponse.body.device.name;

  const updateResponse = await request(app)
    .patch("/api/devices/SD-001")
    .set("Authorization", `Bearer ${session.token}`)
    .send({ name: "保存失败后脏内存", address: "测试地址" });

  assert.equal(updateResponse.status, 500);

  const afterResponse = await request(app)
    .get("/api/devices/SD-001")
    .set("Authorization", `Bearer ${session.token}`);

  assert.equal(afterResponse.status, 200);
  assert.equal(afterResponse.body.device.name, beforeName);
});

test("exposes readiness endpoint", async () => {
  const app = await buildApp();
  const response = await request(app).get("/readyz");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
  assert.equal(response.body.storage, "ok");
});

test("persists profile and password changes across app restart", async () => {
  let storedUsers = null;

  const saveUsers = async (users) => {
    storedUsers = structuredClone(users);
  };

  const loadUsers = async () => {
    if (!storedUsers) {
      return null;
    }

    return structuredClone(storedUsers);
  };

  const appA = await buildApp({ saveUsers, loadUsers });
  const session = await loginAs(appA, "user", "user");

  const profileResponse = await request(appA)
    .patch("/api/auth/profile")
    .set("Authorization", `Bearer ${session.token}`)
    .send({ displayName: "持久化用户" });

  assert.equal(profileResponse.status, 200);

  const passwordResponse = await request(appA)
    .patch("/api/auth/password")
    .set("Authorization", `Bearer ${session.token}`)
    .send({ oldPassword: "user", newPassword: "user-restart" });

  assert.equal(passwordResponse.status, 204);

  const appB = await buildApp({ saveUsers, loadUsers });
  const loginResponse = await request(appB)
    .post("/api/auth/login")
    .send({ username: "user", password: "user-restart" });

  assert.equal(loginResponse.status, 200);
  assert.equal(loginResponse.body.user.displayName, "持久化用户");
});

test("deletes a device alarm by id", async () => {
  const app = await buildApp();
  const session = await loginAs(app, "admin", "admin");

  const response = await request(app)
    .delete("/api/devices/SD-001/alarms/alarm-bean-001")
    .set("Authorization", `Bearer ${session.token}`);

  assert.equal(response.status, 204);

  const deviceResponse = await request(app)
    .get("/api/devices/SD-001")
    .set("Authorization", `Bearer ${session.token}`);

  assert.equal(deviceResponse.status, 200);
  assert.equal(deviceResponse.body.device.alarms.some((alarm) => alarm.id === "alarm-bean-001"), false);
});

test("returns 500 when persisting mutated devices fails", async () => {
  const app = await buildApp({
    saveDevices: async () => {
      throw new Error("disk full");
    },
  });
  const session = await loginAs(app, "admin", "admin");

  const updateResponse = await request(app)
    .patch("/api/devices/SD-001")
    .set("Authorization", `Bearer ${session.token}`)
    .send({ name: "保存失败测试设备", address: "测试地址" });

  assert.equal(updateResponse.status, 500);
  assert.equal(updateResponse.body.message, "设备状态保存失败");
});

test("rejects unauthenticated group list access", async () => {
  const app = await buildApp();
  const response = await request(app).get("/api/groups");

  assert.equal(response.status, 401);
});

test("creates and updates groups for current user", async () => {
  const app = await buildApp();
  const session = await loginAs(app, "admin", "admin");

  const listResponse = await request(app)
    .get("/api/devices")
    .set("Authorization", `Bearer ${session.token}`);

  assert.equal(listResponse.status, 200);
  const [firstDevice, secondDevice] = listResponse.body.devices;

  const createResponse = await request(app)
    .post("/api/groups")
    .set("Authorization", `Bearer ${session.token}`)
    .send({ name: "我的分组", deviceIds: [firstDevice.id, secondDevice.id] });

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.group.name, "我的分组");
  assert.deepEqual(createResponse.body.group.deviceIds, [firstDevice.id, secondDevice.id]);

  const updateResponse = await request(app)
    .patch(`/api/groups/${createResponse.body.group.id}`)
    .set("Authorization", `Bearer ${session.token}`)
    .send({ name: "我的分组A", deviceIds: [firstDevice.id] });

  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.group.name, "我的分组A");
  assert.deepEqual(updateResponse.body.group.deviceIds, [firstDevice.id]);

  const groupsResponse = await request(app)
    .get("/api/groups")
    .set("Authorization", `Bearer ${session.token}`);

  assert.equal(groupsResponse.status, 200);
  assert.equal(groupsResponse.body.groups.length, 1);
  assert.equal(groupsResponse.body.groups[0].name, "我的分组A");
});

test("isolates groups by user", async () => {
  const app = await buildApp();
  const adminSession = await loginAs(app, "admin", "admin");
  const userSession = await loginAs(app, "user", "user");

  const adminDevices = await request(app)
    .get("/api/devices")
    .set("Authorization", `Bearer ${adminSession.token}`);

  assert.equal(adminDevices.status, 200);

  const createResponse = await request(app)
    .post("/api/groups")
    .set("Authorization", `Bearer ${adminSession.token}`)
    .send({ name: "管理员分组", deviceIds: [adminDevices.body.devices[0].id] });

  assert.equal(createResponse.status, 201);

  const userGroups = await request(app)
    .get("/api/groups")
    .set("Authorization", `Bearer ${userSession.token}`);

  assert.equal(userGroups.status, 200);
  assert.equal(userGroups.body.groups.length, 0);
});

test("keeps in-memory group state unchanged when persistence fails", async () => {
  const app = await buildApp({
    saveGroups: async () => {
      throw new Error("disk full");
    },
    loadGroups: async () => ([
      {
        id: "group-fixed",
        userId: "user-admin",
        name: "原分组",
        deviceIds: ["ZZ-001"],
      },
    ]),
  });
  const session = await loginAs(app, "admin", "admin");

  const updateResponse = await request(app)
    .patch("/api/groups/group-fixed")
    .set("Authorization", `Bearer ${session.token}`)
    .send({ name: "失败后脏内存", deviceIds: ["SD-001"] });

  assert.equal(updateResponse.status, 500);
  assert.equal(updateResponse.body.message, "分组信息保存失败");

  const groupsResponse = await request(app)
    .get("/api/groups")
    .set("Authorization", `Bearer ${session.token}`);

  assert.equal(groupsResponse.status, 200);
  assert.equal(groupsResponse.body.groups[0].name, "原分组");
  assert.deepEqual(groupsResponse.body.groups[0].deviceIds, ["ZZ-001"]);
});

test("persists groups across app restart", async () => {
  let storedGroups = null;

  const saveGroups = async (groups) => {
    storedGroups = structuredClone(groups);
  };

  const loadGroups = async () => {
    if (!storedGroups) {
      return [];
    }

    return structuredClone(storedGroups);
  };

  const appA = await buildApp({ saveGroups, loadGroups });
  const session = await loginAs(appA, "admin", "admin");

  const devicesResponse = await request(appA)
    .get("/api/devices")
    .set("Authorization", `Bearer ${session.token}`);

  assert.equal(devicesResponse.status, 200);

  const createResponse = await request(appA)
    .post("/api/groups")
    .set("Authorization", `Bearer ${session.token}`)
    .send({ name: "重启后分组", deviceIds: [devicesResponse.body.devices[0].id] });

  assert.equal(createResponse.status, 201);

  const appB = await buildApp({ saveGroups, loadGroups });
  const sessionB = await loginAs(appB, "admin", "admin");
  const groupsResponse = await request(appB)
    .get("/api/groups")
    .set("Authorization", `Bearer ${sessionB.token}`);

  assert.equal(groupsResponse.status, 200);
  assert.equal(groupsResponse.body.groups.length, 1);
  assert.equal(groupsResponse.body.groups[0].name, "重启后分组");
});
