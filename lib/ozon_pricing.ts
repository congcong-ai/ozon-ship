import { OzonGroup, OzonGroupRule, OzonRateTable, OzonPricingParams, ResultItem, OzonCalcBreakdown } from "@/types/ozon";

// ------------------------------
// 1) Ozon 六组规则（固定常量）
// ------------------------------
export const OZON_GROUP_RULES: OzonGroupRule[] = [
  { group: "Extra Small",   priceRub: { min: 1,    max: 1500 },   weightG: { min: 1,    max: 500 } },
  { group: "Budget",        priceRub: { min: 1,    max: 1500 },   weightG: { min: 501,  max: 30000 } },
  { group: "Small",         priceRub: { min: 1501, max: 7000 },   weightG: { min: 1,    max: 2000 } },
  { group: "Big",           priceRub: { min: 1501, max: 7000 },   weightG: { min: 2001, max: 30000 } },
  { group: "Premium Small", priceRub: { min: 7001, max: 250000 }, weightG: { min: 1,    max: 5000 } },
  { group: "Premium Big",   priceRub: { min: 7001, max: 250000 }, weightG: { min: 5001, max: 30000 } },
];

// ------------------------------
// 2) 工具函数
// ------------------------------
function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

function uniqueSorted(nums: number[]) {
  const set = new Set<number>();
  for (const v of nums) if (!Number.isNaN(v) && Number.isFinite(v)) set.add(Math.round(v * 100) / 100);
  return Array.from(set).sort((a, b) => a - b);
}

function feasibleRulesByWeight(weight_g: number, rules: OzonGroupRule[] = OZON_GROUP_RULES) {
  return rules.filter(r => weight_g >= r.weightG.min && weight_g <= r.weightG.max);
}

// ------------------------------
// 3) 候选价格点枚举
// ------------------------------
export function enumerateCandidatePrices(priceRange: { min: number; max: number }, extra: number[] = [], withEdgeBuffer = true) {
  const E = [1499, 1500, 1501, 6999, 7000, 7001, 750, 10000, ...extra];
  const arr: number[] = [priceRange.min, priceRange.max];
  for (const x of E) if (x >= priceRange.min && x <= priceRange.max) arr.push(x);
  if (withEdgeBuffer) {
    // 在允许区间内加入 ±1 的缓冲点
    for (const x of [priceRange.min + 1, priceRange.max - 1]) if (x >= priceRange.min && x <= priceRange.max) arr.push(x);
  }
  return uniqueSorted(arr);
}

// ------------------------------
// 4) 费用计算
// ------------------------------
function lastMileFeeRub(P: number, cfg: { rate: number; min_rub: number; max_rub: number }) {
  const v = P * cfg.rate;
  return clamp(v, cfg.min_rub, cfg.max_rub);
}

function intlLogisticsRub(rate: { base_cny: number; per_gram_cny: number }, weight_g: number, rub_per_cny: number) {
  const cny = rate.base_cny + rate.per_gram_cny * weight_g;
  return cny * rub_per_cny;
}

export function computeProfitForPrice(
  P: number,
  group: OzonGroup,
  rate: { base_cny: number; per_gram_cny: number },
  params: OzonPricingParams
): OzonCalcBreakdown {
  const α = params.commission;
  const β = params.acquiring;
  const γ = params.fx;
  const R = params.rub_per_cny;

  const commission_rub = P * α;
  const acquiring_rub = P * β;
  const last_mile_rub = lastMileFeeRub(P, params.last_mile);
  const intl_rub = intlLogisticsRub(rate, params.weight_g, R);

  let fx_fee_rub: number;
  let receipt_rub: number;

  const includeIntl = params.fx_include_intl !== false; // 默认包含国际物流费

  if (includeIntl) {
    const base_payout = P - commission_rub - acquiring_rub - last_mile_rub - intl_rub;
    fx_fee_rub = base_payout * γ;
    receipt_rub = base_payout - fx_fee_rub;
  } else {
    const base_nonintl = P - commission_rub - acquiring_rub - last_mile_rub;
    fx_fee_rub = base_nonintl * γ;
    receipt_rub = base_nonintl - fx_fee_rub - intl_rub;
  }

  const profit_cny = receipt_rub / R - params.cost_cny;
  const margin = params.cost_cny > 0 ? profit_cny / params.cost_cny : (profit_cny > 0 ? Infinity : -Infinity);

  return {
    receipt_rub: Math.round(receipt_rub * 100) / 100,
    fx_fee_rub: Math.round(fx_fee_rub * 100) / 100,
    commission_rub: Math.round(commission_rub * 100) / 100,
    acquiring_rub: Math.round(acquiring_rub * 100) / 100,
    intl_logistics_rub: Math.round(intl_rub * 100) / 100,
    last_mile_rub: Math.round(last_mile_rub * 100) / 100,
    profit_cny: Math.round(profit_cny * 100) / 100,
    margin: Math.round(margin * 10000) / 10000,
  };
}

