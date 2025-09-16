import { useEffect, useMemo, useState } from "react";
import { OzonGroup, OzonPricingParams, OzonRateTable, DeliveryMode } from "@/types/ozon";
import { sampleChartViaWorker } from "@/lib/worker_client";

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
  const [chartSets, setChartSets] = useState<{ sets: { group: string; color: string; points: { x:number;y:number;price:number;margin:number;group: OzonGroup }[] }[]; globalMin: number; globalMax: number; xSegments?: { priceMin: number; priceMax: number; xMin: number; xMax: number; group: OzonGroup }[] }>({ sets: [], globalMin: 0, globalMax: 1 });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!feasibleGroups.length) { if (!cancelled) setChartSets({ sets: [], globalMin: 0, globalMax: 1 }); return; }
      try {
        const rawSets = await sampleChartViaWorker({ feasibleGroups, rates, chartTriple: { carrier: chartTriple.carrier, tier: chartTriple.tier, delivery: chartTriple.delivery as DeliveryMode }, params, N: 100 });
        if (cancelled) return;
        if (!rawSets.length) { setChartSets({ sets: [], globalMin: 0, globalMax: 1 }); return; }
        const globalMin = Math.min(...rawSets.map((s) => s.range.min));
        const globalMax = Math.max(...rawSets.map((s) => s.range.max));
        const vbW = 600, vbH = 180;
        const yMin = typeof minMargin === "number" ? minMargin : 0.1;
        const yMax = typeof maxMargin === "number" && maxMargin > 0 ? maxMargin : yMin + 1;
        const eps = 1e-6;
        const sorted = rawSets.slice().sort((a, b) => a.range.min - b.range.min);
        const segLens = sorted.map(s => Math.max(0, s.range.max - s.range.min));
        const totalLen = segLens.reduce((acc, v) => acc + v, 0);
        const segOffset: number[] = [];
        { let acc = 0; for (let i = 0; i < sorted.length; i++) { segOffset.push(acc); acc += segLens[i]; } }
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
        const sets: { group: string; color: string; points: { x:number;y:number;price:number;margin:number;group: OzonGroup }[] }[] = [];
        const xSegments: { priceMin: number; priceMax: number; xMin: number; xMax: number; group: OzonGroup }[] = [];
        for (let idx = 0; idx < sorted.length; idx++) {
          const seg = sorted[idx];
          const a = seg.range.min; const b = seg.range.max;
          if (!(b > a)) continue;
          const xMin = scaleXCompressed(a, idx, a);
          const xMax = scaleXCompressed(b, idx, a);
          xSegments.push({ priceMin: a, priceMax: b, xMin, xMax, group: seg.group });
          const pts: { x:number;y:number;price:number;margin:number;group: OzonGroup }[] = [];
          for (let i = 0; i < seg.samples.length; i++) {
            const smp = seg.samples[i];
            const isEnd = i === 0 || i === seg.samples.length - 1;
            const x = scaleXCompressed(smp.price, idx, a);
            if (isEnd) {
              pts.push({ x, y: scaleY(smp.margin), price: smp.price, margin: smp.margin, group: seg.group });
            } else {
              if (smp.margin < yMin - 1e-6 || smp.margin > yMax + 1e-6) continue;
              pts.push({ x, y: scaleY(smp.margin), price: smp.price, margin: smp.margin, group: seg.group });
            }
          }
          if (pts.length >= 2) {
            const color = groupColors[seg.group] || "#2563eb";
            sets.push({ group: `${seg.group}-${a.toFixed(2)}-${b.toFixed(2)}`, color, points: pts });
          }
        }
        setChartSets({ sets, globalMin: Math.round(globalMin * 100) / 100, globalMax: Math.round(globalMax * 100) / 100, xSegments });
      } catch {
        if (!cancelled) setChartSets({ sets: [], globalMin: 0, globalMax: 1 });
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feasibleGroups.join(','), rates, chartTriple.carrier, chartTriple.tier, chartTriple.delivery, params.weight_g, params.dims_cm.l, params.dims_cm.w, params.dims_cm.h, params.cost_cny, params.commission, params.acquiring, params.fx, params.last_mile.rate, params.last_mile.min_rub, params.last_mile.max_rub, params.rub_per_cny, params.fx_include_intl, minMargin, maxMargin, groupColors["Extra Small"], groupColors["Budget"], groupColors["Small"], groupColors["Big"], groupColors["Premium Small"], groupColors["Premium Big"]]);

  return chartSets;
}
