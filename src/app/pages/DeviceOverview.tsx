import { useNavigate, useParams } from "react-router";
import { ChevronLeft, MoreVertical, Activity, Droplet, FileText, Power, Zap, Settings, AlertTriangle, AlertCircle } from "lucide-react";
import { MOCK_DEVICES, MOCK_CONFIGS, MOCK_ALARMS } from "../data/mock";

export function DeviceOverview() {
  const { id } = useParams();
  const navigate = useNavigate();

  const device = MOCK_DEVICES.find((d) => d.id === id);
  const configs = MOCK_CONFIGS[id || ""] || [];
  const alarms = MOCK_ALARMS.filter(a => a.deviceId === id);

  if (!device) {
    return (
      <div className="flex flex-col min-h-full items-center justify-center p-6 bg-slate-50">
        <h2 className="text-xl font-bold text-slate-800">设备未找到</h2>
        <button onClick={() => navigate("/devices")} className="mt-4 px-6 py-2 bg-[#5D1B22] text-white rounded-xl font-medium">
          返回列表
        </button>
      </div>
    );
  }

  const getIcon = (type: string, className = "w-6 h-6") => {
    switch (type) {
      case "thermometer": return <Activity className={className} />;
      case "droplet": return <Droplet className={className} />;
      case "file-text": return <FileText className={className} />;
      case "power": return <Power className={className} />;
      case "zap": return <Zap className={className} />;
      default: return <Settings className={className} />;
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-50 relative pb-10">
      {/* Header with Navigation */}
      <div className="bg-gradient-to-b from-rose-950 to-rose-900 px-6 pt-12 pb-24 text-white relative shadow-md">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1770885653473-ca48b4d69173?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGRhcmslMjBibHVlJTIwdGVjaG5vbG9neXxlbnwxfHx8fDE3NzMyODUwNzR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral')] opacity-[0.05] mix-blend-overlay pointer-events-none bg-cover"></div>
        <div className="flex items-center justify-between mb-8 relative z-10">
          <button onClick={() => navigate("/devices")} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <span className="text-lg font-bold tracking-tight text-white/90">设备详情</span>
          <button className="p-2 -mr-2 rounded-full hover:bg-white/10 transition-colors">
            <MoreVertical className="w-6 h-6" />
          </button>
        </div>

        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-2xl font-bold tracking-tight">{device.name}</h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
              device.status === 'online' ? 'bg-emerald-400/20 text-emerald-100 border border-emerald-400/30' : 'bg-slate-400/20 text-slate-200 border border-slate-400/30'
            }`}>
              {device.status === 'online' ? '在线' : '离线'}
            </span>
          </div>
          <p className="text-rose-100/80 text-sm font-medium flex items-center">
            {device.type} · {device.location}
          </p>
        </div>
      </div>

      {/* Main Content (overlapping header) */}
      <div className="px-6 -mt-16 relative z-20 flex-1">
        
        {/* Alarms Section */}
        <div className="mb-8 bg-white p-5 rounded-3xl shadow-lg shadow-rose-950/5 border border-slate-100">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center">
              报警信息
              {alarms.length > 0 && <span className="flex w-2 h-2 ml-2 rounded-full bg-red-500 animate-pulse"></span>}
            </h3>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{alarms.length}条记录</span>
          </div>
          <div className="space-y-3">
            {alarms.length > 0 ? alarms.map(alarm => (
              <div key={alarm.id} className={`p-4 rounded-2xl border flex items-start ${
                alarm.level === 'error' ? 'bg-red-50/50 border-red-100' : 
                alarm.level === 'warning' ? 'bg-orange-50/50 border-orange-100' : 
                'bg-blue-50/50 border-blue-100'
              }`}>
                {alarm.level === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : alarm.level === 'warning' ? (
                  <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <Activity className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">{alarm.message}</p>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{alarm.time}</p>
                </div>
              </div>
            )) : (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-500 text-sm font-medium h-24">
                当前设备运行正常，无报警信息
              </div>
            )}
          </div>
        </div>

        {/* Configs List */}
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-base font-bold text-slate-800 tracking-tight">组态列表</h3>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {configs.map((config) => (
            <div
              key={config.id}
              onClick={() => navigate(`/devices/${device.id}/config/${config.id}`)}
              className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98] flex items-center group"
            >
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-inner">
                {getIcon(config.iconType, "w-6 h-6 text-[#5D1B22]")}
              </div>
              <div className="ml-4 flex-1">
                <h4 className="font-bold text-slate-900 text-[15px] mb-1 tracking-tight">{config.name}</h4>
                <p className="text-xs text-slate-500 font-medium leading-snug">{config.description}</p>
              </div>
              <ChevronLeft className="w-5 h-5 text-slate-300 rotate-180 group-hover:text-rose-800 transition-colors" />
            </div>
          ))}

          {configs.length === 0 && (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-300">
              <p className="text-slate-500 font-medium text-sm">暂无组态配置</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
