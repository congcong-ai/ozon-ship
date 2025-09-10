#!/usr/bin/env bash
set -euo pipefail

# 一键部署入口（根目录）
# 支持交互式选择或 --mode 传参：
#   ./deploy.sh --mode static              # 构建静态站点并 rsync 到 /var/www/ozon-ship/
#   ./deploy.sh --mode static-nginx        # 在服务器配置 Nginx（静态版）并 reload
#   ./deploy.sh --mode supervisor-bootstrap # 安装 Nginx/Node/Supervisor 并配置站点（有后端）
#   ./deploy.sh --mode supervisor          # rsync + 构建 + supervisor 重启（有后端）
#
# 变量从 .env 读取（可覆盖）：
#   SERVER, SSH_USER, APP_DIR, PROGRAM, STATIC_TARGET_DIR
#
ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
cd "$ROOT_DIR"

# 载入 .env（若存在）
if [ -f .env ]; then
  # shellcheck disable=SC1091
  source .env
fi

SERVER=${SERVER:-}
SSH_USER=${SSH_USER:-}
APP_DIR=${APP_DIR:-/srv/ozon-ship}
PROGRAM=${PROGRAM:-ozon-ship}
STATIC_TARGET_DIR=${STATIC_TARGET_DIR:-/var/www/ozon-ship.xixisys.com}
DOMAIN=${DOMAIN:-ozon-ship.xixisys.com}

function need() {
  local name=$1; local val=$2
  if [ -z "${val}" ]; then
    echo "[ERROR] 缺少 $name，请在 .env 中设置或通过环境变量传入。" >&2
    exit 1
  fi
}

function ensure_remote_dir() {
  ssh -o StrictHostKeyChecking=accept-new "${SSH_USER}@${SERVER}" sudo mkdir -p "$1"
  ssh -o StrictHostKeyChecking=accept-new "${SSH_USER}@${SERVER}" sudo chown -R "${SSH_USER}:${SSH_USER}" "$1"
}

function build_static() {
  echo "==> 构建静态站点(out/)"
  bash scripts/build_static.sh
}

function sync_static() {
  need SERVER "$SERVER"; need SSH_USER "$SSH_USER"
  ensure_remote_dir "$STATIC_TARGET_DIR"
  echo "==> rsync out/ -> ${SSH_USER}@${SERVER}:${STATIC_TARGET_DIR}/"
  rsync -az out/ "${SSH_USER}@${SERVER}:${STATIC_TARGET_DIR}/"
}

function setup_nginx_static() {
  need SERVER "$SERVER"; need SSH_USER "$SSH_USER"
  echo "==> 部署 Nginx 静态配置并重载"
  scp -o StrictHostKeyChecking=accept-new "${ROOT_DIR}/docs/deploy/nginx-ozon-ship-static.conf" "${SSH_USER}@${SERVER}:/tmp/ozon-ship.xixisys.com.conf"
  ssh "${SSH_USER}@${SERVER}" sudo bash -lc "'
    set -e
    mv /tmp/ozon-ship.xixisys.com.conf /etc/nginx/sites-available/ozon-ship.xixisys.com.conf
    ln -sf /etc/nginx/sites-available/ozon-ship.xixisys.com.conf /etc/nginx/sites-enabled/ozon-ship.xixisys.com.conf
    nginx -t && systemctl reload nginx
  '"
}

