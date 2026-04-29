# Roastek - IoT 设备管理平台

## 技术栈
React + Vite + TypeScript + MUI | Node.js + Express + PostgreSQL | MQTT | Docker Compose

## 架构
```
单片机 → 4G DTU → MQTT Broker → 后端(Node.js) → PostgreSQL
                                              ↓
                                        REST API → 前端(React HMI)
```

## 工作流

### AI 运行环境边界
- 默认环境是**本机 Windows**，不是远程服务器
- AI 负责本地代码修改、Docker 操作、部署文档
- 服务器状态由用户提供截图/日志，AI 不臆测
- 部署流程：本地调试 → GitHub → 服务器拉取 → 用户执行 → 回传结果

### 本地/服务器协作
- 可本地 Docker 复现的问题，优先用 `http://127.0.0.1:8080` 调试
- 用户回传"服务器已同步"前，不能把本地重启视为线上更新
- 临时文件用后立即删除

### Docker
- 逐个重启：`bash scripts/restart-sequential.sh`（postgres → backend → frontend）
- 涉及代码/配置变更时立即重启容器

### GitHub
- 大更新必须同步到 GitHub
- 推送后更新部署文档

## 开发

### 常用命令
```bash
# 后端（端口 3001）
cd backend && npm install && npm run dev

# 前端（端口 8080）
cd frontend && npm install && npm run dev

# Docker
docker compose up -d
bash scripts/restart-sequential.sh
docker compose logs backend --tail=50
```

### 登录凭证
- admin/admin, user/user

### 环境变量
参考 `.env.example`，关键项：PORT, DB配置, MQTT_HOST/PORT, DEVICE_OFFLINE_TIMEOUT_MS

### 关键文件
| 文件 | 用途 |
|------|------|
| `backend/src/app.js` | 后端路由和业务逻辑 |
| `backend/src/mqtt-handler.js` | MQTT 消息处理和设备类型映射 |
| `backend/src/data/devices.js` | 设备种子数据 |
| `frontend/src/app/pages/` | 页面组件 |
| `frontend/src/app/services/` | API 服务 |

## 设备管理框架

> 新增设备时复制模板并填写

### 设备清单

| 设备ID | 设备名称 | 状态 | 单片机 | DTU | 备注 |
|--------|----------|------|--------|-----|------|
| `SY-001` | 三元催化 | 已归档 | ESP32 | 有人云 4G | - |
| `LY-001` | 溧阳一期风机 | 活跃 | Goodrive270变频器 | 有人云 4G | Modbus RTU透传 |

### 新设备配置模板

```markdown
- **设备ID**: `{DEVICE_ID}`
- **设备名称**: {名称}
- **单片机/变频器**: {型号}
- **DTU**: {类型}
- **通信方案**: {Modbus RTU透传 / JSON透传}
- **MCU 引脚**: {GPIO = 功能}
- **业务逻辑**: {功能说明}
```

## 通信协议

| 层级 | 协议 | 说明 |
|------|------|------|
| 单片机 ↔ DTU | UART/JSON 或 Modbus RTU | 取决于设备能力 |
| DTU ↔ 服务器 | MQTT over TCP | 主题: `devices/{id}/telemetry` 和 `command` |
| 前端 ↔ 后端 | REST API | 实时数据考虑 WebSocket |

### DTU 配置模板

| 参数 | 值 |
|------|-----|
| 服务器地址 | `{服务器IP}` |
| 端口 | `1883` |
| Client ID | `{设备ID}` |
| 发布主题 | `devices/{设备ID}/telemetry` |
| 订阅主题 | `devices/{设备ID}/command` |

## 前端约束

### 报表页 `/report`
- 简洁演示页：时间维度切换 + 折线图卡片 + 三张数据卡片
- 直线折线，不要曲线
- 演示数据：生豆1000kg / 烘焙800kg / 包装500kg
- 不加解释性文案

### 设备中心 `/devices`
- 报表入口作为简洁入口卡，点击直接跳转 `/report`
- 不放解释性长文案

### 文案风格
- 只保留标题与数值，不加副标题/提示语/引导语
- 视觉优先"简洁、干净、像成品"

## 自我改进系统

### 学习记录目录
- `.learnings/LEARNINGS.md` - 经验总结
- `.learnings/ERRORS.md` - 错误记录
- `.learnings/FEATURE_REQUESTS.md` - 功能需求

### 触发场景
1. 命令/操作意外失败
2. 用户纠正 AI
3. 发现更好的方法
4. 知识过期或缺失

## 故障排查

```bash
# Docker 容器问题
docker compose logs postgres  # 查看日志
docker compose logs backend
cat .env                      # 检查环境变量

# MQTT 连接失败
# 检查 MQTT_HOST/MQTT_PORT，确认 Broker 可访问，查看后端 [MQTT] 日志

# 前端无法连接后端
# curl http://localhost:3001/healthz，检查 FRONTEND_ORIGIN 环境变量
```

## Codex 协作

### 工作流
Claude Code（架构/计划）→ Codex（执行）→ Claude Code（复盘）

### Codex 执行日志
Codex 每执行完一步，追加写入项目根目录 `.codex-log.md`：
```
## YYYY-MM-DD 任务标题
- 步骤1 [完成] 修改文件: path/to/file1.js, path/to/file2.js
- 步骤2 [失败] 原因: xxx | 修改文件: path/to/file3.js
- 步骤3 [跳过] 原因: 前置步骤失败
```

### Claude Code 复盘
1. 读 `.codex-log.md`（~50行）
2. 只对 [失败] 和关键决策的步骤深入检查
3. `git diff` 验证修改范围
4. 确认后删除 `.codex-log.md`
