# Auto Sync And Bugfix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add non-destructive device auto-sync to storage, fix the 28 discovered issues in severity order, and finish the 三元催化 HMI power-control flow.

**架构变更：** 移除 JSON 文件存储支持，仅保留 PostgreSQL 存储。添加合并步骤到 `backend/src/storage.js`，使现有持久化设备保持权威，同时新添加的种子设备和缺失的种子专用字段被安全回填。按严重性降序修复前端问题，从编译/运行时安全开始，然后是类型收紧，最后是三元催化电源状态通过现有的 `updateDeviceConfigPayload()` API 路径连接。

**技术栈：** Node.js, Express, PostgreSQL, React, Vite, TypeScript, lucide-react, node:test, supertest。

---

### Task 1: Add failing backend tests for device auto-sync

**Files:**
- Create: `backend/test/storage-sync.test.js`
- Modify: `backend/src/storage.js`
- Reference: `backend/src/data/devices.js`

**Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { mergeSeedDevices } from "../src/storage.js";
import { seedDevices } from "../src/data/devices.js";

test("mergeSeedDevices appends missing seed devices without overwriting persisted values", () => {
  const existingDevices = [
    {
      ...structuredClone(seedDevices[0]),
      name: "现场设备",
      config: {
        ...structuredClone(seedDevices[0].config),
        payload: {
          ...structuredClone(seedDevices[0].config.payload),
          powerOn: false,
        },
      },
    },
  ];

  const merged = mergeSeedDevices(existingDevices, seedDevices);

  assert.equal(merged.some((device) => device.id === "dev-catalytic-001"), true);
  assert.equal(merged.find((device) => device.id === seedDevices[0].id)?.name, "现场设备");
  assert.equal(merged.find((device) => device.id === seedDevices[0].id)?.config.payload.powerOn, false);
});

test("mergeSeedDevices keeps custom persisted devices not present in seedDevices", () => {
  const customDevice = {
    id: "custom-device-001",
    claimCode: "CUSTOM01",
    name: "用户自建设备",
    type: "自定义",
    location: "现场",
    address: "现场",
    status: "online",
    createdAt: "2026-03-18T08:00:00+08:00",
    updatedAt: "2026-03-18T08:00:00+08:00",
    boundAt: "2026-03-18T08:00:00+08:00",
    connectionHistory: [],
    alarms: [],
    config: null,
  };

  const merged = mergeSeedDevices([customDevice], seedDevices);
  assert.equal(merged.some((device) => device.id === "custom-device-001"), true);
});

