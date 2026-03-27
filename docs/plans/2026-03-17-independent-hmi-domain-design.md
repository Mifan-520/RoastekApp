# Independent HMI Domain Design

**Date:** 2026-03-17

**Goal**

Create a standalone HMI domain under `C:/Users/Mifan/Desktop/app/HMI` so future device-specific UI work happens in `HMI` only, while the existing `app` frontend/backend remain responsible for users, device ownership, claim flow, and core device records.

**Confirmed Direction**

- Use an independent HMI domain.
- Keep `app/backend` as the device and account authority.
- Keep `app/frontend` as the existing operations app.
- Build a separate HMI frontend/backend under `HMI`.
- Use stable `deviceId` as the per-device HMI directory key, never `claimCode`.
- Also update the existing device seed in `app/backend` to match the requested business data: 10 stable random-like claim codes, 3 pre-bound devices for Fu Zhou San Xi Yan, and preserved configs for those 3 devices.

## Problem Summary

The current system mixes device ownership, seed data, and config-driven UI concerns in the main `app` codebase.

- `app/backend/src/data/devices.js` embeds device config payloads directly in the device seed.
- `app/backend/src/app.js` only offers thin config APIs and resets default config data during device reset.
- `app/frontend/src/app/pages/DeviceUI.tsx` is part of the main app route tree, so future HMI work would keep touching the main frontend.
- `HMI/` already exists physically, but only as empty category folders, with no runtime boundary, no build system, and no backend/API separation.

If we keep extending the current pattern, every new device-specific HMI screen will keep coupling UI work to the main app's frontend/backend and make per-device customization harder.

## Target Architecture

### 1. Domain Boundary

Split responsibilities into two domains:

**Device domain (`app`)**
- User auth
- Device claim/unclaim
- Device seed and ownership
- Device metadata (name, type, location, address, status)
- Stable lookup of which HMI resource belongs to which device

**HMI domain (`HMI`)**
- Device-specific UI packages
- HMI layout/config schemas
- HMI rendering backend/frontend
- Per-device visual resources and page definitions

The HMI domain must consume device identity from the device domain, but must not own device claim rules or account rules.

### 2. Physical Layout

Recommended structure:

```text
HMI/
  backend/
    src/
    package.json
  frontend/
    src/
    package.json
  devices/
    ZZ-001/
      manifest.json
      ui/
      assets/
    SD-001/
      manifest.json
      ui/
      assets/
    ...
```

Notes:

- `HMI/frontend` is a standalone frontend app.
- `HMI/backend` is a standalone API/service layer for HMI-specific data access and manifest resolution.
- `HMI/devices/<deviceId>/` is the only place where device-specific HMI files live.
- Existing empty folders like `HMI/生豆处理站/` can later become business-facing grouping folders if still useful, but the runtime lookup key must remain `deviceId`.

### 3. Runtime Model

Recommended runtime flow:

1. User works in the existing `app` system.
2. The device domain returns device records, including a stable `deviceId` and a future `hmiBinding`/`hmiKey` field.
3. When entering an HMI screen, the HMI frontend requests HMI metadata from `HMI/backend`.
4. `HMI/backend` resolves the device's HMI package using `deviceId`.
5. The HMI frontend renders the package for that one device only.

This keeps HMI independent while still allowing the main system to remain the source of truth for ownership.

## Device Seed Strategy

The seed change belongs to the existing `app/backend` device domain, not to `HMI`.

### Required Seed Outcomes

- Replace the current 5-device seed with 10 seeded devices.
- Use 10 stable random-like 8-character claim codes.
- Pre-bind 3 devices to the existing seeded admin-side ownership flow, representing Fu Zhou San Xi Yan devices.
- Preserve config payloads for those 3 pre-bound devices.
- The other 7 devices must not carry default fake config payloads.
- Remove the old default demo-device naming/config behavior that conflicts with the requested business seed.

### Data Rules

For the 3 pre-bound devices:
- Stable `deviceId`
- Stable random-like `claimCode`
- Business-facing names/locations for Fu Zhou San Xi Yan
- Keep meaningful `config` payloads

For the remaining 7 devices:
- Stable `deviceId`
- Stable random-like `claimCode`
- Unbound by default
- `config: null`
- No fake default payloads

### Why Stable, Not Truly Random Each Boot

The user asked for “10 random codes”, but generating new codes on every process start would break tests, documentation, operational lookup, and any future HMI directory mapping. The correct interpretation is random-like seeded codes that look non-sequential but remain stable in source control.

## API Direction

### Existing `app/backend`

Keep the current device APIs for now, but evolve them so they stop injecting unwanted default config data during reset.

Likely adjustments:
- Stop recreating fake default config payloads for unbound devices.
- Keep device ownership and metadata APIs stable.
- Add a lightweight HMI binding field later if needed.

### New `HMI/backend`

Planned responsibilities:
- Resolve `deviceId -> HMI package`
- Return per-device manifest/schema
- Serve device-specific assets or metadata
- Optionally validate HMI manifest shape

This backend should not duplicate device ownership logic.

## Frontend Direction

### Existing `app/frontend`

Do not keep expanding `app/frontend/src/app/pages/DeviceUI.tsx` as the long-term home for HMI work.

Short-term:
- Existing config-driven UI can remain as the current working screen.

Long-term:
- Replace or redirect this entry into the new standalone HMI frontend.

### New `HMI/frontend`

Responsibilities:
- Load per-device HMI manifest from `HMI/backend`
- Render device-specific HMI independently of the main app
- Keep device UI code isolated from main app routes/components

## Per-Device Modification Model

The core requirement is: “以后添加设备组态ui时只改 `HMI`，不要再动 `app` 整体前后端”.

To satisfy that, the modification contract must be:

- Adding a new device HMI should normally mean:
  - add or edit files under `HMI/devices/<deviceId>/`
  - possibly update a manifest or binding entry
  - no required edits to `app/frontend`
  - no required edits to `app/backend` business logic

Only seed/business changes should touch `app/backend`.

## Risks And Controls

### Risk 1: Claim code used as filesystem key

If HMI directories use `claimCode`, future seed changes will break the filesystem structure.

**Control:** use immutable `deviceId` only.

### Risk 2: HMI backend duplicates device authority

If `HMI/backend` starts owning auth or claim logic, the system will fork its truth model.

**Control:** keep ownership/auth in `app/backend`; HMI backend only resolves HMI resources.

### Risk 3: Seed change breaks tests

Current tests hardcode old claim codes and device ids.

**Control:** update backend tests first in TDD order, then update seed.

### Risk 4: Old default config recreation survives reset flow

`resetDevice()` currently recreates default config metadata.

**Control:** remove or narrow that reset behavior so unbound devices stay unconfigured unless explicitly configured.

## Validation Plan

The implementation must prove all of the following:

1. `app/backend` starts with 10 seeded devices.
2. Exactly 3 seeded devices are pre-bound for Fu Zhou San Xi Yan.
3. Those 3 keep their config payloads.
4. The other 7 have no fake default config payloads.
5. `HMI/` contains a real standalone frontend/backend skeleton.
6. Device-specific HMI resources are addressed by `deviceId`.
7. Existing app tests pass after seed updates.
8. New HMI app builds independently.

## Decision Summary

This project should move to a dual-domain model:

- `app/` remains the business/device system.
- `HMI/` becomes the independent HMI system.
- Seed changes happen in `app/backend`.
- Future device-specific HMI work happens in `HMI/` only.

That is the cleanest way to satisfy the user's requirement for separated files, separated code, separated frontend/backend, and per-device customization without repeatedly reopening the main application architecture.
