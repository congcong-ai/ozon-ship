"use client";

import FxToolbar from "@/components/ozon/FxToolbar";
import PriceControlsBar from "@/components/ozon/PriceControlsBar";
import PriceChart, { type PriceChartSets } from "@/components/ozon/price-chart";
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
  onOpenSettings: () => void;
}) {
  const yMin = typeof minMargin === 'number' ? minMargin : 0.1;
  const yMax = typeof maxMargin === 'number' && maxMargin > 0 ? maxMargin : yMin + 1;
  const yMid = (yMin + yMax) / 2;
  return (
    <section className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">{title}</h2>
        <div className="flex items-center gap-2">
          <FxToolbar {...fxToolbar} />
          <Button size="sm" variant="default" onClick={onOpenSettings}>
            <Settings className="mr-1 h-4 w-4" />
            更多设置
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3">
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
        />
        {/* 图表上方外置图例（不与曲线重叠） */}
        <div className="flex justify-end">
          <ChartLegend chart={chart} title="Ozon货件分组" />
        </div>
        <div className="relative select-none rounded-md border bg-white overflow-hidden">
          <PriceChart
            chart={chart}
            sliderPrice={sliderPrice}
            minMargin={typeof minMargin === 'number' ? minMargin : 0.1}
            maxMargin={typeof maxMargin === 'number' && maxMargin > 0 ? maxMargin : undefined}
            onDragToPrice={(p)=> onChangeSliderPrice(Math.round(p*100)/100)}
            hideLegend
          />
        </div>
      </div>
    </section>
  );
}
