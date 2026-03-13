import cors from "cors";
import express from "express";
import { config as defaultConfig } from "./config.js";
import { createStore } from "./store.js";

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
    lastActive: device.lastActive,
    lastSeenAt: device.lastSeenAt,
    createdAt: device.createdAt,
    updatedAt: device.updatedAt,
    boundAt: device.boundAt,
    connectionHistory: device.connectionHistory,
    alarms: device.alarms,
    config: device.config ? { ...device.config } : null,
  };
}

export async function createApp(options = {}) {
  const runtimeConfig = options.config || defaultConfig;
  const store = options.store || await createStore(runtimeConfig, options);
  const app = express();

  app.locals.store = store;

  async function requireAuth(req, res, next) {
    const authorization = req.headers.authorization || "";
    const token = authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : "";
    const user = await store.findUserByToken(token);

    if (!user) {
      res.status(401).json({ message: "未登录或登录已失效" });
      return;
    }

    req.user = user;
    req.token = token;
    next();
  }

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || runtimeConfig.frontendOrigins.includes(origin)) {
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

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body ?? {};
    const user = await store.findUserByCredentials(username, password);

    if (!user) {
      res.status(401).json({ message: "用户名或密码错误" });
      return;
    }

    const token = await store.createSession(user.id);
    res.json({ token, user: serializeUser(user) });
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    res.json({ user: serializeUser(req.user) });
  });

  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    await store.deleteSession(req.token);
    res.status(204).send();
  });

  app.patch("/api/auth/profile", requireAuth, async (req, res) => {
    const displayName = String(req.body?.displayName || "").trim();
    if (!displayName) {
      res.status(400).json({ message: "显示名称不能为空" });
      return;
    }

    const user = await store.updateProfile({ userId: req.user.id, displayName });
    res.json({ user: serializeUser(user) });
  });

  app.patch("/api/auth/password", requireAuth, async (req, res) => {
    const oldPassword = String(req.body?.oldPassword || "");
    const newPassword = String(req.body?.newPassword || "");

    if (!oldPassword || !newPassword) {
      res.status(400).json({ message: "密码不能为空" });
      return;
    }

    const result = await store.updatePassword({ userId: req.user.id, oldPassword, newPassword });
    if (result.status !== 204) {
      res.status(result.status).json({ message: result.error });
      return;
    }

    res.status(204).send();
  });

  app.get("/api/devices", requireAuth, async (req, res) => {
    const devices = await store.listOwnedDevices(req.user.id);
    res.json({ devices: devices.map(serializeDevice) });
  });

  app.post("/api/devices/claim", requireAuth, async (req, res) => {
    const claimCode = String(req.body?.claimCode || "").trim().toUpperCase();
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

    const result = await store.claimDevice({ userId: req.user.id, claimCode, name, address });
    if (!result.device) {
      res.status(result.status).json({ message: result.error });
      return;
    }

    res.status(result.status).json({ device: serializeDevice(result.device) });
  });

  app.get("/api/devices/:id", requireAuth, async (req, res) => {
    const device = await store.getOwnedDevice(req.user.id, req.params.id);
    if (!device) {
      res.status(404).json({ message: "设备不存在" });
      return;
    }
    res.json({ device: serializeDevice(device) });
  });

  app.patch("/api/devices/:id", requireAuth, async (req, res) => {
    const name = String(req.body?.name || "").trim();
    const address = String(req.body?.address || "").trim();
    if (!name || !address) {
      res.status(400).json({ message: "设备名称和地址不能为空" });
      return;
    }

    const device = await store.updateDevice({ userId: req.user.id, deviceId: req.params.id, name, address });
    if (!device) {
      res.status(404).json({ message: "设备不存在" });
      return;
    }
    res.json({ device: serializeDevice(device) });
  });

  app.delete("/api/devices/:id", requireAuth, async (req, res) => {
    const removed = await store.unbindDevice({ userId: req.user.id, deviceId: req.params.id });
    if (!removed) {
      res.status(404).json({ message: "设备不存在" });
      return;
    }
    res.status(204).send();
  });

  app.get("/api/devices/:id/config", requireAuth, async (req, res) => {
    const device = await store.getOwnedDevice(req.user.id, req.params.id);
    if (!device) {
      res.status(404).json({ message: "设备不存在" });
      return;
    }
    res.json({ config: device.config ? { ...device.config } : null });
  });

  app.patch("/api/devices/:id/config", requireAuth, async (req, res) => {
    const name = String(req.body?.name || "").trim();
    if (!name) {
      res.status(400).json({ message: "组态名称不能为空" });
      return;
    }

    const result = await store.updateDeviceConfig({ userId: req.user.id, deviceId: req.params.id, name });
    if (!result.config) {
      res.status(result.status).json({ message: result.error });
      return;
    }
    res.json({ config: { ...result.config } });
  });

  return app;
}
