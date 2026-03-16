# Device Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add stable backend-driven device management with fixed claim codes, role-aware login, editable device naming, and a single editable configuration per device.

**Architecture:** Move device truth into the backend, keep the frontend as a thin client, and treat device deletion as unbinding rather than hard removal. Seed admin/user accounts plus several unclaimed devices with fixed 8-character codes, then expose focused APIs for login, claiming, editing, deleting, and reading one configuration per device.

**Tech Stack:** Express, in-memory data store, Supertest, Vite React, React Router

---

### Task 1: Lock backend auth and device behavior with tests

**Files:**
- Modify: `backend/test/auth.test.js`

**Steps:**
1. Add failing tests for admin and user login roles.
2. Add failing tests for claiming a device with a fixed code.
3. Add failing tests for editing device name/config name and deleting device bindings.
4. Run `npm test` in `backend` and verify failures.

### Task 2: Implement stable backend device store and APIs

**Files:**
- Modify: `backend/src/app.js`
- Modify: `backend/src/data/devices.js`
- Modify: `backend/src/config.js`
- Create if needed: `backend/src/data/users.js`

**Steps:**
1. Add seeded users for admin and user roles.
2. Add seeded unclaimed devices with fixed 8-character claim codes.
3. Expose authenticated endpoints for `/api/auth/login`, `/api/auth/me`, `/api/devices`, `/api/devices/claim`, `/api/devices/:id`, `/api/devices/:id/config`, and delete/unbind.
4. Make device delete reversible by returning the device to the unclaimed pool.
5. Ensure each device has at most one config entry.

### Task 3: Replace frontend mock device flow with backend APIs

**Files:**
- Modify: `frontend/src/app/services/auth.ts`
- Create: `frontend/src/app/services/devices.ts`
- Modify: `frontend/src/app/pages/DeviceList.tsx`

**Steps:**
1. Add token-aware fetch helpers.
2. Load devices from backend on the list page.
3. Use fixed code claim flow for add-device.
4. Wire edit and delete actions to backend.
5. Remove unstable local mock writes that fight server state.

### Task 4: Update settings and detail pages for role/config behavior

**Files:**
- Modify: `frontend/src/app/pages/Settings.tsx`
- Modify: `frontend/src/app/pages/DeviceOverview.tsx`
- Modify: `frontend/src/app/pages/DeviceUI.tsx`

**Steps:**
1. Show current session username and role label in settings.
2. Rename/reshape detail sections around configuration info.
3. Make the single config editable but not deletable.
4. Show `无组态` when a device has no config.
5. Remove unneeded descriptive text like `设备运行状态及启停控制`.

### Task 5: Verify end-to-end behavior

**Files:**
- Verify existing modified files only

**Steps:**
1. Run `npm test` in `backend`.
2. Run `npm run build` in `frontend`.
3. Run browser verification for admin login, user login, add/edit/delete device, and config display.
4. Review for obvious long-term instability such as stale localStorage state or duplicated source of truth.
