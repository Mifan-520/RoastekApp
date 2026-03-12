export const config = {
  port: Number(process.env.PORT || 3001),
  frontendOrigins: (process.env.FRONTEND_ORIGIN || "http://127.0.0.1:4173,http://127.0.0.1:5173,http://localhost:4173,http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  adminUsername: process.env.ADMIN_USERNAME || "admin",
  adminPassword: process.env.ADMIN_PASSWORD || "admin",
};
