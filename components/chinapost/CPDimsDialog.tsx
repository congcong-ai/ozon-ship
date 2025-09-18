"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ServiceWithComputed } from "@/types/shipping";

export default function CPDimsDialog({
  open,
  onOpenChange,
  service,
  dims,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  service: ServiceWithComputed | null;
  dims: { l: number; w: number; h: number };
}) {
  if (!service) return null;
  const L = Math.max(0, dims?.l || 0);
  const W = Math.max(0, dims?.w || 0);
  const H = Math.max(0, dims?.h || 0);
  const sum = L + W + H;
  const longest = Math.max(L, W, H);
  const sorted = [L, W, H].sort((a, b) => b - a);
  const sumTwo = sorted[0] + sorted[1];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>尺寸超限提示</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm leading-6">
          <div>
            <span className="text-muted-foreground">渠道：</span>
            <span className="font-medium">{service.name}（{service.group}）</span>
          </div>
          {service.dims_limit ? (
            <div className="text-muted-foreground">尺寸限制：三边之和 ≤ {service.dims_limit.sum_cm_max} cm，最长边 ≤ {service.dims_limit.longest_cm_max} cm</div>
          ) : null}
          {service.dims_options && service.dims_options.length ? (
            <div className="text-muted-foreground">
              满足以下任意一项：
              <ul className="list-disc pl-5 space-y-0.5">
                {service.dims_options.map((o, i) => (
                  <li key={i}>任一边≤{o.any_side_max_cm} cm，两个最大边之和≤{o.two_largest_sum_max_cm} cm</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div>
            <span className="text-muted-foreground">您的尺寸：</span>
            <span>{L} × {W} × {H} cm（和 = {sum} cm，最长边 = {longest} cm；两边之和 = {sumTwo} cm）</span>
          </div>
          <div className="pt-1">
            温馨提示：可适当调整长宽高或选择其他邮政产品；如需寄送超大件，建议改用合作物流渠道。
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>我知道了</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
