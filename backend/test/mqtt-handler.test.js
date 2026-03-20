import test from "node:test";
import assert from "node:assert/strict";

import { mapTelemetryToPayload } from "../src/mqtt-handler.js";

test("maps catalytic telemetry for the current device type value", () => {
  const payload = mapTelemetryToPayload(
    {
      type: "催化设备",
      config: { payload: { inletTemp: 120, burnerStatus: "off" } },
    },
    {
      inletTemp: 320,
      outletTemp: 180,
      catalystTemp: 260,
      burnerStatus: "on",
    }
  );

  assert.equal(payload.inletTemp, 320);
  assert.equal(payload.outletTemp, 180);
  assert.equal(payload.catalystTemp, 260);
  assert.equal(payload.burnerStatus, "on");
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
      config: { payload: { inletTemp: 120, burnerStatus: "off" } },
    },
    {
      inletTemp: 330,
      outletTemp: 190,
      catalystTemp: 270,
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

  assert.equal(catalyticPayload.inletTemp, 330);
  assert.equal(catalyticPayload.outletTemp, 190);
  assert.equal(catalyticPayload.catalystTemp, 270);
  assert.equal(catalyticPayload.burnerStatus, "off");
  assert.equal(catalyticPayload.purgeStatus, "idle");
  assert.equal(liftPayload.currentFloor, 2);
  assert.equal(liftPayload.targetFloor, 5);
  assert.equal(liftPayload.doorClosed, true);
  assert.equal(liftPayload.operationMode, "manual");
});
