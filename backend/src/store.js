import crypto from "node:crypto";
import { Client } from "pg";
import { seedDevices } from "./data/devices.js";
import { createSeedUsers } from "./data/users.js";

const schemaSql = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  role_label TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  claim_code TEXT NOT NULL UNIQUE,
  default_name TEXT NOT NULL,
  default_type TEXT NOT NULL,
  default_location TEXT NOT NULL,
  default_address TEXT NOT NULL,
  default_config_name TEXT,
  status TEXT NOT NULL,
  last_active TEXT NOT NULL,
  last_seen_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  bound_at TEXT,
  connection_history_json TEXT NOT NULL,
  alarms_json TEXT NOT NULL,
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  location TEXT NOT NULL,
  address TEXT NOT NULL,
  config_name TEXT,
  config_payload_json TEXT
);

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS expires_at TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS connection_history_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE devices ADD COLUMN IF NOT EXISTS alarms_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE devices ADD COLUMN IF NOT EXISTS config_payload_json TEXT;
`;

function nowIso() {
  const now = new Date();
  const shanghaiOffsetMinutes = 8 * 60;
  const adjusted = new Date(now.getTime() + (shanghaiOffsetMinutes + now.getTimezoneOffset()) * 60_000);
  return `${adjusted.toISOString().slice(0, 19)}+08:00`;
}

function serializeUser(row) {
  return {
    id: row.id,
    username: row.username,
    password: row.password,
    displayName: row.display_name,
    role: row.role,
    roleLabel: row.role_label,
  };
}

function isHashedPassword(value) {
  return String(value || "").startsWith("scrypt$");
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, storedValue) {
  if (!isHashedPassword(storedValue)) {
    return storedValue === password;
  }

  const [, salt, hash] = storedValue.split("$");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
}

function serializeDevice(row) {
  const connectionHistory = JSON.parse(row.connection_history_json || "[]");
  const alarms = JSON.parse(row.alarms_json || "[]");
  const configPayload = row.config_payload_json ? JSON.parse(row.config_payload_json) : null;
  return {
    id: row.id,
    claimCode: row.claim_code,
    defaultName: row.default_name,
    defaultType: row.default_type,
    defaultLocation: row.default_location,
    defaultAddress: row.default_address,
    defaultConfigName: row.default_config_name,
    status: row.status,
    lastActive: row.last_active,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    boundAt: row.bound_at,
    connectionHistory,
    alarms,
    ownerId: row.owner_id,
    name: row.name,
    type: row.type,
    location: row.location,
    address: row.address,
    config: row.config_name
      ? {
          id: "default",
          name: row.config_name,
          payload: configPayload,
        }
      : null,
  };
}

async function createClient({ databaseUrl, useInMemoryDb }) {
  if (useInMemoryDb) {
    const { newDb } = await import("pg-mem");
    const db = newDb({ autoCreateForeignKeyIndices: true });
    const adapter = db.adapters.createPg();
    const client = new adapter.Client();
    await client.connect();
    return client;
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  return client;
}

async function seedIfNeeded(client, config) {
  const userCount = await client.query("SELECT COUNT(*)::int AS count FROM users");

  if (userCount.rows[0].count === 0) {
    const timestamp = nowIso();
    const users = createSeedUsers(config).map((user) => ({
      id: user.id,
      username: user.username,
      password: user.password,
      displayName: user.displayName,
      role: user.role,
      roleLabel: user.roleLabel,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    for (const user of users) {
      await client.query(
        `INSERT INTO users (id, username, password, display_name, role, role_label, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [user.id, user.username, hashPassword(user.password), user.displayName, user.role, user.roleLabel, user.createdAt, user.updatedAt]
      );
    }
  }

  const existingUsers = await client.query("SELECT id, password FROM users");
  for (const row of existingUsers.rows) {
    if (!isHashedPassword(row.password)) {
      await client.query("UPDATE users SET password = $1 WHERE id = $2", [hashPassword(row.password), row.id]);
    }
  }

  const deviceCount = await client.query("SELECT COUNT(*)::int AS count FROM devices");

  if (deviceCount.rows[0].count === 0) {
    for (const device of seedDevices) {
      await client.query(
        `INSERT INTO devices (
          id, claim_code, default_name, default_type, default_location, default_address, default_config_name,
          status, last_active, last_seen_at, created_at, updated_at, bound_at, connection_history_json, alarms_json, owner_id,
          name, type, location, address, config_name, config_payload_json
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22
        )`,
        [
          device.id,
          device.claimCode,
          device.defaultName,
          device.defaultType,
          device.defaultLocation,
          device.defaultAddress,
          device.defaultConfigName,
          device.status,
          device.lastActive,
          device.lastSeenAt,
          device.createdAt,
          device.updatedAt,
          device.boundAt,
          JSON.stringify(device.connectionHistory || []),
          JSON.stringify(device.alarms || []),
          device.ownerId,
          device.name,
          device.type,
          device.location,
          device.address,
          device.config?.name ?? null,
          device.config?.payload ? JSON.stringify(device.config.payload) : null,
        ]
      );
    }
  }

  for (const device of seedDevices) {
    await client.query(
      `UPDATE devices
       SET connection_history_json = CASE
             WHEN connection_history_json IS NULL OR connection_history_json = '[]' THEN $2
             ELSE connection_history_json
           END,
           alarms_json = CASE
             WHEN alarms_json IS NULL THEN $3
             ELSE alarms_json
           END,
           config_payload_json = CASE
             WHEN config_payload_json IS NULL THEN $4
             ELSE config_payload_json
           END,
           default_address = COALESCE(default_address, $5),
           address = COALESCE(address, $5)
       WHERE id = $1`,
      [
        device.id,
        JSON.stringify(device.connectionHistory || []),
        JSON.stringify(device.alarms || []),
        device.config?.payload ? JSON.stringify(device.config.payload) : null,
        device.defaultAddress,
      ]
    );
  }
}

export async function createStore(config, options = {}) {
  const client = await createClient({
    databaseUrl: config.databaseUrl,
    useInMemoryDb: Boolean(options.useInMemoryDb),
  });

  await client.query(schemaSql);
  await seedIfNeeded(client, config);

  return {
    async close() {
      await client.end();
    },
    async findUserByCredentials(username, password) {
      const result = await client.query("SELECT * FROM users WHERE username = $1 LIMIT 1", [username]);
      if (!result.rows[0]) {
        return null;
      }
      return verifyPassword(password, result.rows[0].password) ? serializeUser(result.rows[0]) : null;
    },
    async createSession(userId) {
      const token = crypto.randomBytes(24).toString("base64url");
      const createdAt = nowIso();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const expiresIso = `${new Date(expiresAt.getTime() + (8 * 60 + expiresAt.getTimezoneOffset()) * 60_000).toISOString().slice(0, 19)}+08:00`;
      await client.query(
        "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES ($1, $2, $3, $4)",
        [token, userId, createdAt, expiresIso]
      );
      return token;
    },
    async findUserByToken(token) {
      const result = await client.query(
        `SELECT u.*
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token = $1 AND (s.expires_at IS NULL OR s.expires_at > $2)
         LIMIT 1`,
        [token, nowIso()]
      );
      return result.rows[0] ? serializeUser(result.rows[0]) : null;
    },
    async deleteSession(token) {
      const result = await client.query("DELETE FROM sessions WHERE token = $1", [token]);
      return result.rowCount > 0;
    },
    async listOwnedDevices(userId) {
      const result = await client.query(
        "SELECT * FROM devices WHERE owner_id = $1 ORDER BY created_at ASC",
        [userId]
      );
      return result.rows.map(serializeDevice);
    },
    async claimDevice({ userId, claimCode, name, address }) {
      const timestamp = nowIso();
      const updated = await client.query(
        `UPDATE devices
         SET owner_id = $1, name = $2, address = $3, bound_at = $4, updated_at = $4
         WHERE claim_code = $5 AND owner_id IS NULL
         RETURNING *`,
        [userId, name, address || "", timestamp, claimCode]
      );

      if (!updated.rows[0]) {
        const existing = await client.query("SELECT * FROM devices WHERE claim_code = $1 LIMIT 1", [claimCode]);
        if (!existing.rows[0]) {
          return { error: "设备码不存在", status: 404 };
        }
        return { error: "该设备已被绑定", status: 409 };
      }

      return { device: serializeDevice(updated.rows[0]), status: 201 };
    },
    async getOwnedDevice(userId, deviceId) {
      const result = await client.query(
        "SELECT * FROM devices WHERE id = $1 AND owner_id = $2 LIMIT 1",
        [deviceId, userId]
      );
      return result.rows[0] ? serializeDevice(result.rows[0]) : null;
    },
    async updateDevice({ userId, deviceId, name, address }) {
      const current = await this.getOwnedDevice(userId, deviceId);
      if (!current) {
        return null;
      }

      const result = await client.query(
        `UPDATE devices
         SET name = $1, address = $2, updated_at = $3
         WHERE id = $4 AND owner_id = $5
         RETURNING *`,
        [name, address, nowIso(), deviceId, userId]
      );
      if (!result.rows[0]) {
        return null;
      }
      return serializeDevice(result.rows[0]);
    },
    async unbindDevice({ userId, deviceId }) {
      const current = await this.getOwnedDevice(userId, deviceId);
      if (!current) {
        return false;
      }

      const timestamp = nowIso();
      const result = await client.query(
        `UPDATE devices
         SET owner_id = NULL,
             name = default_name,
             type = default_type,
             location = default_location,
             address = default_address,
             config_name = default_config_name,
             updated_at = $1,
             bound_at = NULL
         WHERE id = $2 AND owner_id = $3`,
        [timestamp, deviceId, userId]
      );
      return result.rowCount > 0;
    },
    async getDeviceConfig({ userId, deviceId }) {
      const device = await this.getOwnedDevice(userId, deviceId);
      return device ? device.config : null;
    },
    async updateDeviceConfig({ userId, deviceId, name }) {
      const current = await this.getOwnedDevice(userId, deviceId);
      if (!current) {
        return { status: 404, error: "设备不存在" };
      }
      if (!current.config) {
        return { status: 404, error: "当前设备无组态" };
      }

      const result = await client.query(
        `UPDATE devices
         SET config_name = $1, updated_at = $2
         WHERE id = $3 AND owner_id = $4
         RETURNING *`,
        [name, nowIso(), deviceId, userId]
      );
      if (!result.rows[0]) {
        return { status: 404, error: "设备不存在" };
      }
      return { status: 200, config: serializeDevice(result.rows[0]).config };
    },
    async deleteAlarm({ userId, deviceId, alarmId }) {
      const current = await this.getOwnedDevice(userId, deviceId);
      if (!current) {
        return { status: 404, error: "设备不存在" };
      }

      const alarms = current.alarms || [];
      const filtered = alarms.filter((a) => a.id !== alarmId);
      const alarmsJson = JSON.stringify(filtered);

      const result = await client.query(
        `UPDATE devices
         SET alarms_json = $1, updated_at = $2
         WHERE id = $3 AND owner_id = $4
         RETURNING *`,
        [alarmsJson, nowIso(), deviceId, userId]
      );

      if (!result.rows[0]) {
        return { status: 404, error: "设备不存在" };
      }
      return { status: 204 };
    },
    async updateProfile({ userId, displayName }) {
      const result = await client.query(
        `UPDATE users
         SET display_name = $1, updated_at = $2
         WHERE id = $3
         RETURNING *`,
        [displayName, nowIso(), userId]
      );
      return serializeUser(result.rows[0]);
    },
    async updatePassword({ userId, oldPassword, newPassword }) {
      const current = await client.query("SELECT * FROM users WHERE id = $1 LIMIT 1", [userId]);
      if (!current.rows[0]) {
        return { status: 404, error: "用户不存在" };
      }
      if (!verifyPassword(oldPassword, current.rows[0].password)) {
        return { status: 400, error: "原密码错误" };
      }

      await client.query(
        `UPDATE users
         SET password = $1, updated_at = $2
         WHERE id = $3`,
        [hashPassword(newPassword), nowIso(), userId]
      );
      await client.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
      return { status: 204 };
    },
  };
}
