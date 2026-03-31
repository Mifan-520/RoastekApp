/**
 * MQTT Message Handler
 * 
 * Processes incoming device telemetry and updates device config.payload
 * Topic format: devices/{deviceId}/telemetry
 * Message format: JSON with device-specific telemetry data
 */

import { saveDevices, loadDevices } from "./storage.js";
import { resolveDeviceStatus, trimConnectionHistory } from "./app.js";

const DEFAULT_CATALYTIC_MODES = [
  { fireMinutes: 5, closeMinutes: 3 },
  { fireMinutes: 5, closeMinutes: 3 },
  { fireMinutes: 5, closeMinutes: 3 },
  { fireMinutes: 5, closeMinutes: 3 },
];

export const CATALYTIC_SYNC_TOLERANCE_SECONDS = 5;

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

function formatCatalyticPhase(countMode) {
  if (countMode === 1) return "点火中";
  if (countMode === 2) return "关机中";
  return "待机";
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

function sanitizeCatalyticPayload(currentPayload) {
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

  return restPayload;
}

function normalizeCatalyticModeMinutes(modes, fallbackModes = DEFAULT_CATALYTIC_MODES) {
  const sourceModes = Array.isArray(modes) && modes.length > 0 ? modes : fallbackModes;

  return [0, 1, 2, 3].map((index) => {
    const mode = sourceModes[index] ?? fallbackModes[index] ?? fallbackModes[0];
    return {
      fireMinutes: toFiniteNumber(mode.fireMinutes, fallbackModes[index]?.fireMinutes ?? 5),
      closeMinutes: toFiniteNumber(mode.closeMinutes, fallbackModes[index]?.closeMinutes ?? 3),
    };
  });
}

function createSyncAlarm(id, message, time) {
  return {
    id,
    message,
    time,
    level: "warning",
  };
}

function appendSyncAlarmHistory(existingAlarms = [], nextSyncAlarms = [], previousActiveWarnings = []) {
  const previousActiveIds = new Set(
    previousActiveWarnings.map((alarm) => String(alarm?.id || "")).filter(Boolean),
  );

  const newHistoryEntries = nextSyncAlarms
    .filter((alarm) => !previousActiveIds.has(String(alarm?.id || "")))
    .map((alarm) => ({
      ...alarm,
      id: `${alarm.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    }));

  return [...existingAlarms, ...newHistoryEntries];
}

function resolveExpectedCatalyticState(expected, referenceDate = new Date()) {
  if (!expected) {
    return null;
  }

  const modes = normalizeCatalyticModeMinutes(expected.modes);
  const currentMode = Math.min(4, Math.max(1, Math.round(toFiniteNumber(expected.currentMode, 1))));
  const initialCountMode = normalizeCountMode(expected.countMode);
  const baseRestSeconds = Math.max(0, Math.round(toFiniteNumber(expected.baseRestSeconds, 0)));
  const updatedAtMs = new Date(expected.updatedAt || referenceDate).getTime();
  const nowMs = referenceDate.getTime();
  const elapsedSeconds = Number.isFinite(updatedAtMs) ? Math.max(0, (nowMs - updatedAtMs) / 1000) : 0;
  const activeMode = modes[currentMode - 1] ?? DEFAULT_CATALYTIC_MODES[0];
  const closeTotalSeconds = Math.round(toFiniteNumber(expected.closeSeconds, activeMode.closeMinutes * 60));

  if (initialCountMode === 1) {
    if (elapsedSeconds < baseRestSeconds) {
      return {
        currentMode,
        countMode: 1,
        restSeconds: Math.max(0, baseRestSeconds - elapsedSeconds),
        powerOn: true,
        modes,
      };
    }

    const remainingCloseSeconds = closeTotalSeconds - (elapsedSeconds - baseRestSeconds);
    if (remainingCloseSeconds > 0) {
      return {
        currentMode,
        countMode: 2,
        restSeconds: remainingCloseSeconds,
        powerOn: true,
        modes,
      };
    }
  }

  if (initialCountMode === 2) {
    const remainingCloseSeconds = closeTotalSeconds - elapsedSeconds;
    if (remainingCloseSeconds > 0) {
      return {
        currentMode,
        countMode: 2,
        restSeconds: remainingCloseSeconds,
        powerOn: true,
        modes,
      };
    }
  }

  return {
    currentMode,
    countMode: 0,
    restSeconds: 0,
    powerOn: false,
    modes,
  };
}

export function buildCatalyticPayload(currentPayload, nextState) {
  const sanitizedPayload = sanitizeCatalyticPayload(currentPayload);
  const modes = normalizeCatalyticModeMinutes(nextState.modes ?? currentPayload.modes);
  const currentMode = Math.min(4, Math.max(1, Math.round(toFiniteNumber(nextState.currentMode, toFiniteNumber(currentPayload.currentMode, 1)))));
  const countMode = normalizeCountMode(nextState.countMode ?? currentPayload.countMode);
  const restSeconds = Math.max(0, toFiniteNumber(nextState.restSeconds, toFiniteNumber(currentPayload.restSeconds, 0)));
  const temperature = toFiniteNumber(nextState.temperature, toFiniteNumber(currentPayload.temperature, 0));
  const powerOn = typeof nextState.powerOn === "boolean" ? nextState.powerOn : countMode !== 0;
  const lastTelemetryAt = typeof nextState.lastTelemetryAt === "string"
    ? nextState.lastTelemetryAt
    : sanitizedPayload.lastTelemetryAt ?? new Date().toISOString();

  return {
    ...sanitizedPayload,
    lastTelemetryAt,
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

function reconcileCatalyticSync(device, telemetryPayload, telemetryTime) {
  const expected = device.syncState?.expected;
  const previousActiveWarnings = Array.isArray(device.syncState?.activeWarnings)
    ? device.syncState.activeWarnings
    : [];

  if (!expected) {
    return {
      alarms: device.alarms || [],
      syncState: {
        ...(device.syncState || {}),
        telemetry: {
          currentMode: telemetryPayload.currentMode,
          countMode: telemetryPayload.countMode,
          restSeconds: telemetryPayload.restSeconds,
          modes: normalizeCatalyticModeMinutes(telemetryPayload.modes),
          lastTelemetryAt: telemetryPayload.lastTelemetryAt ?? telemetryTime,
        },
        activeWarnings: [],
        status: "idle",
        lastCheckedAt: telemetryTime,
      },
    };
  }

  const resolvedExpected = resolveExpectedCatalyticState(expected, new Date(telemetryTime));
  const toleranceSeconds = Math.max(0, Math.round(toFiniteNumber(expected.toleranceSeconds, CATALYTIC_SYNC_TOLERANCE_SECONDS)));
  const nextSyncAlarms = [];

  if (resolvedExpected.currentMode !== telemetryPayload.currentMode) {
    nextSyncAlarms.push(createSyncAlarm(
      `sync-mode-${device.id}`,
      `发送模式${resolvedExpected.currentMode}后，设备当前是模式${telemetryPayload.currentMode}`,
      telemetryTime,
    ));
  }

  if (resolvedExpected.countMode !== telemetryPayload.countMode) {
    nextSyncAlarms.push(createSyncAlarm(
      `sync-phase-${device.id}`,
      `发送后应进入${formatCatalyticPhase(resolvedExpected.countMode)}，设备当前是${formatCatalyticPhase(telemetryPayload.countMode)}`,
      telemetryTime,
    ));
  }

  if (resolvedExpected.countMode !== 0 && telemetryPayload.countMode === resolvedExpected.countMode) {
    const countdownDrift = Math.abs(toFiniteNumber(telemetryPayload.restSeconds, 0) - toFiniteNumber(resolvedExpected.restSeconds, 0));
    if (countdownDrift > toleranceSeconds) {
      nextSyncAlarms.push(createSyncAlarm(
        `sync-countdown-${device.id}`,
        `发送后预计还剩${Math.round(resolvedExpected.restSeconds)}秒，设备当前还剩${telemetryPayload.restSeconds}秒，相差${countdownDrift.toFixed(1)}秒`,
        telemetryTime,
      ));
    }
  }

  const expectedModes = normalizeCatalyticModeMinutes(resolvedExpected.modes);
  const telemetryModes = normalizeCatalyticModeMinutes(telemetryPayload.modes);
  const modeParamMismatches = expectedModes
    .map((mode, index) => {
      const telemetryMode = telemetryModes[index] ?? telemetryModes[0];
      const fireDrift = Math.abs(Math.round(mode.fireMinutes * 60) - Math.round(telemetryMode.fireMinutes * 60));
      const closeDrift = Math.abs(Math.round(mode.closeMinutes * 60) - Math.round(telemetryMode.closeMinutes * 60));
      return fireDrift > toleranceSeconds || closeDrift > toleranceSeconds
        ? `模式${index + 1}(点火相差${fireDrift}秒/关机相差${closeDrift}秒)`
        : null;
    })
    .filter(Boolean);

  if (modeParamMismatches.length > 0) {
    nextSyncAlarms.push(createSyncAlarm(
      `sync-modes-${device.id}`,
      `发送的模式时间与设备当前设置不一致：${modeParamMismatches.join("、")}`,
      telemetryTime,
    ));
  }

  return {
    alarms: appendSyncAlarmHistory(device.alarms || [], nextSyncAlarms, previousActiveWarnings),
    syncState: {
      ...(device.syncState || {}),
      expected,
      telemetry: {
        currentMode: telemetryPayload.currentMode,
        countMode: telemetryPayload.countMode,
        restSeconds: telemetryPayload.restSeconds,
        modes: telemetryModes,
          lastTelemetryAt: telemetryPayload.lastTelemetryAt ?? telemetryTime,
        },
      activeWarnings: nextSyncAlarms,
      status: nextSyncAlarms.length > 0 ? "warning" : "matched",
      lastCheckedAt: telemetryTime,
    },
  };
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
        const temperature = toFiniteNumber(telemetry.temperature, toFiniteNumber(currentPayload.temperature, 0));
        const currentMode = Math.min(4, Math.max(1, Math.round(toFiniteNumber(telemetry.mode, toFiniteNumber(currentPayload.currentMode, 1)))));
        const countMode = normalizeCountMode(telemetry.countMode ?? currentPayload.countMode);
        const restSeconds = Math.max(0, Math.round(toFiniteNumber(telemetry.restSeconds, toFiniteNumber(currentPayload.restSeconds, 0))));
        const modes = buildCatalyticModes(telemetry, currentPayload);
        const powerOn = countMode !== 0;

        return buildCatalyticPayload(currentPayload, {
          ...commonUpdate,
          temperature,
          currentMode,
          countMode,
          restSeconds,
          modes,
          powerOn,
        });
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

      // Check previous status before updating lastSeenAt
      const prevStatus = resolveDeviceStatus(device);

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
        status: "online",
      };

      // Record connection history on status transition (offline -> online)
      if (prevStatus === "offline") {
        const lastHistoryRecord = updatedDevice.connectionHistory?.[updatedDevice.connectionHistory.length - 1] ?? null;
        const historyEntry = {
          id: `ch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: "online",
          time: now,
          label: "设备上线",
        };

        if (lastHistoryRecord?.type !== "online") {
          updatedDevice.connectionHistory = trimConnectionHistory([
            ...(updatedDevice.connectionHistory || []),
            historyEntry,
          ]);
          console.log(`[MQTT] Device ${deviceId} went online, recorded in connectionHistory`);
        }
      }

      if (device.type === "三元催化" || device.type === "催化设备") {
        const { alarms, syncState } = reconcileCatalyticSync(updatedDevice, newPayload, now);
        updatedDevice.alarms = alarms;
        updatedDevice.syncState = syncState;
      }

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
