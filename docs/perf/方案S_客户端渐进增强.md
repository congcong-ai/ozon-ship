# 方案S：客户端渐进增强（以浏览器计算为主，首屏极快）

本方案目标：
- 首屏可见时间极快（秒开、无白屏）。
- 主要计算在浏览器进行，降低服务器压力与成本。
- 重代码与重数据按需/空闲加载，拖动时只做轻量联动。

## 已落地的优化

- 路由级骨架屏：`app/ozon/loading.tsx` — 首屏不再白板。
- 动态拆包与懒加载：`app/ozon/page.tsx` 将多个重组件（`PriceChartCard`、`CarrierList` 等）改为 `next/dynamic`，并对“数据来源元信息”改为弹窗打开时才加载。
- 初帧计算降载：`hooks/useOzonChart.ts` 采样点 N=100（由 160 降低）。
- Nginx 压缩与缓存：`docs/deploy/nginx-ozon-ship-static.conf` 启用 gzip，对 `/_next/static/` 设置 365d immutable。
- 手动计算 + 收起默认列表（本次变更）：
  - “承运商清单”改为仅在点击“更新列表/计算”后才计算与渲染。
  - 默认收起为“查看更多”按钮；展开后显示“此售价 {当前售价} 时所有物流商运费及对应利润情况”。
  - 搜索/承运商/档位/配送/分组筛选对“已计算结果”即时生效（前端过滤），无需重算；若更换“分组”，建议点击“更新列表/计算”以重算。
  - 变更位置：`app/ozon/page.tsx`。

### 新增（本次推进）
- 费率 JSON 懒加载分片：
  - 删除顶层静态 import，改为动态 `import()`：`lib/ozon_pricing.ts` 的 `loadAllCarrierRatesAsync()`。
  - 页面在空闲时加载：`app/ozon/page.tsx` 中使用 `requestIdleCallback` 或 `setTimeout` 异步加载。
- Web Worker 计算“渠道清单”：
  - 新增 `workers/pricing.worker.ts`，把“当前售价下的渠道循环计算”移入 Worker，主线程不卡顿。
  - 页面在点击“更新列表/计算”时向 Worker 发送请求，收到结果后再渲染。
  - 回退：若 Worker 不可用，自动在主线程低频计算。
  - 计算结果附带 `eta_days`、`battery_allowed` 元信息，前端无需再次加载费率表。

## 待办与扩展（保持纯前端计算）

1) 费率 JSON 本地缓存（可选）
- 在动态加载基础上，结合 `Cache Storage`/`localStorage` 做本地缓存与版本号校验，减少重复下载。

2) Worker 通信封装（可选）
- 使用 Comlink 简化消息封送，或抽象 Promise 化封装，便于扩展更多任务。

3) 拖动联动分级
- 拖动时：仅更新竖线与“简要摘要”（轻量，节流 120–200ms）。
- 停止拖动 200ms 后或点击“更新列表/计算”：再触发“承运商清单”的全量计算。

4) 空闲预取
- 首屏稳定 1–2 秒后使用 `requestIdleCallback` 预拉常见承运商分片与 Worker 脚本。

5) 静态资源与缓存
- 将费率 JSON 放静态/CDN 并加长 `Cache-Control`；文件名带 hash 保证更新机制可靠。

## 交互说明（与当前实现一致）
- 页面顶部显示 RUB/CNY 汇率，支持手动/自动；手动模式不自动刷新，所有运算始终使用当前显示汇率（状态持久化）。
- “承运商清单”默认收起为“查看更多”。
- 展开后，点击“更新列表/计算”才会计算当前售价下的渠道列表；随后的筛选为前端过滤，不触发重算。

## 可选：方案H（后端仅做 SSR 壳）
- 保持计算在浏览器，将 `/ozon` 改为 Server Page（SSR 壳 + 流式 HTML）以进一步缩短首屏时间。
- 部署方式：`./deploy.sh --mode supervisor`（端口 3001，脚本内已按“先杀端口再启动”）。
- 服务器压力很低，成本小；如需再做可在未来迭代时启用。

## 相关文件
- 路由骨架：`app/ozon/loading.tsx`
- 页面逻辑与动态导入：`app/ozon/page.tsx`
- 图表采样：`hooks/useOzonChart.ts`
- Nginx（静态部署）：`docs/deploy/nginx-ozon-ship-static.conf`

## 部署（静态）
- 构建并同步：`./deploy.sh --mode static`
- 更新 Nginx（静态）：`./deploy.sh --mode static-nginx`

如需切换到方案H或继续完成上述待办（Worker/懒加载分片），请在 issue/对话中指明，我将继续实施。
