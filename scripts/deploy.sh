#!/usr/bin/env bash
set -euo pipefail

# 一键部署脚本（无需 git，基于 rsync + systemd），在本地电脑执行。
# 先运行 scripts/bootstrap_server.sh 完成服务器初始化与 nginx/systemd 安装。

SERVER="your.server.ip"         # 服务器 IP 或域名
SSH_USER="ubuntu"               # 远程登录用户（需具备 sudo 权限）
APP_DIR="/srv/ozon-ship"        # 与 systemd WorkingDirectory 保持一致
SERVICE_NAME="ozon-ship"        # systemd 服务名

EXCLUDES=(
  ".git" "node_modules" ".next" "out" "dist" "coverage" ".vercel" ".DS_Store"
)

# 1) 同步代码到服务器（排除重目录）
RSYNC_EXCLUDES=""
for e in "${EXCLUDES[@]}"; do
  RSYNC_EXCLUDES+=" --exclude=${e}"
done

echo "==> rsync project to ${SSH_USER}@${SERVER}:${APP_DIR}"
rsync -az --delete ${RSYNC_EXCLUDES} ./ "${SSH_USER}@${SERVER}:${APP_DIR}/"

# 2) 在服务器上安装依赖、构建、重启服务
ssh -o StrictHostKeyChecking=accept-new "${SSH_USER}@${SERVER}" bash -lc "'
  set -euo pipefail
  cd ${APP_DIR}
  # 先杀 3000 端口（遵循用户规则）
  fuser -k 3000/tcp || true; lsof -ti :3000 | xargs -r kill -9 2>/dev/null || true

  # 安装依赖并构建
  if command -v pnpm >/dev/null 2>&1; then
    pnpm i --frozen-lockfile || pnpm i
    pnpm build
  elif command -v yarn >/dev/null 2>&1; then
    yarn install --frozen-lockfile || yarn install
    yarn build
  else
    npm ci || npm i
    npm run build
  fi

  # 重启 systemd 服务
  sudo systemctl restart ${SERVICE_NAME}
  sudo systemctl status ${SERVICE_NAME} --no-pager -l || true
'"

echo "部署已完成，如需查看日志： ssh ${SSH_USER}@${SERVER} 'journalctl -u ${SERVICE_NAME} -f'"
