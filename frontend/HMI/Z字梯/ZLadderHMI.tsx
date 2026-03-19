/**
 * Z字梯 HMI 组件 - 输送设备
 * 特点：电源开关 + 变频器频率仪表盘
 */
import { Power, Zap } from "lucide-react";
import type { HMIComponentProps, HMIFrequency } from "../types";

interface ZLadderData {
  summary?: Array<{ id: string; label: string; value: string; unit?: string; tone?: "rose" | "amber" }>;
  controls?: Array<{ id: string; label: string; description: string; icon?: string; active: boolean; tone?: "rose" | "amber" }>;
  powerOn?: boolean;
  frequency?: HMIFrequency;
}

type ZLadderHMIProps = HMIComponentProps<ZLadderData>;

export function ZLadderHMI({ data, onControlChange }: ZLadderHMIProps) {
  const powerOn = data.powerOn ?? data.controls?.find(c => c.id === "power")?.active ?? false;
  const frequency = data.frequency ?? { 
    current: parseFloat(data.summary?.find(s => s.id === "frequency")?.value || "0"), 
    target: parseFloat(data.summary?.find(s => s.id === "targetFrequency")?.value || "0")
  };
  
  const currentFreq = frequency.current;
  const maxFreq = 60;
  const progress = (currentFreq / maxFreq) * 251;

  return (
    <div className="space-y-4">
      {/* 电源开关 */}
      <div className="bg-gradient-to-br from-[#5D1B22]/40 to-[#5D1B22]/10 rounded-3xl p-5 border border-[#be123c]/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              powerOn ? "bg-[#be123c]/30" : "bg-[#5D1B22]/30"
            }`}>
              <Power className={`w-6 h-6 ${powerOn ? "text-[#fda4af]" : "text-[#be123c]/50"}`} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">总电源</p>
              <p className={`text-xs ${powerOn ? "text-[#fda4af]" : "text-white/40"}`}>
                {powerOn ? "ON" : "OFF"}
              </p>
            </div>
          </div>
          
          {/* Toggle Switch */}
          <button
            onClick={() => onControlChange?.("power", !powerOn)}
            className={`w-14 h-8 rounded-full transition-all duration-300 relative ${
              powerOn ? "bg-[#be123c]" : "bg-[#5D1B22]/50"
            }`}
          >
            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 ${
              powerOn ? "left-7" : "left-1"
            }`} />
          </button>
        </div>
      </div>

      {/* 变频器频率仪表盘 */}
      <div className="bg-gradient-to-br from-[#5D1B22]/40 to-[#5D1B22]/10 rounded-3xl p-5 border border-[#be123c]/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#be123c]" />
            <span className="text-xs font-medium text-white/70 tracking-wider">变频器频率</span>
          </div>
        </div>
        
        {/* 圆形仪表盘 */}
        <div className="relative w-32 h-32 mx-auto">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#3d1216" strokeWidth="8" />
            <circle 
              cx="50" cy="50" r="40" fill="none" 
              stroke="url(#freqGradient)" 
              strokeWidth="8" 
              strokeLinecap="round"
              strokeDasharray={`${progress} 251`}
            />
            <defs>
              <linearGradient id="freqGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#be123c" />
                <stop offset="100%" stopColor="#fda4af" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-white">{currentFreq.toFixed(1)}</span>
            <span className="text-xs text-[#fda4af]/70 font-medium">Hz</span>
          </div>
        </div>
        
        {/* 目标频率 */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <span className="text-xs text-white/40">目标:</span>
          <span className="text-sm font-bold text-[#be123c]">{frequency.target.toFixed(1)} Hz</span>
        </div>
      </div>
    </div>
  );
}
