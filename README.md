# Ozon Ship — China Post 俄罗斯运费计算器

基于 Next.js 14 + Tailwind CSS + shadcn 风格组件的网页应用。支持输入重量/尺寸/属性并计算中国邮政到俄罗斯多渠道价格，提供筛选、搜索与勾选比较。PC 自适应，H5 显示底部 Tab Bar。后续将接入 PostgreSQL 记录登录/未登录两种模式的搜索历史。

## 功能特性
- 读取 `data/chinapost_russia.json` 的结构化渠道与计费规则。
- 根据输入重量（kg/g）、尺寸（cm）、属性（固体/液体/气体/是否电池）计算价格。
- 结果可搜索、排序，支持勾选多条进行比较。
- 自适应：桌面端网格布局；手机端自动显示底部 Tab Bar。

## 快速开始
1. 安装依赖（Node ≥ 18）
   ```bash
   pnpm i   # 或 npm i / yarn
   ```
2. 开发启动（会先“杀 3000 端口”再启动）
   ```bash
   pnpm dev   # 或 npm run dev / yarn dev
   ```
3. 生产构建与启动（同样先杀端口，生产默认 3001）
   ```bash
   pnpm build && pnpm start
   ```

> 端口策略：开发 3000、生产 3001；脚本已内置「先杀端口再启动」。

## 目录结构
- `app/`：Next.js App Router 代码（`page.tsx` 为主计算页面，`api/services` 读取数据）。
- `components/`：UI 组件（含移动端 Tab Bar、服务卡片、按钮）。
- `lib/`：工具与计费逻辑（`pricing.ts`、`utils.ts`）。
- `types/`：TypeScript 类型定义。
- `data/`：数据源（`chinapost_russia.json`）。
- `docs/`：文档与数据字段说明。

## 环境变量（为后续数据库预留）
- 复制 `.env.example` 为 `.env` 并设置 `DATABASE_URL`（PostgreSQL）。当前版本暂未使用数据库，后续版本用于存储搜索历史与用户信息。

## 计费与限制说明（与数据一致）
- e特快：若任一边≥40cm，计费重量取体积重与实际重较大者；体积重公式为 `长×宽×高(cm)/6000`，单位 kg。
- PUDO：部分渠道禁止含电池、液体/易燃品；详情见数据字段 `prohibited`。
- 其他规则以 `data/chinapost_russia.json` 为准。

## 如何修改渠道与价格数据
请阅读 `docs/chinapost_data_schema.md`，其中包含字段解释、示例、校验与常见错误排查。

## 一键部署（静态或有后端）

所有部署入口均为根目录的 `deploy.sh`，支持交互或传参：

```bash
# 纯静态（构建 out/ 并 rsync 到 /var/www/ozon-ship）
./deploy.sh --mode static

# 配置/更新 Nginx（静态站点）
./deploy.sh --mode static-nginx

# 有后端（Supervisor）初始化/部署
./deploy.sh --mode supervisor-bootstrap
./deploy.sh --mode supervisor
```

部署变量来自 `.env`（示例见 `.env.example`）：
- `SERVER`、`SSH_USER`、`STATIC_TARGET_DIR=/var/www/ozon-ship`
- `APP_DIR=/srv/ozon-ship`、`PROGRAM=ozon-ship`（仅有后端时需要）
- `DOMAIN=ozon-ship.xixisys.com`

更详细说明见 `docs/deploy/DEPLOYMENT_GUIDE.md`。

---
如需新增 UI 或接入数据库，请在 Issue/会话中告知具体需求。
