/**
 * 三元催化 HMI 组件 - 四模式切换 + 倒计时监控 + 编辑功能
 * 逻辑参考：esp32-32-2/Countdown.h
 *
 * 显示原则：页面不再本地模拟设备状态，直接以服务端 telemetry 映射结果为准。
 * 仅保留模式参数编辑这一类纯前端交互状态。
 */
import { useEffect, useState } from "react";
import { Flame, Timer, Play, RotateCcw, Thermometer, Pencil, Check, X } from "lucide-react";
import type { HMIComponentProps, HMIControlItem, ModeParams } from "../types";
import { buildCountdownDisplayState, parseTelemetryTimestampMs } from "./countdown.js";

interface CatalyticConverterData {
  modes?: ModeParams[];
  temperature?: number;
  powerOn?: boolean;
  currentMode?: number;
  countMode?: 0 | 1 | 2;
  restSeconds?: number;
  lastTelemetryAt?: string;
  controls?: HMIControlItem[];
}

type CatalyticConverterHMIProps = HMIComponentProps<CatalyticConverterData>;

const DEFAULT_MODES: ModeParams[] = [
  { fireMinutes: 5, closeMinutes: 3 },
  { fireMinutes: 5, closeMinutes: 3 },
  { fireMinutes: 5, closeMinutes: 3 },
  { fireMinutes: 5, closeMinutes: 3 },
];

function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function getTemperatureColor(temp: number): string {
  if (temp < 100) return "text-slate-300";
  if (temp < 200) return "text-amber-400";
  if (temp < 300) return "text-orange-500";
  return "text-rose-500";
}

function clampModeIndex(mode: number | undefined): number {
  const normalized = Number(mode);
  if (!Number.isFinite(normalized)) {
    return 0;
  }

  return Math.min(3, Math.max(0, Math.round(normalized) - 1));
}

