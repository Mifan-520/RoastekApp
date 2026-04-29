import test from "node:test";
import assert from "node:assert/strict";

import {
  buildReadCommand,
  consumeExpectedResponse,
  mapStatusWord,
  parseResponse,
  recordExpectedResponse,
  startPolling,
  stopPolling,
} from "../src/modbus-poller.js";

test("buildReadCommand creates Modbus RTU read frames with CRC16", () => {
  assert.equal(buildReadCommand(0x01, 0x2100, 1), "0103210000018E36");
  assert.equal(buildReadCommand(0x01, 0x3000, 1), "0103300000018B0A");
});

test("parseResponse validates CRC and returns register values", () => {
  assert.deepEqual(parseResponse("01030211D7F44A"), {
    slaveAddr: 1,
    functionCode: 3,
    values: [4567],
  });

  assert.throws(
    () => parseResponse("01030211D7FFFF"),
    /CRC/,
  );
});

test("mapStatusWord maps Goodrive270 status words", () => {
  assert.deepEqual(mapStatusWord(0x0001), {
    status: "forward",
    statusText: "正转运行",
    statusTone: "emerald",
  });
  assert.deepEqual(mapStatusWord(0x0004), {
    status: "fault",
    statusText: "故障",
    statusTone: "rose",
  });
});

test("startPolling publishes status and frequency commands in order", () => {
  const published = [];
  const intervals = [];
  const timeouts = [];

  startPolling(
    "LY-001",
    (deviceId, command) => {
      published.push({ deviceId, command });
    },
    {
      setIntervalFn: (fn, delay) => {
        intervals.push({ fn, delay });
        return { type: "interval" };
      },
      clearIntervalFn: () => {},
      setTimeoutFn: (fn, delay) => {
        timeouts.push({ fn, delay });
        fn();
        return { type: "timeout" };
      },
      clearTimeoutFn: () => {},
    },
  );

  assert.deepEqual(published, [
    { deviceId: "LY-001", command: "0103210000018E36" },
    { deviceId: "LY-001", command: "0103300000018B0A" },
  ]);
  assert.equal(timeouts[0].delay, 500);
  assert.equal(intervals[0].delay, 5000);
  assert.equal(consumeExpectedResponse("LY-001"), 0x2100);
  assert.equal(consumeExpectedResponse("LY-001"), 0x3000);

  stopPolling("LY-001");
});

test("records expected Modbus response registers per device", () => {
  recordExpectedResponse("LY-001", 0x2100);
  recordExpectedResponse("LY-001", 0x3000);

  assert.equal(consumeExpectedResponse("LY-001"), 0x2100);
  assert.equal(consumeExpectedResponse("LY-001"), 0x3000);
  assert.equal(consumeExpectedResponse("LY-001"), null);
});
