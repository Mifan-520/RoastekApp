# Server Deployment Guide

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
bash scripts/server-up.sh
```

Open:

- `http://server-ip:8088`

## Update after pushing to GitHub

```bash
bash scripts/server-update.sh
```

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
