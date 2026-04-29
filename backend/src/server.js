import "./load-env.js";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { closeStorage } from "./storage.js";
import { connectMqtt, subscribeDevice, disconnectMqtt, publishCommand } from "./mqtt-client.js";
import { createMqttMessageHandler, subscribeAllDevices } from "./mqtt-handler.js";
import { isFanDevice, startPolling, stopAllPolling, stopPolling } from "./modbus-poller.js";

function syncFanPollers(devices) {
  const activeFanDeviceIds = new Set(
    (Array.isArray(devices) ? devices : [])
      .filter((device) => isFanDevice(device) && device.config)
      .map((device) => device.id),
  );

  for (const deviceId of activeFanDeviceIds) {
    startPolling(deviceId, publishCommand);
  }

  return activeFanDeviceIds;
}

async function start() {
  const app = await createApp();
  const handleMqttMessage = createMqttMessageHandler({
    onDevicesUpdated: async (nextDevices) => {
      app.locals.replaceDevices?.(nextDevices);
      app.locals.syncFanPollers?.(nextDevices);
    },
  });

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
      let activeFanDeviceIds = syncFanPollers(devices);
      app.locals.syncFanPollers = (nextDevices) => {
        const nextFanDeviceIds = syncFanPollers(nextDevices);

        for (const deviceId of activeFanDeviceIds) {
          if (!nextFanDeviceIds.has(deviceId)) {
            stopPolling(deviceId);
          }
        }

        activeFanDeviceIds = nextFanDeviceIds;
      };
      
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
    app.locals.stopDeviceStatusMonitor?.();
    
    // Disconnect MQTT if connected
    if (mqttConnected) {
      stopAllPolling();
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
