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

function runSeedSyncWithMigrations(persistedDevices, seedDevices) {
  assert.equal(
    typeof storage.syncSeedDevicesWithMigrations,
    "function",
    "storage.syncSeedDevicesWithMigrations should be implemented"
  );

  return storage.syncSeedDevicesWithMigrations({
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

test("should migrate fan unknown placeholder status to offline", () => {
  for (const fan of [
    { id: "LY-001", claimCode: "LYFAN001", configId: "config-ly" },
    { id: "CQ-001", claimCode: "CQFAN001", configId: "config-cq" },
  ]) {
    const result = runSeedSyncWithMigrations(
      [
        createMockDevice({
          id: fan.id,
          claimCode: fan.claimCode,
          config: {
            id: fan.configId,
            payload: {
              runningFreq: 0,
              status: "unknown",
              statusText: "未知状态",
              statusTone: "slate",
              summary: [
                { id: "freq", label: "运行频率", value: "0.00", unit: "Hz", tone: "amber" },
                { id: "status", label: "运行状态", value: "未知状态", tone: "slate" },
              ],
            },
          },
        }),
      ],
      [
        createMockDevice({
          id: fan.id,
          claimCode: fan.claimCode,
          config: {
            id: fan.configId,
            payload: {
              runningFreq: 0,
              status: "offline",
              statusText: "离线",
              statusTone: "slate",
              summary: [
                { id: "freq", label: "运行频率", value: "0.00", unit: "Hz", tone: "amber" },
                { id: "status", label: "运行状态", value: "离线", tone: "slate" },
              ],
            },
          },
        }),
      ],
    );

    assert.equal(result.devices[0].config.payload.status, "offline");
    assert.equal(result.devices[0].config.payload.statusText, "离线");
    assert.equal(result.devices[0].config.payload.summary[1].value, "离线");
  }
});

test("should collapse legacy claimed devices into canonical seed ids by claim code", () => {
  const persistedDevices = [
    createMockDevice({
      id: "SY-001",
      claimCode: "CATALYT1",
      updatedAt: "2026-03-20T00:00:00.000Z",
      config: {
        id: "config-sy",
        payload: { temperature: 20 },
      },
    }),
    createMockDevice({
      id: "dev-catalytic-001",
      claimCode: "CATALYT1",
      name: "旧认领催化设备",
      updatedAt: "2026-03-26T02:00:00.000Z",
      lastSeenAt: "2026-03-26T02:00:00.000Z",
      config: {
        id: "config-catalytic",
        payload: { temperature: 14.4, currentMode: 1 },
      },
    }),
  ];

  const seedDevices = [
    createMockDevice({
      id: "SY-001",
      claimCode: "CATALYT1",
      name: "三元催化",
      config: {
        id: "config-sy",
        payload: { temperature: 0 },
      },
    }),
  ];

  const result = runSeedSyncWithMigrations(persistedDevices, seedDevices);

  assert.equal(result.devices.length, 1);
  assert.deepEqual(result.deviceIdMap, {
    "dev-catalytic-001": "SY-001",
  });
  assert.equal(result.devices[0].id, "SY-001");
  assert.equal(result.devices[0].name, "旧认领催化设备");
  assert.equal(result.devices[0].config.id, "config-sy");
  assert.deepEqual(result.devices[0].config.payload, { temperature: 14.4, currentMode: 1 });
});

test("should remap legacy group device ids to canonical seed ids", () => {
  assert.equal(typeof storage.remapGroupDeviceIds, "function");

  const groups = [
    {
      id: "group-1",
      userId: "user-1",
      name: "默认组",
      deviceIds: ["dev-catalytic-001", "SY-001", "dev-bean-001"],
    },
  ];

  const remapped = storage.remapGroupDeviceIds(groups, {
    "dev-catalytic-001": "SY-001",
    "dev-bean-001": "SD-001",
  });

  assert.deepEqual(remapped, [
    {
      id: "group-1",
      userId: "user-1",
      name: "默认组",
      deviceIds: ["SY-001", "SD-001"],
    },
  ]);
});
