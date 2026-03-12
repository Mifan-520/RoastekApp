import { useNavigate } from "react-router";
import { MOCK_DEVICES } from "../data/mock";
import { Settings, Bell, Server } from "lucide-react";

export function DeviceList() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-full bg-slate-50 relative pb-20">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm sticky top-0 z-10 sm:pt-14 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-900 to-rose-700 border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-sm">
              AD
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">设备中心</h2>
              <p className="text-xs text-slate-500 font-medium flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-1.5" />
                系统运行正常
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 text-slate-500">
            <button className="p-2 hover:bg-slate-100 rounded-full transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
            </button>
            <button 
              onClick={() => navigate("/settings")}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="px-6 py-6 grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-rose-900 to-rose-800 p-5 rounded-[2rem] text-white shadow-lg shadow-rose-900/20">
          <p className="text-rose-100 text-sm font-medium mb-1 opacity-90">运行设备</p>
          <div className="flex items-end space-x-2">
            <span className="text-3xl font-bold tracking-tight">2</span>
            <span className="text-rose-100 text-sm mb-1 font-medium">/ 3</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-sm font-medium mb-1">今日告警</p>
          <div className="flex items-end space-x-2">
            <span className="text-3xl font-bold text-slate-800 tracking-tight">3</span>
            <span className="text-slate-400 text-sm mb-1 font-medium">条未读</span>
          </div>
        </div>
      </div>

      {/* Device List */}
      <div className="flex-1 px-6 pb-6">
        <h3 className="text-sm font-bold text-slate-800 mb-4 px-1 flex items-center justify-between">
          <span>全部设备</span>
          <span className="text-xs font-medium text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">{MOCK_DEVICES.length}</span>
        </h3>
        
        <div className="space-y-4">
          {MOCK_DEVICES.map((device) => (
            <div
              key={device.id}
              onClick={() => navigate(`/devices/${device.id}`)}
              className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-rose-100 transition-all cursor-pointer active:scale-[0.98] group relative overflow-hidden"
            >
              {/* Highlight bar for online status */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${device.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`} />

              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  {/* Unified Device Icon */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                    device.status === 'online' ? 'bg-rose-50' : 'bg-slate-50'
                  }`}>
                    <Server className={`w-6 h-6 ${device.status === 'online' ? 'text-rose-800' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{device.name}</h4>
                    <p className="text-xs text-slate-500 mt-1 font-medium">{device.type}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${
                    device.status === 'online' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {device.status === 'online' ? '在线' : '离线'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-50/50 mt-2">
                <div className="text-xs text-slate-500 font-medium">
                  状态: {device.status === 'online' ? '正常通信中' : '连接断开'}
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  活跃于: {device.lastActive}
                </div>
              </div>
            </div>
          ))}

          {MOCK_DEVICES.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500 font-medium">暂无设备</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
