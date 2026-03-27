import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCountdownDisplayState } from './countdown.js';

test('counts down smoothly between telemetry updates', () => {
  const result = buildCountdownDisplayState({
    countMode: 1,
    restSeconds: 529,
    syncedAtMs: 1000,
    nowMs: 5000,
    fireTotalSeconds: 600,
    closeTotalSeconds: 180,
  });

  assert.equal(result.running, true);
  assert.equal(result.activeSeconds, 525);
  assert.equal(result.fireSeconds, 525);
  assert.equal(result.closeSeconds, 180);
  assert.ok(result.fireProgressPercent > 87 && result.fireProgressPercent < 88);
});

test('stays idle when telemetry says countdown is stopped', () => {
  const result = buildCountdownDisplayState({
    countMode: 0,
    restSeconds: 260,
    syncedAtMs: 1000,
    nowMs: 15000,
    fireTotalSeconds: 600,
    closeTotalSeconds: 180,
  });

  assert.equal(result.running, false);
  assert.equal(result.activeSeconds, 260);
  assert.equal(result.fireSeconds, 600);
  assert.equal(result.closeSeconds, 180);
  assert.equal(result.fireProgressPercent, 100);
  assert.equal(result.closeProgressPercent, 100);
});

test('switches from fire countdown to close countdown locally after fire reaches zero', () => {
  const result = buildCountdownDisplayState({
    countMode: 1,
    restSeconds: 2,
    syncedAtMs: 1000,
    nowMs: 4500,
    fireTotalSeconds: 10,
    closeTotalSeconds: 6,
  });

  assert.equal(result.running, true);
  assert.equal(result.phase, 2);
  assert.equal(result.activeSeconds, 4.5);
  assert.equal(result.fireSeconds, 0);
  assert.equal(result.closeSeconds, 4.5);
  assert.equal(result.fireProgressPercent, 0);
  assert.equal(result.closeProgressPercent, 75);
});
