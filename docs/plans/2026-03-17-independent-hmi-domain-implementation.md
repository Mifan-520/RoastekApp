# Independent HMI Domain Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a standalone HMI domain under `HMI/` and update `app/backend` seed data to 10 stable random-like device codes with 3 pre-bound Fu Zhou San Xi Yan devices that retain their configs.

**Architecture:** Keep `app/backend` and `app/frontend` as the existing device business system, and introduce a separate `HMI/backend` + `HMI/frontend` runtime boundary. Device ownership and seed data remain in `app/backend`; HMI-specific resources move under `HMI/devices/<deviceId>/` and are resolved by a lightweight HMI backend.

**Tech Stack:** Node.js, Express, React, Vite, TypeScript, existing Node test runner, Docker Compose.

**Operational Note:** After each code update, restart Docker services so container runtime picks up the latest changes.

---

### Task 1: Lock the new device seed contract

**Files:**
- Modify: `backend/test/auth.test.js`
- Modify: `backend/test/time.test.js`
- Modify: `backend/src/data/devices.js`

**Step 1: Write the failing test**

Add/adjust backend tests so they assert:
- initial seeded device count is 10
- exactly 3 devices are pre-bound for Fu Zhou San Xi Yan
- those 3 devices still have config payloads
- unbound devices do not expose fake default configs
- claim flow uses the new stable random-like claim codes

**Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because current seed still has 5 devices and old claim codes.

**Step 3: Write minimal implementation**

Update `backend/src/data/devices.js` with:
- 10 seeded devices
- 10 stable random-like claim codes
- 3 seeded Fu Zhou San Xi Yan devices, pre-bound and preserving payloads
- 7 unbound devices with `config: null`

If needed, update reset/default behavior only enough to stop fake config resurrection for unbound devices.

**Step 4: Run test to verify it passes**

Run: `npm test`

Expected: PASS with all backend tests green.

**Step 5: Commit**

```bash
git add backend/test/auth.test.js backend/test/time.test.js backend/src/data/devices.js
git commit -m "Update seeded devices for independent HMI rollout"
```

### Task 2: Scaffold standalone HMI backend

**Files:**
- Create: `HMI/backend/package.json`
- Create: `HMI/backend/src/app.js`
- Create: `HMI/backend/src/index.js`
- Create: `HMI/backend/src/hmi-registry.js`
- Create: `HMI/backend/test/hmi.test.js`

**Step 1: Write the failing test**

In `HMI/backend/test/hmi.test.js`, assert that:
- the HMI backend starts
- `GET /healthz` returns ok
- `GET /api/hmi/devices/:deviceId` returns manifest data for a known device
- unknown `deviceId` returns 404

**Step 2: Run test to verify it fails**

Run: `node --test test/hmi.test.js`

Expected: FAIL because HMI backend does not exist yet.

**Step 3: Write minimal implementation**

Create a minimal Express app that:
- exposes `/healthz`
- reads device manifests from `HMI/devices/<deviceId>/manifest.json`
- returns a normalized manifest payload

**Step 4: Run test to verify it passes**

Run: `node --test test/hmi.test.js`

Expected: PASS.

**Step 5: Commit**

```bash
git add HMI/backend/package.json HMI/backend/src/app.js HMI/backend/src/index.js HMI/backend/src/hmi-registry.js HMI/backend/test/hmi.test.js
git commit -m "Add standalone HMI backend skeleton"
```

### Task 3: Scaffold standalone HMI frontend

**Files:**
- Create: `HMI/frontend/package.json`
- Create: `HMI/frontend/index.html`
- Create: `HMI/frontend/vite.config.ts`
- Create: `HMI/frontend/src/main.tsx`
- Create: `HMI/frontend/src/App.tsx`
- Create: `HMI/frontend/src/lib/api.ts`

**Step 1: Write the failing test**

Since there is no frontend test harness yet, the executable contract is build-based:
- define the expected app shell behavior in code comments and implementation plan
- use the first `npm run build` as the red/green gate

**Step 2: Run build to verify it fails**

Run: `npm run build`

Expected: FAIL because `HMI/frontend` does not exist yet.

**Step 3: Write minimal implementation**

Create a Vite React app shell that:
- reads a `deviceId`
- calls `HMI/backend`
- renders manifest title/metadata only

