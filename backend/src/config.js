function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isInsecureDefaultAdminCredential(value) {
  return (value || "").trim() === "admin";
}

function enforceAdminCredentialSafety(adminUsername, adminPassword) {
  const hasInsecureDefault =
    isInsecureDefaultAdminCredential(adminUsername) ||
    isInsecureDefaultAdminCredential(adminPassword);

  if (!hasInsecureDefault) {
    return;
  }

  const message =
    "Detected insecure default admin credentials (admin/admin). Set ADMIN_USERNAME and ADMIN_PASSWORD to non-default values before running this service.";
  const nodeEnv = (process.env.NODE_ENV || "development").toLowerCase();

  if (nodeEnv === "production") {
    throw new Error(`${message} Refusing to start in production.`);
  }

  console.warn(`\n[SECURITY WARNING] ${message}\n`);
}

const adminUsername = process.env.ADMIN_USERNAME || process.env.ADMIN_USER || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || "admin";

enforceAdminCredentialSafety(adminUsername, adminPassword);

export const config = {
  port: Number(process.env.PORT || 3001),
  frontendOrigins: (process.env.FRONTEND_ORIGIN || "http://127.0.0.1:4173,http://127.0.0.1:5173,http://localhost:4173,http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  adminUsername,
  adminPassword,
  databaseUrl: (process.env.DATABASE_URL || "").trim(),
  dbPoolMax: parsePositiveNumber(process.env.DB_POOL_MAX, 10),
  dbConnectRetries: parsePositiveNumber(process.env.DB_CONNECT_RETRIES, 10),
  dbConnectRetryDelayMs: parsePositiveNumber(process.env.DB_CONNECT_RETRY_DELAY_MS, 1000),
  deviceOfflineTimeoutMs: parsePositiveNumber(process.env.DEVICE_OFFLINE_TIMEOUT_MS, 15000),
  legacyDevicesFile: (process.env.LEGACY_DEVICES_FILE || "").trim() || null,
  
  // MQTT Configuration
  mqtt: {
    enabled: process.env.MQTT_ENABLED === "true" || process.env.MQTT_ENABLED === "1",
    host: process.env.MQTT_HOST || "localhost",
    port: parsePositiveNumber(process.env.MQTT_PORT, 1883),
    username: process.env.MQTT_USERNAME || "",
    password: process.env.MQTT_PASSWORD || "",
  },
};
