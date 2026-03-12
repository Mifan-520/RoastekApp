export interface Device {
  id: string;
  name: string;
  status: "online" | "offline";
  lastActive: string;
  type: string;
  location: string;
  imageUrl?: string;
}

export interface DeviceConfig {
  id: string;
  name: string;
  iconType: string;
  description: string;
}

export interface Alarm {
  id: string;
  deviceId: string;
  level: "warning" | "error" | "info";
  message: string;
  time: string;
}

export const MOCK_DEVICES: Device[] = [
  {
    id: "dev-001",
    name: "智能温室节点A1",
    status: "online",
    lastActive: "03-12 15:10",
    type: "农业传感器",
    location: "1号大棚",
  },
  {
    id: "dev-002",
    name: "水泵控制终端",
    status: "offline",
    lastActive: "03-12 14:50",
    type: "控制终端",
    location: "地下泵房",
  },
  {
    id: "dev-003",
    name: "工厂能耗监测",
    status: "online",
    lastActive: "03-12 15:12",
    type: "能耗网关",
    location: "配电室",
  },
];

export const MOCK_CONFIGS: Record<string, DeviceConfig[]> = {
  "dev-001": [
    { id: "cfg-env", name: "环境监控组态", iconType: "thermometer", description: "温湿度实时监测与设备控制" }
  ],
  "dev-002": [
    { id: "cfg-pump", name: "控制面板组态", iconType: "power", description: "设备运行状态及启停控制" }
  ],
  "dev-003": [
    { id: "cfg-power", name: "能耗监控组态", iconType: "zap", description: "核心参数及能耗监控" }
  ]
};

export const MOCK_ALARMS: Alarm[] = [
  {
    id: "al-1",
    deviceId: "dev-001",
    level: "warning",
    message: "1号大棚温度偏高，请注意检查通风设备",
    time: "03-12 15:00"
  },
  {
    id: "al-2",
    deviceId: "dev-002",
    level: "error",
    message: "水泵进水管网压力异常降低，设备已停机",
    time: "03-12 14:15"
  },
  {
    id: "al-3",
    deviceId: "dev-001",
    level: "info",
    message: "土壤湿度传感器信号微弱",
    time: "03-12 13:45"
  }
];
