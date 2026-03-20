import { createApp } from "./app.js";
import { config } from "./config.js";
import { closeStorage } from "./storage.js";
import { connectMqtt, subscribeDevice, disconnectMqtt } from "./mqtt-client.js";
import { handleMqttMessage, subscribeAllDevices } from "./mqtt-handler.js";

async function start() {
  const app = await createApp();

  const server = app.listen(config.port, () => {
    console.log(`Roastek backend listening on http://127.0.0.1:${config.port}`);
  });

  let mqttConnected = false;
  if (config.mqtt.enabled) {
    try {
      await connectMqtt(config.mqtt, handleMqttMessage);
      mqttConnected = true;
      
      const { loadDevices } = await import("./storage.js");
      const devices = await loadDevices();
      subscribeAllDevices(subscribeDevice, devices);
      
      console.log("[MQTT] Integration enabled and connected");
    } catch (error) {
      console.error("[MQTT] Failed to connect:", error.message);
      console.log("[MQTT] Continuing without MQTT...");
    }
  } else {
    console.log("[MQTT] Disabled (set MQTT_ENABLED=true to enable)");
  }

  const shutdown = async (signal) => {
    console.log(`[Server] Received ${signal}, shutting down...`);
    
    // Disconnect MQTT if connected
    if (mqttConnected) {
      disconnectMqtt();
    }
    
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
