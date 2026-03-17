# Config-Driven Device UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the device configuration screen so the frontend renders a minimal UI from backend `config.payload` instead of hard-coded widgets.

**Architecture:** Keep the current single-device config API, but standardize `config.payload` to a small schema with `summary`, `chart`, and `controls` sections. The backend stays the source of truth for payload data, while the frontend `DeviceUI` becomes a pure renderer with an empty-state fallback when payload is missing.

**Tech Stack:** Node test runner, Express, React, Vite, Recharts, TypeScript, existing device service layer.

---

### Task 1: Lock backend payload contract

**Files:**
- Modify: `backend/test/auth.test.js`
- Modify: `backend/src/data/devices.js`
- Modify: `backend/src/app.js`

**Step 1: Write the failing test**

Add a backend test that fetches a seeded device config and asserts:
- `config.payload.summary` is an array of status cards
- `config.payload.chart` contains `title` and `data`
- `config.payload.controls` contains renderable control items

**Step 2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern "returns structured config payload"`
Expected: FAIL because current payload shape still uses `chartData` / `switches` only.

**Step 3: Write minimal implementation**

Update seeded device config payloads in `backend/src/data/devices.js` to the new minimal schema and keep `serializeDevice` / config route behavior compatible in `backend/src/app.js`.

**Step 4: Run test to verify it passes**

Run: `npm test -- --test-name-pattern "returns structured config payload"`
Expected: PASS.

### Task 2: Rebuild DeviceUI as payload-driven renderer

**Files:**
- Modify: `frontend/src/app/services/devices.ts`
- Modify: `frontend/src/app/pages/DeviceUI.tsx`

**Step 1: Write the failing test**

Add a frontend test or, if no test harness exists, first add a small pure helper in `DeviceUI.tsx` or a local utility that maps payload sections to render data, then write a test for that helper.

**Step 2: Run test to verify it fails**

Run the targeted frontend test command for the new helper.
Expected: FAIL because the current page still assumes fixed `chartData` and `switches` keys.

**Step 3: Write minimal implementation**

Update `frontend/src/app/services/devices.ts` types to match the backend payload contract, then refactor `frontend/src/app/pages/DeviceUI.tsx` to:
- render summary cards from `payload.summary`
- render a chart block from `payload.chart`
- render control cards from `payload.controls`
- keep the existing empty-state UI when `payload` is missing

**Step 4: Run test to verify it passes**

Run the targeted frontend test command.
Expected: PASS.

### Task 3: Regression verification

**Files:**
- Modify if needed: `backend/test/time.test.js`

**Step 1: Run backend suite**

Run: `npm test`
Workdir: `backend`
Expected: all backend tests pass.

**Step 2: Run frontend build**

Run: `npm run build`
Workdir: `frontend`
Expected: Vite build succeeds.

**Step 3: Sanity check config page**

Run the smallest available verification for the config screen and confirm there is no hard dependency on the old payload shape.

**Step 4: Commit**

Create atomic commits only after verification passes.
