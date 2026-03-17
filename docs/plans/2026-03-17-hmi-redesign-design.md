# HMI UI Redesign Design Document

**Date**: 2026-03-17
**Author**: Metis (Pre-Planning Consultant)
**Status**: Approved by User

---

## Overview

Redesign three HMI (Human-Machine Interface) components for IoT devices with ROASTEK company branding (rose/red color theme). The redesign focuses on simplicity, consistency, and mobile-first design.

---

## Design Decisions (User-Confirmed)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Power Control Style | Toggle Switch (滑动开关) | Modern, mobile-friendly, consistent across all HMIs |
| Bean Station Equipment | 6 standard coffee processing units | Cleaner, Destoner, Grader, Dryer, Elevator, Conveyor |
| Warehouse Bin Layout | 2×5 Grid (10 bins) | Balanced appearance, good for both mobile and desktop |

---

## Color Palette (ROASTEK Theme)

| Token | Value | Tailwind Equivalent | Usage |
|-------|-------|---------------------|-------|
| `--roastek-primary` | `#5D1B22` | Custom | Primary buttons, active states, headers |
| `--roastek-secondary` | `#be123c` | `rose-700` | Hover states, highlights |
| `--roastek-accent` | `#fda4af` | `rose-300` | Borders, subtle backgrounds |
| `--roastek-light` | `#fff1f2` | `rose-50` | Card backgrounds, disabled states |

**Implementation**: Add to `frontend/src/styles/theme.css` in `:root` block and create Tailwind mapping in `@theme inline`.

---

## Component Designs

### 1. ZLadderHMI (Z字梯 / 输送设备)

**Requirements**:
- 总电源控件（开/关）- Toggle switch
- 显示变频器速率 - Circular gauge

**Layout**:
```
┌─────────────────────────────────────┐
│  ⚡ 总电源                          │
│  [Toggle Switch: ON/OFF]            │
├─────────────────────────────────────┤
│  📊 变频器速率                      │
│  [Circular Gauge: 0-60 Hz]          │
│  当前: 45 Hz | 设定: 50 Hz          │
└─────────────────────────────────────┘
```

**Data Requirements**:
```typescript
interface ZLadderPayload {
  power: boolean;           // 总电源状态
  frequency: {
    current: number;        // 当前频率 (Hz)
    target: number;         // 目标频率 (Hz)
  };
}
```

---

### 2. BeanStationHMI (生豆处理站 / 处理设备)

**Requirements**:
- 总电源控件（开/关）- Toggle switch
- 监控设备在线状态表 - 6 equipment status cards

**Layout**:
```
┌─────────────────────────────────────┐
│  ⚡ 总电源                          │
│  [Toggle Switch: ON/OFF]            │
├─────────────────────────────────────┤
│  🏭 设备在线状态                    │
│  ┌─────────┬─────────┬─────────┐   │
│  │ 清洁机  │ 去石机  │ 分级机  │   │
│  │   ●     │   ●     │   ○     │   │
│  │  在线   │  在线   │  离线   │   │
│  ├─────────┼─────────┼─────────┤   │
│  │ 烘干机  │ 提升机  │ 输送带  │   │
│  │   ●     │   ●     │   ●     │   │
│  │  在线   │  运行中 │  运行中 │   │
│  └─────────┴─────────┴─────────┘   │
└─────────────────────────────────────┘
```

**Equipment List**:
| ID | Name | Icon | Possible Statuses |
|----|------|------|-------------------|
| `cleaner` | 清洁机 | 🧹 | 在线/离线 |
| `destoner` | 去石机 | ⚙️ | 在线/离线 |
| `grader` | 分级机 | 📊 | 在线/离线 |
| `dryer` | 烘干机 | 🔥 | 在线/离线 |
| `elevator` | 提升机 | ⬆️ | 运行中/停止/离线 |
| `conveyor` | 输送带 | ➡️ | 运行中/停止/离线 |

**Data Requirements**:
```typescript
interface BeanStationPayload {
  power: boolean;
  equipment: Array<{
    id: string;
    name: string;
    status: 'online' | 'offline' | 'running' | 'stopped';
  }>;
}
```

---

### 3. WarehouseHMI (智能仓储 / 仓储设备)

**Requirements**:
- 总电源控件（开/关）- Toggle switch
- 10个仓的重量显示 - 2×5 grid
- 上料/下料开关 - Mode selector
- 选择上料/下料多少kg的输入 - Numeric input + quick select

**Layout**:
```
┌─────────────────────────────────────┐
│  ⚡ 总电源                          │
│  [Toggle Switch: ON/OFF]            │
├─────────────────────────────────────┤
│  📦 仓储重量监控                    │
│  ┌────┬────┬────┬────┬────┐       │
│  │ 1  │ 2  │ 3  │ 4  │ 5  │       │
│  │125 │ 80 │200 │ 45 │175 │ kg   │
│  ├────┼────┼────┼────┼────┤       │
│  │ 6  │ 7  │ 8  │ 9  │ 10 │       │
│  │ 60 │110 │ 95 │150 │ 30 │ kg   │
│  └────┴────┴────┴────┴────┘       │
├─────────────────────────────────────┤
│  🔄 上料/下料控制                   │
│  操作模式: [上料 ○]  [● 下料]      │
│  数量设定: [___50___] kg           │
│  快速选择: [25] [50] [100] [200]   │
│  [执行下料]                         │
└─────────────────────────────────────┘
```

**Data Requirements**:
```typescript
interface WarehousePayload {
  power: boolean;
  bins: Array<{
    id: number;          // 1-10
    weight: number;      // kg
    capacity?: number;   // max capacity (optional, for fill indicator)
  }>;
  operation: {
    mode: 'loading' | 'unloading';
    quantity: number;    // kg
  };
}
```

---

## Shared Components

### PowerToggle
```typescript
interface PowerToggleProps {
  active: boolean;
  onChange: (active: boolean) => void;
  label?: string;  // defaults to "电源开关"
}
```

### StatusIndicator
```typescript
interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'running' | 'stopped';
  label?: string;
}
```

### NumericInput
```typescript
interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
}
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `frontend/src/styles/theme.css` | MODIFY | Add ROASTEK color variables |
| `frontend/src/app/hmi/zladder/ZLadderHMI.tsx` | REWRITE | New simplified design |
| `frontend/src/app/hmi/bean-station/BeanStationHMI.tsx` | REWRITE | New simplified design |
| `frontend/src/app/hmi/warehouse/WarehouseHMI.tsx` | REWRITE | New simplified design |
| `frontend/src/app/hmi/index.ts` | CLEANUP | Remove redundant imports (lines 9-11) |
| `backend/src/data/devices.js` | MODIFY | Update payload schemas for new data structures |

---

## Verification Method

- **Docker-based verification only** (no local dev server)
- Frontend accessible at `http://localhost:8088`
- Test each HMI component renders correctly
- Test toggle switches respond to clicks
- Test numeric input accepts values

---

## Acceptance Criteria

1. ✅ All three HMIs display ROASTEK rose/red theme
2. ✅ Power toggle switches work (UI state changes)
3. ✅ ZLadder: Frequency gauge displays value
4. ✅ Bean Station: 6 equipment cards show status
5. ✅ Warehouse: 10-bin grid displays weights
6. ✅ Warehouse: Operation controls (mode selector, quantity input)
7. ✅ No TypeScript errors
8. ✅ Docker build succeeds
9. ✅ Application loads at localhost:8088

---

## Next Steps

Invoke `writing-plans` skill to create detailed implementation plan with:
- Atomic commit strategy
- Parallel execution opportunities
- TDD-oriented approach
- QA automation directives
