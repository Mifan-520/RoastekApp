# LY-001 溧阳一期风机 - 设备接入设计

## 概述

新增设备 LY-001（溧阳一期风机），接入 Goodrive270 变频器，通过有人 DTU RS485 透传 + MQTT 与后端通信。后端主动发 Modbus RTU 指令读取变频器寄存器。

## 设备信息

| 字段 | 值 |
|------|-----|
| 设备ID | `LY-001` |
| 设备名称 | 溧阳一期风机 |
| 设备类型 | `风机设备` |
| 变频器 | Goodrive270（英威腾） |
| DTU | 有人云 4G（纯透传模式） |
| 通信协议 | Modbus RTU over RS485，经 DTU MQTT 透传 |
| 变频器从机地址 | `01H` |
| 位置 | 溧阳 |

## 通信架构

```
后端(Node.js) ──MQTT──→ 有人DTU ──RS485──→ Goodrive270变频器
后端(Node.js) ←─MQTT── 有人DTU ←─RS485── Goodrive270变频器
```

### MQTT 主题

| 方向 | 主题 | 内容格式 |
|------|------|----------|
| 后端 → DTU → 变频器 | `devices/LY-001/command` | Modbus RTU 帧的 Hex 字符串（如 `"0103210000018E36"`） |
| 变频器 → DTU → 后端 | `devices/LY-001/telemetry` | Modbus RTU 应答帧的 Hex 字符串（如 `"0103020031F845"`） |

DTU 配置：
- 订阅 `devices/LY-001/command`，将收到的 Hex 内容通过 RS485 原样发出
- 将 RS485 收到的应答原样发布到 `devices/LY-001/telemetry`
- 波特率与变频器 P14.01 一致（通常 9600，8N1）

## 变频器寄存器

只需读取以下寄存器：

| 地址 | 名称 | 单位 | 比例 |
|------|------|------|------|
| `2100H` | 变频器状态字1 | - | 直接映射 |
| `3000H` | 运行频率 | 0.01Hz | 除以100得Hz |

### 状态字映射（2100H）

| 值 | 含义 | 前端显示 | 色调 |
|----|------|----------|------|
| 0001H | 正转运行 | 正转运行 | emerald |
| 0002H | 反转运行 | 反转运行 | blue |
| 0003H | 停机中 | 已停机 | amber |
| 0004H | 故障中 | 故障 | rose |
| 0005H | POFF状态 | POFF | amber |
| 0006H | 预励磁 | 预励磁 | blue |
| 其他 | 未知 | 未知状态 | slate |

### Modbus RTU 指令

**读状态字（2100H，1个寄存器）**：
- 请求：`01 03 21 00 00 01 [CRC16]`
- 应答：`01 03 02 [高字节] [低字节] [CRC16]`

**读运行频率（3000H，1个寄存器）**：
- 请求：`01 03 30 00 00 01 [CRC16]`
- 应答：`01 03 02 [高字节] [低字节] [CRC16]`

也可合并为一次读取（从 2100H 读 2 个寄存器不可行，因为 2100H 和 3000H 不连续）。

实际方案：发一次合并指令从 3000H 读 2 个寄存器（频率 + 设定频率），状态字单独读。或分别发两条。

**简化方案**：每次轮询发 2 条指令：
1. `01 03 21 00 00 01` — 读状态
2. `01 03 30 00 00 01` — 读频率

间隔 500ms，轮询周期 5 秒。

## 数据模型

### Payload 结构

```js
{
  runningFreq: 45.67,      // 运行频率 Hz
  status: "forward",       // forward/reverse/stopped/fault/poff/preexcitation
  statusText: "正转运行",   // 中文状态描述
  statusTone: "emerald",   // 前端色调
  lastTelemetryAt: "2026-04-28T10:00:00.000Z"
}
```

### 前端 Summary 卡片

| ID | 标签 | 值 | 单位 | 色调 |
|----|------|-----|------|------|
| freq | 运行频率 | 45.67 | Hz | emerald（运行时）/ amber（停机） |
| status | 运行状态 | 正转运行 | - | 按状态映射 |

## 后端实现

### 新增文件

**`backend/src/modbus-poller.js`** — Modbus 轮询模块

职责：
- `buildReadCommand(slaveAddr, startReg, count)` — 组 Modbus RTU 读帧（含 CRC16）
- `parseResponse(hexString)` — 解析应答帧，校验 CRC，返回寄存器值数组
- `mapStatusWord(value)` — 状态字映射为 { status, statusText, tone }
- `startPolling(deviceId, publishFn)` — 启动定时轮询，通过 publishFn 下发指令
- `stopPolling(deviceId)` — 停止轮询

CRC16 算法：标准 Modbus RTU CRC16（多项式 0xA001）。

### 修改文件

**`backend/src/mqtt-handler.js`**：
- `mapTelemetryToPayload` 新增 `"风机设备"` case
- 检测到风机设备类型时，先尝试将 telemetry 作为 Hex 解析（而非 JSON）
- 解析后提取 runningFreq 和 status，构建 payload

**`backend/src/data/devices.js`**：
- seedDevices 新增 LY-001 设备条目
- 设备类型为 `"风机设备"`，包含默认 summary 卡片

**`backend/src/app.js`**：
- MQTT 连接成功后，对风机类型设备启动 Modbus 轮询
- 设备下线时停止轮询

### 轮询生命周期

1. 后端 MQTT 连接成功 → 加载设备列表 → 发现 LY-001 为风机设备
2. 订阅 `devices/LY-001/telemetry`
3. 启动轮询：每 5 秒发 2 条 Modbus 读指令到 `devices/LY-001/command`
4. 收到 telemetry → 解析 Modbus 帧 → 更新设备 payload
5. 设备离线超时 → 停止轮询

## 前端

无需新增页面。设备详情页（DeviceUI）已有的 summary 卡片机制可直接渲染风机数据。

CLAUDE.md 中新增 LY-001 到设备清单表格。

## 范围外

- 远程控制变频器（正转/反转/停机）— 后续可扩展
- 电流、电压等更多寄存器 — 后续按需添加
- DTU 侧配置 — 用户自行配置
