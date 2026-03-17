import { authRequest } from "./auth";

export interface DeviceGroupRecord {
  id: string;
  name: string;
  deviceIds: string[];
}

async function parseResponse<T>(response: Response) {
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "请求失败");
  }

  return payload as T;
}

export async function getGroups() {
  const response = await authRequest("/groups");
  const payload = await parseResponse<{ groups: DeviceGroupRecord[] }>(response);
  return payload.groups;
}

export async function createGroup(input: { name: string; deviceIds: string[] }) {
  const response = await authRequest("/groups", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const payload = await parseResponse<{ group: DeviceGroupRecord }>(response);
  return payload.group;
}

export async function updateGroup(groupId: string, input: { name: string; deviceIds: string[] }) {
  const response = await authRequest(`/groups/${groupId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  const payload = await parseResponse<{ group: DeviceGroupRecord }>(response);
  return payload.group;
}

export async function deleteGroup(groupId: string) {
  const response = await authRequest(`/groups/${groupId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const payload = await response.json();
    throw new Error(payload.message || "删除分组失败");
  }
}
