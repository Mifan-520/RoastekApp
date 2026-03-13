export const seedDevices = [
  {
    id: "dev-001",
    claimCode: "A4D7K9P2",
    defaultName: "智能温室节点A1",
    defaultType: "农业传感器",
    defaultLocation: "1号大棚",
    defaultAddress: "上海市青浦区 1号大棚",
    defaultConfigName: "温室主组态",
    status: "online",
    lastActive: "刚刚",
    lastSeenAt: "2026-03-12T08:00:00+08:00",
    createdAt: "2026-03-10T08:00:00+08:00",
    updatedAt: "2026-03-12T08:00:00+08:00",
    boundAt: "2026-03-10T08:30:00+08:00",
    connectionHistory: [
      { id: "ch-1", type: "online", time: "03-12 15:10", label: "设备上线" },
      { id: "ch-2", type: "offline", time: "03-12 14:45", label: "连接断开" },
      { id: "ch-3", type: "online", time: "03-12 09:30", label: "设备上线" }
    ],
    alarms: [],
    ownerId: "user-admin",
    name: "智能温室节点A1",
    type: "农业传感器",
    location: "1号大棚",
    address: "上海市青浦区 1号大棚",
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
    claimCode: "B6F3N8Q1",
    defaultName: "水泵控制终端",
    defaultType: "控制终端",
    defaultLocation: "地下泵房",
    defaultAddress: "上海市松江区 地下泵房",
    defaultConfigName: null,
    status: "offline",
    lastActive: "10分钟前",
    lastSeenAt: "2026-03-12T07:50:00+08:00",
    createdAt: "2026-03-10T09:00:00+08:00",
    updatedAt: "2026-03-12T07:50:00+08:00",
    boundAt: "2026-03-10T09:20:00+08:00",
    connectionHistory: [
      { id: "ch-4", type: "offline", time: "03-12 08:50", label: "连接断开" },
      { id: "ch-5", type: "online", time: "03-12 08:00", label: "设备上线" }
    ],
    alarms: [],
    ownerId: "user-admin",
    name: "水泵控制终端",
    type: "控制终端",
    location: "地下泵房",
    address: "上海市松江区 地下泵房",
    config: null,
  },
  {
    id: "dev-003",
    claimCode: "Q4R8T2VW",
    defaultName: "工厂能耗监测",
    defaultType: "能耗网关",
    defaultLocation: "配电室",
    defaultAddress: "苏州市工业园区 配电室",
    defaultConfigName: "能耗监测组态",
    status: "online",
    lastActive: "1分钟前",
    lastSeenAt: "2026-03-12T07:59:00+08:00",
    createdAt: "2026-03-11T08:00:00+08:00",
    updatedAt: "2026-03-12T07:59:00+08:00",
    boundAt: null,
    connectionHistory: [
      { id: "ch-6", type: "online", time: "03-12 15:10", label: "设备上线" },
      { id: "ch-7", type: "offline", time: "03-12 13:40", label: "连接断开" }
    ],
    alarms: [],
    ownerId: null,
    name: "工厂能耗监测",
    type: "能耗网关",
    location: "配电室",
    address: "苏州市工业园区 配电室",
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
    claimCode: "M7N5P2LX",
    defaultName: "园区采集终端",
    defaultType: "4G 采集终端",
    defaultLocation: "园区北区",
    defaultAddress: "杭州市园区北区 2号机柜",
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
    alarms: [
      { id: "alarm-1", message: "采集延迟偏高", time: "03-12 07:28" }
    ],
    ownerId: null,
    name: "园区采集终端",
    type: "4G 采集终端",
    location: "园区北区",
    address: "杭州市园区北区 2号机柜",
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
    claimCode: "Z8C6V4BN",
    defaultName: "备用采集终端",
    defaultType: "4G DTU",
    defaultLocation: "待分配",
    defaultAddress: "待分配地址",
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
    address: "待分配地址",
    config: null,
  },
];
