#!/usr/bin/env bash
set -euo pipefail

# 一键部署（Supervisor 版本）：在本地执行，将代码同步到服务器并重启 supervisor 程序
# 先执行 scripts/bootstrap_supervisor.sh 初始化服务器环境

SERVER="your.server.ip"       # 服务器 IP/域名
SSH_USER="ubuntu"             # SSH 用户（需 sudo）
APP_DIR="/srv/ozon-ship"      # 代码目录（与 supervisor 配置一致）
PROGRAM="ozon-ship"           # supervisor 程序名

EXCLUDES=( ".git" "node_modules" ".next" "out" "dist" "coverage" ".vercel" ".DS_Store" )
RSYNC_EXCLUDES=""
for e in "${EXCLUDES[@]}"; do RSYNC_EXCLUDES+=" --exclude=${e}"; done

# 1) 同步代码
echo "==> rsync project to ${SSH_USER}@${SERVER}:${APP_DIR}"
rsync -az --delete ${RSYNC_EXCLUDES} ./ "${SSH_USER}@${SERVER}:${APP_DIR}/"

# 2) 远程安装依赖、构建、重启
ssh -o StrictHostKeyChecking=accept-new "${SSH_USER}@${SERVER}" bash -lc "'
  set -euo pipefail
  cd ${APP_DIR}
  # 先杀 3001 端口（遵循端口策略）
  fuser -k 3001/tcp || true; lsof -ti :3001 | xargs -r kill -9 2>/dev/null || true

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

  # 重启 supervisor
  sudo supervisorctl reread
  sudo supervisorctl update
  sudo supervisorctl restart ${PROGRAM}
'"

echo "部署已完成。查看日志： ssh ${SSH_USER}@${SERVER} 'sudo supervisorctl tail -f ${PROGRAM}'"
