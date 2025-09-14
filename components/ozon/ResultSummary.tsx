"use client";

import { Card } from "@/components/ui/card";
import type { ResultItem } from "@/types/ozon";

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
          货件分组：{show.group} · 国际物流费（{String(show.carrier).replace(/^./, s => s.toUpperCase())} / {show.tier} / {deliveryZh(show.delivery)}）：₽ {show.breakdown.intl_logistics_rub.toFixed(2)}
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
