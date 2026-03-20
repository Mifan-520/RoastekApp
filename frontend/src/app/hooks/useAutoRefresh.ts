import { useEffect, useRef, useCallback } from "react";

interface UseAutoRefreshOptions {
  interval?: number;  // 轮询间隔（毫秒），默认 5000ms
  enabled?: boolean;  // 是否启用轮询，默认 true
  onError?: (error: Error) => void;  // 错误处理回调
}

/**
 * 自动刷新 hook - 在指定间隔内自动调用刷新函数
 * @param refreshFn 刷新数据的异步函数
 * @param deps 依赖项数组，当变化时会触发刷新
 * @param options 配置选项
 */
export function useAutoRefresh<T extends (...args: unknown[]) => Promise<unknown>>(
  refreshFn: T,
  deps: React.DependencyList = [],
  options: UseAutoRefreshOptions = {}
) {
  const { interval = 5000, enabled = true, onError } = options;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRefreshingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    
    isRefreshingRef.current = true;
    try {
      await refreshFn();
    } catch (error) {
      if (onError && error instanceof Error) {
        onError(error);
      }
    } finally {
      isRefreshingRef.current = false;
    }
  }, [refreshFn, onError]);

  // 初始加载和依赖变化时刷新
  useEffect(() => {
    if (!enabled) {
      return;
    }

    void refresh();
  }, deps);

  // 设置定时轮询
  useEffect(() => {
    if (!enabled) return;

    intervalRef.current = setInterval(() => {
      void refresh();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, refresh]);

  return { refresh };
}

/**
 * 创建用于条件刷新的 hook
 * 当页面可见或窗口获得焦点时触发刷新
 */
export function useVisibilityRefresh(callback: () => void) {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        callback();
      }
    };

    const handleFocus = () => {
      callback();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [callback]);
}
