# HMI UI Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign three HMI components (ZLadder, BeanStation, Warehouse) with ROASTEK rose/red theme, add power toggles, equipment status monitoring, and warehouse operation controls.

**Architecture:** React functional components with Tailwind CSS v4 styling. Shared PowerToggle component for consistency. Backend payload schemas updated to support new data structures.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, Lucide React icons, Docker for verification

---

## Parallel Execution Strategy

This plan can be executed with **maximum parallelization**:

| Track | Tasks | Can Run In Parallel With |
|-------|-------|--------------------------|
| **Track A: Theme** | Task 1 | Track B, Track C |
| **Track B: Backend** | Task 2 | Track A, Track C |
| **Track C: Frontend Components** | Tasks 3, 4, 5 | Track A, Track B |
| **Track D: Cleanup & Git** | Tasks 6, 7, 8 | Must run after all above |

**Recommended**: Run Track A + Track B + Track C in parallel using subagent-driven-development.

---

## Task 1: Add ROASTEK Theme Colors

**Files:**
- Modify: `frontend/src/styles/theme.css`

**Step 1: Add ROASTEK color variables to :root**

Add after line 42 (after the `:root` block closing, before `.dark`):

```css
/* ROASTEK Brand Colors */
:root {
  --roastek-primary: #5D1B22;
  --roastek-secondary: #be123c;
  --roastek-accent: #fda4af;
  --roastek-light: #fff1f2;
}
```

**Step 2: Add Tailwind theme mapping**

Add to `@theme inline` block (after line 119, before closing brace):

```css
  --color-roastek-primary: var(--roastek-primary);
  --color-roastek-secondary: var(--roastek-secondary);
  --color-roastek-accent: var(--roastek-accent);
  --color-roastek-light: var(--roastek-light);
```

**Step 3: Verify theme changes compile**

Run: `cd frontend && npm run build`
Expected: Build succeeds without errors

**Step 4: Commit**

```bash
git add frontend/src/styles/theme.css
git commit -m "feat(theme): add ROASTEK brand color variables

- Add --roastek-primary (#5D1B22)
- Add --roastek-secondary (#be123c/rose-700)
- Add --roastek-accent (#fda4af/rose-300)
- Add --roastek-light (#fff1f2/rose-50)
- Map colors to Tailwind utilities"
```

---

## Task 2: Update Backend Payload Schemas

**Files:**
- Modify: `backend/src/data/devices.js`

**Step 1: Update ZLadder payload**

Replace `zLadderPayload` (lines 2-22) with:

```javascript
// Z字梯设备组态
const zLadderPayload = {
  power: true,
  frequency: {
    current: 45,
    target: 50,
    min: 0,
    max: 60,
  },
  summary: [
    { id: "speed", label: "运行速度", value: "2.4", unit: "m/s", tone: "emerald" },
    { id: "load", label: "当前负载", value: "85", unit: "%", tone: "amber" },
    { id: "efficiency", label: "传输效率", value: "98", unit: "%", tone: "emerald" },
  ],
  chart: {
    title: "Z字梯能耗分布",
    data: [
      { label: "驱动电机", value: 52, color: "#be123c" },
      { label: "控制系统", value: 18, color: "#fda4af" },
      { label: "照明", value: 12, color: "#f97316" },
      { label: "辅助设备", value: 18, color: "#a78bfa" },
    ],
  },
  controls: [
    { id: "motor-z", label: "主驱动电机", description: "运行中", icon: "power", active: true, tone: "emerald" },
    { id: "fan-z", label: "散热风机", description: "运行中", icon: "fan", active: true, tone: "emerald" },
  ],
};
```

**Step 2: Update BeanStation payload**

Replace `beanStationPayload` (lines 24-45) with:

