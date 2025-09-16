"use client";

import Slider from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import type { DeliveryMode } from "@/types/ozon";
import { carrierName } from "@/lib/carrier_names";

export default function PriceControlsBar({
  sliderRange,
  sliderPrice,
  setSliderPrice,
  priceInput,
  setPriceInput,
  sliderBreakdown,
  chartTriple,
  rubPerCny,
  activeGroup,
}: {
  sliderRange: { min: number; max: number };
  sliderPrice: number | null;
  setSliderPrice: (v: number) => void;
  priceInput: string | null;
  setPriceInput: (s: string | null) => void;
  sliderBreakdown: {
    margin: number;
    profit_cny: number;
    intl_logistics_rub: number;
  } | null;
  chartTriple: { carrier: string; tier: string; delivery: DeliveryMode };
  rubPerCny: number;
  activeGroup: string;
}) {
  function deliveryZh(d: DeliveryMode) {
    if (d === "door") return "上门配送";
    // 其余视为自提
    return "取货点";
  }
  return (
    <div>
      <div className="flex items-end justify-between text-xs text-muted-foreground">
        <span>₽ {sliderRange.min}</span>
        <span>₽ {sliderRange.max}</span>
      </div>
      <div className="mt-1">
        <Slider
          value={[sliderPrice ?? sliderRange.min]}
          min={sliderRange.min}
          max={sliderRange.max}
          step={0.01}
          onValueChange={(v)=> {
            if (!v || v.length === 0 || typeof v[0] !== 'number' || !isFinite(v[0])) return;
            setSliderPrice(Math.round(v[0]*100)/100);
          }}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
        <div className="inline-flex items-center gap-2">
          <span>当前售价：</span>
          <Input
            className="h-8 w-28"
            type="number"
            step="0.01"
            value={priceInput ?? (typeof sliderPrice==='number' ? sliderPrice.toFixed(2) : "")}
            onChange={(e)=>{ setPriceInput(e.target.value); }}
            onKeyDown={(e)=>{
              if (e.key === 'Enter') {
                e.preventDefault();
                const v = Number(priceInput ?? (typeof sliderPrice==='number' ? sliderPrice : NaN));
                setPriceInput(null);
                if (Number.isNaN(v) || !isFinite(v) || !sliderRange) return;
                const vv = Math.round(v*100)/100;
                const clamped = Math.min(sliderRange.max, Math.max(sliderRange.min, vv));
                setSliderPrice(clamped);
              }
            }}
            onBlur={()=>{
              if (priceInput === null) return;
              const v = Number(priceInput);
              setPriceInput(null);
              if (Number.isNaN(v) || !isFinite(v) || !sliderRange) return;
              const vv = Math.round(v*100)/100;
              const clamped = Math.min(sliderRange.max, Math.max(sliderRange.min, vv));
              setSliderPrice(clamped);
            }}
          />
          {sliderBreakdown && (
            <div className="ml-2 text-sm">
              <div>
                利润率：{(sliderBreakdown.margin*100).toFixed(2)}% · 利润：₽ {(sliderBreakdown.profit_cny * rubPerCny).toFixed(2)} / ¥ {sliderBreakdown.profit_cny.toFixed(2)}
              </div>
              <div>
                货件分组：{activeGroup} · 国际物流费（{carrierName(chartTriple.carrier)} / {chartTriple.tier} / {deliveryZh(chartTriple.delivery)}）：₽ {sliderBreakdown.intl_logistics_rub.toFixed(2)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
