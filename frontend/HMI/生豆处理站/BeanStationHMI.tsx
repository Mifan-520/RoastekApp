/**
 * 生豆处理站 HMI 组件 - 设备状态监控
 * 特点：电源控制 + 设备在线状态表
 */
import {
  Power, SprayCan, Filter, Layers, Flame, ArrowUp, Move, Wifi
} from "lucide-react";
import type { HMIComponentProps, HMIEquipment } from "../types";

interface BeanStationData {
  summary?: Array<{ id: string; label: string; value: string; unit?: string; tone?: "rose" | "amber" }>;
  controls?: Array<{ id: string; label: string; description: string; icon?: string; active: boolean; tone?: "rose" | "amber" }>;
  powerOn?: boolean;
  equipment?: HMIEquipment[];
}

type BeanStationHMIProps = HMIComponentProps<BeanStationData>;

// 默认设备列表
const DEFAULT_EQUIPMENT: HMIEquipment[] = [
  { id: "cleaner", name: "清洁机", status: "online" },
  { id: "stoneremover", name: "去石机", status: "online" },
  { id: "grader", name: "分级机", status: "online" },
  { id: "dryer", name: "烘干机", status: "offline" },
  { id: "elevator", name: "提升机", status: "online" },
  { id: "conveyor", name: "输送带", status: "online" },
];

// 设备图标映射
const EQUIPMENT_ICONS: Record<string, React.ElementType> = {
  cleaner: SprayCan,
  stoneremover: Filter,
  grader: Layers,
  dryer: Flame,
  elevator: ArrowUp,
  conveyor: Move,
};

// 状态样式
const STATUS_STYLES = {
  online: { bg: "bg-rose-900/40", border: "border-rose-700/50", text: "text-rose-300", dot: "bg-rose-400" },
  offline: { bg: "bg-slate-900/40", border: "border-slate-700/50", text: "text-slate-400", dot: "bg-slate-500" },
};

const STATUS_LABELS = { online: "在线", offline: "离线" };

export function BeanStationHMI({ data, onControlChange }: BeanStationHMIProps) {
  const powerOn = data.powerOn ?? true;
  const equipment = data.equipment ?? DEFAULT_EQUIPMENT;

  return (
    <div className="space-y-4">
      {/* 总电源控制 */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-[#5D1B22]/40 to-[#be123c]/20 border border-[#be123c]/30">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
            powerOn ? "bg-[#be123c]/30" : "bg-slate-800/50"
          }`}>
            <Power className={`w-6 h-6 ${powerOn ? "text-[#fda4af]" : "text-slate-500"}`} />
          </div>
          <div>
            <p className="text-sm font-bold text-white">总电源</p>
            <p className={`text-xs ${powerOn ? "text-[#fda4af]" : "text-slate-400"}`}>
              {powerOn ? "系统运行中" : "已关闭"}
            </p>
          </div>
        </div>
        
        {/* 滑动开关 */}
        <button
          onClick={() => onControlChange?.("power", !powerOn)}
          className={`w-14 h-8 rounded-full transition-all duration-300 relative ${
            powerOn ? "bg-[#be123c]" : "bg-slate-700"
          }`}
        >
          <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 ${
            powerOn ? "left-7" : "left-1"
          }`} />
        </button>
      </div>

      {/* 设备状态表 */}
      <div className="rounded-2xl bg-gradient-to-br from-[#5D1B22]/20 to-[#be123c]/5 border border-[#be123c]/20 p-4">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Wifi className="w-4 h-4 text-[#fda4af]" />
          设备在线状态
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          {equipment.map((item) => {
            const Icon = EQUIPMENT_ICONS[item.id] || Power;
            const style = STATUS_STYLES[item.status];
            
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${style.bg} ${style.border}`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  item.status === "online" ? "bg-rose-500/20" : "bg-slate-500/20"
                }`}>
                  <Icon className={`w-5 h-5 ${style.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{item.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                    <span className={`text-xs ${style.text}`}>{STATUS_LABELS[item.status]}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