test("mergeSeedDevices backfills missing nested seed-only payload fields", () => {
  const existing = structuredClone(seedDevices[1]);
  delete existing.config.payload.powerOn;

  const merged = mergeSeedDevices([existing], seedDevices);
  assert.equal(merged[0].config.payload.powerOn, true);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/storage-sync.test.js`
Expected: FAIL with `mergeSeedDevices is not exported` or equivalent missing-helper error.

**Step 3: Run it again after a clean restart**

Run: `node --test test/storage-sync.test.js`
Expected: Same red result; no flaky setup assumptions.

**Step 4: Record the intended merge rules in a short comment at the top of the test file**

```js
// Existing persisted values win.
// Missing seed devices are appended.
// Missing seed-only fields are backfilled.
// Custom persisted devices are preserved.
```

**Step 5: Commit**

```bash
git add backend/test/storage-sync.test.js
git commit -m "test: cover device seed auto-sync behavior"
```

### Task 2: Implement safe auto-sync in `backend/src/storage.js`

**Files:**
- Modify: `backend/src/storage.js`
- Test: `backend/test/storage-sync.test.js`
- Reference: `backend/src/data/devices.js`

**Step 1: Add merge helpers in `backend/src/storage.js`**

```js
function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function mergeMissingSeedFields(existingValue, seedValue) {
  if (existingValue === undefined) {
    return structuredClone(seedValue);
  }

  if (Array.isArray(existingValue) || Array.isArray(seedValue)) {
    return structuredClone(existingValue);
  }

  if (isPlainObject(existingValue) && isPlainObject(seedValue)) {
    const merged = { ...structuredClone(seedValue), ...structuredClone(existingValue) };

    for (const key of Object.keys(seedValue)) {
      merged[key] = mergeMissingSeedFields(existingValue[key], seedValue[key]);
    }

    return merged;
  }

  return structuredClone(existingValue);
}

export function mergeSeedDevices(existingDevices, latestSeedDevices = seedDevices) {
  const existingById = new Map(existingDevices.map((device) => [device.id, device]));
  const mergedSeedDevices = latestSeedDevices.map((seedDevice) => {
    const existingDevice = existingById.get(seedDevice.id);
    return existingDevice
      ? mergeMissingSeedFields(existingDevice, seedDevice)
      : structuredClone(seedDevice);
  });

  const customDevices = existingDevices.filter(
    (device) => !latestSeedDevices.some((seedDevice) => seedDevice.id === device.id)
  );

  return [...mergedSeedDevices, ...customDevices.map((device) => structuredClone(device))];
}
```

**Step 2: Apply the merge for PostgreSQL startup**

在 `initializePostgresStorage()` 中，读取现有 `devices` 行后，添加：

```js
const payload = existing.rows[0]?.payload;
if (Array.isArray(payload)) {
  const mergedDevices = mergeSeedDevices(payload, seedDevices);
  if (JSON.stringify(mergedDevices) !== JSON.stringify(payload)) {
    await client.query(
      "UPDATE app_state SET payload = $2::jsonb, updated_at = NOW() WHERE state_key = $1",
      ["devices", JSON.stringify(mergedDevices)]
    );
  }
}
```

**Step 3: 删除 JSON 文件存储相关代码**

- 删除 `loadDevices()` 和 `saveDevices()` 函数中处理 JSON 文件的分支
- 删除 `backend/data/devices.json` 文件（如果存在）
- 确保所有存储操作只走 PostgreSQL 路径

**Step 4: Run tests**

运行: `node --test test/storage-sync.test.js`
期望: PASS.

运行: `npm test`
期望: PASS; auth 和 device 测试在合并加载行为后仍能通过。

**Step 5: Verify the original cloud DB problem manually**

- 启动后端，使用在 `dev-catalytic-001` 存在之前创建的数据库快照。
- 以 admin 身份调用 `GET /api/devices`。
- 确认 `dev-catalytic-001` 出现，且现有名称、所有者绑定和 payload 覆盖保持不变。

**Step 6: Commit**

```bash
git add backend/src/storage.js backend/test/storage-sync.test.js
git commit -m "feat: auto-sync new seed devices into PostgreSQL storage (remove JSON support)"
```

### Task 3: Block insecure admin/admin runtime defaults

**Files:**
- Create: `backend/test/config.test.js`
- Modify: `backend/src/config.js`
- Modify: `backend/src/server.js`
- Modify: `.env.example`
- Modify: `backend/README.md`

**Step 1: Write the failing config-validation test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { validateRuntimeConfig } from "../src/config.js";

test("validateRuntimeConfig rejects default admin credentials outside tests", () => {
  assert.throws(
    () => validateRuntimeConfig({ adminUsername: "admin", adminPassword: "admin" }, { isTestRuntime: false }),
    /Default admin credentials are not allowed/
  );
});

test("validateRuntimeConfig allows test defaults during node --test", () => {
  assert.doesNotThrow(() =>
    validateRuntimeConfig({ adminUsername: "admin", adminPassword: "admin" }, { isTestRuntime: true })
  );
});
```

**Step 2: Run test to verify it fails**

Run: `node --test test/config.test.js`
Expected: FAIL because `validateRuntimeConfig()` does not exist yet.

**Step 3: Implement the runtime guard**

Add to `backend/src/config.js`:

```js
const IS_TEST_RUNTIME = process.env.NODE_ENV === "test" || process.execArgv.includes("--test");

export function validateRuntimeConfig(runtimeConfig, options = {}) {
  const isTestRuntime = options.isTestRuntime ?? IS_TEST_RUNTIME;
  if (isTestRuntime) {
    return;
  }

  if (!runtimeConfig.adminUsername || !runtimeConfig.adminPassword) {
    throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD must be set before starting the backend");
  }

  if (runtimeConfig.adminUsername === "admin" && runtimeConfig.adminPassword === "admin") {
    throw new Error("Default admin credentials are not allowed outside tests");
  }
}
```

Then call `validateRuntimeConfig(config);` at the top of `start()` in `backend/src/server.js`.

**Step 4: Update docs and examples**

- In `.env.example`, add explicit non-default `ADMIN_USERNAME` and `ADMIN_PASSWORD` placeholders.
- In `backend/README.md`, remove `admin/admin` as the documented non-test default and explain that tests still use safe test-only defaults.

**Step 5: Verify**

Run: `node --test test/config.test.js test/auth.test.js`
Expected: PASS.

Manual check:
- Run `npm start` without admin env vars and confirm startup fails fast.
- Run again with non-default credentials and confirm `/healthz` succeeds.

**Step 6: Commit**

```bash
git add backend/src/config.js backend/src/server.js backend/test/config.test.js .env.example backend/README.md
git commit -m "fix: block default admin credentials outside tests"
```

### Task 4: Clear the frontend compile and runtime blockers first

**Files:**
- Modify: `frontend/src/app/pages/DeviceList.tsx`
- Modify: `frontend/src/app/pages/DeviceOverview.tsx`
- Modify: `frontend/src/app/pages/DeviceUI.tsx`

**Step 1: Capture the current failing build**

Run: `npm run build`
Expected: FAIL with the reported parser/runtime blockers in `frontend/src/app/pages/DeviceList.tsx`, `frontend/src/app/pages/DeviceOverview.tsx`, or `frontend/src/app/pages/DeviceUI.tsx`.

**Step 2: Fix the `DeviceUI.tsx` null-reference path**

Apply:

```tsx
const selectedConfig = nextConfig && (!configId || nextConfig.id === configId) ? nextConfig : null;
const summaryItems = config?.payload?.summary ?? [];
const controlItems = config?.payload?.controls ?? [];
```

Then render `summaryItems.map(...)` and `controlItems.map(...)` instead of assuming `config.payload` always exists.

**Step 3: Fix the `DeviceOverview.tsx` missing error handling**

Add local error state and surface it in the page instead of silently swallowing the load/delete failures:

```tsx
const [pageError, setPageError] = useState("");
const [alarmActionError, setAlarmActionError] = useState("");
```

Use these states in the load `catch` block and the `handleDeleteAlarm()` `catch` block.

**Step 4: Remove dead alarm-deletion plumbing from `DeviceList.tsx`**

Delete the empty `handleDeleteAlarm()` stub and any dead modal event wiring so the list alarm modal is clearly read-only there.

**Step 5: Verify**

Run: `npm run build`
Expected: Either PASS or only type-specific HMI issues remain.

Manual checks:
- device list renders
- device overview renders
- invalid `configId` falls back to the existing “加载失败，请重试” state instead of throwing

**Step 6: Commit**

```bash
git add frontend/src/app/pages/DeviceList.tsx frontend/src/app/pages/DeviceOverview.tsx frontend/src/app/pages/DeviceUI.tsx
git commit -m "fix: restore frontend build and null-safe page loading"
```

### Task 5: Restore HMI type safety and remove `any`

**Files:**
- Create: `frontend/HMI/types.ts`
- Modify: `frontend/HMI/index.ts`
- Modify: `frontend/HMI/Z字梯/ZLadderHMI.tsx`
- Modify: `frontend/HMI/生豆处理站/BeanStationHMI.tsx`
- Modify: `frontend/HMI/智能仓储/WarehouseHMI.tsx`
- Modify: `frontend/HMI/三元催化/三元催化HMI.tsx`
- Modify: `frontend/src/app/pages/DeviceUI.tsx`

**Step 1: Create a shared HMI prop contract**

```ts
import type { DeviceUiPayload } from "../src/app/services/devices";

export type HMIControlValue =
  | boolean
  | number
  | string
  | DeviceUiPayload["modes"]
  | DeviceUiPayload["countdowns"]
  | null;

export interface HMIComponentProps<TData extends Partial<DeviceUiPayload> = Partial<DeviceUiPayload>> {
  data: TData;
  onControlChange?: (controlId: string, value: HMIControlValue) => void;
}
```

**Step 2: Replace all `any` callback/value usages**

- In `frontend/HMI/index.ts`, change `Record<string, React.ComponentType<any>>` to `Record<string, React.ComponentType<HMIComponentProps>>`.
- In each HMI component, replace `value: any` with the shared `HMIControlValue` contract or a narrower file-local type.
- In `frontend/src/app/pages/DeviceUI.tsx`, keep `handleControlChange(controlId: string, value: HMIControlValue)` aligned with the shared type.

**Step 3: Run the frontend build**

Run: `npm run build`
Expected: PASS without `any`-driven holes in the HMI entry points.

**Step 4: Verify manually**

Open Z字梯、生豆处理站、智能仓储、三元催化 HMI pages and confirm the existing power or edit actions still flow through `DeviceUI.handleControlChange()`.

**Step 5: Commit**

```bash
git add frontend/HMI/types.ts frontend/HMI/index.ts frontend/HMI/Z字梯/ZLadderHMI.tsx frontend/HMI/生豆处理站/BeanStationHMI.tsx frontend/HMI/智能仓储/WarehouseHMI.tsx frontend/HMI/三元催化/三元催化HMI.tsx frontend/src/app/pages/DeviceUI.tsx
git commit -m "refactor: type shared HMI control callbacks"
```

### Task 6: Complete 三元催化 HMI power control

**Files:**
- Modify: `frontend/HMI/三元催化/三元催化HMI.tsx`
- Modify: `frontend/src/app/pages/DeviceUI.tsx`
- Modify: `backend/src/data/devices.js`

**Step 1: Add the missing power UI to `三元催化HMI.tsx`**

Reuse the existing power-toggle card pattern from `frontend/HMI/智能仓储/WarehouseHMI.tsx`:

```tsx
const powerOn = data.powerOn ?? true;

<button
  onClick={() => onControlChange?.("power", !powerOn)}
  className={`w-14 h-8 rounded-full transition-all duration-300 relative ${powerOn ? "bg-[#be123c]" : "bg-white/20"}`}
>
```

Show clear ON/OFF copy and disable start/edit interactions when `powerOn === false`.

**Step 2: Fix the mode-sync effect loop**

Replace the raw sync effect with a guarded update:

```tsx
useEffect(() => {
  const incomingModes = data.modes && data.modes.length > 0 ? data.modes : DEFAULT_MODES;
  setModeParams((current) =>
    JSON.stringify(current) === JSON.stringify(incomingModes) ? current : incomingModes
  );
}, [data.modes]);
```

**Step 3: Fix the countdown closure bug**

Rewrite the countdown interval so phase transitions are driven from one functional update or by mirrored refs for `countMode` and `nextCloseSeconds`, avoiding stale closure reads inside `setInterval()`.

**Step 4: Persist `powerOn` through `DeviceUI.tsx`**

Extend `handleControlChange()`:

```tsx
if (controlId === "power" && typeof value === "boolean") {
  updatedPayload.powerOn = value;
  updatedPayload.controls = (updatedPayload.controls ?? []).map((control) => ({
    ...control,
    active: control.id === "heater-c" || control.id === "fan-c" || control.id === "pump-c"
      ? value
      : control.active,
  }));
}
```

Also keep `powerOn: true` explicit in the catalytic payload inside `backend/src/data/devices.js`.

**Step 5: Verify**

Run: `npm run build`
Expected: PASS.

Manual checks:
- power toggle persists after refresh
- start button is disabled when power is off
- countdown flows 点火中 -> 关机中 -> 停止 without getting stuck
- edited mode parameters persist after refresh

**Step 6: Commit**

```bash
git add frontend/HMI/三元催化/三元催化HMI.tsx frontend/src/app/pages/DeviceUI.tsx backend/src/data/devices.js
git commit -m "feat: complete catalytic converter power controls"
```

### Task 7: Fix the remaining high-severity alarm and page-flow issues

**Files:**
- Modify: `frontend/src/app/pages/DeviceList.tsx`
- Modify: `frontend/src/app/pages/DeviceOverview.tsx`
- Modify: `frontend/src/app/services/devices.ts`

**Step 1: Make the intended alarm-delete behavior explicit**

- Keep the device-list alarm modal read-only in `frontend/src/app/pages/DeviceList.tsx`.
- Keep deletion only in `frontend/src/app/pages/DeviceOverview.tsx`.
- Replace console-only failure handling with visible page state.

```tsx
const [alarmActionError, setAlarmActionError] = useState("");
...
} catch (error) {
  setAlarmActionError(error instanceof Error ? error.message : "删除报警失败");
}
```

**Step 2: Harden service error parsing**

In `frontend/src/app/services/devices.ts`:

```ts
async function parseResponse<T>(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.message === "string" ? payload.message : "请求失败");
  }
  return payload as T;
}
```

**Step 3: Verify**

Run: `npm run build`
Expected: PASS.

Manual checks:
- list modal only displays alarms
- device overview still deletes alarms successfully
- forced delete failures show visible feedback instead of only writing to the console

**Step 4: Commit**

```bash
git add frontend/src/app/pages/DeviceList.tsx frontend/src/app/pages/DeviceOverview.tsx frontend/src/app/services/devices.ts
git commit -m "fix: clarify alarm deletion behavior and page errors"
```

### Task 8: Sweep medium and low issues, then run full regression

**Files:**
- Modify: `frontend/src/app/pages/DeviceList.tsx`
- Modify: `frontend/src/app/pages/DeviceOverview.tsx`
- Modify: `frontend/HMI/index.ts`
- Modify: `frontend/HMI/Z字梯/ZLadderHMI.tsx`
- Modify: `frontend/HMI/生豆处理站/BeanStationHMI.tsx`
- Modify: `frontend/HMI/智能仓储/WarehouseHMI.tsx`
- Modify: `frontend/HMI/三元催化/三元催化HMI.tsx`

**Step 1: Remove medium/low noise while the files are open**

Do one pass for:
- unused imports in `frontend/src/app/pages/DeviceList.tsx` and `frontend/src/app/pages/DeviceOverview.tsx`
- remaining `console.error()` usage in `frontend/src/app/pages/DeviceOverview.tsx`
- formatting-only inconsistencies introduced by the fixes

**Step 2: Run backend verification**

Run: `npm test`
Expected: PASS in `backend/`.

**Step 3: Run frontend verification**

Run: `npm run build`
Expected: PASS in `frontend/`.

**Step 4: Run the manual regression checklist**

- login with configured admin credentials
- confirm 三元催化 appears in environments initialized before it was added
- open each HMI page once and confirm no runtime crashes
- open device details and delete an alarm successfully
- refresh a 三元催化 config after toggling power or editing mode times and confirm values persist

**Step 5: Commit**

```bash
git add frontend/src/app/pages/DeviceList.tsx frontend/src/app/pages/DeviceOverview.tsx frontend/HMI/index.ts frontend/HMI/Z字梯/ZLadderHMI.tsx frontend/HMI/生豆处理站/BeanStationHMI.tsx frontend/HMI/智能仓储/WarehouseHMI.tsx frontend/HMI/三元催化/三元催化HMI.tsx
git commit -m "chore: clean remaining frontend bugfix fallout"
```

**Step 6: Record rollout notes**

Capture these items in the final PR description or handoff note:
- storage auto-sync added
- default admin credentials blocked outside tests
- 三元催化 HMI power control completed
- frontend null-safety and alarm-flow fixes verified

Plan complete and saved to `.sisyphus/plans/auto-sync-and-bugfix-plan.md`.

Two execution options:

**1. Subagent-Driven (this session)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Parallel Session (separate)** - Open a new session with `superpowers:executing-plans`, batch execution with checkpoints.
