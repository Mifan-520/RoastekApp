// Z字梯设备组态
const zLadderPayload = {
  summary: [
    { id: "speed", label: "运行速度", value: "2.4", unit: "m/s", tone: "emerald" },
    { id: "load", label: "当前负载", value: "85", unit: "%", tone: "amber" },
    { id: "efficiency", label: "传输效率", value: "98", unit: "%", tone: "emerald" },
  ],
  chart: {
    title: "Z字梯能耗分布",
    data: [
      { label: "驱动电机", value: 52, color: "#16a34a" },
      { label: "控制系统", value: 18, color: "#facc15" },
      { label: "照明", value: 12, color: "#f97316" },
      { label: "辅助设备", value: 18, color: "#a78bfa" },
    ],
  },
  controls: [
    { id: "motor-z", label: "主驱动电机", description: "运行中", icon: "power", active: true, tone: "emerald" },
    { id: "speed-z", label: "速度控制", description: "2.4 m/s", icon: "gauge", active: true, tone: "amber" },
    { id: "fan-z", label: "散热风机", description: "运行中", icon: "fan", active: true, tone: "emerald" },
  ],
};

// 生豆处理站组态
const beanStationPayload = {
  summary: [
    { id: "temp", label: "处理温度", value: "28", unit: "C", tone: "emerald" },
    { id: "humidity", label: "环境湿度", value: "65", unit: "%", tone: "amber" },
    { id: "throughput", label: "处理量", value: "450", unit: "kg/h", tone: "emerald" },
  ],
  chart: {
    title: "生豆处理站能耗分布",
    data: [
      { label: "分选机", value: 35, color: "#be123c" },
      { label: "输送带", value: 25, color: "#f97316" },
      { label: "除尘系统", value: 22, color: "#facc15" },
      { label: "其他", value: 18, color: "#16a34a" },
    ],
  },
  controls: [
    { id: "sorter-b", label: "分选机", description: "运行中", icon: "power", active: true, tone: "emerald" },
    { id: "conveyor-b", label: "输送带", description: "运行中", icon: "gauge", active: true, tone: "amber" },
    { id: "dust-b", label: "除尘系统", description: "运行中", icon: "fan", active: true, tone: "emerald" },
  ],
};

// 智能仓储组态
const warehousePayload = {
  summary: [
    { id: "capacity", label: "库存容量", value: "78", unit: "%", tone: "amber" },
    { id: "items", label: "存储批次", value: "156", unit: "批", tone: "emerald" },
    { id: "temperature", label: "仓内温度", value: "22", unit: "C", tone: "emerald" },
  ],
  chart: {
    title: "智能仓储能耗分布",
    data: [
      { label: "温控系统", value: 42, color: "#7c3aed" },
      { label: "堆垛机", value: 28, color: "#8b5cf6" },
      { label: "照明", value: 15, color: "#a78bfa" },
      { label: "监控", value: 15, color: "#ddd6fe" },
    ],
  },
  controls: [
    { id: "ac-w", label: "温控系统", description: "制冷中", icon: "power", active: true, tone: "emerald" },
    { id: "stacker-w", label: "堆垛机", description: "待机", icon: "gauge", active: false, tone: "amber" },
    { id: "monitor-w", label: "监控系统", description: "运行中", icon: "fan", active: true, tone: "emerald" },
  ],
};

export const seedDevices = [
  {
    id: "dev-zladder-001",
    claimCode: "ZLADDER01",
    defaultName: "Z字梯",
    defaultType: "输送设备",
    defaultLocation: "福州三喜燕",
    defaultAddress: "福州三喜燕",
    defaultConfigName: "Z字梯组态",
    status: "offline",
    lastActive: "2026-03-17T08:30:00+08:00",
    lastSeenAt: "2026-03-17T08:30:00+08:00",
    createdAt: "2026-03-15T08:00:00+08:00",
    updatedAt: "2026-03-17T08:30:00+08:00",
    boundAt: "2026-03-15T08:30:00+08:00",
    ownerId: "user-admin",
    name: "Z字梯",
    type: "输送设备",
    location: "福州三喜燕",
    address: "福州三喜燕",
    connectionHistory: [
      { id: "conn-1", type: "offline", time: "2026-03-17T08:30:00+08:00", label: "设备离线" },
    ],
    alarms: [],
    config: {
      id: "config-zladder",
      name: "Z字梯组态",
      payload: zLadderPayload,
    },
  },
  {
    id: "dev-bean-001",
    claimCode: "BEAN0001",
    defaultName: "生豆处理站",
    defaultType: "处理设备",
    defaultLocation: "福州三喜燕",
    defaultAddress: "福州三喜燕",
    defaultConfigName: "生豆处理站组态",
    status: "online",
    lastActive: "2026-03-17T09:08:00+08:00",
    lastSeenAt: "2026-03-17T09:08:00+08:00",
    createdAt: "2026-03-15T08:20:00+08:00",
    updatedAt: "2026-03-17T09:08:00+08:00",
    boundAt: "2026-03-15T08:45:00+08:00",
    ownerId: "user-admin",
    name: "生豆处理站",
    type: "处理设备",
    location: "福州三喜燕",
    address: "福州三喜燕",
    connectionHistory: [
      { id: "conn-3", type: "online", time: "2026-03-17T09:08:00+08:00", label: "设备上线" },
    ],
    alarms: [
      {
        id: "alarm-bean-001",
        message: "分选机振动异常，请检查轴承状态",
        time: "2026-03-17T08:45:00+08:00",
        level: "warning",
      },
      {
        id: "alarm-bean-002",
        message: "除尘系统滤芯需更换",
        time: "2026-03-17T07:30:00+08:00",
        level: "info",
      },
    ],
    config: {
      id: "config-bean",
      name: "生豆处理站组态",
      payload: beanStationPayload,
    },
  },
  {
    id: "dev-warehouse-001",
    claimCode: "WAREH001",
    defaultName: "智能仓储",
    defaultType: "仓储设备",
    defaultLocation: "福州三喜燕",
    defaultAddress: "福州三喜燕",
    defaultConfigName: "智能仓储组态",
    status: "online",
    lastActive: "2026-03-17T09:05:00+08:00",
    lastSeenAt: "2026-03-17T09:05:00+08:00",
    createdAt: "2026-03-15T08:40:00+08:00",
    updatedAt: "2026-03-17T09:05:00+08:00",
    boundAt: "2026-03-15T09:00:00+08:00",
    ownerId: "user-admin",
    name: "智能仓储",
    type: "仓储设备",
    location: "福州三喜燕",
    address: "福州三喜燕",
    connectionHistory: [
      { id: "conn-4", type: "online", time: "2026-03-17T09:05:00+08:00", label: "设备上线" },
      { id: "conn-5", type: "offline", time: "2026-03-16T22:00:00+08:00", label: "计划性停机" },
    ],
    alarms: [
      {
        id: "alarm-warehouse-001",
        message: "温控系统压缩机高温预警",
        time: "2026-03-17T08:20:00+08:00",
        level: "warning",
      },
      {
        id: "alarm-warehouse-002",
        message: "库存容量已超过75%，建议调整入库计划",
        time: "2026-03-17T06:00:00+08:00",
        level: "info",
      },
      {
        id: "alarm-warehouse-003",
        message: "堆垛机定位偏差超过阈值",
        time: "2026-03-16T14:30:00+08:00",
        level: "error",
      },
    ],
    config: {
      id: "config-warehouse",
      name: "智能仓储组态",
      payload: warehousePayload,
    },
  },
];