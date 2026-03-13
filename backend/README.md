# Roastek Backend

Minimal backend skeleton for local development and later Docker deployment.

Runtime storage:

- PostgreSQL in runtime
- in-memory PostgreSQL for tests via `pg-mem`

## Endpoints

- `GET /healthz`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/auth/profile`
- `PATCH /api/auth/password`
- `GET /api/devices`
- `GET /api/devices/:id`
- `POST /api/devices/claim`
- `PATCH /api/devices/:id`
- `DELETE /api/devices/:id`
- `GET /api/devices/:id/config`
- `PATCH /api/devices/:id/config`

## Local Run

```bash
npm install
npm run dev
```

Default login credentials:

- username: `admin`
- password: `admin`
- username: `user`
- password: `user`

Fixed device codes for local testing:

- `Q4R8T2VW`
- `M7N5P2LX`
- `Z8C6V4BN`

Time fields are synchronized from the backend and updated by server-side logic when binding, editing, and unbinding devices.
