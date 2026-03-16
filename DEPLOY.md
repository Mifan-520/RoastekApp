# Server Deployment Guide

If a server-side AI needs the shortest deployment path, start with `SERVER_AI_DEPLOYMENT.md` first and then use this guide for details.

## One source of truth

This guide assumes the deployable repository root is `frontend/`.

- Clone or pull the GitHub repository that contains `frontend/docker-compose.yml`.
- Run deployment commands inside `frontend/`.
- Do not deploy from the repository root `docker-compose.yml`; that is a different simplified stack.

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
cd frontend
cp .env.example .env
edit .env and replace all change-this-* passwords
bash scripts/server-up.sh
```

For a real server domain, also update `FRONTEND_ORIGIN` in `.env` to your actual public origin, for example `https://app.your-company.com`.

Recommended `.env` rules for a real server:

- `ALLOW_DEFAULT_PASSWORDS=false`
- `ADMIN_PASSWORD` and `USER_PASSWORD` must be strong real values
- `FRONTEND_ORIGIN` must match the public URL users will open
- `WEB_PORT` should match the host port you intentionally expose

Open:

- `http://server-ip:8088`

If you use a public domain and reverse proxy, open that public URL instead of the raw IP:port.

## Update after pushing to GitHub

```bash
bash scripts/server-update.sh
```

Run this command from the repository root after `git clone`. If the directory is not a git repository, the script will skip `git pull` and only rebuild containers.

For this project, the safe deployment flow is:

```bash
cd frontend
bash scripts/server-update.sh
```

That script already does `git pull --ff-only` when `.git` exists, then rebuilds the containers.

## Verification checklist for a server-side AI

After `bash scripts/server-up.sh` or `bash scripts/server-update.sh`, verify all of these before claiming success:

```bash
cd frontend
docker compose ps
curl http://127.0.0.1:3001/healthz
curl http://127.0.0.1:${WEB_PORT:-8088}
```

Then verify the public URL in a browser:

- `http://server-ip:${WEB_PORT:-8088}`
- or your reverse-proxied public domain, such as `https://app.your-company.com`

The deployment is not complete until the app opens from the server's public URL.

## GitHub update rule

When local changes are verified, push the updated `frontend/` repository to GitHub so that a server-side AI can deploy from the latest docs and code without relying on unpublished local state.

## Do you still need Nginx?

Short answer: `yes, but you already have one layer of Nginx inside the frontend container`.

### Current setup

The project already uses Nginx inside the frontend image for two jobs:

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

## PostgreSQL and pgAdmin 4

- PostgreSQL is worth adding when device data, users, claim codes, and time records need stable persistence.
- pgAdmin 4 is optional and is not recommended as a long-running production container on a `2 vCPU / 4 GB RAM` server.
- For this server size, a better default is: run PostgreSQL on the server, and use pgAdmin 4 or DBeaver from your local computer to connect remotely.

## UI architecture note

- The main app UI and each device's configuration UI are treated as separate UI layers.
- Future per-device config screens can be designed independently without forcing the main app shell to change.

## Frontend/backend coordination note

- Login flow, device list loading, and device center summary cards must be checked together.
- Do not treat an initial empty device array as proof that the user has zero devices.
- If the first request has not resolved yet, or it failed before any device data arrived, the summary card should stay in a placeholder state rather than misleading users with a real `0/0` count.
