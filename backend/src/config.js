function requireProductionSecret(name, value, fallback) {
  const allowDefaultPasswords = String(process.env.ALLOW_DEFAULT_PASSWORDS || "").toLowerCase() === "true";
  if (process.env.NODE_ENV === "production" && !allowDefaultPasswords && (!value || value === fallback)) {
    throw new Error(`${name} must be changed before production startup`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT || 3001),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/roastek",
  frontendOrigins: (process.env.FRONTEND_ORIGIN || "http://127.0.0.1:4173,http://127.0.0.1:5173,http://localhost:4173,http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  adminUsername: process.env.ADMIN_USERNAME || "admin",
  adminPassword: requireProductionSecret("ADMIN_PASSWORD", process.env.ADMIN_PASSWORD || "admin", "admin"),
  userUsername: process.env.USER_USERNAME || "user",
  userPassword: requireProductionSecret("USER_PASSWORD", process.env.USER_PASSWORD || "user", "user"),
};
