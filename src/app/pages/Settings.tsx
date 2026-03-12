import { useNavigate } from "react-router";
import { ChevronLeft, User, LogOut, Shield, Bell } from "lucide-react";

export function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-full bg-slate-50 pb-10">
      <div className="bg-white px-6 pt-12 pb-4 shadow-sm sticky top-0 z-10 flex items-center">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2 rounded-full hover:bg-slate-100 transition-colors">
          <ChevronLeft className="w-6 h-6 text-slate-700" />
        </button>
        <h2 className="text-xl font-bold text-slate-900">系统设置</h2>
      </div>
      
      <div className="p-6 flex-1">
        {/* User Profile Summary */}
        <div className="bg-white rounded-3xl p-5 mb-6 border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-900 to-rose-700 flex items-center justify-center text-white text-2xl font-bold border-4 border-rose-50 shadow-sm">
            AD
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Admin User</h3>
            <p className="text-sm text-slate-500 font-medium mt-0.5">超级管理员</p>
          </div>
        </div>

        {/* Settings Menu */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-8">
          <div className="flex items-center p-4 border-b border-slate-50 active:bg-slate-50 cursor-pointer transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center mr-4">
              <User className="w-5 h-5 text-slate-600" />
            </div>
            <span className="font-bold text-slate-700 flex-1">账户信息</span>
            <ChevronLeft className="w-5 h-5 text-slate-300 rotate-180" />
          </div>
          
          <div className="flex items-center p-4 border-b border-slate-50 active:bg-slate-50 cursor-pointer transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center mr-4">
              <Shield className="w-5 h-5 text-slate-600" />
            </div>
            <span className="font-bold text-slate-700 flex-1">安全与密码</span>
            <ChevronLeft className="w-5 h-5 text-slate-300 rotate-180" />
          </div>

          <div className="flex items-center p-4 active:bg-slate-50 cursor-pointer transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center mr-4">
              <Bell className="w-5 h-5 text-slate-600" />
            </div>
            <span className="font-bold text-slate-700 flex-1">消息通知设置</span>
            <ChevronLeft className="w-5 h-5 text-slate-300 rotate-180" />
          </div>
        </div>

        {/* Logout Button */}
        <button 
          onClick={() => navigate("/login")}
          className="w-full bg-white border-2 border-rose-100 text-rose-700 rounded-2xl py-4 font-bold text-base flex items-center justify-center space-x-2 hover:bg-rose-50 transition-colors shadow-sm active:scale-[0.98]"
        >
          <LogOut className="w-5 h-5" />
          <span>退出登录</span>
        </button>
      </div>
    </div>
  );
}
