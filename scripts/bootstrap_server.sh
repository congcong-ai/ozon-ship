#!/usr/bin/env bash
set -euo pipefail

# 首次在服务器上准备运行环境与服务（Ubuntu 24.04）
# 使用前请先编辑下方变量
SERVER="your.server.ip"         # 服务器 IP 或域名
SSH_USER="ubuntu"               # 远程登录用户（需具备 sudo 权限）
APP_DIR="/srv/ozon-ship"        # 应用目录
SERVICE_NAME="ozon-ship"        # systemd 服务名
DOMAIN="ozon-ship.xixisys.com"  # 你的域名

read -r -p "将对 ${SSH_USER}@${SERVER} 执行初始化操作，确认继续？(y/N) " ans
[[ "${ans:-N}" == "y" || "${ans:-N}" == "Y" ]] || exit 1

ssh -o StrictHostKeyChecking=accept-new "${SSH_USER}@${SERVER}" bash -lc "'
  set -euo pipefail
  sudo apt-get update
  sudo apt-get install -y nginx certbot python3-certbot-nginx rsync curl lsof psmisc

  # 安装 Node.js 20 LTS
  if ! command -v node >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
  fi

  # 准备目录
  sudo mkdir -p ${APP_DIR}
  sudo chown -R ${SSH_USER}:${SSH_USER} ${APP_DIR}
  sudo mkdir -p /var/www/certbot
  sudo chown -R ${SSH_USER}:${SSH_USER} /var/www/certbot
'"

# (可选) 开放防火墙端口
ssh "${SSH_USER}@${SERVER}" sudo bash -lc "'
  if command -v ufw >/dev/null 2>&1; then
    ufw allow 80/tcp || true
    ufw allow 443/tcp || true
  fi
'"

# 同步 nginx 与 systemd 配置文件
scp -o StrictHostKeyChecking=accept-new "$(dirname "$0")/../docs/deploy/nginx-ozon-ship.conf" "${SSH_USER}@${SERVER}:/tmp/${SERVICE_NAME}.conf"
scp -o StrictHostKeyChecking=accept-new "$(dirname "$0")/../docs/deploy/ozon-ship.service" "${SSH_USER}@${SERVER}:/tmp/${SERVICE_NAME}.service"

ssh "${SSH_USER}@${SERVER}" sudo bash -lc "'
  set -euo pipefail
  mv /tmp/${SERVICE_NAME}.conf /etc/nginx/sites-available/${SERVICE_NAME}.conf
  ln -sf /etc/nginx/sites-available/${SERVICE_NAME}.conf /etc/nginx/sites-enabled/${SERVICE_NAME}.conf
  nginx -t && systemctl reload nginx

  mv /tmp/${SERVICE_NAME}.service /etc/systemd/system/${SERVICE_NAME}.service
  systemctl daemon-reload
  systemctl enable ${SERVICE_NAME}
'"

cat <<'TIPS'
初始化完成。
接下来执行：
  1) 运行 scripts/deploy.sh 完成第一次部署与启动。
  2) 申请 HTTPS 证书（可选）：
       ssh ${SSH_USER}@${SERVER}
       sudo certbot --nginx -d ${DOMAIN}
TIPS
