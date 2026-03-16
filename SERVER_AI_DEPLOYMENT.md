# Server AI Deployment Quickstart

Read this file first if an AI or automation agent is deploying the app on a Linux server.

## Deployment root

- The real deployable project root is the repository root.
- Run deployment commands in `C:/Users/Mifan/Desktop/app` locally, or the cloned project root on the server.
- Do not deploy from `frontend/docker-compose.yml`; that was leftover nested-repo material and is no longer the source of truth.

## Files to read in order

1. `SERVER_AI_DEPLOYMENT.md`
2. `DEPLOY.md`
3. `docker-compose.yml`
4. `frontend/nginx/default.conf`
5. `.env.example`

## First deployment on a Linux server

1. Clone the repository to a stable path such as `/opt/roastek-app`.
2. Install Docker Engine and the Docker Compose plugin.
3. Enter the repository root.
4. Copy `.env.example` to `.env`.
5. Set a strong `ADMIN_PASSWORD`.
6. Set `FRONTEND_ORIGIN` to the real public origin users will open.
7. Optionally change `WEB_PORT` if `8088` is occupied.
8. Run `bash scripts/server-up.sh`.

Example:

```bash
cd /opt/roastek-app
cp .env.example .env
bash scripts/server-up.sh
```

## Update an existing deployment

1. Enter the repository root.
2. Confirm `.env` still contains the right server values.
3. Run `bash scripts/server-update.sh`.

`server-update.sh` uses `git pull --ff-only`, then rebuilds and restarts the containers.

## Mandatory verification after either script

Run these commands from the repository root:

```bash
docker compose ps
curl http://127.0.0.1:3001/healthz
curl http://127.0.0.1:${WEB_PORT:-8088}
```

Then verify manually:

- the frontend opens from the server's public URL
- the login page loads
- admin login succeeds with the password from `.env`
- `/api` requests work through the frontend container

## Domain and HTTPS recommendation

- For a quick internal rollout, exposing `${WEB_PORT}` is acceptable.
- For a real company domain, place host-level Nginx in front of `127.0.0.1:${WEB_PORT:-8088}`.
- Use `deploy/nginx/reverse-proxy.example.conf` as the starting point.
- If you publish through a domain, `FRONTEND_ORIGIN` must match that public origin.

## Hard rules for AI deployers

- Never deploy from `frontend/docker-compose.yml`.
- Never keep the default placeholder admin password on a real server.
- Never claim success before checking the public URL.
- Never expose `8088` directly to the public internet if host-level Nginx and HTTPS are in front.

## Current architecture note

- The root stack currently runs one `backend` container and one `frontend` container.
- The backend is still fileless/in-memory and is suitable for internal testing or lightweight rollout, not durable production persistence.
