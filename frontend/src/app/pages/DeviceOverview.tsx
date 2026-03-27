import { useNavigate, useParams } from "react-router";
import { ChevronLeft, Activity, Droplet, FileText, Power, Zap, Settings, AlertTriangle, AlertCircle, Trash2, Clock, Smartphone, SignalMedium, SignalLow, LayoutTemplate } from "lucide-react";
import { useState } from "react";
import { getDevice, getDeviceConfig, deleteAlarm, type DeviceRecord, type DeviceConfigRecord } from "../services/devices";
import { formatAbsoluteTime } from "../utils/date";
import { useAutoRefresh, useVisibilityRefresh } from "../hooks/useAutoRefresh";

export function DeviceOverview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState<DeviceRecord | null>(null);
  const [config, setConfig] = useState<DeviceConfigRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  // 自动刷新设备详情数据
  const refreshData = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    
    if (!id) {
      setPageError("设备参数缺失");
      setIsLoading(false);
      return;
    }

    if (!silent) {
      setIsLoading(true);
      setPageError("");
    }

    try {
      const [nextDevice, nextConfig] = await Promise.all([getDevice(id), getDeviceConfig(id)]);
      setDevice(nextDevice);
      setConfig(nextConfig);
      if (silent) setPageError(""); // Clear any previous errors if successful
    } catch (error) {
      const message = error instanceof Error ? error.message : "加载设备详情失败";
      if (message.includes("未登录")) {
        navigate("/login", { replace: true });
        return;
      }

      setPageError(message);
      if (!silent) {
        setDevice(null);
        setConfig(null);
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  useAutoRefresh(() => refreshData({ silent: true }), [id], {
    interval: 5000,  // 每 5 秒刷新一次
    enabled: !!id,
    onError: (error) => {
      console.error("设备详情刷新失败:", error);
    },
  });

  useVisibilityRefresh(() => {
    void refreshData({ silent: true });
  });

  const alarms = device?.alarms || [];
  const connectionHistory = [...(device?.connectionHistory || [])].sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  );

  const handleDeleteAlarm = async (alarmId: string) => {
    if (!id) return;
    try {
      await deleteAlarm(id, alarmId);
      const updated = await getDevice(id);
      setDevice(updated);
      setPageError("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除报警失败";
      if (message.includes("未登录")) {
        navigate("/login", { replace: true });
        return;
      }
      setPageError(message);
    }
  };

  if (isLoading) {
    return <div className="flex flex-col min-h-full items-center justify-center p-6 bg-slate-50"><h2 className="text-xl font-bold text-slate-800">加载中...</h2></div>;
  }

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
          <div className="w-10"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-2xl font-bold tracking-tight">{device.name}</h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
              device.status === 'online' ? 'bg-roastek-secondary/20 text-roastek-accent border border-roastek-secondary/30' : 'bg-slate-400/20 text-slate-200 border border-slate-400/30'
            }`}>
              {device.status === 'online' ? '在线' : '离线'}
            </span>
          </div>
          <div className="text-rose-100/80 text-sm font-medium flex flex-col space-y-1">
            <span>{device.address}</span>
          </div>
        </div>
      </div>

      {pageError ? (
        <div className="px-6 -mt-14 relative z-30">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {pageError}
          </div>
        </div>
      ) : null}

      {/* Main Content (overlapping header) */}
      <div className="px-6 -mt-16 relative z-20 flex-1">
        
        {/* Connection History Section */}
        <div className="mb-8 bg-white p-5 rounded-3xl shadow-lg shadow-rose-950/5 border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center">
              上下线记录
              <Clock className="w-4 h-4 ml-2 text-slate-400" />
            </h3>
          </div>
          
          <div className="space-y-4 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
            {connectionHistory.map((record) => (
              <div key={record.id} className="flex items-center justify-between px-1">
                <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center mr-3 ${
                        record.type === 'online' ? 'bg-roastek-light text-roastek-secondary' : 'bg-slate-50 text-slate-400'
                    }`}>
                        {record.type === 'online' ? <SignalMedium className="w-4 h-4" /> : <SignalLow className="w-4 h-4" />}
                    </div>
                    <div>
                        <p className={`text-sm font-bold ${record.type === 'online' ? 'text-slate-800' : 'text-slate-500'}`}>{record.label}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-slate-600">{formatAbsoluteTime(record.time)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alarms Section */}
        <div className="mb-8 bg-white p-5 rounded-3xl shadow-lg shadow-rose-950/5 border border-slate-100">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center">
              报警信息
            {alarms.length > 0 && <span className="flex w-2 h-2 ml-2 rounded-full bg-red-500 animate-pulse"></span>}
            </h3>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{alarms.length}条记录</span>
          </div>
          <div className="space-y-3 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
            {alarms.length > 0 ? alarms.map((alarm) => (
              <div key={alarm.id} className="p-4 rounded-2xl border flex items-start bg-red-50/50 border-red-100">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{alarm.message}</p>
                      <p className="text-xs text-slate-500 mt-1 font-medium">{formatAbsoluteTime(alarm.time)}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteAlarm(alarm.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
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
          <h3 className="text-base font-bold text-slate-800 tracking-tight">设备监控</h3>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {config ? (
            <div
              key={config.id}
              onClick={() => navigate(`/devices/${device.id}/config/${config.id}`)}
              className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98] flex items-center group"
            >
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-inner">
                <LayoutTemplate className="w-6 h-6 text-[#5D1B22]" />
              </div>
              <div className="ml-4 flex-1">
                <h4 className="font-bold text-slate-900 text-[15px] tracking-tight">监控界面</h4>
              </div>
              <ChevronLeft className="w-5 h-5 text-slate-300 rotate-180 group-hover:text-rose-800 transition-colors" />
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-300">
              <p className="text-slate-500 font-medium text-sm">无监控</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
