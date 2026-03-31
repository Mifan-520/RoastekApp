import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, Download, Package, Coffee, Leaf, BarChart2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PRODUCTION_DATA, type ReportTimeRange } from "./reportData";

export function ProductionReportPage() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<ReportTimeRange>("day");

  const currentData = PRODUCTION_DATA[timeRange];

  return (
    <div className="flex flex-col min-h-full bg-slate-50 text-slate-900 relative pb-10">
      <div className="flex items-center p-6 sticky top-0 bg-white/95 backdrop-blur-xl z-50 border-b border-rose-100 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2 rounded-full hover:bg-rose-50 transition-colors text-slate-600">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-[17px] font-bold tracking-tight text-slate-900">总产量数据报表</h1>
        </div>
        <button className="p-2 -mr-2 rounded-full hover:bg-rose-50 transition-colors text-rose-700">
          <Download className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-6">
        <div className="flex items-center bg-white p-1 rounded-xl border border-rose-100 shadow-sm w-full relative isolate">
          <div
            className="absolute top-1 bottom-1 w-[calc(33.33%-4px)] bg-[#940236] rounded-lg transition-transform duration-300 shadow-md z-0"
            style={{
              transform: `translateX(${timeRange === "day" ? "4px" : timeRange === "month" ? "calc(100% + 4px)" : "calc(200% + 4px)"})`,
            }}
          />
          <button
            onClick={() => setTimeRange("day")}
            className={`relative z-10 flex-1 py-2 text-xs font-bold transition-colors ${timeRange === "day" ? "text-white" : "text-slate-500 hover:text-rose-700"}`}
          >
            日产量
          </button>
          <button
            onClick={() => setTimeRange("month")}
            className={`relative z-10 flex-1 py-2 text-xs font-bold transition-colors ${timeRange === "month" ? "text-white" : "text-slate-500 hover:text-rose-700"}`}
          >
            月产量
          </button>
          <button
            onClick={() => setTimeRange("year")}
            className={`relative z-10 flex-1 py-2 text-xs font-bold transition-colors ${timeRange === "year" ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]" : "text-slate-500 hover:text-rose-700"}`}
          >
            年产量
          </button>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-rose-100 shadow-sm">
          <h3 className="text-[14px] font-bold tracking-tight text-slate-800 mb-6 flex items-center">
            <BarChart2 className="w-4 h-4 text-rose-700 mr-2" />
            <span>各阶段产量流转折线图</span>
          </h3>
            <div className="h-[240px] w-full relative -ml-4">
              <ResponsiveContainer width="100%" height={240}>
              <LineChart data={currentData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="stage" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickMargin={12} fontWeight={600} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickMargin={8} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #fecdd3", borderRadius: "12px", fontSize: "12px", color: "#0f172a", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  itemStyle={{ fontSize: "13px", fontWeight: "bold" }}
                  formatter={(value: number) => [`${value.toLocaleString()} kg`, "产量"]}
                />
                <Line
                  type="linear"
                  dataKey="value"
                  name="产量(kg)"
                  stroke="#940236"
                  strokeWidth={3}
                  dot={{ r: 5, fill: "#fff", strokeWidth: 2, stroke: "#940236" }}
                  activeDot={{ r: 7, fill: "#940236" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 border border-rose-100 shadow-sm flex items-center justify-between relative overflow-hidden">
            <div className="absolute -left-4 -bottom-4 opacity-[0.04] text-stone-700">
              <Leaf className="w-24 h-24" />
            </div>
              <div className="flex items-center space-x-4 relative z-10">
              <div className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center">
                <Leaf className="w-5 h-5 text-stone-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 mb-0.5">生豆处理总量</p>
                <p className="text-xl font-bold text-slate-800 tracking-tight">{currentData[0].value.toLocaleString()} <span className="text-xs font-medium text-slate-400 ml-0.5">kg</span></p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-rose-100 shadow-sm flex items-center justify-between relative overflow-hidden">
            <div className="absolute -left-4 -bottom-4 opacity-[0.03]">
              <Coffee className="w-24 h-24" />
            </div>
            <div className="flex items-center space-x-4 relative z-10">
              <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center">
                <Coffee className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 mb-0.5">熟豆烘焙总量</p>
                <p className="text-xl font-bold text-amber-900 tracking-tight">{currentData[1].value.toLocaleString()} <span className="text-xs font-medium text-amber-700/60 ml-0.5">kg</span></p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-rose-100 shadow-sm flex items-center justify-between relative overflow-hidden">
            <div className="absolute -left-4 -bottom-4 opacity-[0.03]">
              <Package className="w-24 h-24" />
            </div>
            <div className="flex items-center space-x-4 relative z-10">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-[#5D1B22]" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 mb-0.5">成品包装总量</p>
                <p className="text-xl font-bold text-[#5D1B22] tracking-tight">{currentData[2].value.toLocaleString()} <span className="text-xs font-medium text-rose-900/60 ml-0.5">kg</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
