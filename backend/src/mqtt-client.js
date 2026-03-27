import mqtt from "mqtt";

/**
 * MQTT Client for device telemetry
 * 
 * Architecture:
 * - ESP8266 + 4G DTU → MQTT Broker → Backend
 * - Topic format: devices/{deviceId}/telemetry
 * - Message format: JSON { temperature, humidity, status, etc. }
 */

let client = null;
let messageHandler = null;

/**
 * Connect to MQTT broker
 * @param {Object} config - MQTT configuration
 * @param {string} config.host - Broker host (e.g., "mqtt.example.com")
 * @param {number} config.port - Broker port (default: 1883)
 * @param {string} config.username - Optional username
 * @param {string} config.password - Optional password
 * @param {Function} onMessage - Callback for incoming messages (topic, message)
 * @returns {Promise<void>}
 */
export async function connectMqtt(config, onMessage) {
  if (client?.connected) {
    console.log("[MQTT] Already connected");
    return;
  }

  messageHandler = onMessage;

  const url = config.port === 8883 
    ? `mqtts://${config.host}:${config.port}`
    : `mqtt://${config.host}:${config.port || 1883}`;

  const options = {
    clientId: `roastek-backend-${Date.now()}`,
    clean: true,
    connectTimeout: 10000,
    reconnectPeriod: 5000,
    rejectUnauthorized: false,
  };

  if (config.username) {
    options.username = config.username;
    options.password = config.password;
  }

  return new Promise((resolve, reject) => {
    console.log(`[MQTT] Connecting to ${url}...`);
    
    client = mqtt.connect(url, options);

    client.on("connect", () => {
      console.log("[MQTT] Connected successfully");
      resolve();
    });

    client.on("error", (err) => {
      console.error("[MQTT] Connection error:", err.message);
      reject(err);
    });

    client.on("message", (topic, payload) => {
      try {
        const message = JSON.parse(payload.toString());
        console.log(`[MQTT] Received on ${topic}:`, message);
        
        if (messageHandler) {
          messageHandler(topic, message);
        }
      } catch (err) {
        console.error("[MQTT] Failed to parse message:", err.message);
      }
    });

    client.on("disconnect", () => {
      console.log("[MQTT] Disconnected");
    });

    client.on("reconnect", () => {
      console.log("[MQTT] Reconnecting...");
    });
  });
}

/**
 * Subscribe to device telemetry topic
 * @param {string} deviceId - Device ID
 */
export function subscribeDevice(deviceId) {
  if (!client?.connected) {
    console.error("[MQTT] Not connected, cannot subscribe");
    return;
  }

  const topic = `devices/${deviceId}/telemetry`;
  client.subscribe(topic, (err) => {
    if (err) {
      console.error(`[MQTT] Failed to subscribe ${topic}:`, err.message);
    } else {
      console.log(`[MQTT] Subscribed to ${topic}`);
    }
  });
}

/**
 * Subscribe to multiple device telemetry topics
 * @param {string[]} deviceIds - Array of device IDs
 */
export function subscribeDevices(deviceIds) {
  deviceIds.forEach(subscribeDevice);
}

/**
 * Unsubscribe from device telemetry topic
 * @param {string} deviceId - Device ID
 */
export function unsubscribeDevice(deviceId) {
  if (!client?.connected) return;

  const topic = `devices/${deviceId}/telemetry`;
  client.unsubscribe(topic, (err) => {
    if (err) {
      console.error(`[MQTT] Failed to unsubscribe ${topic}:`, err.message);
    } else {
      console.log(`[MQTT] Unsubscribed from ${topic}`);
    }
  });
}

/**
 * Publish message to device command topic
 * @param {string} deviceId - Device ID
 * @param {Object} command - Command object
 */
export function publishCommand(deviceId, command) {
  if (!client?.connected) {
    console.error("[MQTT] Not connected, cannot publish");
    return;
  }

  const topic = `devices/${deviceId}/command`;
  const payload = formatCommandPayload(command);
  
  client.publish(topic, payload, { qos: 1 }, (err) => {
    if (err) {
      console.error(`[MQTT] Failed to publish to ${topic}:`, err.message);
    } else {
      console.log(`[MQTT] Published command to ${deviceId}:`, command);
    }
  });
}

export function formatCommandPayload(command) {
  return `${JSON.stringify(command)}\n`;
}

/**
 * Disconnect from MQTT broker
 */
export function disconnectMqtt() {
  if (client) {
    client.end();
    client = null;
    messageHandler = null;
    console.log("[MQTT] Disconnected");
  }
}

/**
 * Check if MQTT client is connected
 * @returns {boolean}
 */
export function isMqttConnected() {
  return client?.connected || false;
}

export default {
  connectMqtt,
  subscribeDevice,
  subscribeDevices,
  unsubscribeDevice,
  publishCommand,
  disconnectMqtt,
  isMqttConnected,
};
