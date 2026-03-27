function toFiniteNumber(value, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

export function parseTelemetryTimestampMs(lastTelemetryAt, fallbackMs) {
  if (typeof lastTelemetryAt !== 'string' || lastTelemetryAt.trim() === '') {
    return fallbackMs;
  }

  const parsed = Date.parse(lastTelemetryAt);
  return Number.isFinite(parsed) ? parsed : fallbackMs;
}

function clampProgressPercent(remainingSeconds, totalSeconds) {
  const safeTotal = Math.max(1, toFiniteNumber(totalSeconds, 1));
  const safeRemaining = Math.max(0, toFiniteNumber(remainingSeconds, 0));
  return Math.max(0, Math.min(100, (safeRemaining / safeTotal) * 100));
}

export function buildCountdownDisplayState({
  countMode,
  restSeconds,
  syncedAtMs,
  nowMs,
  fireTotalSeconds,
  closeTotalSeconds,
}) {
  const normalizedCountMode = countMode === 1 || countMode === 2 ? countMode : 0;
  const baseRestSeconds = Math.max(0, toFiniteNumber(restSeconds, 0));
  const fireSecondsTotal = Math.max(0, toFiniteNumber(fireTotalSeconds, 0));
  const closeSecondsTotal = Math.max(0, toFiniteNumber(closeTotalSeconds, 0));
  const elapsedSeconds = normalizedCountMode === 0
    ? 0
    : Math.max(0, (toFiniteNumber(nowMs, syncedAtMs) - toFiniteNumber(syncedAtMs, nowMs)) / 1000);

  let phase = normalizedCountMode;
  let running = normalizedCountMode !== 0;
  let activeSeconds = normalizedCountMode === 0 ? baseRestSeconds : Math.max(0, baseRestSeconds - elapsedSeconds);
  let fireSeconds = fireSecondsTotal;
  let closeSeconds = closeSecondsTotal;

  if (normalizedCountMode === 1) {
    if (elapsedSeconds < baseRestSeconds) {
      phase = 1;
      fireSeconds = activeSeconds;
      closeSeconds = closeSecondsTotal;
    } else {
      const closeElapsedSeconds = elapsedSeconds - baseRestSeconds;
      const remainingCloseSeconds = Math.max(0, closeSecondsTotal - closeElapsedSeconds);

      if (remainingCloseSeconds > 0) {
        phase = 2;
        activeSeconds = remainingCloseSeconds;
        fireSeconds = 0;
        closeSeconds = remainingCloseSeconds;
      } else {
        phase = 0;
        running = false;
        activeSeconds = 0;
        fireSeconds = 0;
        closeSeconds = 0;
      }
    }
  } else if (normalizedCountMode === 2) {
    if (elapsedSeconds < baseRestSeconds) {
      phase = 2;
      closeSeconds = activeSeconds;
      fireSeconds = 0;
    } else {
      phase = 0;
      running = false;
      activeSeconds = 0;
      fireSeconds = 0;
      closeSeconds = 0;
    }
  }

  return {
    phase,
    running,
    activeSeconds,
    fireSeconds,
    closeSeconds,
    fireProgressPercent: clampProgressPercent(fireSeconds, fireTotalSeconds),
    closeProgressPercent: clampProgressPercent(closeSeconds, closeTotalSeconds),
  };
}
