const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const SESSION_STORAGE_KEY = "roastek-session";

export interface SessionUser {
  username: string;
  displayName: string;
  role: string;
  roleLabel: string;
}

export interface LoginResponse {
  token: string;
  user: SessionUser;
}

function buildUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

export async function login(username: string, password: string) {
  const response = await fetch(buildUrl("/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "登录失败");
  }

  return payload as LoginResponse;
}

export function saveSession(session: LoginResponse) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function updateSessionUser(user: SessionUser) {
  const currentSession = getSession();

  if (!currentSession) {
    return;
  }

  saveSession({
    ...currentSession,
    user,
  });
}

export function clearSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function getSession() {
  const stored = localStorage.getItem(SESSION_STORAGE_KEY);

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as LoginResponse;
  } catch {
    clearSession();
    return null;
  }
}

export async function authRequest(path: string, options: RequestInit = {}) {
  const session = getSession();

  if (!session) {
    throw new Error("未登录或登录已失效");
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${session.token}`);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearSession();
    throw new Error("未登录或登录已失效");
  }

  return response;
}

export async function fetchCurrentUser() {
  const response = await authRequest("/auth/me");
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "获取用户信息失败");
  }

  return payload.user as SessionUser;
}
