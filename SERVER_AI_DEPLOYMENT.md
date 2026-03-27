# 服务器部署说明

这是仓库内唯一保留的部署文档。AI、自动化脚本和人工部署都以本文件为准。

## 先说结论

可以把**同一套仓库代码**与**同一个根目录 `docker-compose.yml` 架构**部署到 Linux 服务器，但**不能把本地 `.env` 原样照搬到服务器**。

也就是说：

- **代码、Compose、容器结构：可以同构部署**
- **环境变量：必须改成服务器专用值**

## AI 运行边界

- AI 默认运行在本机 Windows 工作区，不是远程 Linux 服务器。
- AI 可负责：本地代码修改、Docker/Compose、本地编译、本地验证、部署文档整理、部署命令生成。
- AI 不会把服务器当成本地终端直接操作；服务器上的真实状态必须由用户在服务器执行后回传日志、截图或命令输出。
- 默认协作流程：**本地 Windows 开发与验证 → GitHub 同步 → 服务器拉取并部署 → 用户回传服务器结果 → AI 继续分析与修正**。

## 部署根目录

- 真正的部署根目录是**仓库根目录**。
- 本地执行时路径是 `C:/Users/Mifan/Desktop/app`。
- 服务器执行时路径是服务器上克隆后的仓库根目录，例如 `/opt/roastek-app`。
- 不要从 `frontend/docker-compose.yml` 部署，根目录 `docker-compose.yml` 才是唯一入口。

## 建议先看的文件

1. `SERVER_AI_DEPLOYMENT.md`（本文件）
2. `docker-compose.yml`
3. `.env.example`
4. `frontend/nginx/default.conf`
5. `deploy/nginx/reverse-proxy.example.conf`

## 当前部署结构

根目录 `docker-compose.yml` 包含 3 个核心服务：

- `postgres`：PostgreSQL 数据库
- `backend`：Node.js 后端 API + MQTT 数据处理
- `frontend`：前端静态站点 + 容器内 Nginx

其中：

- `frontend/nginx/default.conf` 会把 `/api` 和 `/healthz` 反代到 `backend:3001`
- 后端数据持久化到 PostgreSQL volume
- 首次启动时，后端会把 `backend/src/data/devices.js` 中的种子设备同步到数据库，但不会覆盖已有用户数据

## 能不能把本地 app 一比一部署到服务器

不能“一比一复制本地运行环境”，但可以“一比一部署同一套应用代码和 Compose 结构”。

原因：

- 本地 `.env` 中的 `FRONTEND_ORIGIN=http://localhost:8080,http://127.0.0.1:8080` 只适用于本机开发
- 本地 `.env` 中的 `ADMIN_PASSWORD=admin` 属于开发态值，不能用于生产服务器
- 服务器必须改成真实域名或公网访问地址，并使用强密码

## 首次部署（Linux 服务器）

1. 把仓库克隆到稳定目录，例如 `/opt/roastek-app`
2. 安装 Docker Engine 与 Docker Compose 插件
3. 进入仓库根目录
4. 复制 `.env.example` 为 `.env`
5. 修改服务器专用环境变量
6. 执行 `bash scripts/server-up.sh`

示例：

```bash
cd /opt/roastek-app
cp .env.example .env
bash scripts/server-up.sh
```

## 服务器 `.env` 至少要改这些值

- `ADMIN_PASSWORD`：必须改成强密码
- `POSTGRES_PASSWORD`：必须改成强密码
- `FRONTEND_ORIGIN`：改成真实访问地址
- `WEB_PORT`：如果 `8080` 被占用则调整
- `DEVICE_OFFLINE_TIMEOUT_MS`：设备离线超时阈值，默认 15000 毫秒

示例：

```env
WEB_PORT=8080
FRONTEND_ORIGIN=https://your-domain.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=请替换为强密码
POSTGRES_DB=roastek
POSTGRES_USER=roastek
POSTGRES_PASSWORD=请替换为强密码
MQTT_ENABLED=true
MQTT_HOST=8.136.109.228
MQTT_PORT=1883
DEVICE_OFFLINE_TIMEOUT_MS=15000
VITE_API_BASE_URL=/api
```

