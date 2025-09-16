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

self.addEventListener('message', (e: MessageEvent) => {
  const data = e.data as ComputeListMsg | SampleChartMsg;
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
});

export {};
