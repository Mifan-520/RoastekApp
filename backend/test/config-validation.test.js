import test from "node:test";
import assert from "node:assert/strict";

const configModulePath = new URL("../src/config.js", import.meta.url);

async function loadConfigWithEnv(overrides) {
  const originalEnv = {
    ADMIN_USERNAME: process.env.ADMIN_USERNAME,
    ADMIN_USER: process.env.ADMIN_USER,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    NODE_ENV: process.env.NODE_ENV,
  };

  try {
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_USER;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.NODE_ENV;

    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined || value === null) {
        delete process.env[key];
      } else {
        process.env[key] = String(value);
      }
    }

    const importUrl = new URL(configModulePath.href);
    importUrl.searchParams.set("t", `${Date.now()}-${Math.random()}`);
    return await import(importUrl.href);
  } finally {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("loads config normally in production when admin credentials are not defaults", async () => {
  const { config } = await loadConfigWithEnv({
    NODE_ENV: "production",
    ADMIN_USERNAME: "ops-admin",
    ADMIN_PASSWORD: "S3cure!Pass",
  });

  assert.equal(config.adminUsername, "ops-admin");
  assert.equal(config.adminPassword, "S3cure!Pass");
});

test("throws in production when default admin credentials are used", async () => {
  await assert.rejects(
    loadConfigWithEnv({
      NODE_ENV: "production",
      ADMIN_USERNAME: "admin",
      ADMIN_PASSWORD: "admin",
    }),
    /insecure default admin credentials/i
  );
});

test("warns in development when default admin credentials are used", async () => {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (message) => {
    warnings.push(String(message));
  };

  try {
    const { config } = await loadConfigWithEnv({
      NODE_ENV: "development",
      ADMIN_USERNAME: "admin",
      ADMIN_PASSWORD: "admin",
    });

    assert.equal(config.adminUsername, "admin");
    assert.equal(config.adminPassword, "admin");
    assert.equal(warnings.length > 0, true);
    assert.equal(/insecure default admin credentials/i.test(warnings.join("\n")), true);
  } finally {
    console.warn = originalWarn;
  }
});
