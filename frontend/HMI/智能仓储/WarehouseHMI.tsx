/**
 * 智能仓储 HMI 组件 - 仓储设备
 * 特点：电源开关 + 10仓位重量网格 + 上料/下料控制
 */
import { useState } from "react";
import { Power, ArrowUp, ArrowDown, Package } from "lucide-react";

interface Bin {
  id: number;
  weight: number;
  maxWeight: number;
}

interface WarehouseHMIProps {
  data: {
    summary: Array<{ id: string; label: string; value: string; unit: string; tone?: string }>;
    controls: Array<{ id: string; label: string; description: string; icon?: string; active: boolean; tone?: string }>;
    powerOn?: boolean;
    bins?: Bin[];
  };
  onControlChange?: (controlId: string, value: any) => void;
}

export function WarehouseHMI({ data, onControlChange }: WarehouseHMIProps) {
  const [powerOn, setPowerOn] = useState(data.powerOn ?? true);
  const [mode, setMode] = useState<"in" | "out">("in");
  const [quantity, setQuantity] = useState("");
  
  // 默认10个仓位数据
  const bins: Bin[] = data.bins ?? [
    { id: 1, weight: 125, maxWeight: 200 },
    { id: 2, weight: 80, maxWeight: 200 },
    { id: 3, weight: 200, maxWeight: 200 },
    { id: 4, weight: 45, maxWeight: 200 },
    { id: 5, weight: 175, maxWeight: 200 },
    { id: 6, weight: 60, maxWeight: 200 },
    { id: 7, weight: 110, maxWeight: 200 },
    { id: 8, weight: 95, maxWeight: 200 },
    { id: 9, weight: 150, maxWeight: 200 },
    { id: 10, weight: 30, maxWeight: 200 },
  ];

  const handlePowerChange = () => {
    const newState = !powerOn;
    setPowerOn(newState);
    onControlChange?.("power", newState);
  };

  const handleExecute = () => {
    if (!powerOn || !quantity) return;
    onControlChange?.(mode === "in" ? "load" : "unload", parseFloat(quantity));
    setQuantity("");
  };

  const quickAmounts = [25, 50, 100, 200];

  return (
    <div className="space-y-4">
      {/* 总电源开关 */}
      <div className="bg-gradient-to-br from-[#5D1B22]/40 to-[#5D1B22]/10 rounded-3xl p-5 border border-[#be123c]/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
              powerOn ? "bg-[#be123c]/30" : "bg-[#5D1B22]/30"
            }`}>
              <Power className={`w-6 h-6 transition-colors ${
                powerOn ? "text-[#fda4af]" : "text-[#be123c]/50"
              }`} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">总电源</p>
              <p className={`text-xs ${powerOn ? "text-[#fda4af]" : "text-white/40"}`}>
                {powerOn ? "已开启" : "已关闭"}
              </p>
            </div>
          </div>
          
          {/* Toggle Switch */}
          <button
            onClick={handlePowerChange}
            className={`w-14 h-8 rounded-full transition-all duration-300 relative ${
              powerOn ? "bg-[#be123c]" : "bg-white/20"
            }`}
          >
            <div className={`absolute w-6 h-6 rounded-full bg-white shadow-md top-1 transition-all duration-300 ${
              powerOn ? "left-7" : "left-1"
            }`} />
          </button>
        </div>
      </div>

      {/* 10仓位重量网格 (2×5) */}
      <div className="bg-gradient-to-br from-[#5D1B22]/20 to-transparent rounded-3xl p-5 border border-[#be123c]/20">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-4 h-4 text-[#fda4af]" />
          <h3 className="text-sm font-bold text-white">仓储重量监控</h3>
        </div>
        
        <div className="grid grid-cols-5 gap-2">
          {bins.map((bin) => {
            const fillPercent = (bin.weight / bin.maxWeight) * 100;
            const isFull = fillPercent >= 90;
            const isLow = fillPercent < 30;
            
            return (
              <div
                key={bin.id}
                className={`rounded-xl p-3 border transition-all ${
                  isFull 
                    ? "bg-[#be123c]/30 border-[#be123c]/50" 
                    : isLow 
                    ? "bg-white/5 border-white/10"
                    : "bg-[#be123c]/10 border-[#be123c]/30"
                }`}
              >
                <div className="text-center">
                  <p className="text-[10px] text-white/50 mb-1">{bin.id}号仓</p>
                  <p className={`text-lg font-black ${
                    isFull ? "text-[#fda4af]" : "text-white"
                  }`}>
                    {bin.weight}
                  </p>
                  <p className="text-[10px] text-white/40">kg</p>
                </div>
                {/* 填充条 */}
                <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      isFull ? "bg-[#be123c]" : "bg-[#fda4af]"
                    }`}
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 上料/下料控制 */}
      <div className="bg-gradient-to-br from-[#5D1B22]/30 to-[#5D1B22]/10 rounded-3xl p-5 border border-[#be123c]/30">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <ArrowUp className="w-4 h-4 text-[#fda4af]" />
          上料/下料控制
        </h3>
        
        {/* 模式选择 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode("in")}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 transition-all ${
              mode === "in" 
                ? "bg-[#be123c] text-white" 
                : "bg-white/5 text-white/50 border border-white/10"
            }`}
          >
            <ArrowDown className="w-4 h-4" />
            <span className="text-sm font-medium">上料</span>
          </button>
          <button
            onClick={() => setMode("out")}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 transition-all ${
              mode === "out" 
                ? "bg-[#be123c] text-white" 
                : "bg-white/5 text-white/50 border border-white/10"
            }`}
          >
            <ArrowUp className="w-4 h-4" />
            <span className="text-sm font-medium">下料</span>
          </button>
        </div>
        
        {/* 数量输入 */}
        <div className="mb-4">
          <label className="text-xs text-white/50 mb-2 block">数量设定 (kg)</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="输入数量..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#be123c]/50"
          />
        </div>
        
        {/* 快速选择按钮 */}
        <div className="flex gap-2 mb-4">
          {quickAmounts.map((amount) => (
            <button
              key={amount}
              onClick={() => setQuantity(amount.toString())}
              className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-medium hover:bg-[#be123c]/20 hover:border-[#be123c]/30 transition-all"
            >
              {amount}
            </button>
          ))}
        </div>
        
        {/* 执行按钮 */}
        <button
          onClick={handleExecute}
          disabled={!powerOn || !quantity}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
            powerOn && quantity
              ? "bg-[#be123c] text-white hover:bg-[#be123c]/80"
              : "bg-white/10 text-white/30 cursor-not-allowed"
          }`}
        >
          {mode === "in" ? "执行上料" : "执行下料"}
        </button>
      </div>
    </div>
  );
}