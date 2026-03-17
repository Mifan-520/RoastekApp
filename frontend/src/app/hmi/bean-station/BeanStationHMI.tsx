/**
 * 生豆处理站 HMI 组件 - 处理设备
 * 特点：工艺流程管道图 + 实时监控卡片 + 分选状态可视化
 */
import { useState } from "react";
import { 
  Thermometer, Droplets, Weight, 
  ArrowRight, Power, Gauge, Fan, AlertTriangle
} from "lucide-react";

interface BeanStationHMIProps {
  data: {
    summary: Array<{ id: string; label: string; value: string; unit: string; tone?: string }>;
    controls: Array<{ id: string; label: string; description: string; icon?: string; active: boolean; tone?: string }>;
  };
  onControlChange?: (id: string, active: boolean) => void;
}

export function BeanStationHMI({ data, onControlChange }: BeanStationHMIProps) {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  // 工艺流程阶段
  const stages = [
    { id: "input", label: "原料投入", active: true },
    { id: "sort", label: "分选处理", active: true },
    { id: "convey", label: "输送传输", active: true },
    { id: "dust", label: "除尘排放", active: true },
  ];

  return (
    <div className="space-y-6">
      {/* 工艺流程可视化 */}
      <div className="bg-gradient-to-br from-rose-950/30 to-rose-900/10 rounded-3xl p-6 border border-rose-800/30">
        <h3 className="text-[15px] font-bold text-white mb-4">工艺流程</h3>
        
        <div className="flex items-center justify-between gap-2">
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex items-center flex-1">
              <button
                onClick={() => setSelectedStage(stage.id)}
                className={`flex-1 flex flex-col items-center p-4 rounded-2xl transition-all duration-300 ${
                  selectedStage === stage.id
                    ? "bg-rose-600/30 border-2 border-rose-500/50 scale-105"
                    : stage.active
                    ? "bg-rose-800/20 border border-rose-700/30 hover:bg-rose-700/30"
                    : "bg-rose-950/30 border border-rose-900/30 opacity-50"
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 ${
                  stage.active ? "bg-rose-500/30" : "bg-rose-900/30"
                }`}>
                  <ArrowRight className={`w-6 h-6 ${stage.active ? "text-rose-300" : "text-rose-500/50"}`} />
                </div>
                <span className="text-xs font-bold text-white text-center">{stage.label}</span>
                <span className={`text-[10px] mt-1 px-2 py-0.5 rounded-full ${
                  stage.active ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-900/30 text-rose-400/50"
                }`}>
                  {stage.active ? "运行中" : "待机"}
                </span>
              </button>
              
              {index < stages.length - 1 && (
                <ArrowRight className="w-5 h-5 text-rose-500/40 mx-1 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 三列监控卡片 */}
      <div className="grid grid-cols-3 gap-3">
        {data.summary.map((item) => (
          <div
            key={item.id}
            className={`rounded-2xl p-4 border transition-all duration-300 ${
              item.tone === "emerald"
                ? "bg-emerald-950/20 border-emerald-700/30"
                : item.tone === "amber"
                ? "bg-amber-950/20 border-amber-700/30"
                : "bg-rose-950/20 border-rose-700/30"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {item.id === "temp" && <Thermometer className="w-4 h-4 text-emerald-400" />}
              {item.id === "humidity" && <Droplets className="w-4 h-4 text-amber-400" />}
              {item.id === "throughput" && <Weight className="w-4 h-4 text-rose-400" />}
              <span className="text-[10px] font-medium text-white/50 tracking-wider uppercase">
                {item.label}
              </span>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-black text-white">{item.value}</span>
              <span className="text-sm font-bold text-white/50 mb-0.5">{item.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 分选状态实时图 */}
      <div className="bg-gradient-to-br from-rose-950/20 to-rose-900/10 rounded-3xl p-5 border border-rose-800/30">
        <h3 className="text-[15px] font-bold text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          分选状态监控
        </h3>
        
        {/* 模拟分选网格 */}
        <div className="grid grid-cols-8 gap-1">
          {Array.from({ length: 32 }).map((_, i) => {
            const quality = Math.random();
            return (
              <div
                key={i}
                className={`aspect-square rounded-md transition-all duration-500 ${
                  quality > 0.7
                    ? "bg-emerald-500/60 animate-pulse"
                    : quality > 0.4
                    ? "bg-amber-500/40"
                    : "bg-rose-600/50"
                }`}
                style={{ animationDelay: `${i * 100}ms` }}
              />
            );
          })}
        </div>
        
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500/60" />
            <span className="text-white/60">优质</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-amber-500/40" />
            <span className="text-white/60">合格</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-rose-600/50" />
            <span className="text-white/60">待分选</span>
          </div>
        </div>
      </div>

      {/* 控制面板 */}
      <div className="grid grid-cols-3 gap-3">
        {data.controls.map((control) => (
          <button
            key={control.id}
            onClick={() => onControlChange?.(control.id, !control.active)}
            className={`p-4 rounded-2xl border transition-all duration-300 ${
              control.active
                ? control.tone === "emerald"
                  ? "bg-emerald-600/20 border-emerald-500/40"
                  : control.tone === "amber"
                  ? "bg-amber-600/20 border-amber-500/40"
                  : "bg-rose-600/20 border-rose-500/40"
                : "bg-rose-950/30 border-rose-900/30"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center ${
              control.active
                ? control.tone === "emerald"
                  ? "bg-emerald-500/30"
                  : control.tone === "amber"
                  ? "bg-amber-500/30"
                  : "bg-rose-500/30"
                : "bg-rose-900/30"
            }`}>
              {control.icon === "fan" ? (
                <Fan className={`w-5 h-5 text-white ${control.active ? "animate-spin" : ""}`} style={{ animationDuration: "3s" }} />
              ) : control.icon === "gauge" ? (
                <Gauge className={`w-5 h-5 ${control.active ? "text-white" : "text-white/40"}`} />
              ) : (
                <Power className={`w-5 h-5 ${control.active ? "text-white" : "text-white/40"}`} />
              )}
            </div>
            <p className="text-xs font-bold text-white text-center mb-1">{control.label}</p>
            <p className="text-[10px] text-white/50 text-center">{control.description}</p>
            <div className={`mt-2 w-8 h-1 rounded-full mx-auto ${
              control.active
                ? control.tone === "emerald"
                  ? "bg-emerald-500"
                  : control.tone === "amber"
                  ? "bg-amber-500"
                  : "bg-rose-500"
                : "bg-rose-900/50"
            }`} />
          </button>
        ))}
      </div>
    </div>
  );
}