// Module Worker for computing carrier list at a given price
// It receives { type: 'compute_list', sliderPrice, group, rates, params }
// and returns { type: 'compute_list_done', items }

import { computeProfitForPrice, priceRangeForMargin, OZON_GROUP_RULES } from '@/lib/ozon_pricing';
import type { OzonGroup, OzonRateTable, OzonPricingParams, ResultItem } from '@/types/ozon';

export type ComputeListMsg = {
  type: 'compute_list';
  sliderPrice: number;
  group: OzonGroup;
  rates: OzonRateTable[];
  params: OzonPricingParams;
};

type ComputeListDone = {
  type: 'compute_list_done';
  items: ResultItem[];
};

export type SampleChartMsg = {
  type: 'sample_chart';
  feasibleGroups: OzonGroup[];
  rates: OzonRateTable[];
  chartTriple: { carrier: string; tier: string; delivery: 'pickup' | 'door' };
  params: OzonPricingParams;
  N?: number;
};

type SampleChartDone = {
  type: 'sample_chart_done';
  rawSets: Array<{ group: OzonGroup; range: { min: number; max: number }; samples: Array<{ price: number; margin: number }> }>;
};

export type SampleDemandLinesMsg = {
  type: 'sample_demand_lines';
  segments: Array<{ priceMin: number; priceMax: number; xMin: number; xMax: number; group: OzonGroup }>;
  rates: OzonRateTable[];
  chartTriple: { carrier: string; tier: string; delivery: 'pickup' | 'door' };
  params: OzonPricingParams;
  demand: {
    model: 'ce' | 'logistic';
    ceEpsilon?: number;
    cePrefP0?: number | null;
    logisticP10?: number | null;
    logisticP90?: number | null;
    globalMin: number;
    globalMax: number;
  };
  vbH?: number; // 默认 180
  N?: number;   // 每段采样点数量（默认 60）
};

type SampleDemandLinesDone = {
  type: 'sample_demand_lines_done';
  qPts: Array<{ x: number; y: number; price: number }>;
  piPts: Array<{ x: number; y: number; price: number }>;
};

