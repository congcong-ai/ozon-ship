# Ozon Ship — China Post 俄罗斯运费计算器

基于 Next.js 14 + Tailwind CSS + shadcn 风格组件的网页应用。支持输入重量/尺寸/属性并计算中国邮政到俄罗斯多渠道价格，同时提供 Ozon 平台的“最优售价/利润区间”参考，帮助跨境卖家更快做出定价与物流决策。PC 自适应，H5 显示底部 Tab Bar。

## 物流价格
https://docs.ozon.ru/global/zh-hans/fulfillment/rfbs/logistic-settings/partner-delivery-ozon/new-archive/?country=CN
此处有更新情况。

## 产品简介
Ozon Ship 是一个轻量、开箱即用的“定价 + 物流”计算助手：
- Ozon 最优售价计算：基于商品规格与费率参数生成利润率曲线，拖动售价滑块即可查看利润拆解与推荐物流搭配。
- 中国邮政到俄罗斯运费计算：按重量/体积重与渠道规则计算多渠道价格，支持搜索与排序。

## 为什么值得用
- 更快更准：减少反复试算与查表，实时看到利润拆解与可行区间。
- 风险更可控：支持汇率（RUB/CNY）手动/自动两种模式，手动模式会记忆且不会被自动刷新覆盖。
- 简洁好用：桌面端顶部导航、移动端底部 Tab Bar，自适应布局，核心操作一步到位。

## 主要页面
- `/` 或 `/partner-logistics` — 合作物流（原 Ozon 页面）
- `/chinapost` — 中国邮政到俄罗斯运费计算器
- `/me` — 简介/产品介绍页
- 兼容：`/ozon` 及其子路由永久重定向至 `/partner-logistics`

## 功能特性
- 读取 `data/chinapost_russia.json` 的结构化渠道与计费规则。
- 根据输入重量（kg/g）、尺寸（cm）、属性（固体/液体/气体/是否电池）计算价格。
- Ozon 合作物流：
  - 实时显示“本组限制（三边和/最长边）+ 体积重预览”，避免滑动后才知道超限；
  - Big / Premium Big 组按“物理重量与体积重取大者”计费（体积重 = 长×宽×高 ÷ 12000，单位 kg）；
  - 若尺寸超出本组限制，会弹出提示，并提供“一键切换至中国邮政计算”的入口。
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
- `app/`：Next.js App Router（`/partner-logistics/page.tsx` 合作物流、`/chinapost/page.tsx` 中国邮政、`/me/page.tsx` 简介；`api/services` 读取数据）。
- `components/`：UI 组件（含移动端 Tab Bar、服务卡片、按钮）。
- `lib/`：工具与计费逻辑（`ozon_pricing.ts` 等）。
- `config/`：业务配置（如 `ozon_groups.ts` 存放 Ozon 货件组的尺寸与计费规则）。
- `types/`：TypeScript 类型定义。
- `data/`：数据源（`chinapost_russia.json`）。
- `docs/`：文档与数据字段说明。

## 环境变量（为后续数据库预留）
- 复制 `.env.example` 为 `.env` 并设置 `DATABASE_URL`（PostgreSQL）。当前版本暂未使用数据库，后续版本用于存储搜索历史与用户信息。

## 计费与限制说明（与数据一致）
- e特快：若任一边≥40cm，计费重量取体积重与实际重较大者；体积重公式为 `长×宽×高(cm)/6000`，单位 kg。
- PUDO：部分渠道禁止含电池、液体/易燃品；详情见数据字段 `prohibited`。
- 其他规则以 `data/chinapost_russia.json` 为准。

### Ozon 合作物流（RFBS）尺寸与计费规则
- 货件组规则集中在配置文件 `config/ozon_groups.ts`：
  - 每组包含：平台价区间、重量区间、尺寸限制（`sum_cm_max`、`longest_cm_max`）、计费方式 `billing`；
  - Big / Premium Big 组为 `max_of_physical_and_dimensional`（取大者），默认体积重分母为 12000；
  - 其余组为 `physical`（仅按物理重量）。
- 页面会实时显示“本组限制 + 体积重预览”，并在超限时弹窗提示，支持一键跳转至 `/chinapost` 继续计算。

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
