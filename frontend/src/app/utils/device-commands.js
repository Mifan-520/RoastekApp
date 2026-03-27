function toModeSeconds(mode) {
  if (!mode || typeof mode !== "object") {
    return { fireSec: 0, closeSec: 0 };
  }

  return {
    fireSec: Math.max(0, Math.round(Number(mode.fireMinutes ?? 0) * 60)),
    closeSec: Math.max(0, Math.round(Number(mode.closeMinutes ?? 0) * 60)),
  };
}

export function buildModeParamsCommandPayload(previousModes, nextModes) {
  if (!Array.isArray(nextModes) || nextModes.length === 0) {
    return null;
  }

  const baselineModes = Array.isArray(previousModes) ? previousModes : [];
  const changedIndex = nextModes.findIndex((nextMode, index) => {
    const prevSeconds = toModeSeconds(baselineModes[index]);
    const nextSeconds = toModeSeconds(nextMode);
    return prevSeconds.fireSec !== nextSeconds.fireSec || prevSeconds.closeSec !== nextSeconds.closeSec;
  });

  if (changedIndex < 0) {
    return null;
  }

  const nextSeconds = toModeSeconds(nextModes[changedIndex]);

  return {
    command: "setTime",
    params: {
      m: changedIndex + 1,
      f: nextSeconds.fireSec,
      c: nextSeconds.closeSec,
    },
  };
}
