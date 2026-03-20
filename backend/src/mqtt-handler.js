/**
 * MQTT Message Handler
 * 
 * Processes incoming device telemetry and updates device config.payload
 * Topic format: devices/{deviceId}/telemetry
 * Message format: JSON with device-specific telemetry data
 */

import { saveDevices, loadDevices } from "./storage.js";

/**
 * Map telemetry data to device config.payload based on device type
 * @param {Object} device - Device object from storage
 * @param {Object} telemetry - Incoming telemetry data
 * @returns {Object} - Updated config.payload
 */
function mapTelemetryToPayload(device, telemetry) {
  const deviceType = device.type;
  const currentPayload = device.config?.payload || {};
  
  // Common fields for all device types
  const commonUpdate = {
    lastTelemetryAt: new Date().toISOString(),
  };
  
  switch (deviceType) {
    case "三元催化":
      return {
        ...currentPayload,
        ...commonUpdate,
        // Temperature sensors
        inletTemp: telemetry.inletTemp ?? currentPayload.inletTemp ?? 0,
        outletTemp: telemetry.outletTemp ?? currentPayload.outletTemp ?? 0,
        catalystTemp: telemetry.catalystTemp ?? currentPayload.catalystTemp ?? 0,
        // Fan control
        fanSpeed: telemetry.fanSpeed ?? currentPayload.fanSpeed ?? 0,
        fanCurrent: telemetry.fanCurrent ?? currentPayload.fanCurrent ?? 0,
        // System status
        burnerStatus: telemetry.burnerStatus ?? currentPayload.burnerStatus ?? "off",
        purgeStatus: telemetry.purgeStatus ?? currentPayload.purgeStatus ?? "idle",
        // Runtime data
        runtimeHours: telemetry.runtimeHours ?? currentPayload.runtimeHours ?? 0,
        ignitionCount: telemetry.ignitionCount ?? currentPayload.ignitionCount ?? 0,
      };
      
    case "智能仓储":
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
export async function handleMqttMessage(topic, message) {
  try {
    // Extract deviceId from topic: devices/{deviceId}/telemetry
    const match = topic.match(/devices\/([^/]+)\/telemetry/);
    if (!match) {
      console.warn(`[MQTT] Unknown topic format: ${topic}`);
      return;
    }
    
    const deviceId = match[1];
    console.log(`[MQTT] Processing telemetry for device: ${deviceId}`);
    
    // Load current devices
    const devices = await loadDevices();
    const deviceIndex = devices.findIndex(d => d.id === deviceId);
    
    if (deviceIndex === -1) {
      console.warn(`[MQTT] Device not found: ${deviceId}`);
      return;
    }
    
    const device = devices[deviceIndex];
    
    // Ensure device has config
    if (!device.config) {
      device.config = {
        name: device.name || "设备监控",
        summary: [],
        chart: { data: [] },
        controls: [],
        payload: {},
      };
    }
    
    // Map telemetry to payload
    const newPayload = mapTelemetryToPayload(device, message);
    
    // Update summary timestamps
    const newSummary = updateSummary(device.config, newPayload);
    
    // Create updated device
    const updatedDevice = {
      ...device,
      config: {
        ...device.config,
        summary: newSummary,
        payload: newPayload,
      },
      lastSeenAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Update status based on telemetry
      status: message.status || device.status || "online",
    };
    
    // Save updated devices
    const updatedDevices = [...devices];
    updatedDevices[deviceIndex] = updatedDevice;
    
    await saveDevices(updatedDevices);
    
    console.log(`[MQTT] Updated device ${deviceId} with telemetry`);
    
  } catch (error) {
    console.error("[MQTT] Failed to handle message:", error.message);
  }
}

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
  handleMqttMessage,
  subscribeAllDevices,
};
