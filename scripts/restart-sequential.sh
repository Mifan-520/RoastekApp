#!/usr/bin/env bash
# 逐个重启 Docker 容器脚本
# 避免一次性重启导致 OpenCode 等资源冲突

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

echo "========================================"
echo "  RoastekApp 逐个重启 Docker 容器"
echo "========================================"

# 定义重启顺序（从基础到上层）
SERVICES=("postgres" "backend" "frontend")

for service in "${SERVICES[@]}"; do
  echo ""
  echo "[$(date '+%H:%M:%S')] 正在重启: ${service}"
  echo "----------------------------------------"
  
  # 1. 停止容器
  echo "  → 停止容器..."
  docker compose stop "${service}" || true
  
  # 2. 等待完全停止
  sleep 2
  
  # 3. 启动容器
  echo "  → 启动容器..."
  docker compose start "${service}"
  
  # 4. 等待健康检查
  echo "  → 等待健康检查..."
  max_attempts=30
  attempt=1
  
  while [ $attempt -le $max_attempts ]; do
    # 获取容器状态
    status=$(docker compose ps "${service}" --format "{{.Health}}" 2>/dev/null || echo "")
    
    if [ "${status}" == "healthy" ]; then
      echo "  ✅ ${service} 已就绪 (健康)"
      break
    elif [ "${status}" == "starting" ]; then
      echo -n "."
      sleep 2
      attempt=$((attempt + 1))
    elif [ -z "${status}" ]; then
      # 有些容器可能没有 healthcheck，检查运行状态
      running=$(docker compose ps "${service}" --format "{{.Status}}" 2>/dev/null || echo "")
      if echo "${running}" | grep -q "Up"; then
        echo "  ✅ ${service} 已就绪 (运行中)"
        break
      fi
      echo -n "."
      sleep 2
      attempt=$((attempt + 1))
    else
      echo -n "."
      sleep 2
      attempt=$((attempt + 1))
    fi
  done
  
  if [ $attempt -gt $max_attempts ]; then
    echo ""
    echo "  ❌ ${service} 启动超时，请检查日志:"
    echo "     docker compose logs ${service} --tail=50"
    exit 1
  fi
  
  # 5. 额外等待确保服务稳定
  echo "  → 等待服务稳定..."
  sleep 3
  
  echo "  ✓ ${service} 重启完成"
done

echo ""
echo "========================================"
echo "  所有容器重启成功！"
echo "========================================"
docker compose ps
