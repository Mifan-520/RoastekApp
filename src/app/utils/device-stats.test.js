import test from "node:test";
import assert from "node:assert/strict";
import { getDeviceStatsSummary } from "./device-stats.js";

test("shows placeholder counts while the first device list request is still loading", () => {
  assert.deepEqual(getDeviceStatsSummary([], { isPendingInitialLoad: true, hasError: false }), {
    onlineCountLabel: "--",
    totalCountLabel: "--",
    isPendingInitialLoad: true,
  });
});

test("shows real counts once device data has loaded", () => {
  assert.deepEqual(
    getDeviceStatsSummary(
      [
        { id: "dev-001", status: "online" },
        { id: "dev-002", status: "offline" },
        { id: "dev-003", status: "online" },
      ],
      { isPendingInitialLoad: false, hasError: false }
    ),
    {
      onlineCountLabel: "2",
      totalCountLabel: "3",
      isPendingInitialLoad: false,
    }
  );
});

test("shows 0/0 when the first request finishes successfully with no devices", () => {
  assert.deepEqual(getDeviceStatsSummary([], { isPendingInitialLoad: false, hasError: false }), {
    onlineCountLabel: "0",
    totalCountLabel: "0",
    isPendingInitialLoad: false,
  });
});

test("keeps placeholder counts when the first request fails and no devices are available", () => {
  assert.deepEqual(getDeviceStatsSummary([], { isPendingInitialLoad: false, hasError: true }), {
    onlineCountLabel: "--",
    totalCountLabel: "--",
    isPendingInitialLoad: false,
  });
});
