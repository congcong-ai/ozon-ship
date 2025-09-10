#!/usr/bin/env bash
set -euo pipefail

# Ubuntu 24.04 初始化脚本：安装 Node + Nginx + Supervisor，并配置站点
# 使用前请修改以下变量
SERVER="your.server.ip"
SSH_USER="ubuntu"
APP_DIR="/srv/ozon-ship"
DOMAIN="ozon-ship.xixisys.com"
PROGRAM="ozon-ship"   # supervisor 程序名

read -r -p "将对 ${SSH_USER}@${SERVER} 执行初始化操作，确认继续？(y/N) " ans
[[ "${ans:-N}" == "y" || "${ans:-N}" == "Y" ]] || exit 1

ssh -o StrictHostKeyChecking=accept-new "${SSH_USER}@${SERVER}" bash -lc "'
  set -euo pipefail
  sudo apt-get update
  sudo apt-get install -y nginx supervisor certbot python3-certbot-nginx rsync curl lsof psmisc git

  # Node.js 20 LTS
  if ! command -v node >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
  fi

  # 目录
  sudo mkdir -p ${APP_DIR}
  sudo chown -R ${SSH_USER}:${SSH_USER} ${APP_DIR}
  sudo mkdir -p /var/www/certbot /var/log/${PROGRAM}
  sudo chown -R ${SSH_USER}:${SSH_USER} /var/www/certbot /var/log/${PROGRAM}
'"

# 拷贝 Nginx 与 Supervisor 配置
scp -o StrictHostKeyChecking=accept-new "$(dirname "$0")/../docs/deploy/nginx-ozon-ship.conf" "${SSH_USER}@${SERVER}:/tmp/${PROGRAM}.conf"
scp -o StrictHostKeyChecking=accept-new "$(dirname "$0")/../docs/deploy/supervisor-ozon-ship.conf" "${SSH_USER}@${SERVER}:/tmp/${PROGRAM}-sup.conf"

ssh "${SSH_USER}@${SERVER}" sudo bash -lc "'
  set -euo pipefail
  mv /tmp/${PROGRAM}.conf /etc/nginx/sites-available/${PROGRAM}.conf
  ln -sf /etc/nginx/sites-available/${PROGRAM}.conf /etc/nginx/sites-enabled/${PROGRAM}.conf
  nginx -t && systemctl reload nginx

  mv /tmp/${PROGRAM}-sup.conf /etc/supervisor/conf.d/${PROGRAM}.conf
  supervisorctl reread
  supervisorctl update
'"

echo "初始化完成。下一步：使用 scripts/deploy_supervisor.sh 或配置 Git 自动部署。"
