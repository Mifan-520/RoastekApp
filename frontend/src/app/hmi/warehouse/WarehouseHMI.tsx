/**
 * 智能仓储 HMI 组件 - 仓储设备
 * 特点：立体货架可视化 + 库存热力图 + 温湿度曲线
 */
import { useState, useEffect } from "react";
import {
  Package, Thermometer, Droplets, Grid3X3,
  Power, Gauge, Fan, Eye
} from "lucide-react";

interface WarehouseHMIProps {
  data: {
    summary: Array<{ id: string; label: string; value: string; unit: string; tone?: string }>;
    controls: Array<{ id: string; label: string; description: string; icon?: string; active: boolean; tone?: string }>;
  };
  onControlChange?: (id: string, active: boolean) => void;
}

export function WarehouseHMI({ data, onControlChange }: WarehouseHMIProps) {
  const [selectedShelf, setSelectedShelf] = useState<{ row: number; col: number } | null>(null);
  const [animatedLevels, setAnimatedLevels] = useState<number[]>([]);

  // 库位动画效果
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedLevels(
        Array.from({ length: 24 }, () => Math.floor(Math.random() * 100))
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // 生成货架数据 (4行6列)
  const shelves = Array.from({ length: 24 }, (_, i) => ({
    row: Math.floor(i / 6),
    col: i % 6,
    level: animatedLevels[i] ?? Math.floor(Math.random() * 100),
  }));

  const getShelfColor = (level: number) => {
    if (level >= 80) return "bg-rose-600/70 border-rose-500/50";
    if (level >= 50) return "bg-amber-500/50 border-amber-400/40";
    return "bg-emerald-500/40 border-emerald-400/30";
  };

  return (
    <div className="space-y-6">
      {/* 立体货架可视化 */}
      <div className="bg-gradient-to-br from-violet-950/30 to-purple-900/10 rounded-3xl p-6 border border-violet-800/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold text-white flex items-center gap-2">
            <Grid3X3 className="w-4 h-4 text-violet-400" />
            立体货架布局
          </h3>
          <div className="flex items-center gap-2 text-xs text-white/50">
            <span>容量</span>
            <span className="text-white font-bold">{data.summary.find(s => s.id === "capacity")?.value || "78"}%</span>
          </div>
        </div>
        
        {/* 货架网格 */}
        <div className="grid grid-cols-6 gap-2">
          {shelves.map((shelf, i) => (
            <button
              key={i}
              onClick={() => setSelectedShelf({ row: shelf.row, col: shelf.col })}
              className={`aspect-square rounded-xl border transition-all duration-500 relative overflow-hidden ${
                selectedShelf?.row === shelf.row && selectedShelf?.col === shelf.col
                  ? "ring-2 ring-white/50 scale-110 z-10"
                  : ""
              } ${getShelfColor(shelf.level)}`}
            >
              <div
                className="absolute bottom-0 left-0 right-0 bg-white/10 transition-all duration-1000"
                style={{ height: `${shelf.level}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white/80">
                {shelf.row + 1}-{shelf.col + 1}
              </span>
            </button>
          ))}
        </div>
        
        {/* 热力图图例 */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-rose-600/70" />
            <span className="text-white/60">高容量 &gt;80%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-amber-500/50" />
            <span className="text-white/60">中容量 50-80%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-emerald-500/40" />
            <span className="text-white/60">低容量 &lt;50%</span>
          </div>
        </div>
      </div>

      {/* 环境监控 */}
      <div className="bg-gradient-to-br from-emerald-950/20 to-teal-900/10 rounded-3xl p-5 border border-emerald-800/30">
        <h3 className="text-[15px] font-bold text-white mb-4">环境监控</h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* 温度曲线 */}
          <div className="bg-emerald-950/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Thermometer className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-300/70">仓内温度</span>
            </div>
            <div className="flex items-end gap-1 mb-2">
              <span className="text-3xl font-black text-white">
                {data.summary.find(s => s.id === "temperature")?.value || "22"}
              </span>
              <span className="text-sm font-bold text-white/50 mb-1">°C</span>
            </div>
            <svg className="w-full h-8" viewBox="0 0 100 30">
              <path
                d="M0,20 Q10,15 20,18 T40,12 T60,16 T80,10 T100,14"
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M0,20 Q10,15 20,18 T40,12 T60,16 T80,10 T100,14 L100,30 L0,30 Z"
                fill="url(#tempGradientW)"
                opacity="0.3"
              />
              <defs>
                <linearGradient id="tempGradientW" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          
          {/* 湿度 */}
          <div className="bg-teal-950/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Droplets className="w-4 h-4 text-teal-400" />
              <span className="text-xs font-medium text-teal-300/70">湿度</span>
            </div>
            <div className="text-center">
              <span className="text-3xl font-black text-white">45</span>
              <span className="text-sm font-bold text-white/50">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 库存批次信息 */}
      <div className="bg-gradient-to-br from-violet-950/20 to-indigo-900/10 rounded-3xl p-5 border border-violet-800/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold text-white flex items-center gap-2">
            <Package className="w-4 h-4 text-violet-400" />
            存储批次
          </h3>
          <span className="text-2xl font-black text-white">
            {data.summary.find(s => s.id === "items")?.value || "156"}
            <span className="text-sm font-normal text-white/50 ml-1">批</span>
          </span>
        </div>
        
        {/* 批次列表 */}
        <div className="space-y-2">
          {[
            { id: "B-2026-001", name: "云南小粒咖啡", weight: "2.5t", date: "03-15" },
            { id: "B-2026-002", name: "埃塞耶加雪菲", weight: "1.8t", date: "03-12" },
          ].map((batch) => (
            <div
              key={batch.id}
              className="flex items-center justify-between p-3 bg-violet-950/30 rounded-xl"
            >
              <div>
                <p className="text-sm font-bold text-white">{batch.name}</p>
                <p className="text-xs text-white/40">{batch.id}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-violet-300">{batch.weight}</p>
                <p className="text-xs text-white/40">{batch.date}入库</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 控制面板 */}
      <div className="grid grid-cols-3 gap-3">
        {data.controls.map((control) => (
          <div
            key={control.id}
            className={`rounded-2xl p-4 border transition-all duration-300 ${
              control.active
                ? control.tone === "emerald"
                  ? "bg-emerald-600/20 border-emerald-500/40"
                  : control.tone === "amber"
                  ? "bg-amber-600/20 border-amber-500/40"
                  : "bg-violet-600/20 border-violet-500/40"
                : "bg-rose-950/30 border-rose-900/30"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                control.active
                  ? control.tone === "emerald"
                    ? "bg-emerald-500/30 text-white"
                    : control.tone === "amber"
                    ? "bg-amber-500/30 text-white"
                    : "bg-violet-500/30 text-white"
                  : "bg-rose-900/30 text-white/40"
              }`}>
                {control.icon === "fan" ? (
                  <Fan className={`w-5 h-5 ${control.active ? "animate-spin" : ""}`} style={{ animationDuration: "3s" }} />
                ) : control.icon === "gauge" ? (
                  <Gauge className="w-5 h-5" />
                ) : control.icon === "eye" ? (
                  <Eye className="w-5 h-5" />
                ) : (
                  <Power className="w-5 h-5" />
                )}
              </div>
              
              <button
                onClick={() => onControlChange?.(control.id, !control.active)}
                className={`w-6 h-10 rounded-full transition-all duration-300 relative ${
                  control.active
                    ? control.tone === "emerald"
                      ? "bg-emerald-500"
                      : control.tone === "amber"
                      ? "bg-amber-500"
                      : "bg-violet-500"
                    : "bg-rose-900/50"
                }`}
              >
                <div className={`absolute left-1 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ${
                  control.active ? "top-1" : "top-5"
                }`} />
              </button>
            </div>
            
            <p className="text-xs font-bold text-white mb-0.5">{control.label}</p>
            <p className="text-[10px] text-white/50">{control.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}