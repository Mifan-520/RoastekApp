# Docker Run Guide

## First start

```bash
docker compose up --build -d
```

Open:

- `http://localhost:8088`

Default login:

- username: `admin`
- password: value from `.env`

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
