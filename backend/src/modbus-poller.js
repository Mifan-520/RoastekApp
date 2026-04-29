const DEFAULT_SLAVE_ADDR = 0x01;
const STATUS_REGISTER = 0x2100;
const FREQUENCY_REGISTER = 0x3000;
const DEFAULT_POLL_INTERVAL_MS = 5000;
const DEFAULT_COMMAND_GAP_MS = 500;

const pollers = new Map();
const expectedResponses = new Map();

function normalizeByte(value, fieldName) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 0xff) {
    throw new Error(`${fieldName} must be a byte`);
  }
  return number;
}

function normalizeRegister(value, fieldName) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 0xffff) {
    throw new Error(`${fieldName} must be a 16-bit register`);
  }
  return number;
}

function toHexByte(value) {
  return value.toString(16).padStart(2, "0").toUpperCase();
}

function parseHexBytes(hexString) {
  const normalized = String(hexString || "").trim().replace(/\s+/g, "");

  if (!/^[0-9a-fA-F]+$/.test(normalized) || normalized.length % 2 !== 0) {
    throw new Error("Invalid Modbus hex string");
  }

  return normalized.match(/../g).map((byte) => Number.parseInt(byte, 16));
}

function calculateCrc16(bytes) {
  let crc = 0xffff;

  for (const byte of bytes) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x0001) !== 0
        ? (crc >> 1) ^ 0xa001
        : crc >> 1;
    }
  }

  return crc & 0xffff;
}

function appendCrc(bytes) {
  const crc = calculateCrc16(bytes);
  return [...bytes, crc & 0xff, (crc >> 8) & 0xff];
}

export function buildReadCommand(slaveAddr = DEFAULT_SLAVE_ADDR, startReg, count = 1) {
  const slave = normalizeByte(slaveAddr, "slaveAddr");
  const register = normalizeRegister(startReg, "startReg");
  const registerCount = normalizeRegister(count, "count");
  const bytes = [
    slave,
    0x03,
    (register >> 8) & 0xff,
    register & 0xff,
    (registerCount >> 8) & 0xff,
    registerCount & 0xff,
  ];

  return appendCrc(bytes).map(toHexByte).join("");
}

export function parseResponse(hexString) {
  const bytes = parseHexBytes(hexString);

  if (bytes.length < 7) {
    throw new Error("Modbus response is too short");
  }

  const dataBytes = bytes.slice(0, -2);
  const expectedCrc = calculateCrc16(dataBytes);
  const actualCrc = bytes[bytes.length - 2] | (bytes[bytes.length - 1] << 8);

  if (expectedCrc !== actualCrc) {
    throw new Error("Modbus response CRC mismatch");
  }

  const [slaveAddr, functionCode, byteCount] = dataBytes;
  if (functionCode !== 0x03) {
    throw new Error(`Unsupported Modbus function code: ${functionCode}`);
  }

  if (byteCount % 2 !== 0 || dataBytes.length !== 3 + byteCount) {
    throw new Error("Invalid Modbus register byte count");
  }

  const values = [];
  for (let index = 0; index < byteCount; index += 2) {
    values.push((dataBytes[3 + index] << 8) | dataBytes[4 + index]);
  }

  return {
    slaveAddr,
    functionCode,
    values,
  };
}

export function mapStatusWord(value) {
  switch (value) {
    case 0x0001:
      return { status: "forward", statusText: "正转运行", statusTone: "emerald" };
    case 0x0002:
      return { status: "reverse", statusText: "反转运行", statusTone: "blue" };
    case 0x0003:
      return { status: "stopped", statusText: "已停机", statusTone: "amber" };
    case 0x0004:
      return { status: "fault", statusText: "故障", statusTone: "rose" };
    case 0x0005:
      return { status: "poff", statusText: "POFF", statusTone: "amber" };
    case 0x0006:
      return { status: "preexcitation", statusText: "预励磁", statusTone: "blue" };
    default:
      return { status: "unknown", statusText: "未知状态", statusTone: "slate" };
  }
}

export function recordExpectedResponse(deviceId, register) {
  const key = String(deviceId || "").trim();
  if (!key) {
    return;
  }

  const queue = expectedResponses.get(key) || [];
  queue.push(register);
  expectedResponses.set(key, queue);
}

export function consumeExpectedResponse(deviceId) {
  const key = String(deviceId || "").trim();
  const queue = expectedResponses.get(key) || [];

  if (queue.length === 0) {
    return null;
  }

  const register = queue.shift();
  if (queue.length === 0) {
    expectedResponses.delete(key);
  } else {
    expectedResponses.set(key, queue);
  }

  return register;
}

function publishReadCommand(deviceId, register, publishFn, slaveAddr) {
  const command = buildReadCommand(slaveAddr, register, 1);
  recordExpectedResponse(deviceId, register);
  publishFn(deviceId, command);
}

export function startPolling(deviceId, publishFn, options = {}) {
  const key = String(deviceId || "").trim();
  if (!key || typeof publishFn !== "function") {
    return;
  }

  if (pollers.has(key)) {
    return;
  }

  const slaveAddr = options.slaveAddr ?? DEFAULT_SLAVE_ADDR;
  const intervalMs = options.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const commandGapMs = options.commandGapMs ?? DEFAULT_COMMAND_GAP_MS;
  const setIntervalFn = options.setIntervalFn ?? setInterval;
  const clearIntervalFn = options.clearIntervalFn ?? clearInterval;
  const setTimeoutFn = options.setTimeoutFn ?? setTimeout;
  const clearTimeoutFn = options.clearTimeoutFn ?? clearTimeout;
  const timeouts = new Set();

  const runCycle = () => {
    publishReadCommand(key, STATUS_REGISTER, publishFn, slaveAddr);

    let timeout;
    timeout = setTimeoutFn(() => {
      if (timeout) {
        timeouts.delete(timeout);
      }
      publishReadCommand(key, FREQUENCY_REGISTER, publishFn, slaveAddr);
    }, commandGapMs);

    timeouts.add(timeout);
  };

  runCycle();
  const interval = setIntervalFn(runCycle, intervalMs);

  pollers.set(key, {
    interval,
    timeouts,
    clearIntervalFn,
    clearTimeoutFn,
  });
}

export function stopPolling(deviceId) {
  const key = String(deviceId || "").trim();
  const poller = pollers.get(key);

  if (!poller) {
    return;
  }

  poller.clearIntervalFn(poller.interval);
  for (const timeout of poller.timeouts) {
    poller.clearTimeoutFn(timeout);
  }

  pollers.delete(key);
  expectedResponses.delete(key);
}

export function stopAllPolling() {
  for (const deviceId of [...pollers.keys()]) {
    stopPolling(deviceId);
  }
}

export function isFanDevice(device) {
  return device?.type === "风机设备" || device?.defaultType === "风机设备";
}

export const FAN_REGISTERS = {
  STATUS: STATUS_REGISTER,
  FREQUENCY: FREQUENCY_REGISTER,
};
