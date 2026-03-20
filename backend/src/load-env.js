import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";

const currentDir = dirname(fileURLToPath(import.meta.url));
const rootEnvPath = resolve(currentDir, "..", "..", ".env");

if (existsSync(rootEnvPath)) {
  loadDotenv({ path: rootEnvPath });
}
