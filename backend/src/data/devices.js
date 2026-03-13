export const seedDevices = [
  {
    id: "dev-001",
    claimCode: "5HXB39VW",
    defaultName: "智能温室节点A1",
    defaultType: "农业传感器",
    defaultLocation: "1号大棚",
    defaultAddress: "无绑定地址",
    defaultConfigName: "温室主组态",
    status: "online",
    lastActive: "刚刚",
    lastSeenAt: "2026-03-12T08:00:00+08:00",
    createdAt: "2026-03-10T08:00:00+08:00",
    updatedAt: "2026-03-12T08:00:00+08:00",
    boundAt: null,
    connectionHistory: [
      { id: "ch-1", type: "online", time: "03-12 15:10", label: "设备上线" },
      { id: "ch-2", type: "offline", time: "03-12 14:45", label: "连接断开" },
      { id: "ch-3", type: "online", time: "03-12 09:30", label: "设备上线" }
    ],
    alarms: [],
    ownerId: null,
    name: "智能温室节点A1",
    type: "农业传感器",
    location: "1号大棚",
    address: "无绑定地址",
    config: {
      id: "default",
      name: "温室主组态",
      payload: {
        chartData: [
          { name: "动力系统", value: 45 },
          { name: "温控系统", value: 30 },
          { name: "照明及其他", value: 25 }
        ],
        switches: { s1: true, s2: false }
      }
    },
  },
  {
    id: "dev-002",
    claimCode: "RQQFRSBA",
    defaultName: "水泵控制终端",
    defaultType: "控制终端",
    defaultLocation: "地下泵房",
    defaultAddress: "无绑定地址",
    defaultConfigName: null,
    status: "offline",
    lastActive: "10分钟前",
    lastSeenAt: "2026-03-12T07:50:00+08:00",
    createdAt: "2026-03-10T09:00:00+08:00",
    updatedAt: "2026-03-12T07:50:00+08:00",
    boundAt: null,
    connectionHistory: [
      { id: "ch-4", type: "offline", time: "03-12 08:50", label: "连接断开" },
      { id: "ch-5", type: "online", time: "03-12 08:00", label: "设备上线" }
    ],
    alarms: [],
    ownerId: null,
    name: "水泵控制终端",
    type: "控制终端",
    location: "地下泵房",
    address: "无绑定地址",
    config: null,
  },
  {
    id: "dev-003",
    claimCode: "32RXMFN9",
    defaultName: "工厂能耗监测",
    defaultType: "能耗网关",
    defaultLocation: "配电室",
    defaultAddress: "无绑定地址",
    defaultConfigName: "能耗监测组态",
    status: "online",
    lastActive: "刚刚",
    lastSeenAt: "2026-03-13T08:00:00+08:00",
    createdAt: "2026-03-11T08:00:00+08:00",
    updatedAt: "2026-03-13T08:00:00+08:00",
    boundAt: null,
    connectionHistory: [
      { id: "ch-6", type: "online", time: "03-13 08:00", label: "设备上线" }
    ],
    alarms: [],
    ownerId: null,
    name: "工厂能耗监测",
    type: "能耗网关",
    location: "配电室",
    address: "无绑定地址",
    config: {
      id: "default",
      name: "能耗监测组态",
      payload: {
        chartData: [
          { name: "动力系统", value: 40 },
          { name: "温控系统", value: 35 },
          { name: "照明及其他", value: 25 }
        ],
        switches: { s1: true, s2: true }
      }
    },
  },
  {
    id: "dev-004",
    claimCode: "9WN62YF8",
    defaultName: "园区采集终端",
    defaultType: "4G 采集终端",
    defaultLocation: "园区北区",
    defaultAddress: "无绑定地址",
    defaultConfigName: "园区采集组态",
    status: "offline",
    lastActive: "30分钟前",
    lastSeenAt: "2026-03-12T07:30:00+08:00",
    createdAt: "2026-03-11T09:00:00+08:00",
    updatedAt: "2026-03-12T07:30:00+08:00",
    boundAt: null,
    connectionHistory: [
      { id: "ch-8", type: "offline", time: "03-12 07:30", label: "连接断开" }
    ],
    alarms: [],
    ownerId: null,
    name: "园区采集终端",
    type: "4G 采集终端",
    location: "园区北区",
    address: "无绑定地址",
    config: {
      id: "default",
      name: "园区采集组态",
      payload: {
        chartData: [
          { name: "动力系统", value: 50 },
          { name: "温控系统", value: 20 },
          { name: "照明及其他", value: 30 }
        ],
        switches: { s1: false, s2: false }
      }
    },
  },
  {
    id: "dev-005",
    claimCode: "MFH4LUWN",
    defaultName: "备用采集终端",
    defaultType: "4G DTU",
    defaultLocation: "待分配",
    defaultAddress: "无绑定地址",
    defaultConfigName: null,
    status: "offline",
    lastActive: "未上线",
    lastSeenAt: null,
    createdAt: "2026-03-11T10:00:00+08:00",
    updatedAt: "2026-03-11T10:00:00+08:00",
    boundAt: null,
    connectionHistory: [],
    alarms: [],
    ownerId: null,
    name: "备用采集终端",
    type: "4G DTU",
    location: "待分配",
    address: "无绑定地址",
    config: null,
  },
  {
    id: "dev-006",
    claimCode: "ZC44A3J8",
    defaultName: "新风监测终端",
    defaultType: "环境监测终端",
    defaultLocation: "2号厂房",
    defaultAddress: "无绑定地址",
    defaultConfigName: "新风监测组态",
    status: "online",
    lastActive: "刚刚",
    lastSeenAt: "2026-03-12T08:05:00+08:00",
    createdAt: "2026-03-11T10:30:00+08:00",
    updatedAt: "2026-03-12T08:05:00+08:00",
    boundAt: null,
    connectionHistory: [
      { id: "ch-9", type: "online", time: "03-12 16:05", label: "设备上线" },
      { id: "ch-10", type: "offline", time: "03-12 15:20", label: "连接断开" }
    ],
    alarms: [],
    ownerId: null,
    name: "新风监测终端",
    type: "环境监测终端",
    location: "2号厂房",
    address: "无绑定地址",
    config: {
      id: "default",
      name: "新风监测组态",
      payload: {
        chartData: [
          { name: "送风机", value: 36 },
          { name: "回风机", value: 34 },
          { name: "过滤单元", value: 30 }
        ],
        switches: { s1: true, s2: false }
      }
    },
  },
  {
    id: "dev-007",
    claimCode: "DRC6AHQJ",
    defaultName: "冷库温湿度节点",
    defaultType: "温湿度节点",
    defaultLocation: "冷库一区",
    defaultAddress: "无绑定地址",
    defaultConfigName: "冷库监测组态",
    status: "online",
    lastActive: "2分钟前",
    lastSeenAt: "2026-03-12T08:03:00+08:00",
    createdAt: "2026-03-11T11:00:00+08:00",
    updatedAt: "2026-03-12T08:03:00+08:00",
    boundAt: null,
    connectionHistory: [
      { id: "ch-11", type: "online", time: "03-12 16:03", label: "设备上线" }
    ],
    alarms: [],
    ownerId: null,
    name: "冷库温湿度节点",
    type: "温湿度节点",
    location: "冷库一区",
    address: "无绑定地址",
    config: {
      id: "default",
      name: "冷库监测组态",
      payload: {
        chartData: [
          { name: "制冷系统", value: 48 },
          { name: "保温系统", value: 27 },
          { name: "照明及其他", value: 25 }
        ],
        switches: { s1: true, s2: true }
      }
    },
  },
  {
    id: "dev-008",
    claimCode: "RRK44GRD",
    defaultName: "锅炉房压力终端",
    defaultType: "压力采集终端",
    defaultLocation: "锅炉房",
    defaultAddress: "无绑定地址",
    defaultConfigName: null,
    status: "offline",
    lastActive: "18分钟前",
    lastSeenAt: "2026-03-12T07:47:00+08:00",
    createdAt: "2026-03-11T11:30:00+08:00",
    updatedAt: "2026-03-12T07:47:00+08:00",
    boundAt: null,
    connectionHistory: [
      { id: "ch-12", type: "offline", time: "03-12 15:47", label: "连接断开" },
      { id: "ch-13", type: "online", time: "03-12 14:12", label: "设备上线" }
    ],
    alarms: [],
    ownerId: null,
    name: "锅炉房压力终端",
    type: "压力采集终端",
    location: "锅炉房",
    address: "无绑定地址",
    config: null,
  },
  {
    id: "dev-009",
    claimCode: "MXCZXD5U",
    defaultName: "污水站液位网关",
    defaultType: "液位网关",
    defaultLocation: "污水处理站",
    defaultAddress: "无绑定地址",
    defaultConfigName: "液位监控组态",
    status: "online",
    lastActive: "刚刚",
    lastSeenAt: "2026-03-12T08:06:00+08:00",
    createdAt: "2026-03-11T12:00:00+08:00",
    updatedAt: "2026-03-12T08:06:00+08:00",
    boundAt: null,
    connectionHistory: [
      { id: "ch-14", type: "online", time: "03-12 16:06", label: "设备上线" },
      { id: "ch-15", type: "offline", time: "03-12 12:46", label: "连接断开" }
    ],
    alarms: [],
    ownerId: null,
    name: "污水站液位网关",
    type: "液位网关",
    location: "污水处理站",
    address: "无绑定地址",
    config: {
      id: "default",
      name: "液位监控组态",
      payload: {
        chartData: [
          { name: "液位监测", value: 55 },
          { name: "联锁控制", value: 20 },
          { name: "辅助系统", value: 25 }
        ],
        switches: { s1: false, s2: true }
      }
    },
  },
  {
    id: "dev-010",
    claimCode: "TNJYS9S7",
    defaultName: "楼宇电表采集器",
    defaultType: "电表采集器",
    defaultLocation: "3号楼配电间",
    defaultAddress: "无绑定地址",
    defaultConfigName: "电表采集组态",
    status: "offline",
    lastActive: "1小时前",
    lastSeenAt: "2026-03-12T07:05:00+08:00",
    createdAt: "2026-03-11T12:30:00+08:00",
    updatedAt: "2026-03-12T07:05:00+08:00",
    boundAt: null,
    connectionHistory: [
      { id: "ch-16", type: "offline", time: "03-12 15:05", label: "连接断开" }
    ],
    alarms: [],
    ownerId: null,
    name: "楼宇电表采集器",
    type: "电表采集器",
    location: "3号楼配电间",
    address: "无绑定地址",
    config: {
      id: "default",
      name: "电表采集组态",
      payload: {
        chartData: [
          { name: "动力回路", value: 44 },
          { name: "照明回路", value: 31 },
          { name: "备用回路", value: 25 }
        ],
        switches: { s1: true, s2: false }
      }
    },
  },
];
