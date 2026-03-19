import test from "node:test";
import assert from "node:assert/strict";
import * as storage from "../src/storage.js";

function createMockDevice(overrides = {}) {
  return {
    id: "seed-1",
    claimCode: "AAAA1111",
    name: "默认设备",
    type: "默认类型",
    location: "默认位置",
    status: "online",
    ...overrides,
  };
}

function runSeedSync(persistedDevices, seedDevices) {
  assert.equal(
    typeof storage.syncSeedDevices,
    "function",
    "storage.syncSeedDevices should be implemented"
  );

  return storage.syncSeedDevices({
    persistedDevices,
    seedDevices,
  });
}

test("should merge seed devices without overwriting persisted values", () => {
  const persistedDevices = [
    createMockDevice({
      name: "用户已改名设备",
      type: "用户类型",
      location: "用户位置",
      status: "offline",
    }),
  ];

  const seedDevices = [
    createMockDevice({
      name: "种子新名称",
      type: "种子类型",
      location: "种子位置",
      status: "online",
      firmwareVersion: "1.2.0",
    }),
  ];

  const merged = runSeedSync(persistedDevices, seedDevices);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].name, "用户已改名设备");
  assert.equal(merged[0].type, "用户类型");
  assert.equal(merged[0].location, "用户位置");
  assert.equal(merged[0].status, "offline");
  assert.equal(merged[0].firmwareVersion, "1.2.0");
});

test("should preserve custom devices not in seed", () => {
  const persistedDevices = [
    createMockDevice({
      name: "已存在种子设备",
    }),
    createMockDevice({
      id: "custom-1",
      claimCode: "CUST0001",
      name: "用户自定义设备",
      status: "offline",
      ownerId: "user-1",
    }),
  ];

  const seedDevices = [
    createMockDevice({
      name: "种子设备",
    }),
  ];

  const merged = runSeedSync(persistedDevices, seedDevices);

  assert.equal(merged.length, 2);
  const customDevice = merged.find((device) => device.id === "custom-1");
  assert.ok(customDevice, "custom device should be preserved after seed sync");
  assert.equal(customDevice.name, "用户自定义设备");
  assert.equal(customDevice.ownerId, "user-1");
});

test("should add new seed devices to existing database", () => {
  const persistedDevices = [
    createMockDevice({
      id: "seed-existing",
      claimCode: "EXIST001",
      name: "已存在设备",
    }),
  ];

  const seedDevices = [
    createMockDevice({
      id: "seed-existing",
      claimCode: "EXIST001",
      name: "已存在种子设备",
    }),
    createMockDevice({
      id: "seed-new",
      claimCode: "NEWDEV01",
      name: "新增种子设备",
      firmwareVersion: "2.0.0",
    }),
  ];

  const merged = runSeedSync(persistedDevices, seedDevices);
  assert.equal(merged.length, 2);

  const addedSeedDevice = merged.find((device) => device.id === "seed-new");
  assert.ok(addedSeedDevice, "new seed device should be added during sync");
  assert.equal(addedSeedDevice.claimCode, "NEWDEV01");
  assert.equal(addedSeedDevice.name, "新增种子设备");
  assert.equal(addedSeedDevice.firmwareVersion, "2.0.0");
});

test("should backfill missing seed fields", () => {
  const persistedDevices = [
    createMockDevice({
      name: "旧数据库设备",
      config: {
        id: "cfg-1",
      },
    }),
  ];

  const seedDevices = [
    createMockDevice({
      name: "种子设备",
      defaultAddress: "福州三喜燕",
      config: {
        id: "cfg-1",
        payload: {
          powerOn: true,
          controls: [],
        },
      },
    }),
  ];

  const merged = runSeedSync(persistedDevices, seedDevices);
  assert.equal(merged.length, 1);

  assert.equal(merged[0].name, "旧数据库设备");
  assert.equal(merged[0].defaultAddress, "福州三喜燕");
  assert.equal(merged[0].config.id, "cfg-1");
  assert.deepEqual(merged[0].config.payload, {
    powerOn: true,
    controls: [],
  });
});
