#!/usr/bin/env bash
set -euo pipefail

# 在服务器上创建基于 Git 的自动部署（bare 仓库 + post-receive hook）
# 适用于 supervisor 管理的 Next.js 服务（端口 3001）
# 使用方法：在本地运行本脚本，填好变量后回车；随后把服务器仓库作为远程，git push 即可触发构建与重启。

SERVER="your.server.ip"      # 服务器 IP 或域名
SSH_USER="ubuntu"            # SSH 用户
APP_DIR="/srv/ozon-ship"     # 工作目录（代码实际运行目录）
BARE_REPO="/srv/ozon-ship-repo.git"  # 裸仓库位置
PROGRAM="ozon-ship"          # supervisor 程序名

read -r -p "将在 ${SSH_USER}@${SERVER} 上创建 bare 仓库并配置 post-receive hook，确认继续？(y/N) " ans
[[ "${ans:-N}" == "y" || "${ans:-N}" == "Y" ]] || exit 1

# 在服务器上创建 bare 仓库与工作目录
ssh -o StrictHostKeyChecking=accept-new "${SSH_USER}@${SERVER}" bash -lc "'
  set -euo pipefail
  sudo mkdir -p $(dirname ${BARE_REPO}) ${APP_DIR}
  sudo chown -R ${SSH_USER}:${SSH_USER} $(dirname ${BARE_REPO}) ${APP_DIR}
  if [ ! -d ${BARE_REPO} ]; then
    git init --bare ${BARE_REPO}
  fi
'"

# 生成 post-receive 钩子
HOOK=$(cat <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
APP_DIR="__APP_DIR__"
PROGRAM="__PROGRAM__"

read oldrev newrev refname

# 检出到工作目录（使用当前推送的分支）
BRANCH=${refname#refs/heads/}
mkdir -p "$APP_DIR"
GIT_WORK_TREE="$APP_DIR" git checkout -f "$BRANCH"
cd "$APP_DIR"

# 安装依赖与构建
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

# 先杀 3001 端口，再重启 supervisor 程序
fuser -k 3001/tcp || true; lsof -ti :3001 | xargs -r kill -9 2>/dev/null || true
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl restart "$PROGRAM"
EOF
)

HOOK=${HOOK/__APP_DIR__/${APP_DIR}}
HOOK=${HOOK/__PROGRAM__/${PROGRAM}}

echo "==> 上传 post-receive 钩子"
ssh "${SSH_USER}@${SERVER}" bash -lc "'
  set -euo pipefail
  cat > ${BARE_REPO}/hooks/post-receive <<'H'
${HOOK}
H
  chmod +x ${BARE_REPO}/hooks/post-receive
'"

echo "设置完成。请在本地项目执行：
  git remote add prod ${SSH_USER}@${SERVER}:${BARE_REPO}
  git push prod <你的分支>
首次推送将自动构建并通过 supervisor 重启服务。"
