function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = {
  port: Number(process.env.PORT || 3001),
  frontendOrigins: (process.env.FRONTEND_ORIGIN || "http://127.0.0.1:4173,http://127.0.0.1:5173,http://localhost:4173,http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  adminUsername: process.env.ADMIN_USERNAME || "admin",
  adminPassword: process.env.ADMIN_PASSWORD || "admin",
  databaseUrl: (process.env.DATABASE_URL || "").trim(),
  dbPoolMax: parsePositiveNumber(process.env.DB_POOL_MAX, 10),
  dbConnectRetries: parsePositiveNumber(process.env.DB_CONNECT_RETRIES, 10),
  dbConnectRetryDelayMs: parsePositiveNumber(process.env.DB_CONNECT_RETRY_DELAY_MS, 1000),
  legacyDevicesFile: (process.env.LEGACY_DEVICES_FILE || "").trim() || null,
};
