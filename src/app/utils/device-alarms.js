export function getVisibleDeviceAlarms(devices) {
  return devices.flatMap((device) =>
    (device.alarms || []).map((alarm) => ({
      ...alarm,
      deviceId: device.id,
      deviceName: device.name,
    }))
  );
}
