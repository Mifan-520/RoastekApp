import cors from "cors";
import { randomUUID } from "node:crypto";
import express from "express";
import { config } from "./config.js";
import { publishCommand } from "./mqtt-client.js";
import { buildCatalyticPayload, CATALYTIC_SYNC_TOLERANCE_SECONDS } from "./mqtt-handler.js";
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
export const CONNECTION_HISTORY_LIMIT = 30;

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

function parseTimestampMs(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === "-") {
    return null;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

export function resolveDeviceLastActive(device) {
  return (
    normalizeOptionalTimestamp(device.lastSeenAt)
    ?? normalizeOptionalTimestamp(device.lastActive)
    ?? normalizeOptionalTimestamp(device.updatedAt)
  );
}

export function resolveDeviceStatus(device, now = new Date(), offlineTimeoutMs = config.deviceOfflineTimeoutMs) {
  const currentStatus = String(device?.status || "offline").trim().toLowerCase();

  if (currentStatus !== "online") {
    return currentStatus || "offline";
  }

  const lastSeenMs = parseTimestampMs(device?.lastSeenAt);
  if (lastSeenMs === null) {
    return "offline";
  }

  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (Number.isNaN(nowMs)) {
    return "offline";
  }

  return nowMs - lastSeenMs > offlineTimeoutMs ? "offline" : "online";
}

export function trimConnectionHistory(connectionHistory = [], limit = CONNECTION_HISTORY_LIMIT) {
  if (!Array.isArray(connectionHistory)) {
    return [];
  }

  const normalizedLimit = Math.max(1, Number(limit) || CONNECTION_HISTORY_LIMIT);
  return connectionHistory.slice(-normalizedLimit);
}

export function markDevicesOffline(devices, now = new Date(), offlineTimeoutMs = config.deviceOfflineTimeoutMs) {
  if (!Array.isArray(devices) || devices.length === 0) {
    return devices;
  }

  const referenceDate = now instanceof Date ? now : new Date(now);
  const offlineTime = formatShanghaiIso(referenceDate);
  let changed = false;

  const nextDevices = devices.map((device) => {
    const currentStatus = String(device?.status || "offline").trim().toLowerCase();
    const resolvedStatus = resolveDeviceStatus(device, referenceDate, offlineTimeoutMs);

    if (currentStatus !== "online" || resolvedStatus !== "offline") {
      return device;
    }

    changed = true;

    return {
      ...device,
      status: "offline",
      updatedAt: offlineTime,
      connectionHistory: trimConnectionHistory([
        ...(device.connectionHistory || []),
        {
          id: `ch-${referenceDate.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
          type: "offline",
          time: offlineTime,
          label: "设备离线",
        },
      ]),
    };
  });

  return changed ? nextDevices : devices;
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
    status: resolveDeviceStatus(device),
    lastActive: resolveDeviceLastActive(device),
    lastSeenAt: normalizeOptionalTimestamp(device.lastSeenAt),
    createdAt: normalizeRequiredTimestamp(device.createdAt),
    updatedAt: normalizeRequiredTimestamp(device.updatedAt),
    boundAt: normalizeOptionalTimestamp(device.boundAt),
    connectionHistory: trimConnectionHistory(device.connectionHistory || []),
    alarms: device.alarms || [],
    syncState: device.syncState || null,
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
  device.syncState = null;
  device.updatedAt = timestamp;
  device.boundAt = null;
}

function toFiniteNumber(value, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function normalizeCatalyticModes(modes, fallbackModes = []) {
  const safeFallback = Array.isArray(fallbackModes) && fallbackModes.length > 0
    ? fallbackModes
    : [
      { fireMinutes: 5, closeMinutes: 3 },
      { fireMinutes: 5, closeMinutes: 3 },
      { fireMinutes: 5, closeMinutes: 3 },
      { fireMinutes: 5, closeMinutes: 3 },
    ];
  const sourceModes = Array.isArray(modes) && modes.length > 0 ? modes : safeFallback;

  return [0, 1, 2, 3].map((index) => {
    const mode = sourceModes[index] ?? safeFallback[index] ?? safeFallback[0];
    return {
      fireMinutes: toFiniteNumber(mode.fireMinutes, safeFallback[index]?.fireMinutes ?? 5),
      closeMinutes: toFiniteNumber(mode.closeMinutes, safeFallback[index]?.closeMinutes ?? 3),
    };
  });
}

function createCatalyticSyncState(payload, command, issuedAt) {
  const modes = normalizeCatalyticModes(payload.modes);
  const activeMode = modes[Math.max(0, Math.min(3, Math.round(toFiniteNumber(payload.currentMode, 1)) - 1))] ?? modes[0];

  return {
    status: "pending",
    lastCommand: {
      command: command.command,
      params: command.params ?? {},
      issuedAt,
    },
    expected: {
      currentMode: Math.round(toFiniteNumber(payload.currentMode, 1)),
      countMode: toFiniteNumber(payload.countMode, 0),
      baseRestSeconds: Math.max(0, Math.round(toFiniteNumber(payload.restSeconds, 0))),
      closeSeconds: Math.round(activeMode.closeMinutes * 60),
      modes,
      updatedAt: issuedAt,
      sourceCommand: command.command,
      toleranceSeconds: CATALYTIC_SYNC_TOLERANCE_SECONDS,
    },
  };
}

function applyCatalyticCommandLocally(device, command, issuedAt) {
  const currentPayload = device.config?.payload || {};
  const modes = normalizeCatalyticModes(currentPayload.modes);
  const params = command.params && typeof command.params === "object" ? command.params : {};
  const selectedMode = Math.min(4, Math.max(1, Math.round(toFiniteNumber(params.mode, toFiniteNumber(currentPayload.currentMode, 1)))));
  const activeMode = modes[selectedMode - 1] ?? modes[0];
  const fireSeconds = Math.max(0, Math.round(toFiniteNumber(params.fireSec, activeMode.fireMinutes * 60)));
  const closeSeconds = Math.max(0, Math.round(toFiniteNumber(params.closeSec, activeMode.closeMinutes * 60)));
  const isRunning = toFiniteNumber(currentPayload.countMode, 0) !== 0;

  let nextPayload = currentPayload;

  switch (command.command) {
    case "setMode":
      if (isRunning) {
        return device;
      }
      nextPayload = buildCatalyticPayload(currentPayload, {
        currentMode: selectedMode,
        countMode: 0,
        restSeconds: 0,
        modes,
        powerOn: false,
      });
      break;
    case "setModeParams": {
      if (isRunning) {
        return device;
      }

      const nextModes = [1, 2, 3, 4].map((modeIndex) => {
        const currentMode = modes[modeIndex - 1] ?? modes[0];
        const nextFireSeconds = toFiniteNumber(params[`mode${modeIndex}FireSec`], currentMode.fireMinutes * 60);
        const nextCloseSeconds = toFiniteNumber(params[`mode${modeIndex}CloseSec`], currentMode.closeMinutes * 60);
        return {
          fireMinutes: nextFireSeconds / 60,
          closeMinutes: nextCloseSeconds / 60,
        };
      });

      nextPayload = buildCatalyticPayload(currentPayload, {
        currentMode: selectedMode,
        countMode: 0,
        restSeconds: 0,
        modes: nextModes,
        powerOn: false,
      });
      break;
    }
    case "setTime": {
      if (isRunning) {
        return device;
      }

      const mode = Math.min(4, Math.max(1, Math.round(toFiniteNumber(params.mode ?? params.m, selectedMode))));
      const currentMode = modes[mode - 1] ?? modes[0];
      const nextModes = modes.map((item, index) => ({ ...item }));
      nextModes[mode - 1] = {
        fireMinutes: toFiniteNumber(params.fireSec ?? params.f, currentMode.fireMinutes * 60) / 60,
        closeMinutes: toFiniteNumber(params.closeSec ?? params.c, currentMode.closeMinutes * 60) / 60,
      };

      nextPayload = buildCatalyticPayload(currentPayload, {
        currentMode: mode,
        countMode: 0,
        restSeconds: 0,
        modes: nextModes,
        powerOn: false,
      });
      break;
    }
    case "start":
      if (isRunning) {
        return device;
      }

      nextPayload = buildCatalyticPayload(currentPayload, {
        currentMode: selectedMode,
        countMode: 1,
        restSeconds: fireSeconds,
        modes,
        powerOn: true,
      });
      break;
    case "stop":
    case "reset":
      nextPayload = buildCatalyticPayload(currentPayload, {
        currentMode: selectedMode,
        countMode: 0,
        restSeconds: 0,
        modes,
        powerOn: false,
      });
      break;
    default:
      return device;
  }

  return {
    ...device,
    config: device.config
      ? {
        ...device.config,
        payload: nextPayload,
      }
      : device.config,
    syncState: createCatalyticSyncState(nextPayload, command, issuedAt),
    updatedAt: issuedAt,
  };
}

function applyLocalCommandState(device, command, issuedAt) {
  if (!device?.config || (device.type !== "三元催化" && device.type !== "催化设备")) {
    return {
      ...device,
      syncState: {
        status: "pending",
        lastCommand: {
          command: command.command,
          params: command.params ?? {},
          issuedAt,
        },
      },
      updatedAt: issuedAt,
    };
  }

  return applyCatalyticCommandLocally(device, command, issuedAt);
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
  const publishCommandFn = options.publishCommandFn ?? publishCommand;
  let devices = await loadDevicesFn();
  if (Array.isArray(devices)) {
    const normalizedDevices = devices.map((device) => ({
      ...device,
      connectionHistory: trimConnectionHistory(device.connectionHistory || []),
    }));
    const needsHistoryTrim = normalizedDevices.some((device, index) => (
      (device.connectionHistory?.length || 0) !== (devices[index]?.connectionHistory?.length || 0)
    ));

    devices = normalizedDevices;

    if (needsHistoryTrim) {
      await saveDevicesFn(devices);
    }
  }
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

  app.locals.replaceDevices = (nextDevices) => {
    devices = Array.isArray(nextDevices) ? nextDevices : devices;
  };

  let isOfflineSweepRunning = false;
  const offlineSweepIntervalMs = Math.max(1000, Math.min(5000, config.deviceOfflineTimeoutMs));
  const offlineSweepTimer = setInterval(() => {
    if (isOfflineSweepRunning) {
      return;
    }

    isOfflineSweepRunning = true;
    void (async () => {
      try {
        const nextDevices = markDevicesOffline(devices, new Date(), config.deviceOfflineTimeoutMs);
        if (nextDevices !== devices) {
          await saveDevicesFn(nextDevices);
          devices = nextDevices;
        }
      } catch (error) {
        console.error("[Devices] Failed to persist offline status:", error.message);
      } finally {
        isOfflineSweepRunning = false;
      }
    })();
  }, offlineSweepIntervalMs);

  if (typeof offlineSweepTimer.unref === "function") {
    offlineSweepTimer.unref();
  }

  app.locals.stopDeviceStatusMonitor = () => {
    clearInterval(offlineSweepTimer);
  };

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

  app.post("/api/devices/:id/command", requireAuth, async (req, res) => {
    const ownedDevice = getOwnedDevice(req, res);

    if (!ownedDevice) {
      return;
    }

    const commandName = String(req.body?.command || "").trim();
    const params = req.body?.params;

    if (!commandName) {
      res.status(400).json({ message: "命令名称不能为空" });
      return;
    }

    if (params !== undefined && (typeof params !== "object" || Array.isArray(params) || params === null)) {
      res.status(400).json({ message: "命令参数必须是对象" });
      return;
    }

    const command = params === undefined
      ? { command: commandName }
      : { command: commandName, params };

    try {
      await publishCommandFn(ownedDevice.device.id, command);
    } catch (error) {
      console.error("[Command] Failed to publish device command:", error?.message || error);
      res.status(502).json({ message: "设备命令下发失败" });
      return;
    }

    const issuedAt = nowIso();
    const nextDevices = structuredClone(devices);
    const nextDevice = applyLocalCommandState(nextDevices[ownedDevice.index], command, issuedAt);
    nextDevices[ownedDevice.index] = nextDevice;
    const persisted = await persistDevices(nextDevices, res);

    if (!persisted) {
      return;
    }

    res.status(202).json({
      ok: true,
      deviceId: ownedDevice.device.id,
      command,
      device: serializeDevice(nextDevice),
      config: nextDevice.config ? { ...nextDevice.config } : null,
    });
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
      res.status(404).json({ message: "当前设备无监控" });
      return;
    }

    const name = String(req.body?.name || "").trim();
    const payload = req.body?.payload;

    if (!name && payload === undefined) {
      res.status(400).json({ message: "监控名称或payload至少提供一个" });
      return;
    }

    const nextDevices = structuredClone(devices);
    const nextDevice = nextDevices[ownedDevice.index];
    if (name) {
      nextDevice.config.name = name;
    }
    if (payload !== undefined) {
      nextDevice.config.payload = payload;
    }
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
