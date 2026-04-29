# CQ-001 重庆风机设备接入计划

## Context
新增一台与 LY-001 完全相同的重庆风机设备 CQ-001，Modbus RTU 透传 + Goodrive270 变频器，逻辑/UI 完全复用现有风机框架。

## 需要修改的文件

### 1. `backend/src/data/devices.js` (~行 146 后)
- 复制 `lyFanPayload`，新增 `cqFanPayload`（改标题 `重庆风机运行状态`）
- 复制 LY-001 设备条目（~行 297-321），新增 CQ-001 条目放在其后
- 字段变更：
  - id → `CQ-001`
  - claimCode → `CQFAN001`
  - defaultName/name → `重庆风机`
  - defaultType/type → `风机设备`（不变）
  - defaultLocation/location → `重庆`
  - defaultAddress/address → `重庆`
  - defaultConfigName → `重庆风机监控`
  - config.id → `config-cq`
  - config.name → `重庆风机监控`
  - config.payload → `cqFanPayload`
  - createdAt/updatedAt → `2026-04-29T10:00:00+08:00`

### 2. `backend/src/storage.js` (~行 291)
- `mergeDeviceIntoSeed` 中把条件从 `seedDevice.id === "LY-001"` 改为 `["LY-001", "CQ-001"].includes(seedDevice.id)`

### 无需修改的文件
- `backend/src/mqtt-handler.js` — 风机逻辑已通过 `case "风机设备"` 统一处理
- `backend/src/modbus-poller.js` — 轮询逻辑按 deviceId 通用
- `frontend/` — 前端根据设备类型动态渲染
- `backend/src/app.js` — 路由通用

### 3. `CLAUDE.md` 设备清单表
- 新增一行：`CQ-001 | 重庆风机 | 活跃 | Goodrive270变频器 | 有人云 4G | Modbus RTU透传`

## 验证步骤
1. `cd backend && npm test` 全部通过
2. `cd backend && npm run dev` 启动无报错
3. `cd frontend && npm run dev`，访问 `/devices` 确认 CQ-001 出现在设备列表
4. 访问 `/devices/CQ-001/config/config-cq` 确认 UI 正常渲染
