# 阿里云服务器部署说明

## 目标

在阿里云服务器从 GitHub 拉取 RoastekApp，并使用 Docker Compose 部署：

```text
GitHub -> 阿里云服务器 -> docker compose -> postgres/backend/frontend
```

## 前置条件

- 服务器已安装 Git、Docker、Docker Compose。
- 服务器可以访问 GitHub 仓库：`https://github.com/Mifan-520/RoastekApp.git`
- 阿里云安全组已放行 Web 端口，默认 `8080`。
- 如果 MQTT Broker 在服务器外部，确认 `MQTT_HOST` 和 `MQTT_PORT` 可访问。

## 首次部署

```bash
cd /opt
git clone https://github.com/Mifan-520/RoastekApp.git roastek-app
cd /opt/roastek-app

cp .env.example .env
nano .env
```

`.env` 至少修改以下值：

```env
WEB_PORT=8080
FRONTEND_ORIGIN=http://服务器公网IP:8080
ADMIN_USERNAME=admin
ADMIN_PASSWORD=请改成强密码
POSTGRES_DB=roastek
POSTGRES_USER=roastek
POSTGRES_PASSWORD=请改成强密码
MQTT_ENABLED=true
MQTT_HOST=8.136.109.228
MQTT_PORT=1883
VITE_API_BASE_URL=/api
```

启动：

```bash
bash scripts/server-up.sh
```

检查：

```bash
docker compose ps
docker compose logs backend --tail=50
curl http://127.0.0.1:8080
```

浏览器访问：

```text
http://服务器公网IP:8080
```

默认登录：

```text
admin / .env 中设置的 ADMIN_PASSWORD
```

## 后续更新部署

当本地代码已经推送到 GitHub 后，在服务器执行：

```bash
cd /opt/roastek-app
bash scripts/server-update.sh
```

该脚本会执行：

```text
git pull --ff-only
docker compose up --build -d
docker compose ps
```

## 常用排查

后端健康检查：

```bash
docker compose logs backend --tail=80
docker compose exec backend node -e "fetch('http://127.0.0.1:3001/healthz').then(r=>console.log(r.status)).catch(console.error)"
```

前端无法访问：

```bash
docker compose logs frontend --tail=80
docker compose ps
```

数据库问题：

```bash
docker compose logs postgres --tail=80
```

MQTT 连接问题：

```bash
docker compose logs backend --tail=120 | grep MQTT
```

## 当前设备

- `SY-001`：三元催化，已归档。
- `LY-001`：溧阳一期风机，Goodrive270 变频器 + 有人云 4G DTU。
- `CQ-001`：重庆风机设备，按当前代码配置为设备中心可管理设备。