**Step 4: Run build to verify it passes**

Run: `npm run build`

Expected: PASS.

**Step 5: Commit**

```bash
git add HMI/frontend/package.json HMI/frontend/index.html HMI/frontend/vite.config.ts HMI/frontend/src/main.tsx HMI/frontend/src/App.tsx HMI/frontend/src/lib/api.ts
git commit -m "Add standalone HMI frontend shell"
```

### Task 4: Introduce per-device HMI manifests

**Files:**
- Create: `HMI/devices/dev-001/manifest.json`
- Create: `HMI/devices/dev-002/manifest.json`
- Create: `HMI/devices/dev-003/manifest.json`
- Modify: `HMI/backend/src/hmi-registry.js`
- Test: `HMI/backend/test/hmi.test.js`

**Step 1: Write the failing test**

Add assertions that the registry:
- resolves manifests by stable `deviceId`
- returns a device-specific title/layout reference
- rejects missing or malformed manifests

**Step 2: Run test to verify it fails**

Run: `node --test test/hmi.test.js`

Expected: FAIL until manifests exist and validation is wired.

**Step 3: Write minimal implementation**

Create the first device manifests using `deviceId` directories, not `claimCode`, and update registry parsing/validation.

**Step 4: Run test to verify it passes**

Run: `node --test test/hmi.test.js`

Expected: PASS.

**Step 5: Commit**

```bash
git add HMI/devices/dev-001/manifest.json HMI/devices/dev-002/manifest.json HMI/devices/dev-003/manifest.json HMI/backend/src/hmi-registry.js HMI/backend/test/hmi.test.js
git commit -m "Add device-scoped HMI manifests"
```

### Task 5: Connect app device records to HMI binding

**Files:**
- Modify: `backend/src/app.js`
- Modify: `backend/src/data/devices.js`
- Modify: `frontend/src/app/services/devices.ts`
- Test: `backend/test/auth.test.js`

**Step 1: Write the failing test**

Add assertions that seeded devices expose a stable HMI binding field, for example `hmiBinding.deviceId` or `hmiKey`, and that it matches the device's immutable id.

**Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because the app API does not expose HMI binding yet.

**Step 3: Write minimal implementation**

Expose a minimal HMI binding field from `backend/src/app.js` and align the frontend service type so the existing app can link into the HMI domain later.

**Step 4: Run test to verify it passes**

Run: `npm test`

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/app.js backend/src/data/devices.js frontend/src/app/services/devices.ts backend/test/auth.test.js
git commit -m "Expose device HMI bindings from app backend"
```

### Task 6: Add HMI deployment entry points

**Files:**
- Modify: `docker-compose.yml`
- Modify: `.gitignore`
- Create: `HMI/frontend/Dockerfile`
- Create: `HMI/backend/Dockerfile`
- Modify: `SERVER_AI_DEPLOYMENT.md`
- Modify: `DEPLOY.md`

**Step 1: Write the failing test**

Use config rendering as the executable contract.

**Step 2: Run config render to verify it fails**

Run: `docker compose config`

Expected: FAIL or omit HMI services because they are not defined yet.

**Step 3: Write minimal implementation**

Add HMI frontend/backend services and document how they are built and routed.

**Step 4: Run config render to verify it passes**

Run: `docker compose config`

Expected: PASS and include HMI services.

**Step 5: Commit**

```bash
git add docker-compose.yml .gitignore HMI/frontend/Dockerfile HMI/backend/Dockerfile SERVER_AI_DEPLOYMENT.md DEPLOY.md
git commit -m "Document and wire standalone HMI deployment"
```

### Task 7: Final verification

**Files:**
- Verify only

**Step 1: Run backend tests**

Run: `npm test`

Expected: PASS.

**Step 2: Run HMI backend tests**

Run: `node --test test/hmi.test.js`

Expected: PASS.

**Step 3: Run frontend builds**

Run:

```bash
npm run build
```

for both `frontend` and `HMI/frontend`.

Expected: PASS.

**Step 4: Render compose config**

Run: `docker compose config`

Expected: PASS and show HMI services.

**Step 5: Commit**

No new commit if verification is clean.

Plan complete and saved to `docs/plans/2026-03-17-independent-hmi-domain-implementation.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints
