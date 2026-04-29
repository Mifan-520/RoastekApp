import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import pg from "pg";
import { config } from "./config.js";
import { seedDevices } from "./data/devices.js";
import { createSeedUsers } from "./data/users.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const DEVICES_FILE = join(DATA_DIR, "devices.json");
const USERS_FILE = join(DATA_DIR, "users.json");
const GROUPS_FILE = join(DATA_DIR, "groups.json");
const LEGACY_DEVICES_FILE = config.legacyDevicesFile || DEVICES_FILE;
const IS_TEST_RUNTIME =
  process.env.NODE_ENV === "test"
  || process.env.npm_lifecycle_event === "test"
  || process.execArgv.includes("--test");
const IS_POSTGRES_ENABLED = Boolean(config.databaseUrl);
const { Pool } = pg;

let pool = null;
let storageReadyPromise = null;

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      max: config.dbPoolMax,
    });
  }

  return pool;
}

async function connectWithRetry() {
  const maxAttempts = Math.max(config.dbConnectRetries, 1);
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const client = await getPool().connect();
      if (attempt > 1) {
        console.log(`[Storage] PostgreSQL connected on retry ${attempt}/${maxAttempts}`);
      }
      return client;
    } catch (error) {
      lastError = error;
      console.error(`[Storage] PostgreSQL connect failed (${attempt}/${maxAttempts}):`, error.message);

      if (attempt < maxAttempts) {
        await wait(config.dbConnectRetryDelayMs);
      }
    }
  }

  throw lastError;
}

function getSeedDevicesFromLegacyFile() {
  if (!existsSync(LEGACY_DEVICES_FILE)) {
    return null;
  }

  try {
    const raw = readFileSync(LEGACY_DEVICES_FILE, "utf-8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      console.error("[Storage] Legacy devices file is not an array, fallback to seed devices");
      return null;
    }

    console.log("[Storage] Loaded initial data from legacy file:", LEGACY_DEVICES_FILE);
    return parsed;
  } catch (error) {
    console.error("[Storage] Failed to read legacy devices file, fallback to seed devices:", error.message);
    return null;
  }
}

function getSeedUsers() {
  return createSeedUsers(config);
}

function isValidUserArray(payload) {
  return Array.isArray(payload) && payload.every((item) => item && typeof item === "object" && typeof item.id === "string" && typeof item.username === "string" && typeof item.password === "string");
}

