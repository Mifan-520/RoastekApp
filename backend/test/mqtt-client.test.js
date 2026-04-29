import test from 'node:test';
import assert from 'node:assert/strict';

import { formatCommandPayload } from '../src/mqtt-client.js';

test('formatCommandPayload appends newline for DTU line parser', () => {
  const payload = formatCommandPayload({
    command: 'reset',
    params: { mode: 2 },
  });

  assert.equal(payload, '{"command":"reset","params":{"mode":2}}\n');
});

test('formatCommandPayload sends Modbus hex strings without JSON wrapping', () => {
  const payload = formatCommandPayload('0103210000018E36');

  assert.equal(payload, '0103210000018E36\n');
});
