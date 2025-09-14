# Ozon 工程技术方案与接口设计（草案）

本文给出可落地的前后端设计，支持根据“重量/尺寸/进价/费率参数/物流选择（或枚举）/汇率”计算最优售价或最优区间，并回显每项费用明细。确认后即可按此开发。

---

## 1. 现有代码与目录复用
- `types/shipping.ts`：沿用 `Service`、`PricingInput`、`ServiceWithComputed` 等类型；新增 Ozon 专用类型。
- `lib/pricing.ts`：已有中国邮政计价逻辑；新增 Ozon 计价与最优解模块 `lib/ozon_pricing.ts`。
- `app/ozon/page.tsx`：目前是占位页，将改为工具页（表单 + 结果）。
- `components/`：新增 Ozon 表单与结果组件，重用 `ui/` 里的按键与弹窗。
- `docs/`：已新增《ozon_pricing_math.md》（数学模型）。本方案文档为《ozon_pricing_tech_plan.md》。

---

## 2. 数据模型
新增类型文件 `types/ozon.ts`（示意）：
```ts
export type OzonGroup =
  | "Extra Small"
  | "Budget"
  | "Small"
  | "Big"
  | "Premium Small"
  | "Premium Big";

export type OzonGroupRule = {
  group: OzonGroup;
  priceRub: { min: number; max: number };
  weightG: { min: number; max: number };
};

export type CarrierId = "ural" | "chinapost" | string;
export type UralTier = "Express" | "Standard" | "Economy";
export type DeliveryMode = "pickup" | "door";

// "基础费 + 克费" 计费模型（以 CNY 计价）
export type LinearWeightPricingCNY = {
  base_cny: number;
  per_gram_cny: number;
};

export type OzonRateTable = {
  carrier: CarrierId;
  tier: string; // Express/Standard/Economy 等
  delivery: DeliveryMode;
  group: OzonGroup;
  pricing: LinearWeightPricingCNY;
};

export type OzonPricingParams = {
  // 商品参数
  weight_g: number;
  dims_cm: { l: number; w: number; h: number };
  cost_cny: number;

  // 费率参数（可编辑）
  commission: number; // α 平台佣金（默认 0.12）
  acquiring: number;  // β 银行收单费（默认 0.019）
  fx: number;         // γ 货币转换费（默认 0.012）
  last_mile: { rate: number; min_rub: number; max_rub: number }; // η 与 Min/Max

  // 汇率
  rub_per_cny: number; // R

  // 可选筛选
  carrier?: CarrierId;
  tier?: string;
  delivery?: DeliveryMode;
};
```

> 备注：若未来出现“首重+续重阶梯”等模型，可与 `types/shipping.ts` 的 union 一样扩展。

---

## 3. 费率数据文件
- 路径：`data/ozon_carriers.json`（新增）
- 结构：
```jsonc
{
  "groups": [ /* OzonGroupRule[]（六组）*/ ],
  "rates": [ /* OzonRateTable[]：按 carrier/tier/delivery/group 罗列 */ ]
}
```
- 由你提供 Ural 三档的 6 组价格（两列“到点/上门”）与其他承运商数据，存成此 JSON。
- 前端在 `NEXT_PUBLIC_USE_STATIC_DATA=true` 时直接 import；否则从 `/api/ozon/rates` 动态读取。

---

## 4. 核心算法模块 `lib/ozon_pricing.ts`
导出方法：
```ts
export function enumerateCandidatePrices(weight_g: number, rules: OzonGroupRule[]): number[];
export function computeProfitForPrice(P: number, group: OzonGroup, rate: LinearWeightPricingCNY, params: OzonPricingParams): {
  receipt_rub: number;
  fx_fee_rub: number;
  commission_rub: number;
  acquiring_rub: number;
  intl_logistics_rub: number;
  last_mile_rub: number;
  profit_cny: number;
  margin: number;
};
export function bestPricing(params: OzonPricingParams, dataset: { rules: OzonGroupRule[]; candidates: OzonRateTable[] }): {
  best: ResultItem;        // 单一最优
  top: ResultItem[];       // Top-N（比如 3）
};
```
`ResultItem` 含：`price_rub`、`group`、`carrier/tier/delivery`、明细（上面返回结构）等。

实现要点：
- 根据 `weight_g` 过滤可行组与价格区间。
- 生成候选价格点集合：区间端点 + {1499,1500,1501,6999,7000,7001,750,10000} 交集 + ±1 缓冲；去重与裁剪。
- 对每个候选价、每个候选费率项（carrier/tier/delivery×group），计算利润率，筛最大。
- 输出安全区间 `[P* - δ, P*]`，默认 `δ = 10`（可配置）。

---

## 5. 前端交互（`app/ozon/page.tsx`）
- 表单字段：
  - 商品：重量（g）、尺寸（cm）、进货价（CNY）
  - 可选：物流商（下拉）、档位（下拉）、配送方式（下拉）
  - 参数：佣金、收单、尾城费（比例+min/max）、转换费、汇率（实时值为默认，允许编辑）
  - 高级：是否将国际物流费计入平台回款计提基数（开关）
- 动作：
  - 点击“计算”，本地运行算法（纯前端，可离线）；或调用 `/api/ozon/optimize`（若未来要做服务端）
- 结果展示：
  - 推荐价与安全区间、所属组
  - 利润率、各费用项（填充示例 CSV 的 E~I 列）
  - Top-3 候选卡片（不同物流/档位的方案对比）
  - 折线图：价格-利润率，标注 1500/7000/750/10000

---

## 6. API（可选，首版可不做）
- `GET /api/ozon/rates`：返回 `data/ozon_carriers.json`
- `POST /api/ozon/optimize`：入参 `OzonPricingParams`，返回 `best/top` 结果。

---

## 7. 实时汇率
- 首版：由前端输入，手动维护。
- 拓展：支持从免费 API 拉取实时 RUB/CNY（需配置 API Key，不在仓库硬编码）。

---

## 8. 验证与测试
- 基于 `docs/示例-推荐售价.csv` 两个样例，补齐 E~I 各列，生成期望结果；
- 为 `lib/ozon_pricing.ts` 编写单元测试：
  - 临界点枚举正确性
  - 尾城费分段与 clamp 行为
  - 多物流商横向比较

---

## 9. 渐进式上线
1) 仅前端实现（无 API），数据从 JSON 读取；
2) 加入 API 与校验脚本；
3) 运营面板编辑费率（后期）

---

## 10. 待提供数据与确认点
- Ural 三档（Express/Standard/Economy）在六组下的“基础费+克费”（区分到点/上门），单位 CNY。
- 是否把国际物流费计入“平台回款计提基数”。
- 安全区间 δ 默认值与展示样式。

---

## 11. 里程碑
- M1 文档确认（本文件 + `ozon_pricing_math.md`）
- M2 实现 `lib/ozon_pricing.ts` 与数据 JSON
- M3 完成 UI 与结果展示，接入 Tab Bar（`components/mobile-tab-bar.tsx` 已有 `Ozon` 入口）
- M4 单测与样例回填