```javascript
// 生豆处理站组态
const beanStationPayload = {
  power: true,
  equipment: [
    { id: "cleaner", name: "清洁机", icon: "sparkles", status: "online" },
    { id: "destoner", name: "去石机", icon: "settings", status: "online" },
    { id: "grader", name: "分级机", icon: "bar-chart-2", status: "offline" },
    { id: "dryer", name: "烘干机", icon: "flame", status: "online" },
    { id: "elevator", name: "提升机", icon: "arrow-up", status: "running" },
    { id: "conveyor", name: "输送带", icon: "arrow-right", status: "running" },
  ],
  summary: [
    { id: "temp", label: "处理温度", value: "28", unit: "C", tone: "emerald" },
    { id: "humidity", label: "环境湿度", value: "65", unit: "%", tone: "amber" },
    { id: "throughput", label: "处理量", value: "450", unit: "kg/h", tone: "emerald" },
  ],
  chart: {
    title: "生豆处理站能耗分布",
    data: [
      { label: "分选机", value: 35, color: "#be123c" },
      { label: "输送带", value: 25, color: "#f97316" },
      { label: "除尘系统", value: 22, color: "#facc15" },
      { label: "其他", value: 18, color: "#16a34a" },
    ],
  },
  controls: [
    { id: "sorter-b", label: "分选机", description: "运行中", icon: "power", active: true, tone: "emerald" },
    { id: "dust-b", label: "除尘系统", description: "运行中", icon: "fan", active: true, tone: "emerald" },
  ],
};
```

**Step 3: Update Warehouse payload**

Replace `warehousePayload` (lines 47-68) with:

```javascript
// 智能仓储组态
const warehousePayload = {
  power: true,
  bins: [
    { id: 1, weight: 125, capacity: 200 },
    { id: 2, weight: 80, capacity: 200 },
    { id: 3, weight: 200, capacity: 200 },
    { id: 4, weight: 45, capacity: 200 },
    { id: 5, weight: 175, capacity: 200 },
    { id: 6, weight: 60, capacity: 200 },
    { id: 7, weight: 110, capacity: 200 },
    { id: 8, weight: 95, capacity: 200 },
    { id: 9, weight: 150, capacity: 200 },
    { id: 10, weight: 30, capacity: 200 },
  ],
  operation: {
    mode: "unloading",
    quantity: 50,
    presets: [25, 50, 100, 200],
  },
  summary: [
    { id: "capacity", label: "库存容量", value: "78", unit: "%", tone: "amber" },
    { id: "items", label: "存储批次", value: "156", unit: "批", tone: "emerald" },
    { id: "temperature", label: "仓内温度", value: "22", unit: "C", tone: "emerald" },
  ],
  chart: {
    title: "智能仓储能耗分布",
    data: [
      { label: "温控系统", value: 42, color: "#be123c" },
      { label: "堆垛机", value: 28, color: "#fda4af" },
      { label: "照明", value: 15, color: "#a78bfa" },
      { label: "监控", value: 15, color: "#ddd6fe" },
    ],
  },
  controls: [
    { id: "ac-w", label: "温控系统", description: "制冷中", icon: "power", active: true, tone: "emerald" },
    { id: "stacker-w", label: "堆垛机", description: "待机", icon: "gauge", active: false, tone: "amber" },
  ],
};
```

**Step 4: Verify backend starts**

Run: `cd backend && npm run dev &`
Expected: Server starts on port 3001

**Step 5: Commit**

```bash
git add backend/src/data/devices.js
git commit -m "feat(backend): update device payload schemas for HMI redesign

- ZLadder: add power + frequency fields
- BeanStation: add power + equipment array (6 units)
- Warehouse: add power + bins (10) + operation controls"
```

---

## Task 3: Redesign ZLadderHMI Component

**Files:**
- Modify: `frontend/src/app/hmi/zladder/ZLadderHMI.tsx`

**Step 1: Write new ZLadderHMI implementation**

Replace entire file content with:

```typescript
/**
 * Z字梯 HMI 组件 - 输送设备
 * 简洁设计：总电源开关 + 变频器速率显示
 */
import { Power, Gauge } from "lucide-react";

interface ZLadderHMIProps {
  data: {
    power?: boolean;
    frequency?: {
      current: number;
      target: number;
      min?: number;
      max?: number;
    };
    summary?: Array<{ id: string; label: string; value: string; unit: string; tone?: string }>;
    controls?: Array<{ id: string; label: string; description: string; icon?: string; active: boolean; tone?: string }>;
  };
  onControlChange?: (id: string, active: boolean) => void;
}

export function ZLadderHMI({ data, onControlChange }: ZLadderHMIProps) {
  const power = data.power ?? false;
  const frequency = data.frequency ?? { current: 0, target: 50, min: 0, max: 60 };
  const freqPercent = (frequency.current / (frequency.max ?? 60)) * 100;

  const handlePowerToggle = () => {
    onControlChange?.("power", !power);
  };

  return (
    <div className="space-y-6">
      {/* 总电源控制 */}
      <div className="bg-gradient-to-br 
