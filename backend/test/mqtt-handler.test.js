import test from "node:test";
import assert from "node:assert/strict";

import { createMqttMessageHandler, mapTelemetryToPayload } from "../src/mqtt-handler.js";

test("maps catalytic telemetry to HMI payload fields", () => {
  const payload = mapTelemetryToPayload(
    {
      type: "催化设备",
      config: {
        payload: {
          summary: [],
          chart: { title: "test", data: [] },
          controls: [{ id: "power", active: false, label: "总电源", description: "已停止", icon: "power", tone: "rose" }],
          temperature: 25.6,
          modes: [{ fireMinutes: 5, closeMinutes: 3 }],
          currentMode: 1,
          countMode: 0,
          restSeconds: 0,
        },
      },
    },
    {
      temperature: 14.4,
      mode: 2,
      countMode: 1,
      restSeconds: 529,
      m1f: 540,
      m1c: 180,
      m2f: 570,
      m2c: 240,
      m3f: 540,
      m3c: 240,
      m4f: 15,
      m4c: 15,
    }
  );

  assert.equal(payload.temperature, 14.4);
  assert.equal(payload.currentMode, 2);
  assert.equal(payload.countMode, 1);
  assert.equal(payload.restSeconds, 529);
  assert.deepEqual(payload.modes, [
    { fireMinutes: 9, closeMinutes: 3 },
    { fireMinutes: 9.5, closeMinutes: 4 },
    { fireMinutes: 9, closeMinutes: 4 },
    { fireMinutes: 0.25, closeMinutes: 0.25 },
  ]);
  assert.equal(payload.powerOn, true);
  assert.equal(payload.controls?.[0]?.active, true);
  assert.equal(typeof payload.lastTelemetryAt, "string");
});

test("maps lift telemetry for the current conveyor device type value", () => {
  const payload = mapTelemetryToPayload(
    {
      type: "输送设备",
      config: { payload: { currentFloor: 1, emergencyStop: false } },
    },
    {
      currentFloor: 3,
      targetFloor: 4,
      emergencyStop: true,
    }
  );

  assert.equal(payload.currentFloor, 3);
  assert.equal(payload.targetFloor, 4);
  assert.equal(payload.emergencyStop, true);
  assert.equal(typeof payload.lastTelemetryAt, "string");
});

test("maps telemetry when deviceType uses display names instead of type ids", () => {
  const catalyticPayload = mapTelemetryToPayload(
    {
      type: "三元催化",
      config: { payload: { temperature: 25.6, countMode: 0, restSeconds: 0 } },
    },
    {
      temperature: 13.8,
      mode: 1,
      countMode: 0,
      restSeconds: 0,
      m1f: 300,
      m1c: 180,
      m2f: 300,
      m2c: 180,
      m3f: 300,
      m3c: 180,
      m4f: 300,
      m4c: 180,
    }
  );

  const liftPayload = mapTelemetryToPayload(
    {
      type: "Z字梯",
      config: { payload: { currentFloor: 1, emergencyStop: false } },
    },
      {
        currentFloor: 2,
        targetFloor: 5,
      }
  );

  assert.equal(catalyticPayload.temperature, 13.8);
  assert.equal(catalyticPayload.currentMode, 1);
  assert.equal(catalyticPayload.countMode, 0);
  assert.equal(catalyticPayload.restSeconds, 0);
  assert.equal(catalyticPayload.powerOn, false);
  assert.equal(liftPayload.currentFloor, 2);
  assert.equal(liftPayload.targetFloor, 5);
  assert.equal(liftPayload.doorClosed, true);
  assert.equal(liftPayload.operationMode, "manual");
});

test("handleMqttMessage syncs updated devices back to app memory", async () => {
  const initialDevices = [
    {
      id: "dev-catalytic-001",
      type: "三元催化",
      status: "offline",
      config: {
        payload: {
          summary: [
            { id: "temperature", value: "320", unit: "°C" },
          ],
          controls: [{ id: "power", active: false, label: "总电源", description: "已停止", icon: "power", tone: "rose" }],
          countdowns: [{ id: "fire", value: 300 }, { id: "close", value: 180 }],
          temperature: 25.6,
          countMode: 0,
          restSeconds: 0,
        },
      },
    },
  ];

  const savedSnapshots = [];
  const syncedSnapshots = [];

  const handleMqttMessage = createMqttMessageHandler({
    loadDevices: async () => structuredClone(initialDevices),
    saveDevices: async (devices) => {
      savedSnapshots.push(structuredClone(devices));
    },
    onDevicesUpdated: async (devices) => {
      syncedSnapshots.push(structuredClone(devices));
    },
  });

  await handleMqttMessage("devices/dev-catalytic-001/telemetry", {
    temperature: 14.4,
    mode: 1,
    countMode: 1,
    restSeconds: 529,
    m1f: 540,
    m1c: 180,
    m2f: 570,
    m2c: 240,
    m3f: 540,
    m3c: 240,
    m4f: 15,
    m4c: 15,
  });

  assert.equal(savedSnapshots.length, 1);
  assert.equal(syncedSnapshots.length, 1);
  assert.equal(savedSnapshots[0][0].config.payload.temperature, 14.4);
  assert.equal(savedSnapshots[0][0].config.payload.currentMode, 1);
  assert.equal(savedSnapshots[0][0].config.payload.countMode, 1);
  assert.equal(savedSnapshots[0][0].config.payload.restSeconds, 529);
  assert.equal(savedSnapshots[0][0].lastActive !== null, true);
  assert.deepEqual(syncedSnapshots[0], savedSnapshots[0]);
});
