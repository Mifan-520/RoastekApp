import { useNavigate } from "react-router";
import { AlertCircle, ChevronLeft, Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteAlarm, getDevices, type DeviceRecord } from "../services/devices";
import { formatAbsoluteTime } from "../utils/date";
import { getVisibleDeviceAlarms } from "../utils/device-alarms";
import { useAutoRefresh, useVisibilityRefresh } from "../hooks/useAutoRefresh";

export function DeviceSyncAlarms() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const refreshData = async () => {
    setIsLoading(true);
    setPageError("");

      try {
        const nextDevices = await getDevices();
        setDevices(nextDevices);
      } catch (error) {
      const message = error instanceof Error ? error.message : "加载告警失败";
      if (message.includes("未登录")) {
        navigate("/login", { replace: true });
        return;
      }

      setPageError(message);
      setDevices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useAutoRefresh(refreshData, [], {
    interval: 5000,
    enabled: true,
    onError: (error) => {
        console.error("告警刷新失败:", error);
      },
    });

  useVisibilityRefresh(() => {
    void refreshData();
  });

  const alarms = getVisibleDeviceAlarms(devices)
    .sort((left, right) => new Date(right.time).getTime() - new Date(left.time).getTime());

  const handleDeleteAlarm = async (deviceId: string, alarmId: string) => {
    try {
      await deleteAlarm(deviceId, alarmId);
      await refreshData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除告警失败";
      if (message.includes("未登录")) {
        navigate("/login", { replace: true });
        return;
      }

      setPageError(message);
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-slate-50 pb-10">
      <div className="bg-gradient-to-b from-rose-950 to-rose-900 px-6 pt-12 pb-20 text-white shadow-md">
        <div className="mb-8 flex items-center justify-between">
          <button onClick={() => navigate("/devices")} className="-ml-2 rounded-full p-2 transition-colors hover:bg-white/10">
            <ChevronLeft className="h-6 w-6" />
          </button>
            <span className="text-lg font-bold tracking-tight text-white/90">告警信息</span>
          <div className="w-10" />
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">设备告警信息</h1>
              <span className="inline-flex rounded-full border border-rose-200/20 bg-white/10 px-2.5 py-1 text-[10px] font-bold tracking-wide text-rose-100">
                {alarms.length}条
              </span>
            </div>

        </div>
      </div>

      <div className="relative z-20 -mt-14 px-6">
        {pageError ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {pageError}
          </div>
        ) : null}

        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-lg shadow-rose-950/5">
          {isLoading ? (
            <div className="py-12 text-center text-sm font-medium text-slate-500">正在加载告警信息...</div>
          ) : alarms.length > 0 ? (
            <div className="space-y-3">
              {alarms.map((alarm) => (
                <div key={`${alarm.deviceId}-${alarm.id}`} className="rounded-2xl border border-red-100 bg-red-50/60 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{alarm.deviceName}</p>
                          <p className="mt-1 text-sm font-medium text-slate-800">{alarm.message}</p>
                          <p className="mt-2 text-xs font-medium text-slate-500">{formatAbsoluteTime(alarm.time)}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteAlarm(alarm.deviceId, alarm.id)}
                          className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm font-medium text-slate-500">
              当前没有需要处理的设备告警
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
