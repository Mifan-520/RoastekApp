import { DeviceRecord } from '../services/devices';

export function getVisibleDeviceAlarms(devices: DeviceRecord[]) {
  return devices.flatMap((device) =>
    (device.alarms || []).map((alarm) => ({
      ...alarm,
      deviceId: device.id,
      deviceName: device.name,
    }))
  );
}
