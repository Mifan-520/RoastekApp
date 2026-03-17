# Server Deployment Guide

If a server-side AI is doing the deployment, read `SERVER_AI_DEPLOYMENT.md` first and then use this file for the longer checklist.

## What to upload to GitHub

Upload the whole project except ignored files. The root `.gitignore` already excludes `node_modules`, build outputs, logs, and local `.env` files.

## What to copy to the cloud server

Recommended structure on Linux:

```bash
/opt/roastek-app
```

You can either:

1. `git clone` the repository on the server
2. or upload the project directory manually

## First run on server

```bash
cp .env.example .env
edit .env and set ADMIN_PASSWORD, POSTGRES_PASSWORD, FRONTEND_ORIGIN
bash scripts/server-up.sh
```

Open:

- `http://server-ip:8088`

For a real server domain, set `FRONTEND_ORIGIN` in `.env` to the exact public origin users will open, for example `https://app.your-company.com`.

## PostgreSQL persistence and one-time migration

Current stack stores device state in PostgreSQL (`postgres` service + `backend` `DATABASE_URL`).

- `backend` starts only after PostgreSQL healthcheck passes
- On first startup with empty DB, backend creates `app_state` table automatically
- If `/app/data/devices.json` exists (legacy JSON mode), backend imports it once into PostgreSQL

For existing server deployments that already used the old `roastek-data` volume, keep that volume when upgrading. It is mounted read-only to `/app/data` so the backend can auto-import legacy data on first PostgreSQL boot.

After confirming data migrated, you can optionally stop mounting legacy JSON by removing `LEGACY_DEVICES_FILE` and the read-only `/app/data` volume mapping in `docker-compose.yml`.

## Update after pushing to GitHub

```bash
bash scripts/server-update.sh
```

`server-update.sh` now uses `git pull --ff-only` so deployment stops instead of creating an unexpected merge commit on the server.

## Server AI execution flow

If another AI agent runs deployment inside the Linux server, use this exact order:

1. Read `SERVER_AI_DEPLOYMENT.md`
2. Run `bash scripts/server-update.sh`
3. Check `docker compose ps` and `docker compose logs backend --tail=200`
4. Verify backend health and DB path:

```bash
curl -fsS http://127.0.0.1:3001/healthz
docker exec roastek-backend printenv DATABASE_URL
```

5. Verify frontend and API from public entrypoint:

```bash
curl -I http://127.0.0.1:${WEB_PORT:-8088}
curl -fsS http://127.0.0.1:${WEB_PORT:-8088}/api/healthz
```

If any step fails, stop and inspect `docker compose logs` before retry.

## Public network ports (important)

Recommended production exposure:

- Open internet: `80/443` only (through host-level Nginx)
- SSH management: `22` (restricted source IP)
- Keep `8088` internal/private if host-level Nginx is used
- Do not expose PostgreSQL `5432` publicly

If you are in initial internal testing and temporarily expose `${WEB_PORT:-8088}`, still keep `5432` closed.

## Deployment-only UI style drift (resolved)

If UI looks different only after deployment (especially HMI pages), check Tailwind source scanning first.

This repo now includes `frontend/HMI/**` in Tailwind scan sources (`frontend/src/styles/tailwind.css`), fixing a production build issue where HMI classes were omitted and pages degraded to fallback/white styling.

## Do you still need Nginx?

Short answer: `yes, but you already have one layer of Nginx inside the frontend container`.

### Current setup

The project already uses Nginx inside `frontend` for two jobs:

1. serve the built frontend static files
2. forward `/api` requests to the backend container

That means the project can already run directly with Docker Compose, even without an extra server-level Nginx.

### When extra server-level Nginx is useful

Add another Nginx on the Linux server when you need:

1. domain binding such as `app.your-company.com`
2. HTTPS certificates
3. port `80/443` entry instead of exposing `8088`
4. unified reverse proxy for multiple internal systems on one server

### Practical recommendation

- For local development or first internal deployment: current Docker Compose is enough
- For formal company access by domain and HTTPS: add server-level Nginx in front of `127.0.0.1:8088`

If you use host-level Nginx, do not expose `8088` directly to the public internet. Let external traffic enter through `80/443` only.

An example host Nginx config is provided in `deploy/nginx/reverse-proxy.example.conf`.

## Current stack note

- The repository-root stack is the real deployable stack.
- `frontend/docker-compose.yml` and its related deployment docs were old nested-repo leftovers and should not be used anymore.