// 供前端滑块使用：给定利润率上下限，求解对应的可滑动售价区间
export function priceRangeForMargin(
  params: OzonPricingParams,
  rate: { base_cny: number; per_gram_cny: number },
  group: OzonGroup,
  respectGroupLimit: boolean = false
): { min: number; max: number } {
  const rule = OZON_GROUP_RULES.find((r) => r.group === group);
  const floor = (typeof params.min_margin === "number") ? params.min_margin : 0.1;
  const cap = (typeof params.max_margin === "number" && params.max_margin > 0) ? params.max_margin : undefined;
  let lo = rule ? rule.priceRub.min : 1;
  let hi = rule ? rule.priceRub.max : 250000;

  // 如果设置了利润率上下限，使用解析解求端点
  if (Number.isFinite(floor)) {
    const solsLo = solvePriceForTargetMargin(params, rate, floor as number);
    if (solsLo.length) lo = Math.min(...solsLo);
    else {
      // 二分数值回退：单调函数 m(P) 求解 m= floor
      const f = (P: number) => computeProfitForPrice(P, group, rate, params).margin - (floor as number);
      let a = 1, b = 1;
      // 扩展上界直至 f(b) >= 0
      for (let i=0; i<60 && f(b) < 0; i++) b *= 2;
      // 若上界仍未达到，给出宽松上界
      if (f(b) < 0) b = 1e7;
      // 扩展下界直至 f(a) <= 0
      for (let i=0; i<60 && f(a) > 0; i++) a /= 2;
      if (f(a) > 0) a = 1e-4;
      // 二分
      let L=a, R=b;
      for (let i=0; i<120; i++) {
        const mid = (L+R)/2;
        const fm = f(mid);
        if (fm === 0) { L = R = mid; break; }
        if (fm < 0) L = mid; else R = mid;
      }
      const Pnum = (L+R)/2;
      if (isFinite(Pnum)) lo = Pnum;
    }
  }
  if (typeof cap === "number") {
    const solsHi = solvePriceForTargetMargin(params, rate, cap);
    if (solsHi.length) hi = Math.max(...solsHi);
    else {
      const f = (P: number) => computeProfitForPrice(P, group, rate, params).margin - cap;
      let a = 1, b = 1;
      for (let i=0; i<60 && f(b) < 0; i++) b *= 2;
      if (f(b) < 0) b = 1e7;
      for (let i=0; i<60 && f(a) > 0; i++) a /= 2;
      if (f(a) > 0) a = 1e-4;
      let L=a, R=b;
      for (let i=0; i<120; i++) {
        const mid = (L+R)/2;
        const fm = f(mid);
        if (fm === 0) { L = R = mid; break; }
        if (fm < 0) L = mid; else R = mid;
      }
      const Pnum = (L+R)/2;
      if (isFinite(Pnum)) hi = Pnum;
    }
  }

  // 与组内价格限制求交（可选）
  if (respectGroupLimit && rule) {
    lo = Math.max(lo, rule.priceRub.min);
    hi = Math.min(hi, rule.priceRub.max);
  }

  if (!(isFinite(lo) && isFinite(hi))) {
    // 退化处理：回落到组价格范围
    if (rule) return { min: rule.priceRub.min, max: rule.priceRub.max };
    return { min: 1, max: 250000 };
  }
  if (lo > hi) { const t = lo; lo = hi; hi = t; }
  // 两位小数
  lo = Math.round(lo * 100) / 100;
  hi = Math.round(hi * 100) / 100;
  return { min: lo, max: hi };
}

