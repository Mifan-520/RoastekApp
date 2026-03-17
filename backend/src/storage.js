import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { seedDevices } from "./data/devices.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const DEVICES_FILE = join(DATA_DIR, "devices.json");

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadDevices() {
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
  saveDevices(initialDevices);
  return initialDevices;
}

export function saveDevices(devices) {
  ensureDataDir();
  
  try {
    writeFileSync(DEVICES_FILE, JSON.stringify(devices, null, 2), "utf-8");
    console.log("[Storage] Saved", devices.length, "devices to", DEVICES_FILE);
  } catch (error) {
    console.error("[Storage] Failed to save devices:", error.message);
  }
}