self.addEventListener('message', (e: MessageEvent) => {
  const data = e.data as ComputeListMsg | SampleChartMsg | SampleDemandLinesMsg;
  if (!data) return;
  if (data.type === 'compute_list') {
    try {
      const { sliderPrice, group, rates, params } = data as ComputeListMsg;
      const items: ResultItem[] = (rates || [])
        .filter((r) => r.group === group)
        .map((r) => {
          const breakdown = computeProfitForPrice(sliderPrice, group, r.pricing, params);
          return {
            price_rub: sliderPrice,
            group,
            carrier: r.carrier,
            tier: r.tier,
            delivery: r.delivery,
            breakdown,
            pricing: r.pricing,
            safe_range: null,
            constraint_ok: true,
            eta_days: r.eta_days,
            battery_allowed: r.battery_allowed,
          } as ResultItem;
        });
      const resp: ComputeListDone = { type: 'compute_list_done', items };
      (self as any).postMessage(resp);
    } catch {
      const resp: ComputeListDone = { type: 'compute_list_done', items: [] };
      (self as any).postMessage(resp);
    }
    return;
  }
  if (data.type === 'sample_chart') {
    try {
      const { feasibleGroups, rates, chartTriple, params } = data as SampleChartMsg;
      const rawSets: SampleChartDone['rawSets'] = [];
      for (const g of feasibleGroups) {
        const rate = (rates || []).find(r => r.group === g && r.carrier === chartTriple.carrier && r.tier === chartTriple.tier && r.delivery === chartTriple.delivery);
        if (!rate) continue;
        const raw = priceRangeForMargin(params, rate.pricing, g as OzonGroup, false);
        const rule = OZON_GROUP_RULES.find(r => r.group === g)!;
        const lo = Math.max(raw.min, rule.priceRub.min);
        const hi = Math.min(raw.max, rule.priceRub.max);
        if (!(isFinite(lo) && isFinite(hi) && hi > lo)) continue;
        const N = Math.max(10, Math.min(400, data.N ?? 100));
        const samples: Array<{ price: number; margin: number }> = [];
        for (let i = 0; i <= N; i++) {
          const p = lo + (i / N) * (hi - lo);
          const isEnd = i === 0 || i === N;
          const P = isEnd ? (i === 0 ? lo : hi) : Math.round(p * 100) / 100;
          const br = computeProfitForPrice(P, g as OzonGroup, rate.pricing, params);
          samples.push({ price: P, margin: br.margin });
        }
        rawSets.push({ group: g as OzonGroup, range: { min: Math.round(lo * 100) / 100, max: Math.round(hi * 100) / 100 }, samples });
      }
      const resp: SampleChartDone = { type: 'sample_chart_done', rawSets };
      (self as any).postMessage(resp);
    } catch {
      const resp: SampleChartDone = { type: 'sample_chart_done', rawSets: [] };
      (self as any).postMessage(resp);
    }
    return;
  }
  if (data.type === 'sample_demand_lines') {
    try {
      const { segments, rates, chartTriple, params, demand } = data as SampleDemandLinesMsg;
      const vbH = Math.max(1, data.vbH ?? 180);
      const N = Math.max(10, Math.min(400, data.N ?? 60));
      const samples: Array<{ x: number; price: number; q: number; u: number; pi: number }> = [];
      const LOG_K = Math.log(9);
      const gMin = demand.globalMin;
      const gMax = demand.globalMax;
      const P0 = (typeof demand.cePrefP0 === 'number' && isFinite(demand.cePrefP0) && demand.cePrefP0 > 0)
        ? (demand.cePrefP0 as number)
        : Math.max(1, (gMin + gMax) / 2);
      const p10d = gMin + 0.1 * Math.max(0, gMax - gMin);
      const p90d = gMin + 0.9 * Math.max(0, gMax - gMin);
      const p10 = (typeof demand.logisticP10 === 'number' && isFinite(demand.logisticP10 as number)) ? (demand.logisticP10 as number) : p10d;
      const p90 = (typeof demand.logisticP90 === 'number' && isFinite(demand.logisticP90 as number)) ? (demand.logisticP90 as number) : p90d;
      const kG = (2 * LOG_K) / Math.max(1e-6, p90 - p10);
      const pmidG = (p10 + p90) / 2;

      for (const seg of segments) {
        const { priceMin, priceMax, xMin, xMax, group } = seg;
        for (let i = 0; i <= N; i++) {
          const t = i / N;
          const P = priceMin + t * Math.max(0, priceMax - priceMin);
          if (!(isFinite(P) && P > 0)) continue;
          const x = xMin + t * Math.max(0, xMax - xMin);
          const rate = (rates || []).find(r => r.group === group && r.carrier === chartTriple.carrier && r.tier === chartTriple.tier && r.delivery === chartTriple.delivery);
          const br = rate ? computeProfitForPrice(Math.round(P * 100) / 100, group, rate.pricing, params) : null;
          const U = br ? br.profit_cny : 0;
          const qRaw = (demand.model === 'ce')
            ? Math.pow(P / P0, -Math.max(0, demand.ceEpsilon ?? 1.8))
            : (1 / (1 + Math.exp(kG * (P - pmidG))));
          const pi = Math.max(0, U * qRaw);
          samples.push({ x, price: P, q: qRaw, u: U, pi });
        }
      }

      let qPts: SampleDemandLinesDone['qPts'] = [];
      let piPts: SampleDemandLinesDone['piPts'] = [];
      if (samples.length) {
        const qMax = Math.max(...samples.map(s => s.q));
        const piMax = Math.max(...samples.map(s => s.pi));
        if (qMax > 0) qPts = samples.map(s => ({ x: s.x, y: vbH - (s.q / qMax) * (vbH - 20), price: s.price }));
        if (piMax > 0) piPts = samples.map(s => ({ x: s.x, y: vbH - (s.pi / piMax) * (vbH - 20), price: s.price }));
      }
      const resp: SampleDemandLinesDone = { type: 'sample_demand_lines_done', qPts, piPts };
      (self as any).postMessage(resp);
    } catch {
      const resp: SampleDemandLinesDone = { type: 'sample_demand_lines_done', qPts: [], piPts: [] };
      (self as any).postMessage(resp);
    }
    return;
  }
});

export {};