// ------------------------------
// 4.1) 目标利润率反解售价（注入候选点）
// ------------------------------
function solvePriceForTargetMargin(
  params: OzonPricingParams,
  rate: { base_cny: number; per_gram_cny: number },
  targetMargin: number
): number[] {
  const α = params.commission;
  const β = params.acquiring;
  const γ = params.fx;
  const R = params.rub_per_cny;
  const η = params.last_mile.rate;
  const LMmin = params.last_mile.min_rub;
  const LMmax = params.last_mile.max_rub;

  const s = 1 - α - β;
  const t = 1 - γ;
  const I = intlLogisticsRub(rate, params.weight_g, R);
  const C = params.cost_cny;
  const m = targetMargin;
  const out: number[] = [];

  if (!(isFinite(R) && R > 0) || !(isFinite(C) && C >= 0) || !(isFinite(s) && s > 0) || !(isFinite(t) && t > 0)) {
    return out;
  }

  const includeIntl = params.fx_include_intl !== false; // 默认包含国际物流费

  const minEdge = η > 0 ? (LMmin / η) : Number.POSITIVE_INFINITY; // 使 0.02*P = Min 的 P
  const maxEdge = η > 0 ? (LMmax / η) : Number.NEGATIVE_INFINITY; // 使 0.02*P = Max 的 P

  function pushIfValid(P: number, branch: "min" | "lin" | "max") {
    if (!isFinite(P) || P <= 0) return;
    if (!(η > 0)) { out.push(P); return; }
    if (branch === "min" && P <= minEdge + 1e-9) out.push(P);
    else if (branch === "lin" && P >= minEdge - 1e-9 && P <= maxEdge + 1e-9) out.push(P);
    else if (branch === "max" && P >= maxEdge - 1e-9) out.push(P);
  }

  if (includeIntl) {
    // receipt = t * (sP - LM - I)
    // profit_cny = receipt/R - C
    // 令 profit_cny/C = m ⇒ t * (sP - LM - I) / (R*C) - 1 = m
    // ⇒ sP - LM - I = (m+1) * R * C / t
    // A) LM = Min
    const Pmin = (LMmin + I + ((m + 1) * R * C) / t) / s;
    pushIfValid(Pmin, "min");
    // B) LM = ηP
    const denomLin = (s - η);
    if (Math.abs(denomLin) > 1e-9) {
      const Plin = (I + ((m + 1) * R * C) / t) / denomLin;
      pushIfValid(Plin, "lin");
    }
    // C) LM = Max
    const Pmax = (LMmax + I + ((m + 1) * R * C) / t) / s;
    pushIfValid(Pmax, "max");
  } else {
    // 不含国际物流费计提 FX：
    // receipt = t*(sP - LM) - I
    // profit_cny = receipt/R - C
    // t*(sP - LM) - I = (m+1) * R * C
    // A) LM = Min
    const Pmin = (t * LMmin + I + (m + 1) * R * C) / (t * s);
    pushIfValid(Pmin, "min");
    // B) LM = ηP
    const denomLin = t * (s - η);
    if (Math.abs(denomLin) > 1e-9) {
      const Plin = (I + (m + 1) * R * C) / denomLin;
      pushIfValid(Plin, "lin");
    }
    // C) LM = Max
    const Pmax = (t * LMmax + I + (m + 1) * R * C) / (t * s);
    pushIfValid(Pmax, "max");
  }

  return out;
}

function integerizeCandidates(nums: number[]): number[] {
  const set = new Set<number>();
  for (const v of nums) {
    if (!isFinite(v)) continue;
    // 原始小数解（保留两位）
    set.add(Math.round(v * 100) / 100);
    // 也加入临近整数，便于 UI 在只接受整数售价时选择
    set.add(Math.floor(v));
    set.add(Math.round(v));
    set.add(Math.ceil(v));
  }
  return Array.from(set.values());
}

function neighborsBelow(values: number[], radius: number = 20): number[] {
  const out: number[] = [];
  for (const v of values) {
    if (!isFinite(v)) continue;
    // 包含自身
    out.push(Math.round(v * 100) / 100);
    // 向下取若干邻近点（整数与两位小数）
    for (let k = 1; k <= radius; k++) {
      const x = v - k;
      out.push(Math.round(x * 100) / 100);
      out.push(Math.floor(x));
    }
  }
  return out;
}

