import { useNavigate, useParams } from "react-router";
import { ChevronLeft, Fan, Power } from "lucide-react";
import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { MOCK_DEVICES, MOCK_CONFIGS } from "../data/mock";

const STYLED_COLORS = ["#be123c", "#f43f5e", "#ffe4e6"];
const chartData = [
  { name: "动力系统", value: 45 },
  { name: "温控系统", value: 30 },
  { name: "照明及其他", value: 25 },
];

export function DeviceUI() {
  const { id, configId } = useParams();
  const navigate = useNavigate();

  const [switches, setSwitches] = useState({ s1: true, s2: false });

  const device = MOCK_DEVICES.find((d) => d.id === id);
  const configs = MOCK_CONFIGS[id || ""] || [];
  const config = configs.find((c) => c.id === configId);

  if (!device || !config) return null;

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
        
        {/* Statistics Chart */}
        <div className="bg-[#1a0f12]/50 rounded-3xl p-5 border border-rose-900/20">
          <h3 className="text-[15px] font-bold tracking-tight text-white mb-4 px-1">能耗分布统计</h3>
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
                    <Cell key={`cell-${index}`} fill={STYLED_COLORS[index % STYLED_COLORS.length]} />
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
          <div className="grid grid-cols-2 gap-4">
            {/* Switch 1 */}
            <div className={`p-4 rounded-3xl border transition-all duration-300 ${switches.s1 ? 'bg-rose-900/20 border-rose-800/40' : 'bg-[#1a0f12] border-rose-900/20'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${switches.s1 ? 'bg-rose-800 text-white shadow-[0_0_15px_rgba(159,18,57,0.4)]' : 'bg-black/50 text-rose-200/40'}`}>
                  <Fan className={`w-5 h-5 ${switches.s1 ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
                </div>
                <button 
                  onClick={() => setSwitches(s => ({ ...s, s1: !s.s1 }))}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${switches.s1 ? 'bg-rose-700' : 'bg-rose-950'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${switches.s1 ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
              <p className="text-sm font-bold text-white mb-0.5">排风机 1</p>
              <p className="text-xs font-medium text-rose-200/50">{switches.s1 ? '运行中 (1.2kW)' : '已停止'}</p>
            </div>

            {/* Switch 2 */}
            <div className={`p-4 rounded-3xl border transition-all duration-300 ${switches.s2 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[#1a0f12] border-rose-900/20'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${switches.s2 ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(5,150,105,0.4)]' : 'bg-black/50 text-rose-200/40'}`}>
                  <Power className="w-5 h-5" />
                </div>
                <button 
                  onClick={() => setSwitches(s => ({ ...s, s2: !s.s2 }))}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${switches.s2 ? 'bg-emerald-600' : 'bg-rose-950'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${switches.s2 ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
              <p className="text-sm font-bold text-white mb-0.5">主水泵</p>
              <p className="text-xs font-medium text-rose-200/50">{switches.s2 ? '运行中 (2.5kW)' : '已停止'}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
