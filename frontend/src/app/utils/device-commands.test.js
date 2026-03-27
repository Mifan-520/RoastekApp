import test from "node:test";
import assert from "node:assert/strict";
import { buildModeParamsCommandPayload } from "./device-commands.js";

test("buildModeParamsCommandPayload only emits the changed mode in compact format", () => {
  const previousModes = [
    { fireMinutes: 10, closeMinutes: 3 },
    { fireMinutes: 9.5, closeMinutes: 4 },
    { fireMinutes: 9, closeMinutes: 4 },
    { fireMinutes: 0.25, closeMinutes: 0.25 },
  ];

  const nextModes = [
    { fireMinutes: 7, closeMinutes: 2 },
    { fireMinutes: 9.5, closeMinutes: 4 },
    { fireMinutes: 9, closeMinutes: 4 },
    { fireMinutes: 0.25, closeMinutes: 0.25 },
  ];

  assert.deepEqual(buildModeParamsCommandPayload(previousModes, nextModes), {
    command: "setTime",
    params: { m: 1, f: 420, c: 120 },
  });
});

test("buildModeParamsCommandPayload returns null when no mode changed", () => {
  const modes = [
    { fireMinutes: 10, closeMinutes: 3 },
    { fireMinutes: 9.5, closeMinutes: 4 },
    { fireMinutes: 9, closeMinutes: 4 },
    { fireMinutes: 0.25, closeMinutes: 0.25 },
  ];

  assert.equal(buildModeParamsCommandPayload(modes, modes), null);
});
