import { useMemo } from "react";
import { OzonGroup, OzonPricingParams, OzonRateTable, DeliveryMode } from "@/types/ozon";
import { OZON_GROUP_RULES, priceRangeForMargin, computeProfitForPrice } from "@/lib/ozon_pricing";

export type ChartTriple = { carrier: string; tier: string; delivery: DeliveryMode };

export function useOzonChart(args: {
  feasibleGroups: OzonGroup[];
  rates: OzonRateTable[];
  chartTriple: ChartTriple;
  params: OzonPricingParams;
  minMargin?: number;
  maxMargin?: number;
  groupColors: Record<OzonGroup, string>;
}) {
  const { feasibleGroups, rates, chartTriple, params, minMargin, maxMargin, groupColors } = args;

  const chartSets = useMemo(() => {
    if (!feasibleGroups.length) return { sets: [] as { group: string; color: string; points: { x:number;y:number;price:number;margin:number;group: OzonGroup }[] }[], globalMin: 0, globalMax: 1 };

    // 片段（按“利润率解 ∩ 组价段”）
    const segs = feasibleGroups.map((g) => {
      const list = rates
        .filter((r) => r.group === g)
        .filter((r) => r.carrier === chartTriple.carrier && r.tier === chartTriple.tier && r.delivery === chartTriple.delivery);
      const rate = list[0];
      if (!rate) return null as null | { group: OzonGroup; range: { min: number; max: number }; rate: any };
      const raw = priceRangeForMargin(params, rate.pricing, g as OzonGroup, false);
      const rule = OZON_GROUP_RULES.find((r) => r.group === g)!;
      const lo = Math.max(raw.min, rule.priceRub.min);
      const hi = Math.min(raw.max, rule.priceRub.max);
      if (!(isFinite(lo) && isFinite(hi) && hi > lo)) return null;
      return { group: g as OzonGroup, range: { min: Math.round(lo * 100) / 100, max: Math.round(hi * 100) / 100 }, rate };
    }).filter((x): x is { group: OzonGroup; range: { min: number; max: number }; rate: any } => !!x);

    if (!segs.length) return { sets: [], globalMin: 0, globalMax: 1 };

    const globalMin = Math.min(...segs.map((s) => s.range.min));
    const globalMax = Math.max(...segs.map((s) => s.range.max));

    const vbW = 600, vbH = 180;
    const yMin = typeof minMargin === "number" ? minMargin : 0.1;
    const yMax = typeof maxMargin === "number" && maxMargin > 0 ? maxMargin : yMin + 1;
    const eps = 1e-6;
    // 横轴压缩：将各段的价格长度累加得到总长，再把每段线性映射到连续的 [0,vbW] 区间，消除段间空白
    const sorted = segs.slice().sort((a, b) => a.range.min - b.range.min);
    const segLens = sorted.map(s => Math.max(0, s.range.max - s.range.min));
    const totalLen = segLens.reduce((acc, v) => acc + v, 0);
    const segOffset: number[] = [];
    {
      let acc = 0;
      for (let i = 0; i < sorted.length; i++) {
        segOffset.push(acc);
        acc += segLens[i];
      }
    }
    const scaleXCompressed = (price: number, segIndex: number, segMin: number) => {
      if (totalLen <= eps) return 0;
      const local = Math.max(0, price - segMin);
      const x = (segOffset[segIndex] + local) / totalLen * vbW;
      return x;
    };
    const scaleY = (m: number) => {
      const mm = Math.min(Math.max(m, yMin), yMax);
      return vbH - ((mm - yMin) / Math.max(eps, yMax - yMin)) * (vbH - 20);
    };

    // 采样，强制包含每段端点，并对端点即便超出 y 范围也“夹紧”到边界，保证曲线触达左右边缘
    const sets: { group: string; color: string; points: { x:number;y:number;price:number;margin:number;group: OzonGroup }[] }[] = [];
    const xSegments: { priceMin: number; priceMax: number; xMin: number; xMax: number; group: OzonGroup }[] = [];
    const N = 160;
    for (let idx = 0; idx < sorted.length; idx++) {
      const seg = sorted[idx];
      const a = seg.range.min;
      const b = seg.range.max;
      if (!(b > a)) continue;
      const xMin = scaleXCompressed(a, idx, a);
      const xMax = scaleXCompressed(b, idx, a);
      xSegments.push({ priceMin: a, priceMax: b, xMin, xMax, group: seg.group });
      const pts: { x:number;y:number;price:number;margin:number;group: OzonGroup }[] = [];
      for (let i = 0; i <= N; i++) {
        const p = a + (i / N) * (b - a);
        const isEnd = i === 0 || i === N;
        const P = isEnd ? (i === 0 ? a : b) : Math.round(p * 100) / 100;
        const br = computeProfitForPrice(P, seg.group, seg.rate.pricing, params);
        const x = scaleXCompressed(P, idx, a);
        if (isEnd) {
          // 端点：无条件加入（Y 夹紧在 scaleY 内处理）
          pts.push({ x, y: scaleY(br.margin), price: P, margin: br.margin, group: seg.group });
        } else {
          // 中间点：若超出 y 范围则跳过，避免顶部“平台线”错觉
          if (br.margin < yMin - 1e-6 || br.margin > yMax + 1e-6) continue;
          pts.push({ x, y: scaleY(br.margin), price: P, margin: br.margin, group: seg.group });
        }
      }
      if (pts.length >= 2) {
        const color = groupColors[seg.group] || "#2563eb";
        sets.push({ group: `${seg.group}-${a.toFixed(2)}-${b.toFixed(2)}`, color, points: pts });
      }
    }

    return { sets, globalMin: Math.round(globalMin * 100) / 100, globalMax: Math.round(globalMax * 100) / 100, xSegments };
  }, [feasibleGroups.join(','), rates, chartTriple.carrier, chartTriple.tier, chartTriple.delivery, params.weight_g, params.dims_cm.l, params.dims_cm.w, params.dims_cm.h, params.cost_cny, params.commission, params.acquiring, params.fx, params.last_mile.rate, params.last_mile.min_rub, params.last_mile.max_rub, params.rub_per_cny, params.fx_include_intl, minMargin, maxMargin, groupColors["Extra Small"], groupColors["Budget"], groupColors["Small"], groupColors["Big"], groupColors["Premium Small"], groupColors["Premium Big"]]);

  return chartSets;
}
