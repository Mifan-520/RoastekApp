import { useNavigate } from "react-router";
import { Settings, Server, Plus, X, Check, ArchiveX, Edit2, AlertTriangle, Info, AlertCircle, Trash2, User } from "lucide-react";
import { useState, useEffect } from "react";
import { claimDevice, deleteDevice, getDevices, updateDevice, type DeviceRecord } from "../services/devices";
import { createGroup, deleteGroup, getGroups, updateGroup, type DeviceGroupRecord } from "../services/groups";
import { formatAbsoluteTime } from "../utils/date";
import { getVisibleDeviceAlarms } from "../utils/device-alarms";
import { getDeviceStatsSummary } from "../utils/device-stats.js";

export function DeviceList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [groups, setGroups] = useState<DeviceGroupRecord[]>([]);
  
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);

  const [deleteConfirmGroupId, setDeleteConfirmGroupId] = useState<string | null>(null);
  const [isAlarmsModalOpen, setIsAlarmsModalOpen] = useState(false);

  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [isDevicesLoading, setIsDevicesLoading] = useState(true);
  const [hasResolvedInitialDeviceLoad, setHasResolvedInitialDeviceLoad] = useState(false);
  const [listError, setListError] = useState("");
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [devName, setDevName] = useState("");
  const [devAddress, setDevAddress] = useState("");
  const [devActivationCode, setDevActivationCode] = useState("");
  const [deleteConfirmDeviceId, setDeleteConfirmDeviceId] = useState<string | null>(null);
  const [deviceFormError, setDeviceFormError] = useState("");
  const [isDeviceSubmitting, setIsDeviceSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadDeviceList() {
      setIsDevicesLoading(true);
      setListError("");

      try {
        const [nextDevices, nextGroups] = await Promise.all([getDevices(), getGroups()]);

        if (!active) {
          return;
        }

        setDevices(nextDevices);
        setGroups(nextGroups);
      } catch (error) {
        if (!active) {
          return;
        }

        const message = error instanceof Error ? error.message : "加载设备失败";
        setListError(message);

        if (message.includes("未登录")) {
          navigate("/login", { replace: true });
        }
      } finally {
        if (active) {
          setHasResolvedInitialDeviceLoad(true);
          setIsDevicesLoading(false);
        }
      }
    }

    loadDeviceList();

    return () => {
      active = false;
    };
  }, [navigate]);

  const openAddDeviceModal = () => {
    setEditingDeviceId(null);
    setDevName("");
    setDevAddress("");
    setDevActivationCode("");
    setDeviceFormError("");
    setIsDeviceModalOpen(true);
  };

  const openEditDeviceModal = (device: DeviceRecord) => {
    setEditingDeviceId(device.id);
    setDevName(device.name);
    setDevAddress(device.address || "");
    setDevActivationCode("");
    setDeviceFormError("");
    setIsDeviceModalOpen(true);
  };

  const handleSaveDevice = async () => {
    const name = devName.trim();
    const address = devAddress.trim();
    const claimCode = devActivationCode.trim();

    if (!name || (!editingDeviceId && !address)) {
      setDeviceFormError("名称和地址不能为空");
      return;
    }

    if (editingDeviceId && !address) {
      setDeviceFormError("编辑设备时请补全信息");
      return;
    }

    if (!editingDeviceId && (!claimCode || !address)) {
      setDeviceFormError("请输入8位设备码和设备地址");
      return;
    }

    setIsDeviceSubmitting(true);
    setDeviceFormError("");

    try {
      if (editingDeviceId) {
        await updateDevice(editingDeviceId, { name, address });
      } else {
        await claimDevice({ claimCode, name, address });
      }

      const nextDevices = await getDevices();
      setDevices(nextDevices);
      setIsDeviceModalOpen(false);
    } catch (error) {
      setDeviceFormError(error instanceof Error ? error.message : "保存设备失败");
    } finally {
      setIsDeviceSubmitting(false);
    }
  };

  const handleDeleteDevice = async () => {
    if (!deleteConfirmDeviceId) return;

    try {
      await deleteDevice(deleteConfirmDeviceId);
      const [nextDevices, nextGroups] = await Promise.all([getDevices(), getGroups()]);
      setDevices(nextDevices);
      setGroups(nextGroups);
      setDeleteConfirmDeviceId(null);
    } catch (error) {
      setDeviceFormError(error instanceof Error ? error.message : "删除设备失败");
    }
  };

  const openAddModal = () => {
    setEditingGroupId(null);
    setNewGroupName("");
    setSelectedDeviceIds([]);
    setIsGroupModalOpen(true);
  };

  const openEditModal = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
        setEditingGroupId(group.id);
        setNewGroupName(group.name);
        setSelectedDeviceIds(group.deviceIds);
        setIsGroupModalOpen(true);
    }
  };

  const handleSaveGroup = async () => {
    if (!newGroupName.trim() || selectedDeviceIds.length === 0) return;

    try {
      if (editingGroupId) {
        await updateGroup(editingGroupId, {
          name: newGroupName.trim(),
          deviceIds: selectedDeviceIds,
        });
      } else {
        const created = await createGroup({
          name: newGroupName.trim(),
          deviceIds: selectedDeviceIds,
        });
        setActiveTab(created.id);
      }

      const nextGroups = await getGroups();
      setGroups(nextGroups);
      setIsGroupModalOpen(false);
    } catch (error) {
      setListError(error instanceof Error ? error.message : "保存分组失败");
    }
  };

  const handleDeleteGroup = async () => {
    if (!deleteConfirmGroupId) return;

    try {
      await deleteGroup(deleteConfirmGroupId);
      const nextGroups = await getGroups();
      setGroups(nextGroups);
      if (activeTab === deleteConfirmGroupId) {
        setActiveTab("all");
      }
      setDeleteConfirmGroupId(null);
    } catch (error) {
      setListError(error instanceof Error ? error.message : "删除分组失败");
    }
  };

  const filteredDevices = activeTab === "all" 
    ? devices 
    : devices.filter(d => groups.find(g => g.id === activeTab)?.deviceIds.includes(d.id));
  const alarms = getVisibleDeviceAlarms(devices);
  const statsSummary = getDeviceStatsSummary(devices, {
    isPendingInitialLoad: !hasResolvedInitialDeviceLoad,
    hasError: Boolean(listError),
  });

  // Helper function to get icon based on alarm level
  const getAlarmIcon = (_level: string) => {
    return <AlertCircle className="w-5 h-5 text-rose-500" />;
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-50 relative pb-20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md px-6 pt-12 pb-6 shadow-sm sticky top-0 z-30 sm:pt-14 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center text-slate-500">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">设备中心</h2>
            </div>
          </div>
          <div className="flex items-center space-x-3 text-slate-500">
            <button 
              onClick={openAddDeviceModal}
              className="px-3 py-1.5 hover:bg-rose-50 text-rose-600 rounded-full transition-colors flex items-center text-sm font-medium border border-rose-100"
            >
              <Plus className="w-4 h-4 mr-1" />
              添加设备
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
        <div className="bg-gradient-to-br from-rose-900 to-rose-800 p-5 rounded-[2rem] text-white shadow-lg shadow-rose-900/20 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-rose-100 text-sm font-medium mb-1 opacity-90">运行设备</p>
            <div className="flex items-end space-x-2">
              <span className="text-3xl font-bold tracking-tight">{statsSummary.onlineCountLabel}</span>
              <span className="text-rose-100 text-sm mb-1 font-medium">/ {statsSummary.totalCountLabel}</span>
            </div>
          </div>
          {/* Decorative mini chart / ring */}
          <div className="absolute -bottom-2 -right-2 opacity-20">
            <svg width="80" height="80" viewBox="0 0 100 100" className="-rotate-90">
              <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="12" fill="none" opacity="0.3" />
              <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="12" fill="none" strokeDasharray="251" strokeDashoffset="80" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <div 
          onClick={() => setIsAlarmsModalOpen(true)}
          className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
        >
          <div className="relative z-10">
            <p className="text-slate-500 text-sm font-medium mb-1 flex items-center">
              告警信息
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 ml-1.5 animate-pulse" />
            </p>
            <div className="flex items-end space-x-2">
              <span className="text-3xl font-bold text-slate-800 tracking-tight">{alarms.length}</span>
              <span className="text-slate-400 text-sm mb-1 font-medium">条记录</span>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 left-0 h-10 opacity-[0.03]">
             <svg viewBox="0 0 200 40" preserveAspectRatio="none" className="w-full h-full text-rose-500 fill-current">
                <path d="M0,40 L0,20 C20,20 30,10 50,10 C70,10 80,30 100,30 C120,30 130,5 150,5 C170,5 180,25 200,25 L200,40 Z"></path>
             </svg>
          </div>
        </div>
      </div>

      {/* Device List Tabs */}
      <div className="px-6 mb-4">
        <div className="flex items-center space-x-3 overflow-x-auto no-scrollbar pb-2">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex items-center flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === "all"
                ? "bg-rose-900 text-white shadow-md shadow-rose-900/20"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            全部设备
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === "all" ? "bg-rose-800 text-rose-100" : "bg-slate-100 text-slate-500"
            }`}>
              {devices.length}
            </span>
          </button>
          
          {groups.map(group => (
            <button
              key={group.id}
              onClick={() => setActiveTab(group.id)}
              className={`flex items-center flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === group.id
                  ? "bg-rose-900 text-white shadow-md shadow-rose-900/20"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {group.name}
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === group.id ? "bg-rose-800 text-rose-100" : "bg-slate-100 text-slate-500"
              }`}>
                {group.deviceIds.length}
              </span>
              {activeTab === group.id && (
                <div className="flex items-center ml-2 border-l border-rose-800/50 pl-2 space-x-1.5">
                  <Edit2 
                    onClick={(e) => { e.stopPropagation(); openEditModal(group.id); }} 
                    className="w-3.5 h-3.5 text-rose-200 hover:text-white transition-colors" 
                  />
                  <X 
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmGroupId(group.id); }}
                    className="w-3.5 h-3.5 text-rose-200 hover:text-white transition-colors" 
                  />
                </div>
              )}
            </button>
          ))}
          
          <button
            onClick={() => openAddModal()}
            className="flex items-center justify-center flex-shrink-0 w-9 h-9 rounded-full bg-white border border-dashed border-slate-300 text-slate-400 hover:text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {listError ? (
        <div className="px-6 mb-4">
          <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-700">
            {listError}
          </div>
        </div>
      ) : null}

      {/* Device List */}
      <div className="flex-1 px-6 pb-6">
        {isDevicesLoading ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm px-6 py-12 text-center text-slate-500 font-medium">
            正在加载设备...
          </div>
        ) : null}

        <div className="space-y-4">
          {filteredDevices.map((device) => (
            <div
              key={device.id}
              onClick={() => navigate(`/devices/${device.id}`)}
              className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-rose-100 transition-all cursor-pointer active:scale-[0.98] group relative overflow-hidden"
            >
{/* Highlight bar for online status */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${device.status === 'online' ? 'bg-roastek-secondary' : 'bg-slate-300'}`} />

              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center space-x-4 min-w-0 flex-1">
                  {/* Unified Device Icon */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors relative ${
                    device.status === 'online' ? 'bg-roastek-light' : 'bg-slate-50'
                  }`}>
                    {device.status === 'online' && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-roastek-secondary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-roastek-secondary border-2 border-white"></span>
                      </span>
                    )}
                    <Server className={`w-6 h-6 ${device.status === 'online' ? 'text-roastek-primary' : 'text-slate-400'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className={`font-bold text-base ${device.status === 'online' ? 'text-slate-900' : 'text-slate-500'}`}>{device.name}</h4>
                    <div className="flex flex-col mt-1 space-y-0.5">
                      <p className="text-xs text-slate-500 font-medium flex items-center"><span className="w-10 flex-shrink-0 text-slate-400">位置：</span><span className="truncate">{device.address || device.location}</span></p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2 flex-shrink-0">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${
                    device.status === 'online' 
                      ? 'bg-roastek-light text-roastek-primary border border-roastek-accent' 
                      : 'bg-slate-100 text-slate-600 border border-slate-200/50'
                  }`}>
                    {device.status === 'online' ? '在线' : '离线'}
                  </span>
                  <div className="flex space-x-1">
                    <button onClick={(e) => { e.stopPropagation(); openEditDeviceModal(device); }} className="p-1.5 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                       <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmDeviceId(device.id); }} className="p-1.5 bg-rose-50 text-rose-400 hover:text-rose-600 rounded-full hover:bg-rose-100 transition-colors">
                       <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end pt-3 border-t border-slate-50/50 mt-2">
                <div className="text-xs text-slate-400 font-medium">
                  活跃于: {formatAbsoluteTime(device.lastActive)}
                </div>
              </div>
            </div>
          ))}

          {!isDevicesLoading && filteredDevices.length === 0 && (
            <div className="text-center py-16 px-6 bg-white rounded-3xl border border-slate-100 shadow-sm border-dashed">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                 <ArchiveX className="w-10 h-10 text-slate-300" />
              </div>
              <h4 className="text-slate-800 font-bold mb-1">该分组暂无设备</h4>
              <p className="text-slate-500 text-xs font-medium mb-5">您可以添加新的设备到此分组中以便统一管理</p>
              {activeTab === 'all' ? (
                 <button 
                  onClick={() => openAddDeviceModal()}
                  className="inline-flex items-center justify-center px-5 py-2.5 bg-rose-600 text-white text-sm font-medium rounded-xl shadow-sm hover:bg-rose-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  添加新设备
                </button>
              ) : (
                 <button 
                  onClick={() => openEditModal(activeTab)}
                  className="inline-flex items-center justify-center px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-xl shadow-sm hover:bg-slate-800 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  管理分组设备
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Group Modal (Add / Edit) */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
              <h3 className="font-bold text-slate-900">{editingGroupId ? '编辑设备分组' : '新建设备分组'}</h3>
              <button 
                onClick={() => setIsGroupModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 mb-2">分组名称</label>
                <input 
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="输入分组名称"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium placeholder:font-normal placeholder:text-slate-400"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">选择设备</label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {devices.map(device => (
                    <div 
                      key={device.id}
                      onClick={() => {
                        setSelectedDeviceIds(prev => 
                          prev.includes(device.id) 
                            ? prev.filter(id => id !== device.id)
                            : [...prev, device.id]
                        )
                      }}
                      className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedDeviceIds.includes(device.id)
                          ? "border-rose-200 bg-rose-50"
                          : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 flex-shrink-0 transition-colors ${
                        selectedDeviceIds.includes(device.id)
                          ? "border-rose-600 bg-rose-600"
                          : "border-slate-300 bg-white"
                      }`}>
                        {selectedDeviceIds.includes(device.id) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          selectedDeviceIds.includes(device.id) ? "text-rose-900" : "text-slate-700"
                        }`}>{device.name}</p>
                        <p className={`text-xs truncate ${
                          selectedDeviceIds.includes(device.id) ? "text-rose-700/70" : "text-slate-500"
                        }`}>{device.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
              <button
                onClick={() => setIsGroupModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveGroup}
                disabled={!newGroupName.trim() || selectedDeviceIds.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-xl shadow-sm hover:bg-rose-700 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {editingGroupId ? '保存修改' : '确认创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmGroupId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-xs overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 p-6">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">确认删除分组？</h3>
            <p className="text-sm text-slate-500 font-medium text-center mb-6">
              删除分组不会删除分组内的设备，此操作不可撤销。
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteConfirmGroupId(null)}
                className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDeleteGroup}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-rose-600 rounded-xl shadow-sm hover:bg-rose-700 hover:shadow transition-all"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Device Modal (Add / Edit) */}
      {isDeviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
              <h3 className="font-bold text-slate-900">{editingDeviceId ? '编辑设备信息' : '添加新设备'}</h3>
              <button 
                onClick={() => setIsDeviceModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">设备名称</label>
                <input 
                  type="text"
                  value={devName}
                  onChange={(e) => setDevName(e.target.value)}
                  placeholder="例如：智能温室节点B"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium placeholder:font-normal placeholder:text-slate-400"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">设备地址</label>
                <input 
                  type="text"
                  value={devAddress}
                  onChange={(e) => setDevAddress(e.target.value)}
                  placeholder="例如：XX省XX市XX路XX号"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              {!editingDeviceId && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">设备码</label>
                  <input 
                    type="text"
                    value={devActivationCode}
                    onChange={(e) => setDevActivationCode(e.target.value)}
                    placeholder="请输入8位固定设备码"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium placeholder:font-normal placeholder:text-slate-400 font-mono"
                  />
                  <p className="mt-1.5 text-[10px] text-slate-400">输入正确设备码后即可绑定，绑定后可再编辑其它信息</p>
                </div>
              )}

              {deviceFormError ? (
                <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                  {deviceFormError}
                </div>
              ) : null}
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
              <button
                onClick={() => setIsDeviceModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
                <button
                  onClick={handleSaveDevice}
                  disabled={Boolean(isDeviceSubmitting || !devName.trim() || !devAddress.trim() || (!editingDeviceId && !devActivationCode.trim()))}
                  className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-xl shadow-sm hover:bg-rose-700 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                {isDeviceSubmitting ? '处理中...' : editingDeviceId ? '保存信息' : '立即绑定'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Device Confirm Modal */}
      {deleteConfirmDeviceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-xs overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 p-6">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">确认删除设备？</h3>
            <p className="text-sm text-slate-500 font-medium text-center mb-6">
              删除后该设备将解绑，且从所有分组中移除。
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteConfirmDeviceId(null)}
                className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDeleteDevice}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-rose-600 rounded-xl shadow-sm hover:bg-rose-700 hover:shadow transition-all"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alarms Modal */}
      {isAlarmsModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col px-4 pt-20 pb-10 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md mx-auto overflow-hidden shadow-2xl flex flex-col flex-1 max-h-[80vh] animate-in slide-in-from-bottom-8 duration-300">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-white sticky top-0 z-10">
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-900">告警信息</h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">{alarms.length}</span>
              </div>
              <button 
                onClick={() => setIsAlarmsModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {alarms.map((alarm) => {
                return (
                  <div key={alarm.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex space-x-4 relative overflow-hidden group/alarm">
                    <div className="absolute top-0 bottom-0 left-0 w-1 bg-rose-500" />
                    <div className="flex-shrink-0 mt-0.5">
                      {getAlarmIcon(alarm.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="flex items-start justify-between mb-1">
                          <p className="text-sm font-bold text-slate-900 leading-snug pr-4">{alarm.message}</p>
                       </div>
                        <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
                          <span>{alarm.deviceName || alarm.deviceId}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span>{formatAbsoluteTime(alarm.time)}</span>
                        </div>
                    </div>
                  </div>
                );
              })}
              {alarms.length === 0 && (
                <div className="text-center py-20">
                   <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-emerald-500" />
                   </div>
                   <p className="text-slate-500 font-medium">暂无未处理的告警记录</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
