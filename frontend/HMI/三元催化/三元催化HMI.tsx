/**
 * 三元催化 HMI 组件 - 四模式切换 + 倒计时监控 + 编辑功能
 * 逻辑参考：esp32-32-2/Countdown.h
 * 
 * 状态机：
 * - countMode 0: 停止状态
 * - countMode 1: 点火倒计时中
 * - countMode 2: 关机倒计时中
 * 
 * 流程：按下启动 → 点火倒计时 → 自动衔接关机倒计时 → 结束
 * 
 * 编辑功能：点击倒计时区域展开编辑面板，可修改点火/关机时间
 */
import { useState, useEffect, useCallback } from "react";
import { Flame, Timer, Play, Square, Thermometer, Pencil, Check, X } from "lucide-react";
import type { HMIComponentProps, HMIControlItem, ModeParams } from "../types";

interface CatalyticConverterData {
  modes?: ModeParams[];
  temperature?: number;
  powerOn?: boolean;
  controls?: HMIControlItem[];
}

type CatalyticConverterHMIProps = HMIComponentProps<CatalyticConverterData>;

// 默认四模式参数
const DEFAULT_MODES: ModeParams[] = [
  { fireMinutes: 5, closeMinutes: 3 },
  { fireMinutes: 5, closeMinutes: 3 },
  { fireMinutes: 5, closeMinutes: 3 },
  { fireMinutes: 5, closeMinutes: 3 },
];

// 格式化时间（秒转为 MM:SS）
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// 温度颜色映射
function getTemperatureColor(temp: number): string {
  if (temp < 100) return "text-slate-300";
  if (temp < 200) return "text-amber-400";
  if (temp < 300) return "text-orange-500";
  return "text-rose-500";
}