## MQTT 与本机 / 服务器的关系

- 设备不是“只发给服务器”，而是发给 **MQTT Broker**。
- 只要本机 Docker 里的 backend 和服务器 backend 都连接到同一个 broker，并订阅同一个 topic（如 `devices/SY-001/telemetry`），两边都会各自收到同一条 telemetry。
- 这不等于本机数据库和服务器数据库自动同步；更准确地说，是两边**各自消费同一条 MQTT 消息后，分别更新各自的数据库和内存状态**。
- 如果只想服务器接收 telemetry，本机开发环境就不要同时连接生产 broker，或改用不同 topic / 不同 broker。

## 更新已有部署

在服务器仓库根目录执行：

```bash
bash scripts/server-update.sh
```

这个脚本会：

- 先执行 `git pull --ff-only`
- 再执行 `docker compose up --build -d`
- 最后输出 `docker compose ps`

## 本次同步修复上线说明

这次需要同步到服务器的修复，核心是让 **MQTT telemetry → 后端内存状态 → API → HMI 页面** 使用同一份最新设备状态。

涉及的本次改动重点：

- 后端在收到 MQTT telemetry 后，会同时刷新存储层和 API 进程内存，避免"数据库已更新但 API 还在吐旧 payload"
- 三元催化设备的 telemetry 映射已切换到 ESP32 实际上报字段：`temperature`、`mode`、`countMode`、`restSeconds`、`m1f..m4c`
- 前端三元催化 HMI 已取消本地自跑倒计时和本地假状态，改为直接显示后端返回的真实 telemetry 映射结果
- 后端已增加按 `lastSeenAt` 判定的自动离线逻辑，默认超过 `DEVICE_OFFLINE_TIMEOUT_MS=15000` 毫秒未收到 telemetry 就会在 API 中显示为 `offline`
- 后端已实现设备上下线记录同步：设备从离线恢复上线时（再次收到 telemetry），会在 `connectionHistory` 中自动添加一条"设备上线"记录
- 前端设备详情页的上下线记录区域可展示设备的连接历史（每次上线事件）
- 前端已删除告警页面描述文本"显示当前设备中心的全部告警，包括同步异常与普通设备告警"
- 清理了调试遗留文件 `esp32_time_sync.txt`、`esp32_time_sync.err.txt`
- 前端设备告警列表现已修复无法按时间降序排列的 Bug，保证最新告警始终在最前显示
- 前端三元催化 HMI 现已接入 `syncState`：设备运行中或等待同步期间，会锁定模式切换与倒计时编辑，避免界面误切模式
- 三元催化 HMI 主操作区已统一为：待机时显示"启动 + 复位"，运行中或同步冲突时保留"重置"入口，便于再次下发复位命令
- 同步异常告警文案已统一成现场中文，例如"发送后应进入点火中，设备当前是待机"、"发送的模式时间与设备当前设置不一致"
- 本地联调如修改了前端 HMI 逻辑，不仅要重启容器，还要确保前端镜像重新构建；服务器侧执行 `bash scripts/server-update.sh` 会自动完成 `docker compose up --build -d`
- 同步异常告警现在分成两层：`device.alarms` 保留历史告警，`syncState.activeWarnings` 只表示当前仍在发生的同步异常；因此顶部黄色同步提示会随状态恢复而消失，但报警信息列表不会被自动清空
- 三元催化时间编辑框已改为字符串草稿输入：手机端现在可以先删空再输入，也可以直接保存 `0` 分钟，保存后 HMI 会显示 `00:00`
- 后端已增加离线巡检持久化：设备超时从在线变离线时，会真正写一条"设备离线"到 `connectionHistory`，设备详情页不再只有上线记录

如果服务器还没拉到这次代码，线上页面就仍可能出现以下旧现象：

- 设备卡片活跃时间更新了，但 HMI 温度/模式/倒计时还是旧值
- API 里同时混有旧 summary/controls/countdowns 和新 telemetry 字段
- 页面本地倒计时与设备真实倒计时不一致

