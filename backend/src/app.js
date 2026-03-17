import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { seedDevices } from "./data/devices.js";
import { createSeedUsers } from "./data/users.js";

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

export function createApp() {
  const app = express();
  const users = createSeedUsers(config);
  const devices = structuredClone(seedDevices);
  const tokenToUserId = new Map(users.map((user) => [`token-${user.username}`, user.id]));

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
    next();
  }

  function getOwnedDevice(req, res) {
    const device = devices.find((item) => item.id === req.params.id && item.ownerId === req.user.id);

    if (!device) {
      res.status(404).json({ message: "设备不存在" });
      return null;
    }

    return device;
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

  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body ?? {};
    const user = users.find((item) => item.username === username && item.password === password);

    if (user) {
      res.json({
        token: `token-${user.username}`,
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

  app.get("/api/devices", requireAuth, (req, res) => {
    const ownedDevices = devices
      .filter((device) => device.ownerId === req.user.id)
      .map(serializeDevice);

    res.json({ devices: ownedDevices });
  });

  app.post("/api/devices/claim", requireAuth, (req, res) => {
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

    const device = devices.find((item) => item.claimCode === claimCode);

    if (!device) {
      res.status(404).json({ message: "设备码不存在" });
      return;
    }

    if (device.ownerId) {
      res.status(409).json({ message: "该设备已被绑定" });
      return;
    }

    device.ownerId = req.user.id;
    device.name = name;
    device.address = address || device.defaultAddress;
    device.boundAt = nowIso();
    device.updatedAt = device.boundAt;

    res.status(201).json({ device: serializeDevice(device) });
  });

  app.get("/api/devices/:id", requireAuth, (req, res) => {
    const device = getOwnedDevice(req, res);

    if (!device) {
      return;
    }

    res.json({ device: serializeDevice(device) });
  });

  app.patch("/api/devices/:id", requireAuth, (req, res) => {
    const device = getOwnedDevice(req, res);

    if (!device) {
      return;
    }

    const name = String(req.body?.name || "").trim();
    const type = String(req.body?.type || "").trim();
    const location = String(req.body?.location || "").trim();
    const address = String(req.body?.address || "").trim();

    const nextLocation = location || device.location;

    if (!name || !nextLocation) {
      res.status(400).json({ message: "设备名称和位置不能为空" });
      return;
    }

    device.name = name;
    if (type) device.type = type;
    device.location = nextLocation;
    device.address = address || device.address;
    device.updatedAt = nowIso();

    res.json({ device: serializeDevice(device) });
  });

  app.delete("/api/devices/:id", requireAuth, (req, res) => {
    const device = getOwnedDevice(req, res);

    if (!device) {
      return;
    }

    resetDevice(device);
    res.status(204).send();
  });

  app.get("/api/devices/:id/config", requireAuth, (req, res) => {
    const device = getOwnedDevice(req, res);

    if (!device) {
      return;
    }

    res.json({ config: device.config || null });
  });

  app.patch("/api/devices/:id/config", requireAuth, (req, res) => {
    const device = getOwnedDevice(req, res);

    if (!device) {
      return;
    }

    if (!device.config) {
      res.status(404).json({ message: "当前设备无组态" });
      return;
    }

    const name = String(req.body?.name || "").trim();

    if (!name) {
      res.status(400).json({ message: "组态名称不能为空" });
      return;
    }

    device.config.name = name;
    device.updatedAt = nowIso();
    res.json({ config: { ...device.config } });
  });

  return app;
}
