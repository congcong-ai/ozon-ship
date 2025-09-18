"use client";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ResultItem } from "@/types/ozon";
import { carrierName } from "@/lib/carrier_names";
import { useMemo, useState } from "react";
import { Info } from "lucide-react";

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
  onOpenSettings,
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
  onOpenSettings?: () => void;
}) {
  const platformPayoutRub = useMemo(() => {
    if (!item) return 0;
    return (
      (item.price_rub || 0) -
      (item.breakdown?.commission_rub || 0) -
      (item.breakdown?.acquiring_rub || 0) -
      (item.breakdown?.intl_logistics_rub || 0) -
      (item.breakdown?.last_mile_rub || 0)
    );
  }, [item?.price_rub, item?.breakdown.commission_rub, item?.breakdown.acquiring_rub, item?.breakdown.intl_logistics_rub, item?.breakdown.last_mile_rub]);

  const priceCny = useMemo(() => {
    if (!item || !(rubPerCny && rubPerCny > 0)) return 0;
    return item.price_rub / rubPerCny;
  }, [item?.price_rub, rubPerCny]);

  const saleMargin = useMemo(() => {
    const profit = item?.breakdown?.profit_cny ?? 0;
    return priceCny > 0 ? profit / priceCny : 0;
  }, [priceCny, item?.breakdown.profit_cny]);

  const [openInfo, setOpenInfo] = useState<{ [k: string]: boolean }>({});
  const toggle = (k: string) => setOpenInfo((s) => ({ ...s, [k]: !s[k] }));
  const allKeys = ["commission","acquiring","intl","last_mile","fx","platform","margin","sale_margin"] as const;
  const allOpen = allKeys.every((k) => !!openInfo[k]);
  const setAllOpen = (v: boolean) => setOpenInfo(Object.fromEntries(allKeys.map(k => [k, v])) as any);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>方案详情</DialogTitle>
        </DialogHeader>
        {item ? (
          <div className="text-sm space-y-2">
            <div className="font-medium">{carrierName(String(item.carrier))} / {item.tier} / {item.delivery === 'door' ? '上门配送' : '取货点'} · 组 {item.group}</div>
            <div className="flex items-center justify-end -mb-1">
              <button type="button" className="text-xs text-blue-600 hover:underline" onClick={()=> setAllOpen(!allOpen)}>
                {allOpen ? "收起全部" : "展开全部"}
              </button>
            </div>
            <div className="grid grid-cols-[3fr_7fr] gap-x-4 gap-y-1 mt-1">
              <span>售价：</span>
              <span>₽ {item.price_rub.toFixed(2)} / ¥ {rubPerCny ? (item.price_rub / rubPerCny).toFixed(2) : '-'}</span>

              <span>平台佣金：</span>
              <span className="flex items-center gap-1">
                <span>₽ {item.breakdown.commission_rub.toFixed(2)} / ¥ {rubPerCny ? (item.breakdown.commission_rub / rubPerCny).toFixed(2) : '-'}</span>
                <button type="button" aria-label="查看平台佣金说明" onClick={() => toggle('commission')} className="text-slate-400 hover:text-slate-600">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </span>
              {openInfo['commission'] && (
                <>
                  <span></span>
                  <span className="text-xs text-muted-foreground">费率：{typeof commission === 'number' ? `${(commission * 100).toFixed(2)}%` : '-'} {onOpenSettings ? (<button className="ml-2 text-blue-600 hover:underline" onClick={onOpenSettings}>设置</button>) : null}</span>
                </>
              )}

              <span>银行收单费：</span>
              <span className="flex items-center gap-1">
                <span>₽ {item.breakdown.acquiring_rub.toFixed(2)} / ¥ {rubPerCny ? (item.breakdown.acquiring_rub / rubPerCny).toFixed(2) : '-'}</span>
                <button type="button" aria-label="查看银行收单费说明" onClick={() => toggle('acquiring')} className="text-slate-400 hover:text-slate-600">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </span>
              {openInfo['acquiring'] && (
                <>
                  <span></span>
                  <span className="text-xs text-muted-foreground">费率：{typeof acquiring === 'number' ? `${(acquiring * 100).toFixed(2)}%` : '-'} {onOpenSettings ? (<button className="ml-2 text-blue-600 hover:underline" onClick={onOpenSettings}>设置</button>) : null}</span>
                </>
              )}

              <span>国际物流费：</span>
              <span className="flex items-center gap-1">
                <span>₽ {item.breakdown.intl_logistics_rub.toFixed(2)} / ¥ {rubPerCny ? (item.breakdown.intl_logistics_rub / rubPerCny).toFixed(2) : '-'}</span>
                {item.pricing ? (
                  <button type="button" aria-label="查看国际物流费公式" onClick={() => toggle('intl')} className="text-slate-400 hover:text-slate-600">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </span>
              {openInfo['intl'] && item.pricing && (
                <>
                  <span></span>
                  <span className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {(() => {
                      if (!(rubPerCny && item.pricing)) return null;
                      const R = rubPerCny; const base = item.pricing.base_cny; const pg = item.pricing.per_gram_cny;
                      const wb = (pg > 0 && R > 0) ? Math.max(0, (item.breakdown.intl_logistics_rub / R - base) / pg) : NaN;
                      const wbTxt = isFinite(wb) ? wb.toFixed(0) : "?";
                      const r6 = isFinite(R) ? R.toFixed(6) : "-";
                      const iRub = item.breakdown.intl_logistics_rub.toFixed(2);
                      return (
                        <>
                          公式： (¥ {base.toFixed(2)} + ¥ {pg.toFixed(4)} × 计费重量[g]) × 汇率{"\n"}
                          ₽ {iRub} = (¥ {base.toFixed(2)} + ¥ {pg.toFixed(4)} × 计费重量[g]) × 汇率 = （¥ {base.toFixed(2)} + ¥ {pg.toFixed(4)}*{wbTxt} g） * {r6}
                        </>
                      );
                    })()}
                  </span>
                </>
              )}

              <span>尾城配送费：</span>
              <span className="flex items-center gap-1">
                <span>₽ {item.breakdown.last_mile_rub.toFixed(2)} / ¥ {rubPerCny ? (item.breakdown.last_mile_rub / rubPerCny).toFixed(2) : '-'}</span>
                {last_mile ? (
                  <button type="button" aria-label="查看尾城配送费说明" onClick={() => toggle('last_mile')} className="text-slate-400 hover:text-slate-600">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </span>
              {openInfo['last_mile'] && last_mile && (
                <>
                  <span></span>
                  <span className="text-xs text-muted-foreground">费率：{(last_mile.rate * 100).toFixed(2)}%，Min ₽ {last_mile.min_rub}，Max ₽ {last_mile.max_rub} {onOpenSettings ? (<button className="ml-2 text-blue-600 hover:underline" onClick={onOpenSettings}>设置</button>) : null}</span>
                </>
              )}

              <span>平台回款：</span>
              <span className="flex items-center gap-1">
                <span>₽ {platformPayoutRub.toFixed(2)} / ¥ {rubPerCny ? (platformPayoutRub / rubPerCny).toFixed(2) : '-'}</span>
                <button type="button" aria-label="查看平台回款公式" onClick={() => toggle('platform')} className="text-slate-400 hover:text-slate-600">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </span>
              {openInfo['platform'] && (
                <>
                  <span></span>
                  <span className="text-xs text-muted-foreground whitespace-pre-wrap">
                    公式：售价 - 平台佣金 - 银行收单费 - 国际物流费 - 尾城配送费{"\n"}
                    ₽ {platformPayoutRub.toFixed(2)} = ₽ {item.price_rub.toFixed(2)} - ₽ {item.breakdown.commission_rub.toFixed(2)} - ₽ {item.breakdown.acquiring_rub.toFixed(2)} - ₽ {item.breakdown.intl_logistics_rub.toFixed(2)} - ₽ {item.breakdown.last_mile_rub.toFixed(2)}
                  </span>
                </>
              )}

              <span>货币转换费：</span>
              <span className="flex items-center gap-1">
                <span>₽ {item.breakdown.fx_fee_rub.toFixed(2)} / ¥ {rubPerCny ? (item.breakdown.fx_fee_rub / rubPerCny).toFixed(2) : '-'}</span>
                {typeof fx === 'number' ? (
                  <button type="button" aria-label="查看货币转换费说明" onClick={() => toggle('fx')} className="text-slate-400 hover:text-slate-600">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </span>
              {openInfo['fx'] && typeof fx === 'number' && (
                <>
                  <span></span>
                  <span className="text-xs text-muted-foreground">费率：{(fx * 100).toFixed(2)}% {onOpenSettings ? (<button className="ml-2 text-blue-600 hover:underline" onClick={onOpenSettings}>设置</button>) : null}</span>
                </>
              )}

              <span>最终回款：</span>
              <span>¥ {rubPerCny ? (item.breakdown.receipt_rub / rubPerCny).toFixed(2) : '-'} / ₽ {item.breakdown.receipt_rub.toFixed(2)}</span>

              {typeof costCny === 'number' ? (<>
                <span>商品成本：</span>
                <span>¥ {costCny.toFixed(2)} / ₽ {rubPerCny ? (costCny * rubPerCny).toFixed(2) : '-'}</span>
              </>) : null}

              <span>利润：</span>
              <span>¥ {item.breakdown.profit_cny.toFixed(2)} / ₽ {rubPerCny ? (item.breakdown.profit_cny * rubPerCny).toFixed(2) : '-'}</span>
              <span>利润率：</span>
              <span className="flex items-center gap-1">
                <span>{(item.breakdown.margin*100).toFixed(2)}%</span>
                <button type="button" aria-label="查看利润率公式" onClick={() => toggle('margin')} className="text-slate-400 hover:text-slate-600">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </span>
              {openInfo['margin'] && (
                <>
                  <span></span>
                  <span className="text-xs text-muted-foreground">公式：利润(CNY) ÷ 成本(CNY) = {(item.breakdown.margin*100).toFixed(2)}% = ¥ {item.breakdown.profit_cny.toFixed(2)} ÷ ¥ {(typeof costCny === 'number' ? costCny.toFixed(2) : '-')}</span>
                </>
              )}
              <span>销售利润率：</span>
              <span className="flex items-center gap-1">
                <span>{(saleMargin*100).toFixed(2)}%</span>
                <button type="button" aria-label="查看销售利润率公式" onClick={() => toggle('sale_margin')} className="text-slate-400 hover:text-slate-600">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </span>
              {openInfo['sale_margin'] && (
                <>
                  <span></span>
                  <span className="text-xs text-muted-foreground">公式：利润(CNY) ÷ 售价(CNY) = {(saleMargin*100).toFixed(2)}% = ¥ {item.breakdown.profit_cny.toFixed(2)} ÷ ¥ {priceCny.toFixed(2)}</span>
                </>
              )}
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
