# 部署指南（静态与有后端两种方式）

本项目提供“一键部署”入口脚本：`./deploy.sh`。
你可以交互式选择模式，或使用 `--mode <name>` 直接执行。
所有必要的编译、同步、Nginx/Supervisor 配置都由脚本完成，无需手动改配置。

环境变量来自项目根目录 `.env`（示例见 `.env.example`）：

- SERVER：服务器 IP 或域名
- SSH_USER：SSH 用户
- APP_DIR：有后端部署的工作目录（默认 `/srv/ozon-ship`）
- PROGRAM：Supervisor 程序名（默认 `ozon-ship`）
- STATIC_TARGET_DIR：静态站点目录（默认 `/var/www/ozon-ship`）
- DOMAIN：Nginx 绑定域名（默认 `ozon-ship.xixisys.com`）

## 一、纯静态部署（推荐，当前无需后端）

静态部署不需要 Node 进程，Nginx 直接服务 `out/` 产物。

- 构建 + 同步（最常用）：
  ```bash
  ./deploy.sh --mode static
  ```
  - 自动执行 `scripts/build_static.sh` 生成 `out/`
  - rsync 同步到服务器：`rsync -az out/ ${SSH_USER}@${SERVER}:/var/www/ozon-ship.xixisys.com/`

- 准备/更新 Nginx（静态站点）：
  ```bash
  ./deploy.sh --mode static-nginx
  ```
  - 使用 `docs/deploy/nginx-ozon-ship-static.conf` 写入 `/etc/nginx/sites-available/ozon-ship.xixisys.com.conf` 并 reload
  - 若需 HTTPS：`sudo certbot --nginx -d ${DOMAIN}`

## 二、有后端部署（Node 进程 + Supervisor + Nginx 反代 3001）

- 首次初始化（安装 Nginx/Node/Supervisor 并下发配置）：
  ```bash
  ./deploy.sh --mode supervisor-bootstrap
  ```

- 部署/更新（rsync + 构建 + 重启 Supervisor 程序）：
  ```bash
  ./deploy.sh --mode supervisor
  ```
  - 端口：3001（已在脚本中遵循“先杀端口再启动”的规则）

## 三、基于 Git 的自动部署（可选）

如果你更喜欢 `git push` 触发部署，使用：

- `scripts/setup_git_deploy.sh`：在服务器创建 bare 仓库与 `post-receive` 钩子
- 钩子收到 push 后：检出到 `${APP_DIR}` → 安装依赖 → 构建 → 先杀 3001 → `supervisorctl restart ${PROGRAM}`

## 文件清单
- 部署入口：`deploy.sh`
- 静态构建脚本：`scripts/build_static.sh`
- Nginx（静态）：`docs/deploy/nginx-ozon-ship-static.conf`（安装到 `/etc/nginx/sites-available/ozon-ship.xixisys.com.conf`）
- Supervisor：`docs/deploy/supervisor-ozon-ship.conf`
- 初始化/部署（Supervisor）：`scripts/bootstrap_supervisor.sh`、`scripts/deploy_supervisor.sh`
- Git 自动部署：`scripts/setup_git_deploy.sh`

## 备注
- 静态导出构建时，`scripts/build_static.sh` 会临时禁用 `app/api/`，并让前端直接 import `data/chinapost_russia.json`；构建完成后自动还原。
- 若后续启用数据库与登录功能，建议切换为“有后端部署”模式。
