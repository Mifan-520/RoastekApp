import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const configModulePath = new URL("../src/config.js", import.meta.url);

function loadConfig(env) {
  return spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { config } from ${JSON.stringify(configModulePath.href)}; console.log(JSON.stringify({ adminPassword: config.adminPassword, userPassword: config.userPassword }));`,
    ],
    {
      env: {
        ...process.env,
        ...env,
      },
      encoding: "utf8",
    }
  );
}

test("rejects default passwords in production without explicit local override", () => {
  const result = loadConfig({
    NODE_ENV: "production",
    ADMIN_PASSWORD: "admin",
    USER_PASSWORD: "user",
    ALLOW_DEFAULT_PASSWORDS: "false",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ADMIN_PASSWORD must be changed before production startup/);
});

test("allows default passwords in production when explicit local override is enabled", () => {
  const result = loadConfig({
    NODE_ENV: "production",
    ADMIN_PASSWORD: "admin",
    USER_PASSWORD: "user",
    ALLOW_DEFAULT_PASSWORDS: "true",
  });

  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout.trim()), {
    adminPassword: "admin",
    userPassword: "user",
  });
});
