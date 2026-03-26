/**
 * MQTT Message Handler
 * 
 * Processes incoming device telemetry and updates device config.payload
 * Topic format: devices/{deviceId}/telemetry
 * Message format: JSON with device-specific telemetry data
 */

import { saveDevices, loadDevices } from "./storage.js";

const DEFAULT_CATALYTIC_MODES = [
  { fireMinutes: 5, closeMinutes: 3 },
  { fireMinutes: 5, closeMinutes: 3 },
  { fireMinutes: 5, closeMinutes: 3 },
  { fireMinutes: 5, closeMinutes: 3 },
];

function toFiniteNumber(value, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function normalizeCountMode(value) {
  return value === 1 || value === 2 ? value : 0;
}

function buildCatalyticModes(telemetry, currentPayload) {
  const existingModes = Array.isArray(currentPayload.modes) ? currentPayload.modes : DEFAULT_CATALYTIC_MODES;

  return [1, 2, 3, 4].map((modeIndex) => {
    const currentMode = existingModes[modeIndex - 1] ?? DEFAULT_CATALYTIC_MODES[modeIndex - 1];
    const fireSeconds = telemetry[`m${modeIndex}f`];
    const closeSeconds = telemetry[`m${modeIndex}c`];

    return {
      fireMinutes: Number.isFinite(Number(fireSeconds)) ? Number(fireSeconds) / 60 : currentMode.fireMinutes,
      closeMinutes: Number.isFinite(Number(closeSeconds)) ? Number(closeSeconds) / 60 : currentMode.closeMinutes,
    };
  });
}

function buildCatalyticControls(currentPayload, powerOn) {
  const currentControls = Array.isArray(currentPayload.controls) ? currentPayload.controls : [];

  if (currentControls.length === 0) {
    return [
      {
        id: "power",
        label: "总电源",
        description: powerOn ? "运行中" : "已停止",
        icon: "power",
        active: powerOn,
        tone: powerOn ? "rose" : "amber",
      },
    ];
  }

  return currentControls.map((control, index) => {
    if (control.id === "power" || index === 0) {
      return {
        ...control,
        active: powerOn,
        description: powerOn ? "运行中" : "已停止",
      };
    }

    return control;
  });
}

function buildCatalyticSummary(temperature, currentMode, countMode, restSeconds) {
  const countdownSummary = countMode === 1
    ? { label: "点火剩余", value: String(restSeconds), unit: "s", tone: "amber" }
    : countMode === 2
      ? { label: "关机剩余", value: String(restSeconds), unit: "s", tone: "amber" }
      : { label: "当前状态", value: "待机", tone: "rose" };

  return [
    { id: "temperature", label: "当前温度", value: String(temperature), unit: "C", tone: temperature >= 200 ? "amber" : "rose" },
    { id: "mode", label: "当前模式", value: `模式${currentMode}`, tone: "rose" },
    { id: "countdown", ...countdownSummary },
  ];
}

function buildCatalyticCountdowns(modes, currentMode, countMode, restSeconds) {
  const activeMode = modes[currentMode - 1] ?? DEFAULT_CATALYTIC_MODES[0];

  return [
    {
      id: "fire",
      label: "点火倒计时",
      value: countMode === 1 ? restSeconds : Math.round(activeMode.fireMinutes * 60),
      editable: true,
    },
    {
      id: "close",
      label: "关机倒计时",
      value: countMode === 2 ? restSeconds : Math.round(activeMode.closeMinutes * 60),
      editable: true,
    },
  ];
}

/**
 * Map telemetry data to device config.payload based on device type
 * @param {Object} device - Device object from storage
 * @param {Object} telemetry - Incoming telemetry data
 * @returns {Object} - Updated config.payload
 */
export function mapTelemetryToPayload(device, telemetry) {
  const deviceType = device.type;
  const currentPayload = device.config?.payload || {};
  
  // Common fields for all device types
  const commonUpdate = {
    lastTelemetryAt: new Date().toISOString(),
  };
  
  switch (deviceType) {
    case "三元催化":
    case "催化设备":
      {
        const {
          inletTemp,
          outletTemp,
          catalystTemp,
          fanSpeed,
          fanCurrent,
          burnerStatus,
          purgeStatus,
          runtimeHours,
          ignitionCount,
          ...restPayload
        } = currentPayload;

        const temperature = toFiniteNumber(telemetry.temperature, toFiniteNumber(currentPayload.temperature, 0));
        const currentMode = Math.min(4, Math.max(1, Math.round(toFiniteNumber(telemetry.mode, toFiniteNumber(currentPayload.currentMode, 1)))));
        const countMode = normalizeCountMode(telemetry.countMode ?? currentPayload.countMode);
        const restSeconds = Math.max(0, Math.round(toFiniteNumber(telemetry.restSeconds, toFiniteNumber(currentPayload.restSeconds, 0))));
        const modes = buildCatalyticModes(telemetry, currentPayload);
        const powerOn = countMode !== 0;

        return {
          ...restPayload,
          ...commonUpdate,
          summary: buildCatalyticSummary(temperature, currentMode, countMode, restSeconds),
          controls: buildCatalyticControls(currentPayload, powerOn),
          countdowns: buildCatalyticCountdowns(modes, currentMode, countMode, restSeconds),
          temperature,
          powerOn,
          modes,
          currentMode,
          countMode,
          restSeconds,
        };
      }
      
    case "智能仓储":
    case "仓储设备":
      return {
        ...currentPayload,
        ...commonUpdate,
        // Bin temperatures
        bins: telemetry.bins ?? currentPayload.bins ?? [],
        // Equipment status
        conveyorStatus: telemetry.conveyorStatus ?? currentPayload.conveyorStatus ?? "stopped",
        elevatorStatus: telemetry.elevatorStatus ?? currentPayload.elevatorStatus ?? "stopped",
        // Environmental
        warehouseTemp: telemetry.warehouseTemp ?? currentPayload.warehouseTemp ?? 0,
        warehouseHumidity: telemetry.warehouseHumidity ?? currentPayload.warehouseHumidity ?? 0,
        // Inventory
        totalWeight: telemetry.totalWeight ?? currentPayload.totalWeight ?? 0,
        binCount: telemetry.binCount ?? currentPayload.binCount ?? 0,
      };
      
    case "生豆处理站":
    case "处理设备":
      return {
        ...currentPayload,
        ...commonUpdate,
        // Processing stages
        stages: telemetry.stages ?? currentPayload.stages ?? [],
        // Temperature monitoring
        dryingTemp: telemetry.dryingTemp ?? currentPayload.dryingTemp ?? 0,
        roastingTemp: telemetry.roastingTemp ?? currentPayload.roastingTemp ?? 0,
        coolingTemp: telemetry.coolingTemp ?? currentPayload.coolingTemp ?? 0,
        // Production data
        batchId: telemetry.batchId ?? currentPayload.batchId ?? null,
        batchWeight: telemetry.batchWeight ?? currentPayload.batchWeight ?? 0,
        processedWeight: telemetry.processedWeight ?? currentPayload.processedWeight ?? 0,
        // Equipment status
        grinderStatus: telemetry.grinderStatus ?? currentPayload.grinderStatus ?? "idle",
        dryerStatus: telemetry.dryerStatus ?? currentPayload.dryerStatus ?? "idle",
      };
      
    case "Z字梯":
    case "输送设备":
      return {
        ...currentPayload,
        ...commonUpdate,
        // Lift position
        currentFloor: telemetry.currentFloor ?? currentPayload.currentFloor ?? 1,
        targetFloor: telemetry.targetFloor ?? currentPayload.targetFloor ?? 1,
        // Safety sensors
        doorClosed: telemetry.doorClosed ?? currentPayload.doorClosed ?? true,
        overload: telemetry.overload ?? currentPayload.overload ?? false,
        emergencyStop: telemetry.emergencyStop ?? currentPayload.emergencyStop ?? false,
        // Operation data
        operationMode: telemetry.operationMode ?? currentPayload.operationMode ?? "manual",
        travelCount: telemetry.travelCount ?? currentPayload.travelCount ?? 0,
        // Motor status
        motorCurrent: telemetry.motorCurrent ?? currentPayload.motorCurrent ?? 0,
        motorTemp: telemetry.motorTemp ?? currentPayload.motorTemp ?? 0,
      };
      
    default:
      // Generic device - just merge telemetry with current payload
      return {
        ...currentPayload,
        ...commonUpdate,
        ...telemetry,
      };
  }
}

/**
 * Update summary data based on payload
 * @param {Object} config - Device config object
 * @param {Object} payload - Updated payload
 * @returns {Object} - Updated summary
 */
function updateSummary(config, payload) {
  const currentSummary = config?.summary || [];
  
  // Update timestamp for all cards
  return currentSummary.map(card => ({
    ...card,
    lastUpdated: new Date().toISOString(),
  }));
}

/**
 * Handle incoming MQTT message
 * @param {string} topic - MQTT topic
 * @param {Object} message - Parsed JSON message
 */
export function createMqttMessageHandler(options = {}) {
  const loadDevicesFn = options.loadDevices ?? loadDevices;
  const saveDevicesFn = options.saveDevices ?? saveDevices;
  const onDevicesUpdated = options.onDevicesUpdated ?? null;

  return async function handleMqttMessage(topic, message) {
    try {
      const match = topic.match(/devices\/([^/]+)\/telemetry/);
      if (!match) {
        console.warn(`[MQTT] Unknown topic format: ${topic}`);
        return;
      }

      const deviceId = match[1];
      console.log(`[MQTT] Processing telemetry for device: ${deviceId}`);

      const devices = await loadDevicesFn();
      const deviceIndex = devices.findIndex((d) => d.id === deviceId);

      if (deviceIndex === -1) {
        console.warn(`[MQTT] Device not found: ${deviceId}`);
        return;
      }

      const device = devices[deviceIndex];

      if (!device.config) {
        device.config = {
          name: device.name || "设备监控",
          summary: [],
          chart: { data: [] },
          controls: [],
          payload: {},
        };
      }

      const newPayload = mapTelemetryToPayload(device, message);
      const newSummary = updateSummary(device.config, newPayload);
      const now = new Date().toISOString();

      const updatedDevice = {
        ...device,
        config: {
          ...device.config,
          summary: newSummary,
          payload: newPayload,
        },
        lastActive: now,
        lastSeenAt: now,
        updatedAt: now,
        status: message.status || device.status || "online",
      };

      const updatedDevices = [...devices];
      updatedDevices[deviceIndex] = updatedDevice;

      await saveDevicesFn(updatedDevices);

      if (typeof onDevicesUpdated === "function") {
        await onDevicesUpdated(updatedDevices);
      }

      console.log(`[MQTT] Updated device ${deviceId} with telemetry`);
    } catch (error) {
      console.error("[MQTT] Failed to handle message:", error.message);
    }
  };
}

export const handleMqttMessage = createMqttMessageHandler();

/**
 * Subscribe to all device telemetry topics
 * @param {Function} subscribeFn - MQTT subscribe function
 * @param {Array} devices - Array of device objects
 */
export function subscribeAllDevices(subscribeFn, devices) {
  if (!Array.isArray(devices)) {
    console.warn("[MQTT] No devices to subscribe");
    return;
  }
  
  devices.forEach(device => {
    if (device.id) {
      subscribeFn(device.id);
    }
  });
  
  console.log(`[MQTT] Subscribed to ${devices.length} device(s)`);
}

export default {
  createMqttMessageHandler,
  handleMqttMessage,
  subscribeAllDevices,
};
