import { createApp } from "./app.js";
import { config } from "./config.js";
import { closeStorage } from "./storage.js";

async function start() {
  const app = await createApp();

  const server = app.listen(config.port, () => {
    console.log(`Roastek backend listening on http://127.0.0.1:${config.port}`);
  });

  const shutdown = async (signal) => {
    console.log(`[Server] Received ${signal}, shutting down...`);
    server.close(async () => {
      await closeStorage();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

start().catch((error) => {
  console.error("[Server] Failed to start:", error);
  process.exit(1);
});
