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

- 本地 `.env` 中的 `FRONTEND_ORIGIN=http://localhost:8088,http://127.0.0.1:8088` 只适用于本机开发
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
- `WEB_PORT`：如果 `8088` 被占用则调整

示例：

```env
WEB_PORT=8088
FRONTEND_ORIGIN=https://your-domain.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=请替换为强密码
POSTGRES_DB=roastek
POSTGRES_USER=roastek
POSTGRES_PASSWORD=请替换为强密码
MQTT_ENABLED=true
MQTT_HOST=8.136.109.228
MQTT_PORT=1883
VITE_API_BASE_URL=/api
```

## 更新已有部署

在服务器仓库根目录执行：

```bash
bash scripts/server-update.sh
```

这个脚本会：

- 先执行 `git pull --ff-only`
- 再执行 `docker compose up --build -d`
- 最后输出 `docker compose ps`

## 本地修改后的默认动作

- 只要修改了影响本地运行态的代码、配置、容器相关脚本或部署文件，默认都要重启 Docker。
- 本仓库默认采用**逐个重启**：`bash scripts/restart-sequential.sh`
- 顺序固定为：`postgres → backend → frontend`
- 每个容器健康或稳定后，才继续下一个

## 部署后必须验证

在服务器仓库根目录执行：

```bash
docker compose ps
curl http://127.0.0.1:${WEB_PORT:-8088}/healthz
curl http://127.0.0.1:${WEB_PORT:-8088}
docker compose exec -T backend sh -lc "wget -qO- http://127.0.0.1:3001/healthz"
```

然后手工确认：

- 前端页面能正常打开
- 登录页正常显示
- 管理员账号能登录
- 前端通过 `/api` 访问后端正常
- 设备数据能正常入库和显示

## 域名与 HTTPS 建议

- 内网临时访问时，可直接使用 `${WEB_PORT}`
- 正式对外时，应在宿主机 Nginx 上反代到 `127.0.0.1:${WEB_PORT:-8088}`
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
