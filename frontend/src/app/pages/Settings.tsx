import { useNavigate } from "react-router";
import { ChevronLeft, LogOut, Shield, User, X, Check, Lock } from "lucide-react";
import { fetchCurrentUser, getSession, logout, saveSession, updatePassword, updateProfile } from "../services/auth";
import { useEffect, useState } from "react";

export function SettingsPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState(() => getSession()?.user.displayName || "Admin User");
  const [roleLabel, setRoleLabel] = useState(() => getSession()?.user.roleLabel || "管理员");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [tempName, setTempName] = useState("");

  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  useEffect(() => {
    let active = true;

    async function loadCurrentUser() {
      try {
        const user = await fetchCurrentUser();
        if (!active) return;
        setUsername(user.displayName);
        setRoleLabel(user.roleLabel);
        const session = getSession();
        if (session) {
          saveSession({ ...session, user });
        }
      } catch (error) {
        if (!active) return;
        if (error instanceof Error && error.message.includes("未登录")) {
          navigate("/login", { replace: true });
          return;
        }
        setFeedback({
          type: "error",
          text: error instanceof Error ? error.message : "获取账户信息失败",
        });
      }
    }

    loadCurrentUser();
    return () => {
      active = false;
    };
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const openEditModal = () => {
    setTempName(username);
    setFeedback(null);
    setIsEditModalOpen(true);
  };

  const handleSaveName = async () => {
    if (tempName.trim()) {
      try {
        const user = await updateProfile(tempName.trim());
        setUsername(user.displayName);
        setRoleLabel(user.roleLabel);
        const session = getSession();
        if (session) {
          saveSession({ ...session, user });
        }
        setIsEditModalOpen(false);
        setFeedback({ type: "success", text: "账户信息已更新" });
      } catch (error) {
        setFeedback({
          type: "error",
          text: error instanceof Error ? error.message : "更新账户信息失败",
        });
      }
    }
  };

  const handleSavePassword = async () => {
    if (newPass && newPass === confirmPass) {
       try {
         await updatePassword(oldPass, newPass);
         setIsPassModalOpen(false);
         setOldPass("");
         setNewPass("");
         setConfirmPass("");
         setFeedback({ type: "success", text: "密码修改成功" });
       } catch (error) {
         setFeedback({
           type: "error",
           text: error instanceof Error ? error.message : "密码修改失败",
         });
       }
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-50 pb-10">
      <div className="bg-white px-6 pt-12 pb-4 shadow-sm sticky top-0 z-10 flex items-center">
        <button onClick={() => navigate("/devices")} className="p-2 -ml-2 mr-2 rounded-full hover:bg-slate-100 transition-colors">
          <ChevronLeft className="w-6 h-6 text-slate-700" />
        </button>
        <h2 className="text-xl font-bold text-slate-900">系统设置</h2>
      </div>

      {feedback ? (
        <div className="px-6 pt-4">
          <div
            className={`rounded-2xl px-4 py-3 text-sm border ${
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                : "bg-amber-50 border-amber-100 text-amber-700"
            }`}
          >
            {feedback.text}
          </div>
        </div>
      ) : null}
      
      <div className="p-6 flex-1">
        {/* User Profile Summary - Clickable removed as per request */}
        <div className="bg-white rounded-3xl p-5 mb-6 border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 border-4 border-white shadow-inner flex items-center justify-center text-slate-400">
            <User className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">{username}</h3>
            <p className="text-sm text-slate-500 font-medium mt-0.5">{roleLabel}</p>
          </div>
        </div>

        {/* Settings Menu */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-8">
          <div 
            onClick={openEditModal}
            className="flex items-center p-4 active:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50"
          >
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center mr-4">
              <User className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="font-bold text-slate-700 flex-1">账户信息</span>
            <ChevronLeft className="w-5 h-5 text-slate-300 rotate-180" />
          </div>
          
          <div 
            onClick={() => setIsPassModalOpen(true)}
            className="flex items-center p-4 active:bg-slate-50 cursor-pointer transition-colors"
          >
            <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center mr-4">
              <Shield className="w-5 h-5 text-slate-600" />
            </div>
            <span className="font-bold text-slate-700 flex-1">安全与密码</span>
            <ChevronLeft className="w-5 h-5 text-slate-300 rotate-180" />
          </div>
        </div>

        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className="w-full bg-white border-2 border-rose-100 text-rose-700 rounded-2xl py-4 font-bold text-base flex items-center justify-center space-x-2 hover:bg-rose-50 transition-colors shadow-sm active:scale-[0.98]"
        >
          <LogOut className="w-5 h-5" />
          <span>退出登录</span>
        </button>
      </div>

      {/* Edit Username Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-[2.5rem] sm:rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in slide-in-from-bottom-full duration-300 sm:zoom-in-95">
            <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">修改账户姓名</h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8">
              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 mb-2">新的显示姓名</label>
                <input 
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="请输入您的姓名"
                  autoFocus
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-lg focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-300"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-4 text-base font-bold text-slate-600 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveName}
                  disabled={!tempName.trim() || tempName === username}
                  className="flex-1 py-4 text-base font-bold text-white bg-rose-600 rounded-2xl shadow-lg shadow-rose-600/20 hover:bg-rose-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center space-x-2"
                >
                  <Check className="w-5 h-5" />
                  <span>保存修改</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security & Password Modal */}
      {isPassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-[2.5rem] sm:rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in slide-in-from-bottom-full duration-300 sm:zoom-in-95">
            <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">安全与密码</h3>
              <button 
                onClick={() => setIsPassModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">原密码</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="password"
                    value={oldPass}
                    onChange={(e) => setOldPass(e.target.value)}
                    placeholder="请输入原密码"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">新密码</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="请输入新密码"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">确认密码</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="password"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="请再次输入新密码"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setIsPassModalOpen(false)}
                  className="flex-1 py-4 text-base font-bold text-slate-600 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSavePassword}
                  disabled={!oldPass || !newPass || newPass !== confirmPass}
                  className="flex-1 py-4 text-base font-bold text-white bg-slate-900 rounded-2xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center space-x-2"
                >
                  <Check className="w-5 h-5" />
                  <span>确认修改</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