function isValidGroupArray(payload) {
  return Array.isArray(payload) && payload.every((item) => (
    item
    && typeof item === "object"
    && typeof item.id === "string"
    && typeof item.userId === "string"
    && typeof item.name === "string"
    && Array.isArray(item.deviceIds)
    && item.deviceIds.every((deviceId) => typeof deviceId === "string")
  ));
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Recursively fills missing fields from the seed value into the persisted value.
 * Existing persisted fields are preserved and never overwritten.
 *
 * Merge strategy:
 * - `undefined` persisted value: clone seed value
 * - both plain objects: recurse by key, only fill missing keys
 * - all other types: keep persisted value
 *
 * @param {unknown} persistedValue
 * @param {unknown} seedValue
 * @returns {unknown}
 */
function mergeMissingFields(persistedValue, seedValue) {
  if (persistedValue === undefined) {
    return structuredClone(seedValue);
  }

  if (isPlainObject(persistedValue) && isPlainObject(seedValue)) {
    const merged = structuredClone(persistedValue);

    for (const [key, seedFieldValue] of Object.entries(seedValue)) {
      if (!(key in merged)) {
        merged[key] = structuredClone(seedFieldValue);
        continue;
      }

      merged[key] = mergeMissingFields(merged[key], seedFieldValue);
    }

    return merged;
  }

  return persistedValue;
}

function getDeviceIdentity(device) {
  return device?.id || device?.claimCode || null;
}

function getClaimCode(device) {
  return typeof device?.claimCode === "string" && device.claimCode.trim() ? device.claimCode.trim() : null;
}

function getTimestampValue(device) {
  const raw = device?.updatedAt || device?.lastSeenAt || device?.lastActive || device?.createdAt;
  const parsed = Number.isFinite(Date.parse(raw)) ? Date.parse(raw) : 0;
  return parsed;
}

function selectPreferredPersistedDevice(matchingDevices) {
  if (!Array.isArray(matchingDevices) || matchingDevices.length === 0) {
    return null;
  }

  return [...matchingDevices].sort((left, right) => getTimestampValue(right) - getTimestampValue(left))[0];
}

function mergeDeviceIntoSeed(seedDevice, persistedDevice) {
  if (!persistedDevice) {
    return structuredClone(seedDevice);
  }

  const merged = mergeMissingFields(persistedDevice, seedDevice);
  merged.id = seedDevice.id;
  merged.claimCode = seedDevice.claimCode;

  if (seedDevice.config?.id) {
    merged.config = {
      ...(merged.config ?? {}),
      id: seedDevice.config.id,
    };
  }

  if (seedDevice.id === "LY-001" && merged.config?.payload?.status === "unknown") {
    merged.config.payload.status = "offline";
    merged.config.payload.statusText = "离线";
    merged.config.payload.statusTone = "slate";
    merged.config.payload.summary = Array.isArray(merged.config.payload.summary)
      ? merged.config.payload.summary.map((item) => (
        item?.id === "status"
          ? { ...item, value: "离线", tone: "slate" }
          : item
      ))
      : seedDevice.config?.payload?.summary;
  }

  return merged;
}

export function syncSeedDevicesWithMigrations({ persistedDevices, seedDevices: nextSeedDevices }) {
  if (!Array.isArray(persistedDevices)) {
    return {
      devices: structuredClone(Array.isArray(nextSeedDevices) ? nextSeedDevices : []),
      deviceIdMap: {},
    };
  }

  if (!Array.isArray(nextSeedDevices)) {
    return {
      devices: structuredClone(persistedDevices),
      deviceIdMap: {},
    };
  }

  const mergedDevices = [];
  const persistedByIdentity = new Map();
  const persistedByClaimCode = new Map();
  const deviceIdMap = {};

  for (const persistedDevice of persistedDevices) {
    const identity = getDeviceIdentity(persistedDevice);
    const claimCode = getClaimCode(persistedDevice);

    if (identity) {
      persistedByIdentity.set(identity, persistedDevice);
    } else {
      console.warn("[Storage] Skipping persisted device without identity during seed sync");
    }

    if (claimCode) {
      const existing = persistedByClaimCode.get(claimCode) ?? [];
      existing.push(persistedDevice);
      persistedByClaimCode.set(claimCode, existing);
    }
  }

  for (const seedDevice of nextSeedDevices) {
    const identity = getDeviceIdentity(seedDevice);
    const claimCode = getClaimCode(seedDevice);

    if (!identity) {
      console.warn("[Storage] Skipping seed device without identity during seed sync");
      continue;
    }

    const matchingDevices = [
      ...(persistedByIdentity.has(identity) ? [persistedByIdentity.get(identity)] : []),
      ...((claimCode ? persistedByClaimCode.get(claimCode) : []) ?? []),
    ].filter(Boolean);

    const uniqueMatches = [...new Map(matchingDevices.map((device) => [device.id, device])).values()];
    const persistedDevice = selectPreferredPersistedDevice(uniqueMatches);

    if (!persistedDevice) {
      mergedDevices.push(structuredClone(seedDevice));
      continue;
    }

    mergedDevices.push(mergeDeviceIntoSeed(seedDevice, persistedDevice));

    for (const matchedDevice of uniqueMatches) {
      persistedByIdentity.delete(matchedDevice.id);
      const matchedClaimCode = getClaimCode(matchedDevice);
      if (matchedClaimCode) {
        persistedByClaimCode.delete(matchedClaimCode);
      }

      if (matchedDevice.id !== seedDevice.id) {
        deviceIdMap[matchedDevice.id] = seedDevice.id;
      }
    }
  }

  for (const remainingDevice of persistedByIdentity.values()) {
    mergedDevices.push(structuredClone(remainingDevice));
  }

  return { devices: mergedDevices, deviceIdMap };
}

export function syncSeedDevices({ persistedDevices, seedDevices: nextSeedDevices }) {
  return syncSeedDevicesWithMigrations({
    persistedDevices,
    seedDevices: nextSeedDevices,
  }).devices;
}

export function remapGroupDeviceIds(groups, deviceIdMap = {}) {
  if (!Array.isArray(groups) || Object.keys(deviceIdMap).length === 0) {
    return structuredClone(Array.isArray(groups) ? groups : []);
  }

  return groups.map((group) => ({
    ...group,
    deviceIds: [...new Set((group.deviceIds ?? []).map((deviceId) => deviceIdMap[deviceId] ?? deviceId))],
  }));
}

async function initializePostgresStorage() {
  const client = await connectWithRetry();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        state_key TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const existing = await client.query(
      "SELECT payload FROM app_state WHERE state_key = $1",
      ["devices"]
    );
    let deviceIdMap = {};

    if (existing.rowCount === 0) {
      const fromLegacyFile = getSeedDevicesFromLegacyFile();
      const { devices: initialDevices, deviceIdMap: initialDeviceIdMap } = syncSeedDevicesWithMigrations({
        persistedDevices: Array.isArray(fromLegacyFile) ? fromLegacyFile : [],
        seedDevices,
      });
      deviceIdMap = initialDeviceIdMap;

      await client.query(
        `
        INSERT INTO app_state (state_key, payload, updated_at)
        VALUES ($1, $2::jsonb, NOW())
      `,
        ["devices", JSON.stringify(initialDevices)]
      );

      console.log(
        `[Storage] PostgreSQL initialized with ${fromLegacyFile ? "legacy JSON" : "seed"} data (${initialDevices.length} devices)`
      );
    } else {
      const currentDevices = existing.rows[0]?.payload;

      if (!Array.isArray(currentDevices)) {
        console.error("[Storage] PostgreSQL devices payload is invalid, skipping seed sync");
      } else {
        const { devices: syncedDevices, deviceIdMap: nextDeviceIdMap } = syncSeedDevicesWithMigrations({
          persistedDevices: currentDevices,
          seedDevices,
        });
        deviceIdMap = nextDeviceIdMap;

        if (!isDeepStrictEqual(syncedDevices, currentDevices)) {
          await client.query(
            `
            UPDATE app_state
            SET payload = $2::jsonb, updated_at = NOW()
            WHERE state_key = $1
          `,
            ["devices", JSON.stringify(syncedDevices)]
          );

          console.log(`[Storage] Synced seed devices into PostgreSQL (${syncedDevices.length} devices)`);
        }
      }
    }

    const existingUsers = await client.query(
      "SELECT payload FROM app_state WHERE state_key = $1",
      ["users"]
    );

    if (existingUsers.rowCount === 0) {
      const initialUsers = structuredClone(getSeedUsers());

      await client.query(
        `
        INSERT INTO app_state (state_key, payload, updated_at)
        VALUES ($1, $2::jsonb, NOW())
      `,
        ["users", JSON.stringify(initialUsers)]
      );

      console.log(`[Storage] PostgreSQL initialized with seed users (${initialUsers.length} users)`);
    }

    const existingGroups = await client.query(
      "SELECT payload FROM app_state WHERE state_key = $1",
      ["groups"]
    );

    if (existingGroups.rowCount === 0) {
      const initialGroups = remapGroupDeviceIds([], deviceIdMap);
      await client.query(
        `
        INSERT INTO app_state (state_key, payload, updated_at)
        VALUES ($1, $2::jsonb, NOW())
      `,
        ["groups", JSON.stringify(initialGroups)]
      );

      console.log("[Storage] PostgreSQL initialized with empty groups");
    } else {
      const currentGroups = existingGroups.rows[0]?.payload;

      if (isValidGroupArray(currentGroups)) {
        const syncedGroups = remapGroupDeviceIds(currentGroups, deviceIdMap);

        if (!isDeepStrictEqual(syncedGroups, currentGroups)) {
          await client.query(
            `
            UPDATE app_state
            SET payload = $2::jsonb, updated_at = NOW()
            WHERE state_key = $1
          `,
            ["groups", JSON.stringify(syncedGroups)]
          );

          console.log("[Storage] Remapped legacy group device ids after seed sync");
        }
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("[Storage] PostgreSQL rollback failed:", rollbackError.message);
    }
    throw error;
  } finally {
    client.release();
  }
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getStorageMode() {
  if (IS_TEST_RUNTIME) {
    return "memory-test";
  }

  if (IS_POSTGRES_ENABLED) {
    return "postgres";
  }

  return "json-file";
}

export async function initializeStorage() {
  if (IS_TEST_RUNTIME || !IS_POSTGRES_ENABLED) {
    return;
  }

  if (!storageReadyPromise) {
    storageReadyPromise = initializePostgresStorage().catch((error) => {
      storageReadyPromise = null;
      throw error;
    });
  }

  await storageReadyPromise;
}

export async function checkStorageHealth() {
  if (!IS_POSTGRES_ENABLED || IS_TEST_RUNTIME) {
    return true;
  }

  await initializeStorage();
  await getPool().query("SELECT 1");
  return true;
}

export async function loadDevices() {
  if (IS_TEST_RUNTIME) {
    return structuredClone(seedDevices);
  }

  if (IS_POSTGRES_ENABLED) {
    await initializeStorage();
    const result = await getPool().query(
      "SELECT payload FROM app_state WHERE state_key = $1",
      ["devices"]
    );

    const payload = result.rows[0]?.payload;

    if (!Array.isArray(payload)) {
      console.error("[Storage] PostgreSQL payload is invalid, fallback to seed devices");
      return structuredClone(seedDevices);
    }

    return structuredClone(payload);
  }

  ensureDataDir();
  
  if (existsSync(DEVICES_FILE)) {
    try {
      const raw = readFileSync(DEVICES_FILE, "utf-8");
      const data = JSON.parse(raw);
      console.log("[Storage] Loaded devices from", DEVICES_FILE);
      return data;
    } catch (error) {
      console.error("[Storage] Failed to load devices, using seed data:", error.message);
      return structuredClone(seedDevices);
    }
  }
  
  // 首次启动，使用种子数据
  console.log("[Storage] No existing data, initializing with seed data");
  const initialDevices = structuredClone(seedDevices);
  await saveDevices(initialDevices);
  return initialDevices;
}

export async function loadUsers() {
  if (IS_TEST_RUNTIME) {
    return structuredClone(getSeedUsers());
  }

  if (IS_POSTGRES_ENABLED) {
    await initializeStorage();
    const result = await getPool().query(
      "SELECT payload FROM app_state WHERE state_key = $1",
      ["users"]
    );

    const payload = result.rows[0]?.payload;

    if (!isValidUserArray(payload)) {
      console.error("[Storage] PostgreSQL users payload is invalid, fallback to seed users");
      return structuredClone(getSeedUsers());
    }

    return structuredClone(payload);
  }

  ensureDataDir();

  if (existsSync(USERS_FILE)) {
    try {
      const raw = readFileSync(USERS_FILE, "utf-8");
      const data = JSON.parse(raw);

      if (!isValidUserArray(data)) {
        console.error("[Storage] users file payload is invalid, fallback to seed users");
        return structuredClone(getSeedUsers());
      }

      console.log("[Storage] Loaded users from", USERS_FILE);
      return structuredClone(data);
    } catch (error) {
      console.error("[Storage] Failed to load users, using seed data:", error.message);
      return structuredClone(getSeedUsers());
    }
  }

  console.log("[Storage] No existing user data, initializing with seed users");
  const initialUsers = structuredClone(getSeedUsers());
  await saveUsers(initialUsers);
  return initialUsers;
}

export async function saveDevices(devices) {
  if (IS_TEST_RUNTIME) {
    return;
  }

  if (IS_POSTGRES_ENABLED) {
    await initializeStorage();
    await getPool().query(
      `
      INSERT INTO app_state (state_key, payload, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (state_key)
      DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
    `,
      ["devices", JSON.stringify(devices)]
    );
    return;
  }

  ensureDataDir();
  
  try {
    writeFileSync(DEVICES_FILE, JSON.stringify(devices, null, 2), "utf-8");
    console.log("[Storage] Saved", devices.length, "devices to", DEVICES_FILE);
  } catch (error) {
    console.error("[Storage] Failed to save devices:", error.message);
    throw error;
  }
}

export async function saveUsers(users) {
  if (IS_TEST_RUNTIME) {
    return;
  }

  if (IS_POSTGRES_ENABLED) {
    await initializeStorage();
    await getPool().query(
      `
      INSERT INTO app_state (state_key, payload, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (state_key)
      DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
    `,
      ["users", JSON.stringify(users)]
    );
    return;
  }

  ensureDataDir();

  try {
    writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
    console.log("[Storage] Saved", users.length, "users to", USERS_FILE);
  } catch (error) {
    console.error("[Storage] Failed to save users:", error.message);
    throw error;
  }
}

export async function loadGroups() {
  if (IS_TEST_RUNTIME) {
    return [];
  }

  if (IS_POSTGRES_ENABLED) {
    await initializeStorage();
    const result = await getPool().query(
      "SELECT payload FROM app_state WHERE state_key = $1",
      ["groups"]
    );

    const payload = result.rows[0]?.payload;

    if (!isValidGroupArray(payload)) {
      console.error("[Storage] PostgreSQL groups payload is invalid, fallback to []");
      return [];
    }

    return structuredClone(payload);
  }

  ensureDataDir();

  if (existsSync(GROUPS_FILE)) {
    try {
      const raw = readFileSync(GROUPS_FILE, "utf-8");
      const data = JSON.parse(raw);

      if (!isValidGroupArray(data)) {
        console.error("[Storage] groups file payload is invalid, fallback to []");
        return [];
      }

      console.log("[Storage] Loaded groups from", GROUPS_FILE);
      return structuredClone(data);
    } catch (error) {
      console.error("[Storage] Failed to load groups, fallback to []:", error.message);
      return [];
    }
  }

  await saveGroups([]);
  return [];
}

export async function saveGroups(groups) {
  if (IS_TEST_RUNTIME) {
    return;
  }

  if (IS_POSTGRES_ENABLED) {
    await initializeStorage();
    await getPool().query(
      `
      INSERT INTO app_state (state_key, payload, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (state_key)
      DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
    `,
      ["groups", JSON.stringify(groups)]
    );
    return;
  }

  ensureDataDir();

  try {
    writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2), "utf-8");
    console.log("[Storage] Saved", groups.length, "groups to", GROUPS_FILE);
  } catch (error) {
    console.error("[Storage] Failed to save groups:", error.message);
    throw error;
  }
}

export async function closeStorage() {
  if (pool) {
    await pool.end();
    pool = null;
    storageReadyPromise = null;
  }
}
