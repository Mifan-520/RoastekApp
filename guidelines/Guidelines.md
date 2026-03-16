# Roastek AI Guidelines

## Scope and deployment boundary

- The deployable project root is `frontend/`.
- Production-like Docker commands must run from `frontend/`, not from the repository root.
- Use `frontend/docker-compose.yml` as the only valid app stack for deployment.
- Do not deploy or debug against the simplified root stack in `backend/` or the root `docker-compose.yml` when the goal is the real app.

## Frontend and UI rules

- Do not change the existing app UI layout, colors, spacing, or interaction flow unless the user explicitly asks for a UI change.
- Backend convenience changes are allowed, but they must not silently change the current app shell.
- Each device's config UI is independent from the main app UI and can evolve separately.
- Device center statistics must not render an unloaded device list as a real `0/0` value. Keep the existing card layout, but treat first-load and error empty states as placeholders instead of real counts.

## Data and domain rules

- All time-related fields must stay synchronized with backend-controlled values.
- In device editing, only keep device name and device address. Do not reintroduce the removed installation-position field.
- Device list, online/offline state, alarms, and timestamps must come from backend data. Do not hardcode or locally fake them to satisfy the UI.

## Backend and API rules

- `frontend/backend/` is the backend used by the deployable app stack.
- Before changing frontend data handling, read the matching backend route or store logic first.
- If a page depends on async data, do not treat an initial empty array as proof that the backend has zero records.
- Any auth, device, or deployment change must be checked end-to-end across login, `/api/devices`, and Docker startup flow.

## Deployment rules for AI agents

- A server-side AI should start with `frontend/SERVER_AI_DEPLOYMENT.md`, then read `frontend/DEPLOY.md` and `frontend/DOCKER.md` for details.
- Read `frontend/DEPLOY.md` before doing server deployment work.
- Read `frontend/DOCKER.md` before doing local or containerized startup work.
- Server deployment must include all of these checks: `.env` values, `docker compose ps`, backend health endpoint, login verification, and opening the public URL.
- Never assume the server can reuse local default passwords. `ALLOW_DEFAULT_PASSWORDS=true` is for local-only convenience. Keep it `false` on a real server and set strong passwords in `.env`.
