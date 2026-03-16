import { authRequest } from "./auth";

export interface DeviceConfigRecord {
  id: string;
  name: string;
  payload?: {
    chartData: Array<{ name: string; value: number }>;
    switches: { s1: boolean; s2: boolean };
  } | null;
}

export interface DeviceAlarmRecord {
  id: string;
  message: string;
  time: string;
  level: string;
}

export interface DeviceConnectionRecord {
  id: string;
  type: "online" | "offline";
  time: string;
  label: string;
}

export interface DeviceRecord {
  id: string;
  claimCode: string;
  name: string;
  type: string;
  location: string;
  address: string;
  status: "online" | "offline";
  lastActive: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
  boundAt: string | null;
  connectionHistory: DeviceConnectionRecord[];
  alarms: DeviceAlarmRecord[];
  config: DeviceConfigRecord | null;
}

async function parseResponse<T>(response: Response) {
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "请求失败");
  }

  return payload as T;
}

export async function getDevices() {
  const response = await authRequest("/devices");
  const payload = await parseResponse<{ devices: DeviceRecord[] }>(response);
  return payload.devices;
}

export async function claimDevice(input: { claimCode: string; name: string; address: string }) {
  const response = await authRequest("/devices/claim", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const payload = await parseResponse<{ device: DeviceRecord }>(response);
  return payload.device;
}

export async function updateDevice(deviceId: string, input: { name: string; address: string }) {
  const response = await authRequest(`/devices/${deviceId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  const payload = await parseResponse<{ device: DeviceRecord }>(response);
  return payload.device;
}

export async function deleteDevice(deviceId: string) {
  const response = await authRequest(`/devices/${deviceId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const payload = await response.json();
    throw new Error(payload.message || "删除设备失败");
  }
}

export async function getDevice(deviceId: string) {
  const response = await authRequest(`/devices/${deviceId}`);
  const payload = await parseResponse<{ device: DeviceRecord }>(response);
  return payload.device;
}

export async function getDeviceConfig(deviceId: string) {
  const response = await authRequest(`/devices/${deviceId}/config`);
  const payload = await parseResponse<{ config: DeviceConfigRecord | null }>(response);
  return payload.config;
}

export async function updateDeviceConfig(deviceId: string, input: { name: string }) {
  const response = await authRequest(`/devices/${deviceId}/config`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  const payload = await parseResponse<{ config: DeviceConfigRecord }>(response);
  return payload.config;
}

export async function deleteAlarm(deviceId: string, alarmId: string) {
  const response = await authRequest(`/devices/${deviceId}/alarms/${alarmId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const payload = await response.json();
    throw new Error(payload.message || "删除报警失败");
  }
}