export function CatalyticConverterHMI({ data, onControlChange }: CatalyticConverterHMIProps) {
  // 模式参数（每个模式的点火/关机时间）- 从props读取或使用默认值
  const [modeParams, setModeParams] = useState<ModeParams[]>(
    () => data.modes && data.modes.length > 0 ? data.modes : DEFAULT_MODES
  );
  
  // 当外部data.modes变化时同步更新
  useEffect(() => {
    if (data.modes && data.modes.length > 0) {
      setModeParams(data.modes);
    }
  }, [data.modes]);
  
  // 当前选中的模式 (0-3)
  const [currentMode, setCurrentMode] = useState(0);
  
  // 倒计时状态
  const [countMode, setCountMode] = useState<0 | 1 | 2>(0); // 0=停止, 1=点火, 2=关机
  const [restSeconds, setRestSeconds] = useState(0);        // 当前阶段剩余秒数
  const [nextCloseSeconds, setNextCloseSeconds] = useState(0); // 预设的关机秒数
  
  // 温度
  const [temperature, setTemperature] = useState(data.temperature ?? 0);

  // 电源状态
  const [powerOn, setPowerOn] = useState<boolean>(
    () => data.powerOn ?? data.controls?.find((control) => control.id === "power")?.active ?? false,
  );
  
  // 编辑状态
  const [editingMode, setEditingMode] = useState<number | null>(null);
  const [editFireMinutes, setEditFireMinutes] = useState(5);
  const [editCloseMinutes, setEditCloseMinutes] = useState(3);

  // 当外部温度变化时同步更新
  useEffect(() => {
    setTemperature(data.temperature ?? 0);
  }, [data.temperature]);

  // 当外部电源状态变化时同步更新
  useEffect(() => {
    setPowerOn(data.powerOn ?? data.controls?.find((control) => control.id === "power")?.active ?? false);
  }, [data.powerOn, data.controls]);

  // 获取当前模式参数
  const currentParams = modeParams[currentMode];

  // 电源控制
  const setPowerState = useCallback((nextPowerOn: boolean) => {
    setPowerOn(nextPowerOn);
    onControlChange?.("power", nextPowerOn);
  }, [onControlChange]);

  // 启动倒计时
  const handleStart = useCallback(() => {
    const fireSec = currentParams.fireMinutes * 60;
    const closeSec = currentParams.closeMinutes * 60;

    if (!powerOn) {
      setPowerState(true);
    }
    
    setRestSeconds(fireSec);
    setNextCloseSeconds(closeSec);
    setCountMode(1); // 点火模式
    
    onControlChange?.(`mode-${currentMode + 1}-start`, { fireSec, closeSec });
  }, [currentParams, currentMode, onControlChange, powerOn, setPowerState]);

  // 停止倒计时
  const handleStop = useCallback(() => {
    setCountMode(0);
    setRestSeconds(0);

    if (powerOn) {
      setPowerState(false);
    }
    
    onControlChange?.(`mode-${currentMode + 1}-stop`, true);
  }, [currentMode, onControlChange, powerOn, setPowerState]);

  // 电源关闭时，强制停止倒计时
  useEffect(() => {
    if (!powerOn && countMode !== 0) {
      setCountMode(0);
      setRestSeconds(0);
    }
  }, [powerOn, countMode]);

  // 切换模式
  const handleModeChange = (modeIndex: number) => {
    if (countMode !== 0) {
      // 运行中切换模式，先停止
      handleStop();
    }
    setCurrentMode(modeIndex);
    setEditingMode(null);
    onControlChange?.(`switch-mode`, modeIndex + 1);
  };

  // 开始编辑当前模式
  const startEditing = () => {
    if (countMode !== 0) return; // 运行中不可编辑
    setEditingMode(currentMode);
    setEditFireMinutes(currentParams.fireMinutes);
    setEditCloseMinutes(currentParams.closeMinutes);
  };

  // 取消编辑
  const cancelEditing = () => {
    setEditingMode(null);
  };

  // 保存编辑
  const saveEditing = () => {
    if (editingMode === null) return;
    
    const newModeParams = [...modeParams];
    newModeParams[editingMode] = {
      fireMinutes: editFireMinutes,
      closeMinutes: editCloseMinutes,
    };
    
    setModeParams(newModeParams);
    setEditingMode(null);
    
    // 持久化到后端
    onControlChange?.(`mode-params-update`, newModeParams);
  };

  // 倒计时循环
  useEffect(() => {
    if (countMode === 0) return;

    const interval = setInterval(() => {
      setRestSeconds(prev => {
        const next = prev - 1;
        
        if (next <= 0) {
          if (countMode === 1) {
            // 点火结束，切换到关机
            setCountMode(2);
            return nextCloseSeconds;
          } else if (countMode === 2) {
            // 关机结束，停止
            setCountMode(0);
            return 0;
          }
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [countMode, nextCloseSeconds]);

  // 显示的时间
  const displayFireTime = countMode === 1 ? restSeconds : currentParams.fireMinutes * 60;
  const displayCloseTime = countMode === 2 ? restSeconds : currentParams.closeMinutes * 60;

  return (
    <div className="space-y-4 p-6">
      {/* 当前温度显示 */}
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

      {/* 模式切换Tab */}
      <div className="flex gap-2 p-1 rounded-2xl bg-[#231F1F] border border-[#231F1F]">
        {[0, 1, 2, 3].map((idx) => (
          <button
            key={idx}
            onClick={() => handleModeChange(idx)}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
              currentMode === idx
                ? "bg-[#be123c] text-white shadow-lg"
                : "text-slate-300 hover:text-white hover:bg-[#231F1F]/80"
            }`}
          >
            模式{idx + 1}
          </button>
        ))}
      </div>

      {/* 倒计时显示区域 */}
      <div className="rounded-2xl bg-gradient-to-br from-[#5D1B22]/20 to-[#be123c]/5 border border-[#be123c]/20 p-5">
        {/* 模式标题 */}
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Flame className="w-5 h-5 text-[#fda4af]" />
          模式{currentMode + 1}
          {countMode !== 0 && (
            <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
              countMode === 1 ? "bg-rose-500/30 text-rose-300" : "bg-amber-500/30 text-amber-300"
            }`}>
              {countMode === 1 ? "点火中" : "关机中"}
            </span>
          )}
        </h3>

        {/* 编辑面板（方案C：点击展开） */}
        {editingMode === currentMode ? (
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
                  onChange={(e) => setEditFireMinutes(Math.max(1, parseInt(e.target.value) || 1))}
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
                  onChange={(e) => setEditCloseMinutes(Math.max(1, parseInt(e.target.value) || 1))}
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

        {/* 点火倒计时 */}
        <div
          className={`mb-4 p-4 rounded-xl bg-[#231F1F] border border-[#3a3535] ${
            countMode === 0 ? "cursor-pointer hover:bg-[#2a2828] transition-colors" : ""
          }`}
          onClick={countMode === 0 ? startEditing : undefined}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400 flex items-center gap-2">
              <Timer className="w-4 h-4" />
              点火倒计时
              {countMode === 0 && <Pencil className="w-3 h-3 text-slate-500" />}
            </span>
            <span className={`text-2xl font-mono font-bold ${
              countMode === 1 ? "text-rose-400 animate-pulse" : "text-slate-300"
            }`}>
              {formatTime(displayFireTime)}
            </span>
          </div>
          <div className="w-full h-2 bg-[#3a3535] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                countMode === 1 ? "bg-rose-500" : "bg-[#4a4545]"
              }`}
              style={{
                width: `${Math.min((displayFireTime / (currentParams.fireMinutes * 60)) * 100, 100)}%`
              }}
            />
          </div>
        </div>

        {/* 关机倒计时 */}
        <div
          className={`mb-6 p-4 rounded-xl bg-[#231F1F] border border-[#3a3535] ${
            countMode === 0 ? "cursor-pointer hover:bg-[#2a2828] transition-colors" : ""
          }`}
          onClick={countMode === 0 ? startEditing : undefined}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400 flex items-center gap-2">
              <Timer className="w-4 h-4" />
              关机倒计时
              {countMode === 0 && <Pencil className="w-3 h-3 text-slate-500" />}
            </span>
            <span className={`text-2xl font-mono font-bold ${
              countMode === 2 ? "text-amber-400 animate-pulse" : "text-slate-300"
            }`}>
              {formatTime(displayCloseTime)}
            </span>
          </div>
          <div className="w-full h-2 bg-[#3a3535] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                countMode === 2 ? "bg-amber-500" : "bg-[#4a4545]"
              }`}
              style={{
                width: `${Math.min((displayCloseTime / (currentParams.closeMinutes * 60)) * 100, 100)}%`
              }}
            />
          </div>
        </div>

        {/* 启动/停止按钮 */}
        <button
          onClick={countMode === 0 ? handleStart : handleStop}
          className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl text-base font-bold transition-all ${
            countMode === 0
              ? "bg-[#be123c] text-white hover:bg-[#9f1239] shadow-lg"
              : "bg-[#231F1F] text-white hover:bg-[#2a2828] border border-[#3a3535]"
          }`}
        >
          {countMode === 0 ? (
            <>
              <Play className="w-5 h-5" />
              启动
            </>
          ) : (
            <>
              <Square className="w-5 h-5" />
              停止
            </>
          )}
        </button>
      </div>
    </div>
  );
}
