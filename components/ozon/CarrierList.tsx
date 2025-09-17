"use client";

import type { ResultItem } from "@/types/ozon";
import { carrierName } from "@/lib/carrier_names";
import { Button } from "@/components/ui/button";

export default function CarrierList({ items, rubPerCny, onOpenDetails }: { items: ResultItem[]; rubPerCny: number; onOpenDetails: (it: ResultItem) => void }) {
  // 元信息直接来自 items（由计算阶段附带），避免再次加载所有费率表
  function findMeta(it: ResultItem) { return { eta_days: it.eta_days, battery_allowed: it.battery_allowed }; }
  function deliveryZh(d: string) { return d === "door" ? "上门配送" : "取货点"; }
  function batteryBadge(v?: boolean) {
    if (v === true) return <span className="inline-flex items-center rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700">电池 允许</span>;
    if (v === false) return <span className="inline-flex items-center rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700">电池 不允许</span>;
    return <span className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-600">电池 未知</span>;
  }
  if (!items || items.length === 0) {
    return (
      <section className="rounded-lg border p-4 text-sm text-muted-foreground">当前售价下无可显示的承运商</section>
    );
  }
  return (
    <section className="rounded-lg border divide-y">
      {items.map((it, idx) => (
        <div key={`${it.carrier}-${it.tier}-${it.delivery}-${idx}`} className="flex items-center gap-4 p-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-medium leading-tight">{carrierName(String(it.carrier))} {it.tier}</h3>
              <span className="rounded bg-accent px-1.5 py-0.5 text-xs text-accent-foreground">{deliveryZh(it.delivery).toUpperCase()}</span>
              <span className="rounded bg-accent px-1.5 py-0.5 text-xs text-accent-foreground">组 {it.group}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              国际物流费：₽ {it.breakdown.intl_logistics_rub.toFixed(2)} · 利润：₽ {(it.breakdown.profit_cny * rubPerCny).toFixed(2)} / ¥ {it.breakdown.profit_cny.toFixed(2)} · 利润率 {(it.breakdown.margin*100).toFixed(2)}%
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground flex items-center gap-2">
              {(() => {
                const m = findMeta(it);
                const eta = m?.eta_days || "-";
                return <>
                  <span>时效：{eta}天</span>
                  {batteryBadge(m?.battery_allowed)}
                </>;
              })()}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">国际物流费(RUB)</div>
            <div className="text-lg font-semibold">₽ {it.breakdown.intl_logistics_rub.toFixed(2)}</div>
            <div className="mt-2">
              <Button size="sm" variant="outline" onClick={() => onOpenDetails(it)}>详情</Button>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
