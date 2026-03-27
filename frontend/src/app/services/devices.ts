import { authRequest } from "./auth";

export interface DeviceConfigRecord {
  id: string;
  name: string;
  payload?: DeviceUiPayload | null;
}

export interface DeviceUiSummaryItem {
  id: string;
  label: string;
  value: string;
  unit?: string;
  tone?: "rose" | "amber";
}

export interface DeviceUiChartItem {
  label: string;
  value: number;
  color?: string;
}

export interface DeviceUiControlItem {
  id: string;
  label: string;
  description: string;
  icon?: "fan" | "power" | "gauge";
  active: boolean;
  tone?: "rose" | "amber";
}

export interface DeviceUiCountdownItem {
  id: string;
  label: string;
  value: number;  // 秒数
  editable?: boolean;
}

export interface DeviceUiPayload {
  summary: DeviceUiSummaryItem[];
  chart: {
    title: string;
    data: DeviceUiChartItem[];
  };
  controls: DeviceUiControlItem[];
  countdowns?: DeviceUiCountdownItem[];
  modes?: Array<{ fireMinutes: number; closeMinutes: number }>;
  temperature?: number;
  powerOn?: boolean;
  currentMode?: number;
  countMode?: 0 | 1 | 2;
  restSeconds?: number;
  lastTelemetryAt?: string;
  equipment?: Array<{ id: string; name: string; status: "online" | "offline" }>;
  bins?: Array<{ id: number; weight: number; maxWeight: number }>;
  frequency?: { current: number; target: number };
}

export interface DeviceCommandRequest {
  command: string;
  params?: Record<string, unknown>;
}

export interface DeviceSyncExpectedStateRecord {
  currentMode: number;
  countMode: number;
  baseRestSeconds: number;
  closeSeconds?: number;
  modes?: Array<{ fireMinutes: number; closeMinutes: number }>;
  updatedAt: string;
  sourceCommand: string;
  toleranceSeconds: number;
}

export interface DeviceSyncTelemetryStateRecord {
  currentMode: number;
  countMode: number;
  restSeconds: number;
  modes?: Array<{ fireMinutes: number; closeMinutes: number }>;
  lastTelemetryAt?: string;
}

export interface DeviceSyncStateRecord {
  status: "idle" | "pending" | "matched" | "warning";
  lastCheckedAt?: string;
  lastCommand?: {
    command: string;
    params: Record<string, unknown>;
    issuedAt: string;
  };
  expected?: DeviceSyncExpectedStateRecord;
  telemetry?: DeviceSyncTelemetryStateRecord;
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
  syncState: DeviceSyncStateRecord | null;
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

export async function updateDeviceConfigPayload(deviceId: string, payload: DeviceUiPayload) {
  const response = await authRequest(`/devices/${deviceId}/config`, {
    method: "PATCH",
    body: JSON.stringify({ payload }),
  });
  const result = await parseResponse<{ config: DeviceConfigRecord }>(response);
  return result.config;
}

export async function sendDeviceCommand(deviceId: string, command: DeviceCommandRequest) {
  const response = await authRequest(`/devices/${deviceId}/command`, {
    method: "POST",
    body: JSON.stringify(command),
  });
  const payload = await parseResponse<{
    ok: boolean;
    deviceId: string;
    command: DeviceCommandRequest;
    device: DeviceRecord;
    config: DeviceConfigRecord | null;
  }>(response);
  return payload;
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
