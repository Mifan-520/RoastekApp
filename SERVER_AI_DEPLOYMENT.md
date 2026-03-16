## Server AI Deployment Quickstart

Read this file first if you are an AI deploying the app on a Linux server.

### Deployment root

- The real deployable project root is `frontend/`.
- Do not deploy from the repository root `docker-compose.yml`.
- Use `frontend/docker-compose.yml` and the scripts under `frontend/scripts/`.

### Files to read in order

1. `frontend/SERVER_AI_DEPLOYMENT.md`
2. `frontend/DEPLOY.md`
3. `frontend/DOCKER.md`
4. `frontend/.env.example`

### First deployment on a server

1. Open the repository and enter `frontend/`.
2. Copy `.env.example` to `.env`.
3. Replace all `change-this-*` passwords with real values.
4. Set `FRONTEND_ORIGIN` to the real public URL users will open.
5. Keep `ALLOW_DEFAULT_PASSWORDS=false`.
6. Run `bash scripts/server-up.sh`.

### Update an existing server deployment

1. Enter `frontend/`.
2. Confirm `.env` already contains real server values.
3. Run `bash scripts/server-update.sh`.

`server-update.sh` will do `git pull --ff-only` when the directory is a Git repository, then rebuild and restart the containers.

### Mandatory verification after either script

Run these commands from `frontend/`:

```bash
docker compose ps
curl http://127.0.0.1:3001/healthz
curl http://127.0.0.1:${WEB_PORT:-8088}
```

Then verify all of the following manually:

- The frontend opens from the server's public URL.
- The login page works.
- A real login succeeds.
- The device center loads data.

### Hard rules

- Never use `ALLOW_DEFAULT_PASSWORDS=true` on a real server.
- Never claim deployment is complete before checking the public URL.
- Never use the simplified repository-root stack for normal app deployment.
- If domain and HTTPS are required, place a host-level Nginx in front of `127.0.0.1:8088` and use `frontend/deploy/nginx/reverse-proxy.example.conf` as the starting reference.
