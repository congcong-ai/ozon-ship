"use client";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
                <Input id="fee-commission" type="number" step="0.01" className="pr-8" value={Math.round(commission*10000)/100} onChange={(e)=>setCommission((Number(e.target.value)||0)/100)} />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div>
              <Label htmlFor="fee-acq">银行收单费(β)</Label>
              <div className="relative">
                <Input id="fee-acq" type="number" step="0.01" className="pr-8" value={Math.round(acquiring*10000)/100} onChange={(e)=>setAcquiring((Number(e.target.value)||0)/100)} />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div>
              <Label htmlFor="fee-fx">货币转换费(γ)</Label>
              <div className="relative">
                <Input id="fee-fx" type="number" step="0.01" className="pr-8" value={Math.round(fx*10000)/100} onChange={(e)=>setFx((Number(e.target.value)||0)/100)} />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div>
              <Label htmlFor="lm-rate">尾城配送费比例(η)</Label>
              <div className="relative">
                <Input id="lm-rate" type="number" step="0.01" className="pr-8" value={Math.round(lastmileRate*10000)/100} onChange={(e)=>setLastmileRate((Number(e.target.value)||0)/100)} />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div>
              <Label htmlFor="lm-min">尾城配送费 Min（RUB）</Label>
              <Input id="lm-min" type="number" value={lastmileMin} onChange={(e)=>setLastmileMin(Number(e.target.value)||0)} />
            </div>
            <div>
              <Label htmlFor="lm-max">尾城配送费 Max（RUB）</Label>
              <Input id="lm-max" type="number" value={lastmileMax} onChange={(e)=>setLastmileMax(Number(e.target.value)||0)} />
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
