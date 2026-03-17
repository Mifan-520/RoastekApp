import cors from "cors";
import { randomUUID } from "node:crypto";
import express from "express";
import { config } from "./config.js";
import { createSeedUsers } from "./data/users.js";
import {
  checkStorageHealth,
  loadDevices,
  loadGroups,
  loadUsers,
  saveDevices,
  saveGroups,
  saveUsers,
} from "./storage.js";

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

export function formatShanghaiIso(date = new Date()) {
  const adjusted = new Date(date.getTime() + SHANGHAI_OFFSET_MS);
  return `${adjusted.toISOString().slice(0, 19)}+08:00`;
}

function normalizeOptionalTimestamp(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed || trimmed === "-") {
    return null;
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return formatShanghaiIso(parsed);
}

function normalizeRequiredTimestamp(value) {
  return normalizeOptionalTimestamp(value) ?? String(value || "");
}

export function resolveDeviceLastActive(device) {
  return (
    normalizeOptionalTimestamp(device.lastSeenAt)
    ?? normalizeOptionalTimestamp(device.lastActive)
    ?? normalizeOptionalTimestamp(device.updatedAt)
  );
}

function serializeUser(user) {
  return {
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    roleLabel: user.roleLabel,
  };
}

function serializeDevice(device) {
  return {
    id: device.id,
    claimCode: device.claimCode,
    name: device.name,
    type: device.type,
    location: device.location,
    address: device.address,
    status: device.status,
    lastActive: resolveDeviceLastActive(device),
    lastSeenAt: normalizeOptionalTimestamp(device.lastSeenAt),
    createdAt: normalizeRequiredTimestamp(device.createdAt),
    updatedAt: normalizeRequiredTimestamp(device.updatedAt),
    boundAt: normalizeOptionalTimestamp(device.boundAt),
    connectionHistory: device.connectionHistory || [],
    alarms: device.alarms || [],
    config: device.config ? { ...device.config } : null,
  };
}

function nowIso() {
  return formatShanghaiIso(new Date());
}

function resetDevice(device) {
  const timestamp = nowIso();
  device.ownerId = null;
  device.name = device.defaultName;
  device.type = device.defaultType;
  device.location = device.defaultLocation;
  device.address = device.defaultAddress;
  device.lastActive = null;
  device.lastSeenAt = null;
  device.config = null;
  device.updatedAt = timestamp;
  device.boundAt = null;
}

function normalizeClaimCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function serializeGroup(group) {
  return {
    id: group.id,
    name: group.name,
    deviceIds: [...group.deviceIds],
  };
}

