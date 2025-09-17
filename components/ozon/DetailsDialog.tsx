"use client";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ResultItem } from "@/types/ozon";
import { carrierName } from "@/lib/carrier_names";

export default function DetailsDialog({
  open,
  onOpenChange,
  item,
  rubPerCny,
  costCny,
  commission,
  acquiring,
  fx,
  last_mile,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: ResultItem | null;
  rubPerCny?: number;
  costCny?: number;
  commission?: number;
  acquiring?: number;
  fx?: number;
  last_mile?: { rate: number; min_rub: number; max_rub: number };
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>方案详情</DialogTitle>
        </DialogHeader>
        {item ? (
          <div className="text-sm space-y-2">
            <div className="font-medium">{carrierName(String(item.carrier))} / {item.tier} / {item.delivery === 'door' ? '上门配送' : '取货点'} · 组 {item.group}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span>售价：</span>
              <span>₽ {item.price_rub.toFixed(2)} / ¥ {rubPerCny ? (item.price_rub / rubPerCny).toFixed(2) : '-'}</span>

              <span>平台佣金：</span>
              <span>
                ₽ {item.breakdown.commission_rub.toFixed(2)} / ¥ {rubPerCny ? (item.breakdown.commission_rub / rubPerCny).toFixed(2) : '-'}
                {typeof commission === 'number' ? <span className="text-muted-foreground">（{(commission * 100).toFixed(2)}%）</span> : null}
              </span>

              <span>收单费：</span>
              <span>
                ₽ {item.breakdown.acquiring_rub.toFixed(2)} / ¥ {rubPerCny ? (item.breakdown.acquiring_rub / rubPerCny).toFixed(2) : '-'}
                {typeof acquiring === 'number' ? <span className="text-muted-foreground">（{(acquiring * 100).toFixed(2)}%）</span> : null}
              </span>

              <span>国际物流费：</span>
              <span>
                ₽ {item.breakdown.intl_logistics_rub.toFixed(2)} / ¥ {rubPerCny ? (item.breakdown.intl_logistics_rub / rubPerCny).toFixed(2) : '-'}
                {item.pricing ? (
                  <span className="text-muted-foreground">（公式： (¥ {item.pricing.base_cny.toFixed(2)} + ¥ {item.pricing.per_gram_cny.toFixed(4)} × 计费重量[g]) × R）
                    {(() => {
                      if (rubPerCny && item.pricing) {
                        const R = rubPerCny;
                        const base = item.pricing.base_cny;
                        const pg = item.pricing.per_gram_cny;
                        if (pg > 0 && R > 0) {
                          const wb = Math.max(0, (item.breakdown.intl_logistics_rub / R - base) / pg);
                          if (isFinite(wb)) return <span className="ml-1"> 其中 计费重量 {wb.toFixed(0)} g）</span>;
                        }
                      }
                      return null;
                    })()}
                  </span>
                ) : null}
              </span>

              <span>尾城配送费：</span>
              <span>
                ₽ {item.breakdown.last_mile_rub.toFixed(2)} / ¥ {rubPerCny ? (item.breakdown.last_mile_rub / rubPerCny).toFixed(2) : '-'}
                {last_mile ? <span className="text-muted-foreground">（{(last_mile.rate * 100).toFixed(2)}%，Min ₽ {last_mile.min_rub}，Max ₽ {last_mile.max_rub}）</span> : null}
              </span>

              <span>货币转换费：</span>
              <span>
                ₽ {item.breakdown.fx_fee_rub.toFixed(2)} / ¥ {rubPerCny ? (item.breakdown.fx_fee_rub / rubPerCny).toFixed(2) : '-'}
                {typeof fx === 'number' ? <span className="text-muted-foreground">（{(fx * 100).toFixed(2)}%）</span> : null}
              </span>

              <span>最终回款：</span>
              <span>₽ {item.breakdown.receipt_rub.toFixed(2)} / ¥ {rubPerCny ? (item.breakdown.receipt_rub / rubPerCny).toFixed(2) : '-'}</span>

              {typeof costCny === 'number' ? (<>
                <span>商品成本：</span>
                <span>¥ {costCny.toFixed(2)} / ₽ {rubPerCny ? (costCny * rubPerCny).toFixed(2) : '-'}</span>
              </>) : null}

              <span>利润：</span>
              <span>¥ {item.breakdown.profit_cny.toFixed(2)} / ₽ {rubPerCny ? (item.breakdown.profit_cny * rubPerCny).toFixed(2) : '-'}</span>
              <span>利润率：</span><span>{(item.breakdown.margin*100).toFixed(2)}%</span>
            </div>
            {item.safe_range && (
              <p className="text-xs text-muted-foreground">安全区间：₽ {item.safe_range.from} ~ ₽ {item.safe_range.to}</p>
            )}
          </div>
        ) : null}
        <DialogFooter>
          <Button onClick={()=>onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