function supervisor_bootstrap() {
  need SERVER "$SERVER"; need SSH_USER "$SSH_USER"
  echo "==> 安装 Nginx/Node/Supervisor 并配置站点"
  ssh -o StrictHostKeyChecking=accept-new "${SSH_USER}@${SERVER}" sudo bash -lc "'
    set -e
    apt-get update
    apt-get install -y nginx supervisor certbot python3-certbot-nginx rsync curl lsof psmisc git
    if ! command -v node >/dev/null 2>&1; then
      curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs
    fi
    mkdir -p /var/www/certbot /var/log/${PROGRAM}
  '"
  # 下发 supervisor 配置
  scp -o StrictHostKeyChecking=accept-new "${ROOT_DIR}/docs/deploy/supervisor-ozon-ship.conf" "${SSH_USER}@${SERVER}:/tmp/${PROGRAM}.conf"
  ssh "${SSH_USER}@${SERVER}" sudo bash -lc "'
    set -e
    mv /tmp/${PROGRAM}.conf /etc/supervisor/conf.d/${PROGRAM}.conf
    supervisorctl reread && supervisorctl update || true
  '"
  # 动态 Nginx（反代 3001）— 直接用内置模板写入
  ssh "${SSH_USER}@${SERVER}" sudo bash -lc "'
    cat > /etc/nginx/sites-available/ozon-ship.conf <<NG
server {
  listen 80; listen [::]:80;
  server_name ${DOMAIN};
  location ^~ /.well-known/acme-challenge/ { default_type "text/plain"; root /var/www/certbot; }
  client_max_body_size 20m; gzip on; gzip_types text/plain text/css application/json application/javascript image/svg+xml;
  location / { proxy_pass http://127.0.0.1:3001; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; }
}
NG
    ln -sf /etc/nginx/sites-available/ozon-ship.conf /etc/nginx/sites-enabled/ozon-ship.conf
    nginx -t && systemctl reload nginx
  '"
}

function supervisor_deploy() {
  need SERVER "$SERVER"; need SSH_USER "$SSH_USER"; need APP_DIR "$APP_DIR"; need PROGRAM "$PROGRAM"
  echo "==> rsync 同步代码到 ${SSH_USER}@${SERVER}:${APP_DIR}"
  ssh -o StrictHostKeyChecking=accept-new "${SSH_USER}@${SERVER}" sudo mkdir -p "$APP_DIR"
  ssh -o StrictHostKeyChecking=accept-new "${SSH_USER}@${SERVER}" sudo chown -R "${SSH_USER}:${SSH_USER}" "$APP_DIR"
  rsync -az --delete --exclude .git --exclude node_modules --exclude .next --exclude out --exclude dist --exclude coverage --exclude .vercel --exclude .DS_Store ./ "${SSH_USER}@${SERVER}:${APP_DIR}/"
  echo "==> 远程构建并重启（端口 3001，先杀端口）"
  ssh -o StrictHostKeyChecking=accept-new "${SSH_USER}@${SERVER}" bash -lc "'
    set -e
    cd ${APP_DIR}
    fuser -k 3001/tcp || true; lsof -ti :3001 | xargs -r kill -9 2>/dev/null || true
    if command -v pnpm >/dev/null 2>&1; then pnpm i --frozen-lockfile || pnpm i; pnpm build; 
    elif command -v yarn >/dev/null 2>&1; then yarn install --frozen-lockfile || yarn install; yarn build; 
    else npm ci || npm i; npm run build; fi
    sudo supervisorctl reread; sudo supervisorctl update; sudo supervisorctl restart ${PROGRAM}
  '"
}

function choose_mode() {
  echo "请选择部署模式："
  echo "  1) static               — 构建并 rsync 到 ${STATIC_TARGET_DIR}"
  echo "  2) static-nginx         — 在服务器安装/更新静态站点的 Nginx 配置"
  echo "  3) supervisor-bootstrap — 安装 Nginx/Node/Supervisor 并配置站点（有后端）"
  echo "  4) supervisor           — rsync + 构建 + supervisor 重启（有后端）"
  read -rp "输入序号 [1-4]：" num
  case "$num" in
    1) MODE=static ;;
    2) MODE=static-nginx ;;
    3) MODE=supervisor-bootstrap ;;
    4) MODE=supervisor ;;
    *) echo "无效选择"; exit 1 ;;
  esac
}

MODE=${1:-}
if [[ "$MODE" == "--mode" ]]; then MODE=${2:-}; fi
if [[ "$MODE" =~ ^(--mode=)?(static|static-nginx|supervisor|supervisor-bootstrap)$ ]]; then
  MODE=${MODE#--mode=}
else
  choose_mode
fi

echo "执行模式：$MODE"
case "$MODE" in
  static)
    need SERVER "$SERVER"; need SSH_USER "$SSH_USER";
    build_static
    sync_static
    ;;
  static-nginx)
    setup_nginx_static
    ;;
  supervisor-bootstrap)
    supervisor_bootstrap
    ;;
  supervisor)
    supervisor_deploy
    ;;
  *)
    echo "未知模式：$MODE"; exit 1 ;;
 esac

