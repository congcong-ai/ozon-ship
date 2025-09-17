"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { OzonGroup, OzonGroupRule } from "@/types/ozon";

export default function DimsLimitDialog({
  open,
  onOpenChange,
  info,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  info: {
    group: OzonGroup;
    rule: OzonGroupRule;
    dims: { l: number; w: number; h: number };
    sum: number;
    longest: number;
    price: number;
    weightG: number;
  } | null;
}) {
  const billingText = (() => {
    if (!info?.rule) return "";
    const div = info.rule.dimsLimit?.volumetric_divisor || 12000;
    if (info.rule.billing === "max_of_physical_and_dimensional") {
      return `计费方式：物理重量与体积重取大者（体积重 = 长×宽×高 ÷ ${div}）`;
    }
    return "计费方式：物理重量";
  })();

  const limitText = (() => {
    if (!info?.rule?.dimsLimit) return "";
    const { sum_cm_max, longest_cm_max } = info.rule.dimsLimit;
    return `尺寸限制：三边之和 ≤ ${sum_cm_max} cm，最长边 ≤ ${longest_cm_max} cm`;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>商品尺寸超出当前货件组限制</DialogTitle>
        </DialogHeader>
        {info ? (
          <div className="space-y-2 text-sm leading-6">
            <div>
              <span className="text-muted-foreground">当前货件组：</span>
              <span className="font-medium">{info.group}</span>
            </div>
            <div className="text-muted-foreground">{limitText}</div>
            <div className="text-muted-foreground">{billingText}</div>
            <div>
              <span className="text-muted-foreground">您的商品尺寸：</span>
              <span>
                {info.dims.l} × {info.dims.w} × {info.dims.h} cm（和 = {info.sum} cm，最长边 = {info.longest} cm）
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">当前售价/重量：</span>
              <span>
                ₽ {info.price.toFixed(2)} · {info.weightG >= 1000 ? `${(info.weightG/1000).toFixed(3)} kg` : `${info.weightG} g`}
              </span>
            </div>
            <div className="pt-1">
              温馨提示：
              <br />
              1）可适当调整商品售价或重量，切换到更合适的货件组；
              <br />
              2）或选择使用中国邮政寄送。
            </div>
          </div>
        ) : null}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>我知道了</Button>
          <Button onClick={() => { try { window.location.href = "/chinapost"; } catch {} }}>一键切换至中国邮政计算</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
