import { DeviceRecord } from '../services/devices';

export function getVisibleDeviceAlarms(devices: DeviceRecord[]) {
  return devices
    .flatMap((device) =>
      (device.alarms || []).map((alarm) => ({
        ...alarm,
        deviceId: device.id,
        deviceName: device.name,
      }))
    )
    .sort((left, right) => new Date(right.time).getTime() - new Date(left.time).getTime());
}

export function getVisibleSyncAlarms(devices: DeviceRecord[]) {
  return getVisibleDeviceAlarms(devices)
    .filter((alarm) => String(alarm.id || "").startsWith("sync-"));
}
