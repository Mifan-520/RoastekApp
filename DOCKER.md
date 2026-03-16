# Docker Run Guide

## Important root directory rule

Run every command in this file from `frontend/`.

- Correct: `C:/Users/Mifan/Desktop/app/frontend`
- Wrong: `C:/Users/Mifan/Desktop/app`

The repository root also contains another `docker-compose.yml`, but that stack is not the real deployable app and must not be used for normal app deployment.

## First start

```bash
docker compose up --build -d
```

Open:

- `http://localhost:8088`

Default login:

- username: `admin`
- password: value from `.env`

Local-only shortcut:

- `ALLOW_DEFAULT_PASSWORDS=true` may be used only for local Docker startup with known development credentials.
- Keep `ALLOW_DEFAULT_PASSWORDS=false` for real servers and replace all passwords in `.env`.

## Stop

```bash
docker compose down
```

## Rebuild after code changes

```bash
docker compose up --build -d
```

## Useful checks

```bash
docker compose ps
docker compose logs -f frontend
docker compose logs -f backend
```

## Server migration

1. Copy the whole `app` directory to the Linux server.
2. Install Docker and Docker Compose plugin.
3. Run `docker compose up --build -d` in the project root.
4. Open server port `8088` or set `WEB_PORT=80`/`WEB_PORT=8080` before startup.

If you later add a host-level Nginx for domain and HTTPS, do not expose `8088` to the public internet directly.

## Custom port

If the default port is occupied:

```bash
WEB_PORT=8080 docker compose up --build -d
```

Required `.env` values before first production-style start:

- `FRONTEND_ORIGIN`
- `POSTGRES_PASSWORD`
- `ADMIN_PASSWORD`
- `USER_PASSWORD`
- `ALLOW_DEFAULT_PASSWORDS=false`

## After startup verify all of these

```bash
docker compose ps
docker compose logs --tail 50 backend
docker compose logs --tail 50 frontend
curl http://127.0.0.1:8088
curl http://127.0.0.1:3001/healthz
```

Expected result:

- `roastek-postgres` is healthy
- `roastek-backend` is healthy
- `roastek-frontend` is up
- `/healthz` returns `{"status":"ok"}`