// ------------------------------
// 5) Rate 数据加载（按“每家一个 JSON”）
// ------------------------------
// 通过动态 import 懒加载，避免顶层静态导入导致的首包膨胀。

/**
 * 懒加载所有承运商费率（动态 import 按文件分片），仅在调用时读取 JSON。
 * 注意：不要在首屏同步调用，以免阻塞；建议在交互或空闲时触发。
 */
export async function loadAllCarrierRatesAsync(): Promise<OzonRateTable[]> {
  const mods = await Promise.all(ALL_CARRIERS.map(id => CARRIER_IMPORTERS[id]()));
  const arr: OzonRateTable[] = [];
  for (const m of mods) {
    const src: any = (m as any).default ?? (m as any);
    if (src && Array.isArray(src.rates)) {
      arr.push(...(src.rates as OzonRateTable[]));
    }
  }
  return arr;
}

// 为兼容历史 API，保留一个同步函数占位，但不再在其中打包 JSON。
export function loadAllCarrierRates(): OzonRateTable[] {
  if (process.env.NODE_ENV !== "production") {
    // 提示：同步 API 已不再返回完整数据，请改用 loadAllCarrierRatesAsync()
    // console.warn("loadAllCarrierRates(): empty in dev, use loadAllCarrierRatesAsync() instead");
  }
  return [] as OzonRateTable[];
}

// ------------------------------
// 6) 全局最优计算
// ------------------------------
export function bestPricing(
  params: OzonPricingParams,
  dataset?: { rules?: OzonGroupRule[]; candidates?: OzonRateTable[] },
  topN: number = 3
): { best: ResultItem | null; top: ResultItem[] } {
  const rules = (dataset?.rules && dataset.rules.length ? dataset.rules : OZON_GROUP_RULES);
  const candidates = (dataset?.candidates && dataset.candidates.length ? dataset.candidates : loadAllCarrierRates());

  const feasible = feasibleRulesByWeight(params.weight_g, rules);
  if (feasible.length === 0) return { best: null, top: [] };

  const topList: ResultItem[] = [];
  const δ = 10; // 安全区间大小

  for (const rule of feasible) {
    // 过滤该组的费率项
    const rates = candidates.filter(r => r.group === rule.group)
      .filter(r => !params.carrier || r.carrier === params.carrier)
      .filter(r => !params.tier || r.tier === params.tier)
      .filter(r => !params.delivery || r.delivery === params.delivery);

    if (rates.length === 0) continue;

    for (const rate of rates) {
      // 针对该费率，按目标利润率（min/max）反解注入候选点
      const mFloor = (typeof params.min_margin === "number") ? params.min_margin : 0.1;
      const mCap = (typeof params.max_margin === "number" && params.max_margin > 0) ? params.max_margin : undefined;
      const targets: number[] = [];
      if (Number.isFinite(mFloor)) targets.push(mFloor as number);
      if (typeof mCap === "number") targets.push(mCap);
      let extras: number[] = [];
      if (targets.length) {
        const sols: number[] = [];
        for (const tMargin of targets) {
          const vs = solvePriceForTargetMargin(params, rate.pricing, tMargin);
          sols.push(...vs);
        }
        const base = integerizeCandidates(sols);
        const neigh = neighborsBelow(base, 30); // 在上限附近向下扩展 30 个邻域
        const ints = integerizeCandidates([...base, ...neigh]).filter(x => x >= rule.priceRub.min && x <= rule.priceRub.max);
        extras = uniqueSorted(ints);
      }
      const candidatesP = enumerateCandidatePrices(rule.priceRub, extras);

      for (const P of candidatesP) {
        const breakdown = computeProfitForPrice(P, rule.group, rate.pricing, params);
        const item: ResultItem = {
          price_rub: P,
          group: rule.group,
          carrier: rate.carrier,
          tier: rate.tier,
          delivery: rate.delivery,
          breakdown,
          safe_range: { from: Math.max(rule.priceRub.min, P - δ), to: P },
          eta_days: rate.eta_days,
          battery_allowed: rate.battery_allowed,
        };
        topList.push(item);
      }
    }
  }

  // 先按利润率下限过滤（默认 10%）
  const floor = (typeof params.min_margin === "number") ? params.min_margin : 0.1;
  const EPS = 1e-3; // 浮点/四舍五入容差 ~0.1%
  let pool: ResultItem[] = topList;
  if (Number.isFinite(floor)) {
    pool = pool.filter((x) => x.breakdown.margin >= floor - EPS);
  }

  // 再按上限过滤（若设置）
  const cap = params.max_margin;
  if (typeof cap === "number" && cap > 0) {
    pool = pool.filter((x) => x.breakdown.margin <= cap + EPS);
  }

  // 若范围内为空，则选择“最接近约束”的方案作为降级 best
  if (pool.length === 0) {
    const capInf = (typeof cap === "number" && cap > 0) ? cap : Number.POSITIVE_INFINITY;
    // 在所有候选中选择与 [floor,capInf] 距离最近的
    const rankedAll = [...topList].sort((a, b) => b.breakdown.margin - a.breakdown.margin);
    let bestFallback: ResultItem | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const r of rankedAll) {
      const m = r.breakdown.margin;
      const dist = m < floor ? (floor - m) : (m > capInf ? (m - capInf) : 0);
      if (dist < bestDist) {
        bestDist = dist;
        bestFallback = { ...r, constraint_ok: false, note: `无满足利润率范围（≥${(floor*100).toFixed(0)}%${isFinite(capInf)?`，≤${(capInf*100).toFixed(0)}%`:""}），已返回与约束最近的方案` };
      }
    }
    return { best: bestFallback, top: [] };
  }
  // 主排序：利润率降序；若相等（考虑到浮点容差），按售价升序
  pool.sort((a, b) => {
    const EPS = 1e-3;
    const dm = b.breakdown.margin - a.breakdown.margin;
    if (Math.abs(dm) > EPS) return dm;
    // 利润率相同，售价低者优先
    const dp = a.price_rub - b.price_rub;
    if (Math.abs(dp) > 1e-9) return dp;
    // 再做稳定性排序（可跨渠道/档位有序）
    const sc = String(a.carrier).localeCompare(String(b.carrier));
    if (sc !== 0) return sc;
    const st = String(a.tier).localeCompare(String(b.tier));
    if (st !== 0) return st;
    return String(a.delivery).localeCompare(String(b.delivery));
  });
  const best = { ...pool[0], constraint_ok: true };
  const top = pool.slice(0, Math.max(1, topN)).map((r) => ({ ...r, constraint_ok: true }));
  return { best, top };
}

