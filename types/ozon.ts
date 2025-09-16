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
};
