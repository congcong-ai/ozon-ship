"use client";

import * as React from "react";
import FxToolbar from "@/components/ozon/FxToolbar";
import PriceControlsBar from "@/components/ozon/PriceControlsBar";
import PriceChart, { type PriceChartSets, calcDominatedRegions, type ExtraLine } from "@/components/ozon/price-chart";
import ChartLegend from "@/components/ozon/ChartLegend";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import type { DeliveryMode, OzonGroup } from "@/types/ozon";

export default function PriceChartCard({
  title = "售价滑块与利润率曲线",
  chart,
  sliderRange,
  sliderPrice,
  onChangeSliderPrice,
  priceInput,
  setPriceInput,
  sliderBreakdown,
  chartTriple,
  rubPerCny,
  activeGroup,
  minMargin,
  maxMargin,
  fxToolbar,
  demandModel = 'none',
  setDemandModel,
  extraLines,
  legendExtras,
  demandStats,
  recommendPrice,
  ceEpsilon,
  setCeEpsilon,
  cePrefP0,
  setCePrefP0,
  recommendPriceCE,
  recommendPriceLOG,
  logisticP10,
  setLogisticP10,
  logisticP90,
  setLogisticP90,
  onOpenSettings,
}: {
  title?: string;
  chart: PriceChartSets;
  sliderRange: { min: number; max: number };
  sliderPrice: number | null;
  onChangeSliderPrice: (p: number) => void;
  priceInput: string | null;
  setPriceInput: (s: string | null) => void;
  sliderBreakdown: {
    margin: number;
    profit_cny: number;
    intl_logistics_rub: number;
  } | null;
  chartTriple: { carrier: string; tier: string; delivery: DeliveryMode };
  rubPerCny: number;
  activeGroup: OzonGroup;
  minMargin?: number;
  maxMargin?: number;
  fxToolbar: {
    rubFxMode: 'auto' | 'manual';
    setRubFxMode: (m: 'auto' | 'manual') => void;
    rubPerCny: number;
    setRubPerCny: (v: number) => void;
    rubPerCnyInput: string | null;
    setRubPerCnyInput: (s: string | null) => void;
    loadingFx: boolean;
    refreshFx: () => void | Promise<void>;
    fxSource: string | null;
    fxUpdatedAt: string | null;
  };
  demandModel?: 'none' | 'ce' | 'logistic';
  setDemandModel?: (m: 'none' | 'ce' | 'logistic') => void;
  extraLines?: ExtraLine[];
  legendExtras?: Array<{ label: string; color: string; dash?: string }>;
  demandStats?: { q_norm: number; pi_norm_cny: number } | null;
  recommendPrice?: number | null;
  ceEpsilon?: number;
  setCeEpsilon?: (v: number) => void;
  cePrefP0?: number | null;
  setCePrefP0?: (v: number | null) => void;
  recommendPriceCE?: number | null;
  recommendPriceLOG?: number | null;
  logisticP10?: number | null;
  setLogisticP10?: (v: number | null) => void;
  logisticP90?: number | null;
  setLogisticP90?: (v: number | null) => void;
  onOpenSettings: () => void;
}) {
  const yMin = typeof minMargin === 'number' ? minMargin : 0.1;
  const yMax = typeof maxMargin === 'number' && maxMargin > 0 ? maxMargin : yMin + 1;
  const yMid = (yMin + yMax) / 2;
  // 基于与图表相同的算法计算“提高价格利润下降”的红色区间
  const allPoints = React.useMemo(() => chart.sets.flatMap((s) => s.points), [chart.sets]);
  const dominatedRegions = React.useMemo(() => calcDominatedRegions(allPoints), [allPoints]);
  const activeRegion = React.useMemo(() => {
    if (sliderPrice === null || !isFinite(sliderPrice)) return null;
    for (const r of dominatedRegions) {
      const pts = allPoints.slice(r.startIndex, r.endIndex + 1);
      if (!pts.length) continue;
      const pL = pts[0].price;
      const pR = pts[pts.length - 1].price;
      const minP = Math.min(pL, pR);
      const maxP = Math.max(pL, pR);
      if (sliderPrice >= minP - 1e-6 && sliderPrice <= maxP + 1e-6) {
        return { pL, pR };
      }
    }
    return null;
  }, [dominatedRegions, sliderPrice, allPoints]);
  const danger = !!activeRegion;
  const dangerMessage = React.useMemo(() => {
    if (!activeRegion) return null;
    const pL = Math.min(activeRegion.pL, activeRegion.pR).toFixed(2);
    const pR = Math.max(activeRegion.pL, activeRegion.pR).toFixed(2);
    return `此区域提高价格 利润反而降低：₽ ${pL} - ₽ ${pR}`;
  }, [activeRegion]);
  return (
    <section className="rounded-lg border p-4 space-y-4 sm:space-y-3">
      {/* 头部在小屏改为纵向堆叠，避免标题被压缩成竖排；大屏保持左右分布 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-shrink-0">
          <h2 className="font-medium">{title}</h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <FxToolbar {...fxToolbar} />
          <Button size="sm" variant="default" onClick={onOpenSettings}>
            <Settings className="mr-1 h-4 w-4" />
            更多设置
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:gap-3">
        <PriceControlsBar
          sliderRange={sliderRange}
          sliderPrice={sliderPrice}
          setSliderPrice={onChangeSliderPrice}
          priceInput={priceInput}
          setPriceInput={setPriceInput}
          sliderBreakdown={sliderBreakdown}
          chartTriple={chartTriple}
          rubPerCny={rubPerCny}
          activeGroup={activeGroup}
          danger={danger}
          dangerMessage={dangerMessage}
          demandModel={demandModel}
          setDemandModel={setDemandModel}
          ceEpsilon={ceEpsilon}
          setCeEpsilon={setCeEpsilon}
          cePrefP0={cePrefP0}
          setCePrefP0={setCePrefP0}
          recommendPriceCE={recommendPriceCE}
          recommendPriceLOG={recommendPriceLOG}
          logisticP10={logisticP10}
          setLogisticP10={setLogisticP10}
          logisticP90={logisticP90}
          setLogisticP90={setLogisticP90}
          demandStats={demandStats ?? null}
        />
        {/* 图表上方外置图例（不与曲线重叠） */}
        <div className="flex justify-end gap-3">
          {/* 左：货件分组 */}
          <ChartLegend chart={chart} title="Ozon货件分组" showGroups extras={undefined} />
          {/* 右：销售情况（仅显示 extras）*/}
          <ChartLegend
            chart={chart}
            title="销售情况"
            showGroups={false}
            extras={[
              { label: "单件利润率（各组）", color: "#334155" },
              ...(extraLines ? [
                { label: "销量（相对）", color: "#111827", dash: "4 2" },
                { label: "总利润（相对）", color: "#ef4444", dash: "6 3" },
              ] : [])
            ]}
          />
        </div>
        <div className="relative select-none rounded-md border bg-white overflow-hidden">
          <PriceChart
            chart={chart}
            sliderPrice={sliderPrice}
            minMargin={typeof minMargin === 'number' ? minMargin : 0.1}
            maxMargin={typeof maxMargin === 'number' && maxMargin > 0 ? maxMargin : undefined}
            onDragToPrice={(p)=> onChangeSliderPrice(Math.round(p*100)/100)}
            extraLines={extraLines}
            activeGroup={activeGroup}
            showDominated={demandModel === 'none'}
            hideLegend
          />
        </div>
      </div>
    </section>
  );
}
