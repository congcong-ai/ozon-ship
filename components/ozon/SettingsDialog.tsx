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
  rubPerCny,
  setRubPerCny,
  loadingFx,
  fxUpdatedAt,
  fxSource,
  fxError,
  onRefreshFx,
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
  rubPerCny: number; setRubPerCny: (v: number) => void;
  loadingFx: boolean; fxUpdatedAt: string | null; fxSource: string | null; fxError: string | null;
  onRefreshFx: () => void | Promise<void>;
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
              <Input id="fee-commission" type="number" step="0.001" value={commission} onChange={(e)=>setCommission(Number(e.target.value)||0)} />
            </div>
            <div>
              <Label htmlFor="fee-acq">收单费(β)</Label>
              <Input id="fee-acq" type="number" step="0.001" value={acquiring} onChange={(e)=>setAcquiring(Number(e.target.value)||0)} />
            </div>
            <div>
              <Label htmlFor="fee-fx">转换费(γ)</Label>
              <Input id="fee-fx" type="number" step="0.001" value={fx} onChange={(e)=>setFx(Number(e.target.value)||0)} />
            </div>
            <div>
              <Label htmlFor="lm-rate">尾城比例(η)</Label>
              <Input id="lm-rate" type="number" step="0.001" value={lastmileRate} onChange={(e)=>setLastmileRate(Number(e.target.value)||0)} />
            </div>
            <div>
              <Label htmlFor="lm-min">尾城Min</Label>
              <Input id="lm-min" type="number" value={lastmileMin} onChange={(e)=>setLastmileMin(Number(e.target.value)||0)} />
            </div>
            <div>
              <Label htmlFor="lm-max">尾城Max</Label>
              <Input id="lm-max" type="number" value={lastmileMax} onChange={(e)=>setLastmileMax(Number(e.target.value)||0)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input id="fxIntl" type="checkbox" className="h-4 w-4" checked={fxIncludeIntl} onChange={(e)=>setFxIncludeIntl(e.target.checked)} />
            <label htmlFor="fxIntl">货币转换费对“含国际物流费的回款基数”计提</label>
          </div>
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label htmlFor="rub-cny">RUB/CNY</Label>
                <Input id="rub-cny" type="number" step="0.001" value={rubPerCny} onChange={(e)=>setRubPerCny(Number(e.target.value)||0)} />
              </div>
              <Button type="button" variant="outline" onClick={onRefreshFx} disabled={loadingFx}>{loadingFx?"刷新中…":"刷新"}</Button>
            </div>
            {fxError ? (
              <p className="text-xs text-red-600">{fxError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">{fxUpdatedAt?`已更新：${fxUpdatedAt}（来源：${fxSource}）`:"首次加载后将显示更新时间与来源"}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={()=>onOpenChange(false)}>完成</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
