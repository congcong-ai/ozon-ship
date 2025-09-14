"use client";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ResultItem } from "@/types/ozon";

export default function DetailsDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: ResultItem | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>方案详情</DialogTitle>
        </DialogHeader>
        {item ? (
          <div className="text-sm space-y-2">
            <div className="font-medium">{item.carrier} / {item.tier} / {item.delivery} · 组 {item.group}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span>售价：</span><span>₽ {item.price_rub}</span>
              <span>平台佣金：</span><span>₽ {item.breakdown.commission_rub}</span>
              <span>收单费：</span><span>₽ {item.breakdown.acquiring_rub}</span>
              <span>国际物流费：</span><span>₽ {item.breakdown.intl_logistics_rub}</span>
              <span>尾城费：</span><span>₽ {item.breakdown.last_mile_rub}</span>
              <span>货币转换费：</span><span>₽ {item.breakdown.fx_fee_rub}</span>
              <span>最终回款：</span><span>₽ {item.breakdown.receipt_rub}</span>
              <span>利润：</span><span>¥ {item.breakdown.profit_cny}</span>
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
