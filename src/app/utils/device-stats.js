export function getDeviceStatsSummary(devices, options = {}) {
  const { isPendingInitialLoad = false, hasError = false } = options;

  if (isPendingInitialLoad || (hasError && devices.length === 0)) {
    return {
      onlineCountLabel: "--",
      totalCountLabel: "--",
      isPendingInitialLoad,
    };
  }

  return {
    onlineCountLabel: String(devices.filter((device) => device.status === "online").length),
    totalCountLabel: String(devices.length),
    isPendingInitialLoad,
  };
}
