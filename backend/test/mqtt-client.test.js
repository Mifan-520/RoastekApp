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
