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

// 统一的 Worker 通信抽象（仅用于新接口）
function postWorkerMessage<TResp = any>(expectType: string, payload: any): Promise<TResp> {
  const w = ensureWorker();
  if (!w) return Promise.reject(new Error('Worker not available'));
  return new Promise<TResp>((resolve) => {
    const handler = (e: MessageEvent) => {
      const data = e.data;
      if (data && data.type === expectType) {
        w.removeEventListener('message', handler);
        resolve(data as TResp);
      }
    };
    w.addEventListener('message', handler);
    w.postMessage(payload);
  });
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
  const resp = await postWorkerMessage<{ type: 'compute_list_done'; items: ResultItem[] }>('compute_list_done', { type: 'compute_list', ...args });
  return (resp.items || []) as ResultItem[];
}

// 叠加线（销量/总利润）采样：优先在 Worker 中计算；若无 Worker 则在主线程回退
type DemandSegments = Array<{ priceMin: number; priceMax: number; xMin: number; xMax: number; group: OzonGroup }>;

export async function sampleDemandLinesViaWorker(args: {
  segments: Array<{ priceMin: number; priceMax: number; xMin: number; xMax: number; group: OzonGroup }>;
  rates: OzonRateTable[];
  chartTriple: { carrier: string; tier: string; delivery: DeliveryMode };
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
  vbH?: number;
  N?: number;
}): Promise<{ qPts: Array<{ x: number; y: number; price: number }>; piPts: Array<{ x: number; y: number; price: number }> }> {
  // 内存缓存 + 去重
  const cacheKey = demandCacheKey(args.segments, args.chartTriple, args.demand, args.vbH ?? 180, args.N ?? 60);
  const cached = demandLinesCache.get(cacheKey);
  if (cached) return cached instanceof Promise ? await cached : cached;
  const task = (async () => {
    const w = ensureWorker();
    if (!w) {
      return computeDemandLinesOnMain(args);
    }
    const resp = await postWorkerMessage<{ type: 'sample_demand_lines_done'; qPts: Array<{ x: number; y: number; price: number }>; piPts: Array<{ x: number; y: number; price: number }> }>('sample_demand_lines_done', {
      type: 'sample_demand_lines',
      ...args,
    });
    const out = { qPts: resp.qPts || [], piPts: resp.piPts || [] };
    return out;
  })();
  demandLinesCache.set(cacheKey, task);
  try {
    const out = await task;
    demandLinesCache.set(cacheKey, out);
    return out;
  } catch (e) {
    demandLinesCache.delete(cacheKey);
    throw e;
  }
}

function normalizeNum(n: number, p = 3): string { return Number.isFinite(n) ? n.toFixed(p) : 'NaN'; }
function demandCacheKey(segments: DemandSegments, triple: { carrier: string; tier: string; delivery: DeliveryMode }, demand: any, vbH: number, N: number): string {
  const segKey = segments.map(s => [normalizeNum(s.priceMin,2), normalizeNum(s.priceMax,2), normalizeNum(s.xMin,1), normalizeNum(s.xMax,1), s.group].join(':')).join('|');
  const triKey = [triple.carrier, triple.tier, triple.delivery].join('/');
  const demKey = JSON.stringify({ model: demand?.model, ceEpsilon: demand?.ceEpsilon, cePrefP0: demand?.cePrefP0, logisticP10: demand?.logisticP10, logisticP90: demand?.logisticP90, globalMin: demand?.globalMin, globalMax: demand?.globalMax });
  return `dl:${triKey}|${segKey}|${demKey}|vbH=${vbH}|N=${N}`;
}

async function computeDemandLinesOnMain(args: {
  segments: DemandSegments;
  rates: OzonRateTable[];
  chartTriple: { carrier: string; tier: string; delivery: DeliveryMode };
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
  vbH?: number;
  N?: number;
}): Promise<{ qPts: Array<{ x: number; y: number; price: number }>; piPts: Array<{ x: number; y: number; price: number }> }> {
  const { segments, rates, chartTriple, params, demand } = args;
  const vbH = Math.max(1, args.vbH ?? 180);
  const N = Math.max(10, Math.min(400, args.N ?? 60));
  const LOG_K = Math.log(9);
  const gMin = demand.globalMin, gMax = demand.globalMax;
  const P0 = (typeof demand.cePrefP0 === 'number' && isFinite(demand.cePrefP0) && (demand.cePrefP0 as number) > 0)
    ? (demand.cePrefP0 as number)
    : Math.max(1, (gMin + gMax) / 2);
  const p10d = gMin + 0.1 * Math.max(0, gMax - gMin);
  const p90d = gMin + 0.9 * Math.max(0, gMax - gMin);
  const p10 = (typeof demand.logisticP10 === 'number' && isFinite(demand.logisticP10 as number)) ? (demand.logisticP10 as number) : p10d;
  const p90 = (typeof demand.logisticP90 === 'number' && isFinite(demand.logisticP90 as number)) ? (demand.logisticP90 as number) : p90d;
  const kG = (2 * LOG_K) / Math.max(1e-6, p90 - p10);
  const pmidG = (p10 + p90) / 2;
  const samples: Array<{ x: number; price: number; q: number; u: number; pi: number }> = [];
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
  let qPts: Array<{ x: number; y: number; price: number }> = [];
  let piPts: Array<{ x: number; y: number; price: number }> = [];
  if (samples.length) {
    const qMax = Math.max(...samples.map(s => s.q));
    const piMax = Math.max(...samples.map(s => s.pi));
    if (qMax > 0) qPts = samples.map(s => ({ x: s.x, y: vbH - (s.q / qMax) * (vbH - 20), price: s.price }));
    if (piMax > 0) piPts = samples.map(s => ({ x: s.x, y: vbH - (s.pi / piMax) * (vbH - 20), price: s.price }));
  }
  return { qPts, piPts };
}

const demandLinesCache = new Map<string, any>();

export function prefetchDemandLinesIdle(args: {
  segments: DemandSegments;
  rates: OzonRateTable[];
  chartTriple: { carrier: string; tier: string; delivery: DeliveryMode };
  params: OzonPricingParams;
  demand: any;
  vbH?: number;
  N?: number;
}) {
  const key = demandCacheKey(args.segments, args.chartTriple, args.demand, args.vbH ?? 180, args.N ?? 60);
  if (demandLinesCache.has(key)) return; // 已有或在途
  const runner = () => { sampleDemandLinesViaWorker(args).catch(()=>{}); };
  try {
    if (typeof (globalThis as any).requestIdleCallback === 'function') {
      (globalThis as any).requestIdleCallback(runner);
    } else {
      setTimeout(runner, 500);
    }
  } catch {
    setTimeout(runner, 500);
  }
}

export function terminateWorker() {
  try { worker?.terminate(); } catch {}
  worker = null;
}

// 预热 Worker（在空闲时调用，避免首次使用时的创建开销）
export function prewarmWorker(): boolean {
  const w = ensureWorker();
  return !!w;
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
  const resp = await postWorkerMessage<{ type: 'sample_chart_done'; rawSets: SampleRawSet[] }>('sample_chart_done', { type: 'sample_chart', ...args });
  return (resp.rawSets || []) as SampleRawSet[];
}