export function CatalyticConverterHMI({ data, onControlChange }: CatalyticConverterHMIProps) {
  const [modeParams, setModeParams] = useState<ModeParams[]>(
    () => data.modes && data.modes.length > 0 ? data.modes : DEFAULT_MODES,
  );
  const [selectedMode, setSelectedMode] = useState(() => clampModeIndex(data.currentMode));
  const [editingMode, setEditingMode] = useState<number | null>(null);
  const [editFireMinutes, setEditFireMinutes] = useState(5);
  const [editCloseMinutes, setEditCloseMinutes] = useState(3);
  const [countdownSyncedAtMs, setCountdownSyncedAtMs] = useState(() => Date.now());
  const [countdownNowMs, setCountdownNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (data.modes && data.modes.length > 0) {
      setModeParams(data.modes);
    }
  }, [data.modes]);

  useEffect(() => {
    setSelectedMode(clampModeIndex(data.currentMode));
  }, [data.currentMode]);

  useEffect(() => {
    const fallbackMs = Date.now();
    setCountdownSyncedAtMs(parseTelemetryTimestampMs(data.lastTelemetryAt, fallbackMs));
    setCountdownNowMs(fallbackMs);
  }, [data.lastTelemetryAt, data.restSeconds, data.countMode, data.currentMode]);

  const actualModeIndex = clampModeIndex(data.currentMode);
  const telemetryCountMode: 0 | 1 | 2 = data.countMode === 1 || data.countMode === 2 ? data.countMode : 0;
  const syncedRestSeconds = Math.max(0, Math.round(Number(data.restSeconds ?? 0)));
  const temperature = Number(data.temperature ?? 0);

  const currentParams = modeParams[selectedMode] ?? DEFAULT_MODES[selectedMode] ?? DEFAULT_MODES[0];
  const isViewingActiveMode = selectedMode === actualModeIndex;
  const fireTotalSeconds = Math.round(currentParams.fireMinutes * 60);
  const closeTotalSeconds = Math.round(currentParams.closeMinutes * 60);

  useEffect(() => {
    if (telemetryCountMode === 0) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setCountdownNowMs(Date.now());
    }, 250);

    return () => {
      window.clearInterval(timerId);
    };
  }, [telemetryCountMode, countdownSyncedAtMs]);

  const countdownState = buildCountdownDisplayState({
    countMode: telemetryCountMode,
    restSeconds: syncedRestSeconds,
    syncedAtMs: countdownSyncedAtMs,
    nowMs: countdownNowMs,
    fireTotalSeconds,
    closeTotalSeconds,
  });
  const effectiveCountMode: 0 | 1 | 2 = countdownState.phase === 1 || countdownState.phase === 2 ? countdownState.phase : 0;
  const isRunning = countdownState.running;
  const powerOn = data.powerOn ?? data.controls?.find((control) => control.id === "power")?.active ?? isRunning;

  const displayFireTime = isViewingActiveMode && effectiveCountMode === 1
    ? countdownState.fireSeconds
    : fireTotalSeconds;
  const displayCloseTime = isViewingActiveMode && effectiveCountMode === 2
    ? countdownState.closeSeconds
    : closeTotalSeconds;

  const handleStart = () => {
    const fireSec = Math.round(currentParams.fireMinutes * 60);
    const closeSec = Math.round(currentParams.closeMinutes * 60);
    onControlChange?.(`mode-${selectedMode + 1}-start`, { fireSec, closeSec });
  };

  const handleReset = () => {
    onControlChange?.("reset", { mode: selectedMode + 1 });
  };

  const handleModeChange = (modeIndex: number) => {
    if (isRunning) return; // 运行中不响应模式切换
    setSelectedMode(modeIndex);
    setEditingMode(null);
    onControlChange?.("switch-mode", modeIndex + 1);
  };

  const startEditing = () => {
    if (isRunning) return;
    setEditingMode(selectedMode);
    setEditFireMinutes(currentParams.fireMinutes);
    setEditCloseMinutes(currentParams.closeMinutes);
  };

  const cancelEditing = () => {
    setEditingMode(null);
  };

  const saveEditing = () => {
    if (editingMode === null) return;

    const newModeParams = [...modeParams];
    newModeParams[editingMode] = {
      fireMinutes: editFireMinutes,
      closeMinutes: editCloseMinutes,
    };

    setModeParams(newModeParams);
    setEditingMode(null);
    onControlChange?.("mode-params-update", newModeParams);
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-[#5D1B22]/40 to-[#be123c]/20 border border-[#be123c]/30">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#be123c]/30">
            <Thermometer className="w-6 h-6 text-[#fda4af]" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">当前温度</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-3xl font-bold ${getTemperatureColor(temperature)}`}>
            {temperature}
          </p>
          <p className="text-xs text-slate-400">°C</p>
        </div>
      </div>

      <div className="flex gap-2 p-1 rounded-2xl bg-[#231F1F] border border-[#231F1F]">
        {[0, 1, 2, 3].map((idx) => (
          <button
            key={idx}
            onClick={() => handleModeChange(idx)}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
              selectedMode === idx
                ? "bg-[#be123c] text-white shadow-lg"
                : "text-slate-300 hover:text-white hover:bg-[#231F1F]/80"
            }`}
          >
            模式{idx + 1}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-[#5D1B22]/20 to-[#be123c]/5 border border-[#be123c]/20 p-5">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Flame className="w-5 h-5 text-[#fda4af]" />
          模式{selectedMode + 1}
          {isViewingActiveMode && isRunning ? (
            <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
              effectiveCountMode === 2 ? "bg-amber-500/30 text-amber-300" : "bg-rose-500/30 text-rose-300"
            }`}>
              {effectiveCountMode === 2 ? "关机中" : "点火中"}
            </span>
          ) : null}
        </h3>

        {editingMode === selectedMode ? (
          <div className="mb-4 p-4 rounded-xl bg-[#231F1F] border border-[#3a3535]">
            <p className="text-sm font-bold text-white mb-3">编辑倒计时参数</p>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-300">点火倒计时（分钟）</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={editFireMinutes}
                  onChange={(e) => setEditFireMinutes(Math.max(1, Number(e.target.value) || 1))}
                  className="w-20 px-3 py-1.5 rounded-lg bg-[#3a3535] border border-[#4a4545] text-white text-center font-mono"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-300">关机倒计时（分钟）</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={editCloseMinutes}
                  onChange={(e) => setEditCloseMinutes(Math.max(1, Number(e.target.value) || 1))}
                  className="w-20 px-3 py-1.5 rounded-lg bg-[#3a3535] border border-[#4a4545] text-white text-center font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={saveEditing}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors"
              >
                <Check className="w-4 h-4" />
                保存
              </button>
              <button
                onClick={cancelEditing}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-[#231F1F] hover:bg-[#3a3535] text-white text-sm font-bold transition-colors border border-[#3a3535]"
              >
                <X className="w-4 h-4" />
                取消
              </button>
            </div>
          </div>
        ) : null}

        <div
          className={`mb-4 p-4 rounded-xl bg-[#231F1F] border border-[#3a3535] ${
            !isRunning ? "cursor-pointer hover:bg-[#2a2828] transition-colors" : ""
          }`}
          onClick={!isRunning ? startEditing : undefined}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400 flex items-center gap-2">
              <Timer className="w-4 h-4" />
              点火倒计时
              {!isRunning ? <Pencil className="w-3 h-3 text-slate-500" /> : null}
            </span>
            <span className={`text-2xl font-mono font-bold ${
              isViewingActiveMode && effectiveCountMode === 1 ? "text-rose-400 animate-pulse" : "text-slate-300"
            }`}>
              {formatTime(displayFireTime)}
            </span>
          </div>
          <div className="w-full h-2 bg-[#3a3535] rounded-full overflow-hidden">
            <div
              className={`h-full transition-[width] duration-200 ease-linear ${
                isViewingActiveMode && effectiveCountMode === 1 ? "bg-rose-500" : "bg-[#4a4545]"
              }`}
              style={{
                width: `${isViewingActiveMode ? countdownState.fireProgressPercent : 100}%`,
              }}
            />
          </div>
        </div>

        <div
          className={`mb-6 p-4 rounded-xl bg-[#231F1F] border border-[#3a3535] ${
            !isRunning ? "cursor-pointer hover:bg-[#2a2828] transition-colors" : ""
          }`}
          onClick={!isRunning ? startEditing : undefined}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400 flex items-center gap-2">
              <Timer className="w-4 h-4" />
              关机倒计时
              {!isRunning ? <Pencil className="w-3 h-3 text-slate-500" /> : null}
            </span>
            <span className={`text-2xl font-mono font-bold ${
              isViewingActiveMode && effectiveCountMode === 2 ? "text-amber-400 animate-pulse" : "text-slate-300"
            }`}>
              {formatTime(displayCloseTime)}
            </span>
          </div>
          <div className="w-full h-2 bg-[#3a3535] rounded-full overflow-hidden">
            <div
              className={`h-full transition-[width] duration-200 ease-linear ${
                isViewingActiveMode && effectiveCountMode === 2 ? "bg-amber-500" : "bg-[#4a4545]"
              }`}
              style={{
                width: `${isViewingActiveMode ? countdownState.closeProgressPercent : 100}%`,
              }}
            />
          </div>
        </div>

        <button
          onClick={isRunning ? handleReset : handleStart}
          className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl text-base font-bold transition-all ${
            isRunning
              ? "bg-[#231F1F] text-white hover:bg-[#2a2828] border border-[#3a3535]"
              : "bg-[#be123c] text-white hover:bg-[#9f1239] shadow-lg"
          }`}
        >
          {isRunning ? (
            <>
              <RotateCcw className="w-5 h-5" />
              复位
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              启动
            </>
          )}
        </button>
      </div>
    </div>
  );
}
