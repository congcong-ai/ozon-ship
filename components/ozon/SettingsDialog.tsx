"use client";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import React from "react";

export default function SettingsDialog({
  open,
  onOpenChange,
  commission,
  setCommission,
  acquiring,
  setAcquiring,
  fx,
  setFx,
  lastmileRate,
  setLastmileRate,
  lastmileMin,
  setLastmileMin,
  lastmileMax,
  setLastmileMax,
  fxIncludeIntl,
  setFxIncludeIntl,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  commission: number; setCommission: (v: number) => void;
  acquiring: number; setAcquiring: (v: number) => void;
  fx: number; setFx: (v: number) => void;
  lastmileRate: number; setLastmileRate: (v: number) => void;
  lastmileMin: number; setLastmileMin: (v: number) => void;
  lastmileMax: number; setLastmileMax: (v: number) => void;
  fxIncludeIntl: boolean; setFxIncludeIntl: (v: boolean) => void;
}) {
  // 本地字符串态：允许中间态为空
  const [commissionInput, setCommissionInput] = React.useState<string | null>(null);
  const [acquiringInput, setAcquiringInput] = React.useState<string | null>(null);
  const [fxInput, setFxInput] = React.useState<string | null>(null);
  const [lastmileRateInput, setLastmileRateInput] = React.useState<string | null>(null);
  const [lastmileMinInput, setLastmileMinInput] = React.useState<string | null>(null);
  const [lastmileMaxInput, setLastmileMaxInput] = React.useState<string | null>(null);

  // 当弹窗打开或外部值变化时，重置本地输入（避免保留过期中间态）
  React.useEffect(() => {
    setCommissionInput(null);
    setAcquiringInput(null);
    setFxInput(null);
    setLastmileRateInput(null);
    setLastmileMinInput(null);
    setLastmileMaxInput(null);
  }, [open, commission, acquiring, fx, lastmileRate, lastmileMin, lastmileMax]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>更多设置</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="fee-commission">平台佣金(α)</Label>
              <div className="relative">
                <Input
                  id="fee-commission"
                  type="number"
                  step="0.01"
                  className="pr-8"
                  value={commissionInput ?? String(Math.round(commission * 10000) / 100)}
                  onChange={(e) => setCommissionInput(e.target.value)}
                  onBlur={() => {
                    if (commissionInput === null) return;
                    const v = Number(commissionInput);
                    setCommission(!Number.isNaN(v) ? v / 100 : 0);
                    setCommissionInput(null);
                  }}
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div>
              <Label htmlFor="fee-acq">银行收单费(β)</Label>
              <div className="relative">
                <Input
                  id="fee-acq"
                  type="number"
                  step="0.01"
                  className="pr-8"
                  value={acquiringInput ?? String(Math.round(acquiring * 10000) / 100)}
                  onChange={(e) => setAcquiringInput(e.target.value)}
                  onBlur={() => {
                    if (acquiringInput === null) return;
                    const v = Number(acquiringInput);
                    setAcquiring(!Number.isNaN(v) ? v / 100 : 0);
                    setAcquiringInput(null);
                  }}
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div>
              <Label htmlFor="fee-fx">货币转换费(γ)</Label>
              <div className="relative">
                <Input
                  id="fee-fx"
                  type="number"
                  step="0.01"
                  className="pr-8"
                  value={fxInput ?? String(Math.round(fx * 10000) / 100)}
                  onChange={(e) => setFxInput(e.target.value)}
                  onBlur={() => {
                    if (fxInput === null) return;
                    const v = Number(fxInput);
                    setFx(!Number.isNaN(v) ? v / 100 : 0);
                    setFxInput(null);
                  }}
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div>
              <Label htmlFor="lm-rate">尾城配送费比例(η)</Label>
              <div className="relative">
                <Input
                  id="lm-rate"
                  type="number"
                  step="0.01"
                  className="pr-8"
                  value={lastmileRateInput ?? String(Math.round(lastmileRate * 10000) / 100)}
                  onChange={(e) => setLastmileRateInput(e.target.value)}
                  onBlur={() => {
                    if (lastmileRateInput === null) return;
                    const v = Number(lastmileRateInput);
                    setLastmileRate(!Number.isNaN(v) ? v / 100 : 0);
                    setLastmileRateInput(null);
                  }}
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div>
              <Label htmlFor="lm-min">尾城配送费 Min（RUB）</Label>
              <Input
                id="lm-min"
                type="number"
                value={lastmileMinInput ?? String(lastmileMin)}
                onChange={(e) => setLastmileMinInput(e.target.value)}
                onBlur={() => {
                  if (lastmileMinInput === null) return;
                  const v = Number(lastmileMinInput);
                  setLastmileMin(!Number.isNaN(v) ? v : 0);
                  setLastmileMinInput(null);
                }}
              />
            </div>
            <div>
              <Label htmlFor="lm-max">尾城配送费 Max（RUB）</Label>
              <Input
                id="lm-max"
                type="number"
                value={lastmileMaxInput ?? String(lastmileMax)}
                onChange={(e) => setLastmileMaxInput(e.target.value)}
                onBlur={() => {
                  if (lastmileMaxInput === null) return;
                  const v = Number(lastmileMaxInput);
                  setLastmileMax(!Number.isNaN(v) ? v : 0);
                  setLastmileMaxInput(null);
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input id="fxIntl" type="checkbox" className="h-4 w-4" checked={fxIncludeIntl} onChange={(e)=>setFxIncludeIntl(e.target.checked)} />
            <label htmlFor="fxIntl">货币转换费对“含国际物流费的回款基数”计提</label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={()=>onOpenChange(false)}>完成</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