export function bestPricingWithAutoLoad(params: OzonPricingParams, topN: number = 3) {
  // 已弃用：同步自动加载将返回空集。请在调用方使用 loadAllCarrierRatesAsync 后传入 dataset。
  return bestPricing(params, { rules: OZON_GROUP_RULES, candidates: loadAllCarrierRates() }, topN);
}

export async function bestPricingWithAutoLoadAsync(params: OzonPricingParams, topN: number = 3) {
  const candidates = await loadAllCarrierRatesAsync();
  return bestPricing(params, { rules: OZON_GROUP_RULES, candidates }, topN);
}

// 对外暴露承运商清单与 importer 映射，供缓存层与按需分片加载使用
export const ALL_CARRIERS = [
  'ural','abt','atc','cel','guoo','iml','leader','oyx','rets','tanais','uni','xy','zto'
] as const;
export const CARRIER_IMPORTERS: Record<(typeof ALL_CARRIERS)[number], () => Promise<any>> = {
  ural:   () => import("@/data/ozon_ural.json"),
  abt:    () => import("@/data/ozon_abt.json"),
  atc:    () => import("@/data/ozon_atc.json"),
  cel:    () => import("@/data/ozon_cel.json"),
  guoo:   () => import("@/data/ozon_guoo.json"),
  iml:    () => import("@/data/ozon_iml.json"),
  leader: () => import("@/data/ozon_leader.json"),
  oyx:    () => import("@/data/ozon_oyx.json"),
  rets:   () => import("@/data/ozon_rets.json"),
  tanais: () => import("@/data/ozon_tanais.json"),
  uni:    () => import("@/data/ozon_uni.json"),
  xy:     () => import("@/data/ozon_xy.json"),
  zto:    () => import("@/data/ozon_zto.json"),
};
