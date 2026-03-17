import { useNavigate, useParams } from "react-router";
import { ChevronLeft, Fan, Gauge, LayoutTemplate, Power } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import {
  getDevice,
  getDeviceConfig,
  type DeviceRecord,
  type DeviceConfigRecord,
  type DeviceUiControlItem,
} from "../services/devices";
import { getHMIComponent } from "../../../HMI";

const STYLED_COLORS = ["#be123c", "#f43f5e", "#ffe4e6"];

const toneClasses = {
  rose: "border-rose-800/40 bg-rose-900/15 text-rose-100",
  emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-100",
} as const;

function getToneClass(tone?: "rose" | "emerald" | "amber") {
  return tone ? toneClasses[tone] : "border-rose-900/20 bg-[#1a0f12] text-slate-100";
}

function ControlIcon({ icon, active }: { icon?: DeviceUiControlItem["icon"]; active: boolean }) {
  const className = `w-5 h-5 ${icon === "fan" && active ? "animate-spin" : ""}`;

  if (icon === "fan") {
    return <Fan className={className} style={{ animationDuration: "3s" }} />;
  }

  if (icon === "gauge") {
    return <Gauge className={className} />;
  }

  return <Power className={className} />;
}

export function DeviceUI() {
  const { id } = useParams();
  const navigate = useNavigate();

const [device, setDevice] = useState<DeviceRecord | null>(null);
  const [config, setConfig] = useState<DeviceConfigRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // useMemo 必须在所有条件返回之前调用，符合 React hooks 规则
  const isDesigned = !!config?.payload;
  const chartData = useMemo(
    () => (config?.payload?.chart?.data ?? []).map((item) => ({ ...item, name: item.label })),
    [config?.payload?.chart?.data],
  );

  useEffect(() => {
    let active = true;

    async function loadConfigScreen() {
      if (!id) {
        return;
      }

      setIsLoading(true);

      try {
        const [nextDevice, nextConfig] = await Promise.all([getDevice(id), getDeviceConfig(id)]);
        if (!active) {
          return;
        }
        setDevice(nextDevice);
        setConfig(nextConfig);
      } catch {
        if (!active) {
          return;
        }
        setDevice(null);
        setConfig(null);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadConfigScreen();
    return () => {
      active = false;
    };
  }, [id]);

if (isLoading) {
    return <div className="flex flex-col min-h-full items-center justify-center p-6 bg-[#0d0708] text-slate-100"><h2 className="text-xl font-bold">加载中...</h2></div>;
  }

  if (!device || !config) {
    return (
      <div className="flex flex-col min-h-full bg-[#0d0708] text-slate-100 relative">
        <div className="flex items-center p-6 sticky top-0 bg-[#0d0708]/80 backdrop-blur-xl z-50 border-b border-rose-900/30">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2 rounded-full hover:bg-rose-950/50 transition-colors text-rose-100">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-[17px] font-bold tracking-tight text-white flex-1">组态界面</h1>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-slate-400 font-medium">加载失败，请重试</div>
      </div>
    );
}

  if (!isDesigned) {
    return (
      <div className="flex flex-col min-h-screen bg-[#0d0708] text-slate-100 relative overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-950/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-900/10 rounded-full blur-[100px] pointer-events-none" />
        
        {/* Navigation Bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center p-6 bg-[#0d0708]/80 backdrop-blur-xl z-50 border-b border-rose-900/30">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2 rounded-full hover:bg-rose-950/50 transition-colors text-rose-100">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-[17px] font-bold tracking-tight text-white flex-1">{config.name}</h1>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 mt-16 text-center relative z-10">
            {/* Logo / Placeholder icon */}
            <div className="w-32 h-32 mb-8 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-rose-900/20 to-rose-800/20 rounded-3xl rotate-3 scale-105" />
              <div className="absolute inset-0 bg-[#1a0f12] rounded-3xl border border-rose-900/40 flex items-center justify-center shadow-xl">
                 <div className="w-16 h-16 bg-gradient-to-br from-rose-800 to-rose-950 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(159,18,57,0.3)] border border-rose-700/50">
                    <img src="/device-center.png" alt="logo" className="w-10 h-10 object-contain opacity-90 drop-shadow-md" onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                    <LayoutTemplate className="w-8 h-8 text-rose-200 hidden" />
                 </div>
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-white mb-3 tracking-tight">暂无组态画面</h2>
            <p className="text-rose-200/50 text-[15px] font-medium max-w-[260px] leading-relaxed">
              该设备尚未设计或绑定组态界面，请在工程后台进行配置。
            </p>
            
            <button className="mt-10 px-8 py-3.5 bg-rose-900/30 hover:bg-rose-800/50 border border-rose-800/40 rounded-2xl text-rose-100 font-bold transition-all shadow-[0_0_20px_rgba(159,18,57,0.15)] backdrop-blur-md active:scale-95">
              联系技术支持
            </button>
        </div>
      </div>
    );
  }

// 检查是否有专用HMI组件
  const HMIComponent = getHMIComponent(config.id, device.type);

  // 如果有专用HMI组件，使用它渲染
  if (HMIComponent) {
    return (
      <div className="flex flex-col min-h-full bg-[#0d0708] text-slate-100 relative">
        {/* Header */}
        <div className="flex items-center p-6 sticky top-0 bg-[#0d0708]/80 backdrop-blur-xl z-50 border-b border-rose-900/30">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2 rounded-full hover:bg-rose-950/50 transition-colors text-rose-100">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-[17px] font-bold tracking-tight text-white flex-1">{config.name}</h1>
        </div>
        <HMIComponent data={config.payload} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-[#0d0708] text-slate-100 relative">
      {/* Header */}
      <div className="flex items-center p-6 sticky top-0 bg-[#0d0708]/80 backdrop-blur-xl z-50 border-b border-rose-900/30">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2 rounded-full hover:bg-rose-950/50 transition-colors text-rose-100">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-[17px] font-bold tracking-tight text-white flex-1">{config.name}</h1>
      </div>

      <div className="p-6 pt-4 space-y-6 flex-1">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {config.payload?.summary.map((item) => (
            <div key={item.id} className={`rounded-3xl border p-4 ${getToneClass(item.tone)}`}>
              <p className="text-xs font-medium tracking-[0.2em] text-white/55">{item.label}</p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-3xl font-black tracking-tight text-white">{item.value}</span>
                {item.unit ? <span className="pb-1 text-sm font-semibold text-white/65">{item.unit}</span> : null}
              </div>
            </div>
          ))}
        </div>
        
        {/* Statistics Chart */}
        <div className="bg-[#1a0f12]/50 rounded-3xl p-5 border border-rose-900/20">
          <h3 className="text-[15px] font-bold tracking-tight text-white mb-4 px-1">{config.payload?.chart.title ?? "能耗分布统计"}</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color ?? STYLED_COLORS[index % STYLED_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0d0708', border: '1px solid #4c1d24', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', color: '#fff' }}
                  itemStyle={{ color: '#fda4af' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#cbd5e1' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Control Switches */}
        <div>
          <h3 className="text-[15px] font-bold tracking-tight text-white mb-4 px-1">设备控制</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {config.payload?.controls.map((control) => (
              <div key={control.id} className={`rounded-3xl border p-4 transition-all duration-300 ${getToneClass(control.tone)}`}>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${control.active ? "bg-white/15 text-white shadow-[0_0_15px_rgba(255,255,255,0.08)]" : "bg-black/30 text-white/45"}`}>
                    <ControlIcon icon={control.icon} active={control.active} />
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold tracking-[0.18em] ${control.active ? "bg-white/15 text-white" : "bg-black/25 text-white/55"}`}>
                    {control.active ? "ON" : "OFF"}
                  </span>
                </div>
                <p className="text-sm font-bold text-white mb-0.5">{control.label}</p>
                <p className="text-xs font-medium text-white/60">{control.description}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
