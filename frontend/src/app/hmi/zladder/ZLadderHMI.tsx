/**
 * Z字梯 HMI 组件 - 输送设备
 * 特点：横向输送流动动画 + 速度仪表盘 + 运行状态条
 */
import { useState, useEffect } from "react";
import { ChevronUp, ChevronDown, Zap, Activity, Gauge, Power, Fan } from "lucide-react";

interface ZLadderHMIProps {
  data: {
    summary: Array<{ id: string; label: string; value: string; unit: string; tone?: string }>;
    controls: Array<{ id: string; label: string; description: string; icon?: string; active: boolean; tone?: string }>;
  };
  onControlChange?: (id: string, active: boolean) => void;
}

export function ZLadderHMI({ data, onControlChange }: ZLadderHMIProps) {
  const [flowPosition, setFlowPosition] = useState(0);

  // 流动动画效果
  useEffect(() => {
    const interval = setInterval(() => {
      setFlowPosition((prev) => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const speedValue = data.summary.find((s) => s.id === "speed")?.value || "2.4";
  const loadValue = data.summary.find((s) => s.id === "load")?.value || "85";

  return (
    <div className="space-y-6">
      {/* 输送带可视化 */}
      <div className="bg-gradient-to-br from-rose-950/30 to-rose-900/10 rounded-3xl p-6 border border-rose-800/30">
        <h3 className="text-[15px] font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-rose-400" />
          输送带实时状态
        </h3>
        
        {/* 输送带图形 */}
        <div className="relative h-32 bg-rose-950/50 rounded-2xl overflow-hidden">
          {/* 上层输送带 */}
          <div className="absolute top-4 left-4 right-4 h-8 bg-rose-800/30 rounded-lg overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-transparent via-rose-500/40 to-transparent"
              style={{ 
                transform: `translateX(${flowPosition}%)`,
                width: '200%'
              }}
            />
            {[0, 25, 50, 75].map((pos, i) => (
              <div
                key={i}
                className="absolute top-1 w-6 h-6 bg-rose-500/60 rounded-md border border-rose-400/50"
                style={{ left: `${((pos + flowPosition) % 100)}%` }}
              />
            ))}
          </div>
          
          {/* Z字转折 */}
          <div className="absolute top-12 left-8 w-8 h-8 border-l-4 border-b-4 border-rose-600/50 rounded-bl-lg" />
          <div className="absolute top-12 right-8 w-8 h-8 border-r-4 border-b-4 border-rose-600/50 rounded-br-lg" />
          
          {/* 下层输送带 */}
          <div className="absolute bottom-4 left-4 right-4 h-8 bg-rose-800/30 rounded-lg overflow-hidden">
            <div 
              className="h-full bg-gradient-to-l from-transparent via-rose-500/40 to-transparent"
              style={{ 
                transform: `translateX(-${flowPosition}%)`,
                width: '200%'
              }}
            />
            {[0, 25, 50, 75].map((pos, i) => (
              <div
                key={i}
                className="absolute top-1 w-6 h-6 bg-rose-500/60 rounded-md border border-rose-400/50"
                style={{ left: `${((pos - flowPosition + 100) % 100)}%` }}
              />
            ))}
          </div>
          
          <ChevronUp className="absolute left-1/2 top-0 w-5 h-5 text-rose-400/60 -translate-x-1/2" />
          <ChevronDown className="absolute left-1/2 bottom-0 w-5 h-5 text-rose-400/60 -translate-x-1/2" />
        </div>
      </div>

      {/* 双列仪表盘 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 速度仪表 */}
        <div className="bg-gradient-to-br from-rose-900/20 to-rose-950/20 rounded-3xl p-5 border border-rose-800/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-rose-300/70 tracking-wider">运行速度</span>
            <Gauge className="w-4 h-4 text-rose-400" />
          </div>
          <div className="relative w-28 h-28 mx-auto">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#4c1d24" strokeWidth="8" />
              <circle 
                cx="50" cy="50" r="40" fill="none" 
                stroke="url(#speedGradientZ)" 
                strokeWidth="8" 
                strokeLinecap="round"
                strokeDasharray={`${(parseFloat(speedValue) / 5) * 251} 251`}
              />
              <defs>
                <linearGradient id="speedGradientZ" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#be123c" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-white">{speedValue}</span>
              <span className="text-xs text-rose-300/70 font-medium">m/s</span>
            </div>
          </div>
        </div>

        {/* 负载仪表 */}
        <div className="bg-gradient-to-br from-amber-900/20 to-amber-950/20 rounded-3xl p-5 border border-amber-800/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-amber-300/70 tracking-wider">当前负载</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="relative w-28 h-28 mx-auto">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#78350f" strokeWidth="8" />
              <circle 
                cx="50" cy="50" r="40" fill="none" 
                stroke="url(#loadGradientZ)" 
                strokeWidth="8" 
                strokeLinecap="round"
                strokeDasharray={`${(parseFloat(loadValue) / 100) * 251} 251`}
              />
              <defs>
                <linearGradient id="loadGradientZ" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-white">{loadValue}</span>
              <span className="text-xs text-amber-300/70 font-medium">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 控制按钮 */}
      <div className="bg-rose-950/20 rounded-3xl p-5 border border-rose-800/30">
        <h3 className="text-[15px] font-bold text-white mb-4">设备控制</h3>
        <div className="space-y-3">
          {data.controls.map((control) => (
            <button
              key={control.id}
              onClick={() => onControlChange?.(control.id, !control.active)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 ${
                control.active 
                  ? "bg-rose-600/20 border border-rose-500/40" 
                  : "bg-rose-950/30 border border-rose-900/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  control.active ? "bg-rose-500/30 text-white" : "bg-rose-900/30 text-rose-400/50"
                }`}>
                  {control.icon === "fan" ? (
                    <Fan className={`w-5 h-5 ${control.active ? "animate-spin" : ""}`} style={{ animationDuration: "3s" }} />
                  ) : control.icon === "gauge" ? (
                    <Gauge className="w-5 h-5" />
                  ) : (
                    <Power className="w-5 h-5" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-white">{control.label}</p>
                  <p className="text-xs text-rose-300/60">{control.description}</p>
                </div>
              </div>
              <div className={`w-12 h-7 rounded-full transition-all duration-300 relative ${
                control.active ? "bg-rose-500" : "bg-rose-900/50"
              }`}>
                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
                  control.active ? "left-6" : "left-1"
                }`} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}