因此，这次联调必须严格遵守下面顺序：

1. 先把本机代码同步到 GitHub
2. 再由用户在服务器执行 `bash scripts/server-update.sh`
3. 用户明确回传“服务器已同步完成”
4. 然后才开始打开服务器页面和调用线上 API 做联调

在第 3 步之前，**不能把本地 Docker 重启视为服务器已更新**。

## 本地修改后的默认动作

- 只要修改了影响本地运行态的代码、配置、容器相关脚本或部署文件，默认都要重启 Docker。
- 本仓库默认采用**逐个重启**：`bash scripts/restart-sequential.sh`
- 顺序固定为：`postgres → backend → frontend`
- 每个容器健康或稳定后，才继续下一个

## 部署后必须验证

在服务器仓库根目录执行：

```bash
docker compose ps
curl http://127.0.0.1:${WEB_PORT:-8080}/healthz
curl http://127.0.0.1:${WEB_PORT:-8080}
docker compose exec -T backend sh -lc "wget -qO- http://127.0.0.1:3001/healthz"
```

然后手工确认：

- 前端页面能正常打开
- 登录页正常显示
- 管理员账号能登录
- 前端通过 `/api` 访问后端正常
- 设备数据能正常入库和显示

### 本次同步修复的专项验证

当服务器已经完成这次更新后，再用浏览器和 API 重点核对下面几项是否一致：

- 设备列表卡片中的“活跃于”时间，要能跟随最新 telemetry 刷新
- 三元催化 HMI 当前温度，要与 `/api/devices/:id` / `/api/devices/:id/config` 中的 `payload.temperature` 一致
- HMI 当前模式，要与 `payload.currentMode` 一致
- HMI 当前倒计时状态，要与 `payload.countMode`、`payload.restSeconds` 一致
- HMI 模式参数，要与 `payload.modes` 一致
- 停止发送 telemetry 超过离线阈值后，设备列表和详情页状态要自动从 `online` 变成 `offline`
- 停止发送 telemetry 超过离线阈值后，设备详情页的上下线记录中应新增一条"设备离线"
- 三元催化在点火中或关机中时，模式按钮应不可切换，页面应显示锁定说明
- 当同步警告出现时，页面应保留"重置"按钮，可再次发送复位命令
- 设备告警中的同步异常文案应显示为现场中文，而不是 `0阶段/1阶段` 这类机器式表达
- 同步冲突恢复后，顶部黄色同步提示可以消失，但报警信息列表中的历史同步告警不应自动消失
- 手机端编辑模式时间时，应允许先清空输入框，再输入新值；并且允许把分钟数设置为 `0`

如果需要按固定排障流程继续联调，顺序应为：**先确认服务器已同步完成 → 再打开服务器页面 → 必要时登录并读取 localStorage/token → 再直接调用线上 API 对比页面显示与返回值**。

## 域名与 HTTPS 建议

- 内网临时访问时，可直接使用 `${WEB_PORT}`
- 正式对外时，应在宿主机 Nginx 上反代到 `127.0.0.1:${WEB_PORT:-8080}`
- 使用 `deploy/nginx/reverse-proxy.example.conf` 作为起点
- 如果启用域名访问，`FRONTEND_ORIGIN` 必须与最终公开地址一致

## AI 与部署的硬规则

- 不要从 `frontend/docker-compose.yml` 部署
- 不要把本地开发 `.env` 原样复制到生产服务器
- 不要在正式服务器继续使用弱密码
- 不要在未检查实际访问结果前宣称部署成功
- 不要把服务器日志、线上容器状态、线上数据库状态当作本地可直接观察结果

## 安全与兼容性说明

- `NODE_ENV=production` 时，后端会阻止不安全的默认管理员凭据启动
- 数据卷会保留 PostgreSQL 数据，容器重启和重建不会直接清空业务数据
- 如果之前使用过 JSON 文件存储，后端会在首次 PostgreSQL 启动时自动导入一次旧数据
