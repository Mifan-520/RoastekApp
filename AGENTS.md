# 全局偏好设置

* 语言偏好：后续所有对话统一使用中文。
* 思考与输出：默认以中文进行思考与表达。
* 对话：每次对话开始时要称呼我为米饭。

## 工作流程

### Docker 开发
* 每次修改代码后重启 Docker 容器

### GitHub 同步
* 每次大更新必须同步到 GitHub
* 推送后更新部署文档

### 部署目标
* 最终部署环境：阿里云服务器
* 部署流程：本地 Windows 调试 → GitHub → 服务器克隆 → Docker 部署

## 项目路径

### 单片机项目
* ESP8266-12E-1: `D:\SSSSSSSSSSSSCCCCCCCCCCCCCMMMMMMMMMMMM\ESP32\vscode\esp8266-12E-1`
* 硬件：ESP8266 + CJMCU-752 (SC16IS752 I2C转串口) + 4G DTU
* 开发环境：PlatformIO + VSCode

## 物联网实现目标

### 完整数据流
```
单片机(ESP8266) → 4G DTU → MQTT Broker → 后端(Node.js) → PostgreSQL
                                              ↓
                                        REST API/WebSocket
                                              ↓
                                        前端(React HMI)
```

### 当前状态
- [x] 后端：PostgreSQL + REST API
- [x] 前端：React + HMI 组件
- [ ] 单片机：Modbus RTU 控制（本地调试中）
- [ ] MQTT：待实现
- [ ] 4G DTU 远程通信：待接入

### 通信协议
* 单片机 ↔ DTU: Modbus RTU over UART
* DTU ↔ 服务器: MQTT over TCP
* 前端 ↔ 后端: REST API (实时数据考虑 WebSocket)

## 有人云 DTU 上云架构方案

### 方案 A：单片机(JSON) → 基础DTU → 云端
```
单片机 ──UART/JSON──→ 基础DTU ──MQTT/JSON──→ MQTT Broker ──MQTT──→ 后端(Node.js)
(封装JSON)            (4G透传)                              - 解析JSON
                                                          - 写入PostgreSQL
                                                               ↓
                                                          前端(React)
```

**特点**：
- 单片机自己封装 JSON：`{"temp": 25.5, "status": "running"}`
- DTU 只是透明管道，字节原样转发
- 云端收到 JSON 直接解析，无需协议转换

**适用场景**：自定义设备、有开发能力的单片机项目

---

### 方案 B：PLC → 边缘计算DTU → 云端(JSON)
```
PLC ──PLC协议(MPI)──→ 边缘DTU ──MQTT/JSON──→ MQTT Broker ──MQTT──→ 后端(Node.js)
(西门子/三菱)          (协议转换)                              - 直接存JSON
                       - PLC驱动                               - 控制下发→写寄存器
                       - 读取寄存器
                       - 封装JSON
                               ↓
                          前端(React)
```

**特点**：
- PLC 保持原有通信协议（MPI/PPI/Modbus TCP 等）
- DTU 做边缘计算：内置 PLC 协议驱动，读取寄存器，转 JSON 上传
- 云端直接收 JSON，无需关心 PLC 协议细节

**适用场景**：已有 PLC 系统，不想改动 PLC 程序，快速上云

---

### 方案 C：Modbus设备 → 基础DTU → 云端(Modbus透传)
```
Modbus设备 ──Modbus RTU──→ 基础DTU ──TCP/ModbusRTU──→ 云端Modbus网关 ──JSON──→ 后端
(传感器等)     (01 03...)      (透传)                    - 帧解析
                                                      - 虚拟串口
                                                      - 转成JSON
                                                            ↓
                                                       前端(React)
```

**特点**：
- DTU 透传原始 Modbus RTU 帧（01 03 00 00 00 0A...）
- 云端需要部署 Modbus RTU over TCP 网关
- 网关把 RTU 帧转成 JSON 后再给后端

**适用场景**：纯 Modbus 设备，云端有现成的 SCADA 软件需要直接访问设备

---

### 方案 D：Modbus设备 → 边缘计算DTU → 云端(JSON)
```
Modbus设备 ──Modbus RTU──→ 边缘DTU ──MQTT/JSON──→ MQTT Broker ──MQTT──→ 后端(Node.js)
(传感器等)   (DTU做主站)    - 定时轮询                            - 订阅telemetry
              轮询寄存器     - 解析寄存器                           - 存JSON
                           - 封装JSON {temp:25.5}                - 转发控制→写寄存器
                               ↓                                        ↓
                          MQTT Broker                              前端(React)
```

**特点**：
- DTU 做主站，主动轮询 Modbus 设备寄存器
- DTU 把寄存器数据封装成 JSON：`{"temp": 25.5, "humidity": 60}`
- 云端直接收 JSON，无需 Modbus 协议栈

**适用场景**：Modbus 设备集中，希望云端简化，DTU 集中管理轮询

---

### 方案对比：后端复杂度

| 方案 | 设备类型 | DTU类型 | 上行格式 | 后端实现 | 控制下发 |
|------|----------|---------|----------|----------|----------|
| **A** | 单片机 | 基础DTU | JSON | JSON解析+存储 | MQTT直接下发 |
| **B** | PLC | 边缘DTU | JSON | JSON存储 | MQTT→DTU转PLC |
| **C** | Modbus设备 | 基础DTU | Modbus RTU | **需Modbus网关** | 网关转Modbus |
| **D** | Modbus设备 | 边缘DTU | JSON | JSON存储 | MQTT→DTU写寄存器 |

### 推荐方案

| 场景 | 推荐方案 | 理由 |
|------|----------|------|
| ESP8266自主开发，能封装JSON | **方案A** | 简单直接，云端无需额外处理 |
| 单片机只懂Modbus，不想写JSON | **方案D** | DTU做轮询，单片机保持Modbus从机 |
| 已有PLC，不想改程序 | **方案B** | DTU适配PLC协议 |
| 云端要用现成的组态软件 | **方案C** | 云端软件直接通过虚拟串口访问设备 |

**当前项目推荐：方案A**
- ESP8266 读取传感器 → 封装JSON → 串口发给DTU → 云端直接解析
- 控制下发：后端MQTT→DTU→单片机
