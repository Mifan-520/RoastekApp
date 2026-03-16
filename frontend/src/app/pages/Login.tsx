import { useNavigate } from "react-router";
import { Lock, User, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import logoImg from "../../assets/a0348e23b5c7ce322b5d3ab3599c79872579b09f.png";
import { getSession, login as loginRequest, saveSession } from "../services/auth";

export function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (getSession()) {
      navigate("/devices", { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const session = await loginRequest(username, password);
      saveSession(session);
      navigate("/devices");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "登录失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-white overflow-hidden relative sm:pt-6">
      {/* Abstract Background Top */}
      <div 
        className="absolute top-0 inset-x-0 h-64 bg-cover bg-center"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1770885653473-ca48b4d69173?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGRhcmslMjBibHVlJTIwdGVjaG5vbG9neXxlbnwxfHx8fDE3NzMyODUwNzR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral")'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-rose-950/60 to-white" />
      </div>

      <div className="relative z-10 px-8 pt-12 pb-8 flex flex-col h-full">
        {/* Logo and Welcome */}
        <div className="mb-10">
          <img src={logoImg} alt="ROASTEK Logo" className="h-30 object-contain mb-8" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
            欢迎登录
          </h1>
          <p className="text-gray-500 font-medium">IoT 管理与组态平台</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6 flex-1">
          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="用户名/邮箱"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-0 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-rose-800 focus:bg-white transition-all outline-none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                placeholder="密码"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-0 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-rose-800 focus:bg-white transition-all outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex items-center justify-between px-2">
            <label className="flex items-center space-x-2 text-sm text-gray-600">
              <input type="checkbox" className="rounded text-rose-800 focus:ring-rose-800 bg-gray-50 border-gray-300" />
              <span>记住密码</span>
            </label>
            <button type="button" className="text-sm text-rose-800 font-medium hover:text-rose-900">
              忘记密码?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#5D1B22] text-white rounded-2xl py-4 font-semibold text-lg flex items-center justify-center space-x-2 hover:bg-[#4a151b] transition-colors shadow-xl shadow-rose-900/20 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 mt-8"
          >
            <span>{isLoading ? "登录中..." : "安全登录"}</span>
            {!isLoading && <ChevronRight className="w-5 h-5" />}
          </button>
        </form>

        <div className="text-center mt-auto pb-4">
          <p className="text-sm text-gray-500">
            没有账号？ <button type="button" className="text-rose-800 font-medium">联系管理员</button>
          </p>
        </div>
      </div>
    </div>
  );
}