export async function createApp(options = {}) {
  const app = express();
  const loadDevicesFn = options.loadDevices ?? loadDevices;
  const saveDevicesFn = options.saveDevices ?? saveDevices;
  const loadUsersFn = options.loadUsers ?? loadUsers;
  const saveUsersFn = options.saveUsers ?? saveUsers;
  const loadGroupsFn = options.loadGroups ?? loadGroups;
  const saveGroupsFn = options.saveGroups ?? saveGroups;
  const checkStorageHealthFn = options.checkStorageHealth ?? checkStorageHealth;
  let devices = await loadDevicesFn();
  let users = await loadUsersFn();
  let groups = await loadGroupsFn();
  if (!Array.isArray(users) || users.length === 0) {
    users = createSeedUsers(config);
  }
  if (!Array.isArray(groups)) {
    groups = [];
  }

  const tokenToUserId = new Map();

  async function persistDevices(nextDevices, res) {
    try {
      await saveDevicesFn(nextDevices);
      devices = nextDevices;
      return true;
    } catch (error) {
      console.error("[Storage] Failed to persist devices:", error.message);
      res.status(500).json({ message: "设备状态保存失败" });
      return false;
    }
  }

  async function persistUsers(nextUsers, res) {
    try {
      await saveUsersFn(nextUsers);
      users = nextUsers;
      return true;
    } catch (error) {
      console.error("[Storage] Failed to persist users:", error.message);
      res.status(500).json({ message: "账户信息保存失败" });
      return false;
    }
  }

  async function persistGroups(nextGroups, res) {
    try {
      await saveGroupsFn(nextGroups);
      groups = nextGroups;
      return true;
    } catch (error) {
      console.error("[Storage] Failed to persist groups:", error.message);
      res.status(500).json({ message: "分组信息保存失败" });
      return false;
    }
  }

  function issueToken(userId) {
    const token = `token-${randomUUID()}`;
    tokenToUserId.set(token, userId);
    return token;
  }

  function invalidateTokensForUser(userId) {
    for (const [token, mappedUserId] of tokenToUserId.entries()) {
      if (mappedUserId === userId) {
        tokenToUserId.delete(token);
      }
    }
  }

  function getUserByToken(token) {
    const userId = tokenToUserId.get(token);
    return users.find((user) => user.id === userId) || null;
  }

  function requireAuth(req, res, next) {
    const authorization = req.headers.authorization || "";
    const token = authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : "";
    const user = getUserByToken(token);

    if (!user) {
      res.status(401).json({ message: "未登录或登录已失效" });
      return;
    }

    req.user = user;
    req.authToken = token;
    next();
  }

  function getOwnedDeviceIndex(req) {
    return devices.findIndex((item) => item.id === req.params.id && item.ownerId === req.user.id);
  }

  function getOwnedDevice(req, res) {
    const deviceIndex = getOwnedDeviceIndex(req);

    if (deviceIndex === -1) {
      res.status(404).json({ message: "设备不存在" });
      return null;
    }

    return {
      index: deviceIndex,
      device: devices[deviceIndex],
    };
  }

  function getUserIndex(userId) {
    return users.findIndex((item) => item.id === userId);
  }

  function getUserIndexOrUnauthorized(req, res) {
    const userIndex = getUserIndex(req.user.id);

    if (userIndex === -1) {
      res.status(401).json({ message: "未登录或登录已失效" });
      return null;
    }

    return userIndex;
  }

  function getOwnedGroups(userId) {
    return groups.filter((group) => group.userId === userId);
  }

  function getOwnedGroupIndex(req) {
    return groups.findIndex((group) => group.id === req.params.groupId && group.userId === req.user.id);
  }

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.frontendOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("CORS origin not allowed"));
      },
      credentials: false,
    })
  );
  app.use(express.json());

  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/readyz", async (_req, res) => {
    try {
      const healthy = await checkStorageHealthFn();

      if (!healthy) {
        throw new Error("storage unavailable");
      }

      res.json({ status: "ok", storage: "ok" });
    } catch (error) {
      console.error("[Health] Readiness check failed:", error.message);
      res.status(503).json({ status: "error", storage: "unavailable" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body ?? {};
    const user = users.find((item) => item.username === username && item.password === password);

    if (user) {
      res.json({
        token: issueToken(user.id),
        user: serializeUser(user),
      });
      return;
    }

    res.status(401).json({
      message: "用户名或密码错误",
    });
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    res.json({ user: serializeUser(req.user) });
  });

  app.patch("/api/auth/profile", requireAuth, async (req, res) => {
    const displayName = String(req.body?.displayName || "").trim();

    if (!displayName) {
      res.status(400).json({ message: "显示名称不能为空" });
      return;
    }

    const userIndex = getUserIndexOrUnauthorized(req, res);

    if (userIndex === null) {
      return;
    }

    const nextUsers = structuredClone(users);
    nextUsers[userIndex].displayName = displayName;
    const persisted = await persistUsers(nextUsers, res);

    if (!persisted) {
      return;
    }

    res.json({ user: serializeUser(nextUsers[userIndex]) });
  });

  app.patch("/api/auth/password", requireAuth, async (req, res) => {
    const oldPassword = String(req.body?.oldPassword || req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");

    const userIndex = getUserIndexOrUnauthorized(req, res);

    if (userIndex === null) {
      return;
    }

    const currentUser = users[userIndex];

    if (!oldPassword || !newPassword) {
      res.status(400).json({ message: "旧密码和新密码不能为空" });
      return;
    }

    if (currentUser.password !== oldPassword) {
      res.status(400).json({ message: "旧密码不正确" });
      return;
    }

    const nextUsers = structuredClone(users);
    nextUsers[userIndex].password = newPassword;
    const persisted = await persistUsers(nextUsers, res);

    if (!persisted) {
      return;
    }

    invalidateTokensForUser(currentUser.id);
    res.status(204).send();
  });

  app.post("/api/auth/logout", requireAuth, (req, res) => {
    tokenToUserId.delete(req.authToken);
    res.status(204).send();
  });

  app.get("/api/devices", requireAuth, (req, res) => {
    const ownedDevices = devices
      .filter((device) => device.ownerId === req.user.id)
      .map(serializeDevice);

    res.json({ devices: ownedDevices });
  });

  app.get("/api/groups", requireAuth, (req, res) => {
    const ownedDeviceIds = new Set(
      devices
        .filter((device) => device.ownerId === req.user.id)
        .map((device) => device.id)
    );

    const ownedGroups = getOwnedGroups(req.user.id).map((group) => ({
      ...group,
      deviceIds: group.deviceIds.filter((deviceId) => ownedDeviceIds.has(deviceId)),
    }));

    res.json({ groups: ownedGroups.map(serializeGroup) });
  });

  app.post("/api/groups", requireAuth, async (req, res) => {
    const name = String(req.body?.name || "").trim();
    const inputDeviceIds = Array.isArray(req.body?.deviceIds) ? req.body.deviceIds : [];
    const deviceIds = [...new Set(inputDeviceIds.filter((item) => typeof item === "string"))];

    if (!name) {
      res.status(400).json({ message: "分组名称不能为空" });
      return;
    }

    if (deviceIds.length === 0) {
      res.status(400).json({ message: "分组至少选择一个设备" });
      return;
    }

    const ownedDeviceIds = new Set(
      devices
        .filter((device) => device.ownerId === req.user.id)
        .map((device) => device.id)
    );

    if (deviceIds.some((deviceId) => !ownedDeviceIds.has(deviceId))) {
      res.status(400).json({ message: "分组中包含无权限设备" });
      return;
    }

    const nextGroups = structuredClone(groups);
    const nextGroup = {
      id: `group-${randomUUID()}`,
      userId: req.user.id,
      name,
      deviceIds,
    };
    nextGroups.push(nextGroup);

    const persisted = await persistGroups(nextGroups, res);

    if (!persisted) {
      return;
    }

    res.status(201).json({ group: serializeGroup(nextGroup) });
  });

  app.patch("/api/groups/:groupId", requireAuth, async (req, res) => {
    const groupIndex = getOwnedGroupIndex(req);

    if (groupIndex === -1) {
      res.status(404).json({ message: "分组不存在" });
      return;
    }

    const name = String(req.body?.name || "").trim();
    const inputDeviceIds = Array.isArray(req.body?.deviceIds) ? req.body.deviceIds : [];
    const deviceIds = [...new Set(inputDeviceIds.filter((item) => typeof item === "string"))];

    if (!name) {
      res.status(400).json({ message: "分组名称不能为空" });
      return;
    }

    if (deviceIds.length === 0) {
      res.status(400).json({ message: "分组至少选择一个设备" });
      return;
    }

    const ownedDeviceIds = new Set(
      devices
        .filter((device) => device.ownerId === req.user.id)
        .map((device) => device.id)
    );

    if (deviceIds.some((deviceId) => !ownedDeviceIds.has(deviceId))) {
      res.status(400).json({ message: "分组中包含无权限设备" });
      return;
    }

    const nextGroups = structuredClone(groups);
    nextGroups[groupIndex].name = name;
    nextGroups[groupIndex].deviceIds = deviceIds;
    const persisted = await persistGroups(nextGroups, res);

    if (!persisted) {
      return;
    }

    res.json({ group: serializeGroup(nextGroups[groupIndex]) });
  });

  app.delete("/api/groups/:groupId", requireAuth, async (req, res) => {
    const groupIndex = getOwnedGroupIndex(req);

    if (groupIndex === -1) {
      res.status(404).json({ message: "分组不存在" });
      return;
    }

    const nextGroups = structuredClone(groups);
    nextGroups.splice(groupIndex, 1);
    const persisted = await persistGroups(nextGroups, res);

    if (!persisted) {
      return;
    }

    res.status(204).send();
  });

  app.post("/api/devices/claim", requireAuth, async (req, res) => {
    const claimCode = normalizeClaimCode(req.body?.claimCode);
    const name = String(req.body?.name || "").trim();
    const address = String(req.body?.address || "").trim();

    if (!/^[A-Z0-9]{8}$/.test(claimCode)) {
      res.status(400).json({ message: "设备码格式不正确" });
      return;
    }

    if (!name) {
      res.status(400).json({ message: "设备名称不能为空" });
      return;
    }

    const deviceIndex = devices.findIndex((item) => item.claimCode === claimCode);

    if (deviceIndex === -1) {
      res.status(404).json({ message: "设备码不存在" });
      return;
    }

    const device = devices[deviceIndex];

    if (device.ownerId) {
      res.status(409).json({ message: "该设备已被绑定" });
      return;
    }

    const nextDevices = structuredClone(devices);
    const nextDevice = nextDevices[deviceIndex];
    nextDevice.ownerId = req.user.id;
    nextDevice.name = name;
    nextDevice.address = address || nextDevice.defaultAddress;
    nextDevice.boundAt = nowIso();
    nextDevice.updatedAt = nextDevice.boundAt;
    const persisted = await persistDevices(nextDevices, res);

    if (!persisted) {
      return;
    }

    res.status(201).json({ device: serializeDevice(nextDevice) });
  });

  app.get("/api/devices/:id", requireAuth, (req, res) => {
    const ownedDevice = getOwnedDevice(req, res);

    if (!ownedDevice) {
      return;
    }

    res.json({ device: serializeDevice(ownedDevice.device) });
  });

  app.patch("/api/devices/:id", requireAuth, async (req, res) => {
    const ownedDevice = getOwnedDevice(req, res);

    if (!ownedDevice) {
      return;
    }

    const name = String(req.body?.name || "").trim();
    const type = String(req.body?.type || "").trim();
    const location = String(req.body?.location || "").trim();
    const address = String(req.body?.address || "").trim();

    const nextLocation = location || ownedDevice.device.location;

    if (!name || !nextLocation) {
      res.status(400).json({ message: "设备名称和位置不能为空" });
      return;
    }

    const nextDevices = structuredClone(devices);
    const nextDevice = nextDevices[ownedDevice.index];
    nextDevice.name = name;
    if (type) nextDevice.type = type;
    nextDevice.location = nextLocation;
    nextDevice.address = address || nextDevice.address;
    nextDevice.updatedAt = nowIso();
    const persisted = await persistDevices(nextDevices, res);

    if (!persisted) {
      return;
    }

    res.json({ device: serializeDevice(nextDevice) });
  });

  app.delete("/api/devices/:id", requireAuth, async (req, res) => {
    const ownedDevice = getOwnedDevice(req, res);

    if (!ownedDevice) {
      return;
    }

    const nextDevices = structuredClone(devices);
    resetDevice(nextDevices[ownedDevice.index]);
    const persisted = await persistDevices(nextDevices, res);

    if (!persisted) {
      return;
    }

    res.status(204).send();
  });

  app.get("/api/devices/:id/config", requireAuth, (req, res) => {
    const ownedDevice = getOwnedDevice(req, res);

    if (!ownedDevice) {
      return;
    }

    res.json({ config: ownedDevice.device.config || null });
  });

  app.patch("/api/devices/:id/config", requireAuth, async (req, res) => {
    const ownedDevice = getOwnedDevice(req, res);

    if (!ownedDevice) {
      return;
    }

    if (!ownedDevice.device.config) {
      res.status(404).json({ message: "当前设备无组态" });
      return;
    }

    const name = String(req.body?.name || "").trim();

    if (!name) {
      res.status(400).json({ message: "组态名称不能为空" });
      return;
    }

    const nextDevices = structuredClone(devices);
    const nextDevice = nextDevices[ownedDevice.index];
    nextDevice.config.name = name;
    nextDevice.updatedAt = nowIso();
    const persisted = await persistDevices(nextDevices, res);

    if (!persisted) {
      return;
    }

    res.json({ config: { ...nextDevice.config } });
  });

  app.delete("/api/devices/:id/alarms/:alarmId", requireAuth, async (req, res) => {
    const ownedDevice = getOwnedDevice(req, res);

    if (!ownedDevice) {
      return;
    }

    const alarms = ownedDevice.device.alarms || [];
    const alarmIndex = alarms.findIndex((alarm) => alarm.id === req.params.alarmId);

    if (alarmIndex === -1) {
      res.status(404).json({ message: "报警不存在" });
      return;
    }

    const nextDevices = structuredClone(devices);
    const nextDevice = nextDevices[ownedDevice.index];
    const nextAlarms = nextDevice.alarms || [];
    nextAlarms.splice(alarmIndex, 1);
    nextDevice.alarms = nextAlarms;
    nextDevice.updatedAt = nowIso();
    const persisted = await persistDevices(nextDevices, res);

    if (!persisted) {
      return;
    }

    res.status(204).send();
  });

  return app;
}
