import test from "node:test";
import assert from "node:assert/strict";
import { getVisibleDeviceAlarms } from "./device-alarms.js";

test("collects alarms only from devices that are already in the current device list", () => {
  const alarms = getVisibleDeviceAlarms([
    {
      id: "dev-001",
      name: "智能温室节点A1",
      alarms: [
        { id: "al-1", message: "温度偏高", time: "03-12 15:00" },
        { id: "al-2", message: "湿度偏低", time: "03-12 15:08" },
      ],
    },
    {
      id: "dev-002",
      name: "水泵控制终端",
      alarms: [],
    },
  ]);

  assert.deepEqual(alarms, [
    {
      id: "al-1",
      message: "温度偏高",
      time: "03-12 15:00",
      deviceId: "dev-001",
      deviceName: "智能温室节点A1",
    },
    {
      id: "al-2",
      message: "湿度偏低",
      time: "03-12 15:08",
      deviceId: "dev-001",
      deviceName: "智能温室节点A1",
    },
  ]);
});
