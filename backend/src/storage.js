import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config } from "./config.js";
import { seedDevices } from "./data/devices.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const DEVICES_FILE = join(DATA_DIR, "devices.json");
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

async function initializePostgresStorage() {
  const client = await connectWithRetry();

  try {
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

    if (existing.rowCount === 0) {
      const fromLegacyFile = getSeedDevicesFromLegacyFile();
      const initialDevices = structuredClone(fromLegacyFile || seedDevices);

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
    }
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
  }
}

export async function closeStorage() {
  if (pool) {
    await pool.end();
    pool = null;
    storageReadyPromise = null;
  }
}
