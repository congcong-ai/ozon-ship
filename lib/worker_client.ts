import type { DeliveryMode, OzonGroup, OzonPricingParams, OzonRateTable, ResultItem } from '@/types/ozon';
import { computeProfitForPrice, priceRangeForMargin, OZON_GROUP_RULES } from '@/lib/ozon_pricing';

let worker: Worker | null = null;

function ensureWorker(): Worker | null {
  if (worker) return worker;
  try {
    worker = new Worker(new URL('../workers/pricing.worker.ts', import.meta.url), { type: 'module' });
    return worker;
  } catch (e) {
    worker = null;
    return null;
  }
}

export async function computeListViaWorker(args: {
  sliderPrice: number;
  group: OzonGroup;
  rates: OzonRateTable[];
  params: OzonPricingParams;
}): Promise<ResultItem[]> {
  const w = ensureWorker();
  if (!w) {
    // Fallback to synchronous compute on main thread
    const { sliderPrice, group, rates, params } = args;
    return (rates || []).filter(r => r.group === group).map(r => {
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
  }
  return new Promise<ResultItem[]>((resolve) => {
    const handler = (e: MessageEvent) => {
      const data = e.data;
      if (data && data.type === 'compute_list_done') {
        w.removeEventListener('message', handler);
        resolve((data.items || []) as ResultItem[]);
      }
    };
    w.addEventListener('message', handler);
    w.postMessage({ type: 'compute_list', ...args });
  });
}

export function terminateWorker() {
  try { worker?.terminate(); } catch {}
  worker = null;
}

export type SampleRawSet = {
  group: OzonGroup;
  range: { min: number; max: number };
  samples: Array<{ price: number; margin: number }>;
};

export async function sampleChartViaWorker(args: {
  feasibleGroups: OzonGroup[];
  rates: OzonRateTable[];
  chartTriple: { carrier: string; tier: string; delivery: DeliveryMode };
  params: OzonPricingParams;
  N?: number;
}): Promise<SampleRawSet[]> {
  const w = ensureWorker();
  if (!w) {
    // Main-thread fallback
    const { feasibleGroups, rates, chartTriple, params } = args;
    const out: SampleRawSet[] = [];
    for (const g of feasibleGroups) {
      const rate = (rates || []).find(r => r.group === g && r.carrier === chartTriple.carrier && r.tier === chartTriple.tier && r.delivery === chartTriple.delivery);
      if (!rate) continue;
      const raw = priceRangeForMargin(params, rate.pricing, g as OzonGroup, false);
      const rule = OZON_GROUP_RULES.find(r => r.group === g)!;
      const lo = Math.max(raw.min, rule.priceRub.min);
      const hi = Math.min(raw.max, rule.priceRub.max);
      if (!(isFinite(lo) && isFinite(hi) && hi > lo)) continue;
      const N = Math.max(10, Math.min(400, args.N ?? 100));
      const samples: Array<{ price: number; margin: number }> = [];
      for (let i = 0; i <= N; i++) {
        const p = lo + (i / N) * (hi - lo);
        const isEnd = i === 0 || i === N;
        const P = isEnd ? (i === 0 ? lo : hi) : Math.round(p * 100) / 100;
        const br = computeProfitForPrice(P, g as OzonGroup, rate.pricing, params);
        samples.push({ price: P, margin: br.margin });
      }
      out.push({ group: g, range: { min: Math.round(lo * 100) / 100, max: Math.round(hi * 100) / 100 }, samples });
    }
    return out;
  }
  return new Promise<SampleRawSet[]>((resolve) => {
    const handler = (e: MessageEvent) => {
      const data = e.data;
      if (data && data.type === 'sample_chart_done') {
        w.removeEventListener('message', handler);
        resolve((data.rawSets || []) as SampleRawSet[]);
      }
    };
    w.addEventListener('message', handler);
    w.postMessage({ type: 'sample_chart', ...args });
  });
}
