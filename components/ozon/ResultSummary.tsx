"use client";

import { Card } from "@/components/ui/card";
import { carrierName } from "@/lib/carrier_names";
import type { ResultItem } from "@/types/ozon";
import { loadAllCarrierRates } from "@/lib/ozon_pricing";
import { useMemo } from "react";

export default function ResultSummary({
  currentItem,
  best,
  maxMargin,
  rubPerCny,
}: {
  currentItem: ResultItem | null;
  best: ResultItem | null;
  maxMargin: number;
  rubPerCny: number;
}) {
  const allRates = useMemo(() => loadAllCarrierRates(), []);
  const show = currentItem || best;
  if (!show) {
    return (
      <Card className="rounded-lg border p-4 space-y-3">
        <p className="text-sm text-muted-foreground">点击“计算最优方案”。若无推荐，可能是利润率约束过紧或无可用费率。</p>
      </Card>
    );
  }
  function deliveryZh(d: ResultItem["delivery"]) {
    if (d === "door") return "上门配送";
    return "取货点";
  }
  function metaOf(it: ResultItem | null) {
    if (!it) return undefined;
    return allRates.find(r => r.carrier === it.carrier && r.tier === it.tier && r.delivery === it.delivery && r.group === it.group);
  }
  const m = metaOf(show);
  function batteryBadge(v?: boolean) {
    if (v === true) return <span className="inline-flex items-center rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700">电池 允许</span>;
    if (v === false) return <span className="inline-flex items-center rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700">电池 不允许</span>;
    return <span className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-600">电池 未知</span>;
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h2 className="font-medium">{currentItem ? "当前售价详情" : "推荐结果"}</h2>
      <div className="space-y-2 text-sm">
        <div>
          {currentItem ? "当前售价：" : "推荐售价："}
          <span className="font-semibold">₽ {show.price_rub}</span>
        </div>
        <div>
          利润率：{(show.breakdown.margin*100).toFixed(2)}% · 利润：₽ {(show.breakdown.profit_cny * rubPerCny).toFixed(2)} / ¥ {show.breakdown.profit_cny.toFixed(2)}
        </div>
        <div>
          货件分组：{show.group} · 国际物流费（{carrierName(String(show.carrier))} / {show.tier} / {deliveryZh(show.delivery)}）：₽ {show.breakdown.intl_logistics_rub.toFixed(2)}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span>时效：{m?.eta_days ?? "-"}</span>
          {batteryBadge(m?.battery_allowed)}
        </div>
        {show.safe_range && (
          <div>安全区间：₽ {show.safe_range.from} ~ ₽ {show.safe_range.to}</div>
        )}
        {show.note && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">{show.note}</div>
        )}
        {typeof maxMargin === 'number' && maxMargin > 0 && show.breakdown.margin > maxMargin && (
          <div className="text-xs text-amber-600">提示：该方案利润率 {(show.breakdown.margin*100).toFixed(2)}% 超过上限 {(maxMargin*100).toFixed(0)}%，已按未加盖帽排序返回。可调低上限或忽略此提示。</div>
        )}
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
          <span>平台佣金：</span><span>₽ {show.breakdown.commission_rub}</span>
          <span>收单费：</span><span>₽ {show.breakdown.acquiring_rub}</span>
          <span>国际物流费：</span><span>₽ {show.breakdown.intl_logistics_rub}</span>
          <span>尾城配送费：</span><span>₽ {show.breakdown.last_mile_rub}</span>
          <span>货币转换费：</span><span>₽ {show.breakdown.fx_fee_rub}</span>
          <span>最终回款：</span><span>₽ {show.breakdown.receipt_rub}</span>
          <span>利润(CNY)：</span><span>¥ {show.breakdown.profit_cny}</span>
          <span>利润率：</span><span>{(show.breakdown.margin*100).toFixed(2)}%</span>
        </div>
      </div>
    </div>
  );
}
