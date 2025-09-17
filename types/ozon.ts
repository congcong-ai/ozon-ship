export type OzonGroup =
  | "Extra Small"
  | "Budget"
  | "Small"
  | "Big"
  | "Premium Small"
  | "Premium Big";

export type BillingMode = "physical" | "max_of_physical_and_dimensional";

export type DimsLimit = {
  // 三边之和 ≤ sum_cm_max，最长边 ≤ longest_cm_max
  sum_cm_max: number;
  longest_cm_max: number;
  // 是否允许超尺（默认不允许）；目前业务为一律不允许
  allow_oversize?: boolean;
  // 体积重计算分母（cm），如 12000；当 billing 为“取大者”时生效
  volumetric_divisor?: number;
};

export type OzonGroupRule = {
  group: OzonGroup;
  priceRub: { min: number; max: number };
  weightG: { min: number; max: number };
  // 新增：尺寸限制与计费方式
  dimsLimit?: DimsLimit;
  billing?: BillingMode;
};

export type CarrierId = "ural" | string;
export type UralTier = "Express" | "Standard" | "Economy";
export type DeliveryMode = "pickup" | "door"; // 到取货点/上门

export type LinearWeightPricingCNY = {
  base_cny: number;
  per_gram_cny: number;
};

export type OzonRateTable = {
  carrier: CarrierId;
  tier: string; // Express/Standard/Economy
  delivery: DeliveryMode;
  group: OzonGroup;
  pricing: LinearWeightPricingCNY;
  eta_days?: string;
  battery_allowed?: boolean;
};

// 销量模型定义（首版仅实现常数弹性）
export type DemandModel =
  | { type: "none" }
  | { type: "constant_elasticity"; epsilon: number; pref_price?: number }
  | { type: "logistic"; qmax: number; p10: number; p90: number }
  | { type: "table"; points: Array<{ price: number; qty: number }> };

export type OzonPricingParams = {
  // 商品
  weight_g: number;
  dims_cm: { l: number; w: number; h: number };
  cost_cny: number;

  // 费率参数
  commission: number; // α 平台佣金
  acquiring: number;  // β 收单费
  fx: number;         // γ 货币转换费
  last_mile: { rate: number; min_rub: number; max_rub: number }; // η + Min/Max

  // 汇率
  rub_per_cny: number; // R

  // FX 计提口径（true=包含国际物流费；false=不含国际物流费）
  fx_include_intl?: boolean;

  // 利润率上限（如 1.0 = 100%），用于筛选推荐解；若未设置或 <=0 则不启用
  max_margin?: number;

  // 利润率下限（如 0.1 = 10%），允许为负；若未设置则默认 0.1（10%）
  min_margin?: number;

  // 可选筛选
  carrier?: CarrierId;
  tier?: string;
  delivery?: DeliveryMode;
  //（新增）销量模型与周期口径
  demand?: DemandModel; // 默认未启用
  period?: "day" | "week"; // 默认 day
};

export type OzonCalcBreakdown = {
  receipt_rub: number;
  fx_fee_rub: number;
  commission_rub: number;
  acquiring_rub: number;
  intl_logistics_rub: number;
  last_mile_rub: number;
  profit_cny: number;
  margin: number; // 利润率
};

export type ResultItem = {
  price_rub: number;
  group: OzonGroup;
  carrier: CarrierId;
  tier: string;
  delivery: DeliveryMode;
  breakdown: OzonCalcBreakdown;
  safe_range: { from: number; to: number } | null; // 安全区间 [from,to]
  constraint_ok?: boolean; // 是否满足利润率约束
  note?: string; // 说明文案（如不满足约束时的提示）
  // 便于前端展示而无需再次加载完整费率表
  eta_days?: string;
  battery_allowed?: boolean;
  // （可选）携带计价参数，便于前端展示公式
  pricing?: LinearWeightPricingCNY;
};
