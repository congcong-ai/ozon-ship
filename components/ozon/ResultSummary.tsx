"use client";

import { Card } from "@/components/ui/card";
import { carrierName } from "@/lib/carrier_names";
import type { ResultItem } from "@/types/ozon";
import { useMemo, useState } from "react";
import { Info } from "lucide-react";

export default function ResultSummary({
  currentItem,
  best,
  maxMargin,
  rubPerCny,
  loadingBest,
  costCny,
  commission,
  acquiring,
  fx,
  last_mile,
  onOpenSettings,
}: {
  currentItem: ResultItem | null;
  best: ResultItem | null;
  maxMargin: number;
  rubPerCny: number;
  loadingBest?: boolean;
  costCny?: number;
  commission?: number;
  acquiring?: number;
  fx?: number;
  last_mile?: { rate: number; min_rub: number; max_rub: number };
  onOpenSettings?: () => void;
}) {
  const show = currentItem || best;

  if (!show) {
    if (loadingBest) {
      return (
        <Card className="rounded-lg border p-4 space-y-3">
          <p className="text-sm text-muted-foreground">正在加载推荐结果…（首次将预热全量承运商）</p>
        </Card>
      );
    }
    return (
      <Card className="rounded-lg border p-4 space-y-3">
        <p className="text-sm text-muted-foreground">点击“计算最优方案”。若无推荐，可能是利润率约束过紧或无可用费率。</p>
      </Card>
    );
  }

  function deliveryZh(d: ResultItem["delivery"]) {
    return d === "door" ? "上门配送" : "取货点";
  }

  const m = useMemo(
    () => ({ eta_days: show?.eta_days, battery_allowed: show?.battery_allowed }),
    [show?.eta_days, show?.battery_allowed]
  );

  function batteryBadge(v?: boolean) {
    if (v === true)
      return (
        <span className="inline-flex items-center rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700">
          电池 允许
        </span>
      );
    if (v === false)
      return (
        <span className="inline-flex items-center rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700">
          电池 不允许
        </span>
      );
    return (
      <span className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-600">
        电池 未知
      </span>
    );
  }

  const platformPayoutRub = useMemo(() => {
    if (!show) return 0;
    return (
      (show.price_rub || 0) -
      (show.breakdown?.commission_rub || 0) -
      (show.breakdown?.acquiring_rub || 0) -
      (show.breakdown?.intl_logistics_rub || 0) -
      (show.breakdown?.last_mile_rub || 0)
    );
  }, [show?.price_rub, show?.breakdown.commission_rub, show?.breakdown.acquiring_rub, show?.breakdown.intl_logistics_rub, show?.breakdown.last_mile_rub]);

  const priceCny = useMemo(() => {
    if (!show || !(rubPerCny > 0)) return 0;
    return show.price_rub / rubPerCny;
  }, [show?.price_rub, rubPerCny]);

  const saleMargin = useMemo(() => {
    const profit = show?.breakdown?.profit_cny ?? 0;
    return priceCny > 0 ? profit / priceCny : 0;
  }, [priceCny, show?.breakdown.profit_cny]);

  const [openInfo, setOpenInfo] = useState<{ [k: string]: boolean }>({});
  const toggle = (k: string) => setOpenInfo((s) => ({ ...s, [k]: !s[k] }));
  const allKeys = ["commission","acquiring","intl","last_mile","fx","platform","margin","sale_margin"] as const;
  const allOpen = allKeys.every((k) => !!openInfo[k]);
  const setAllOpen = (v: boolean) => setOpenInfo(Object.fromEntries(allKeys.map(k => [k, v])) as any);

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h2 className="font-medium">{currentItem ? "当前售价详情" : "推荐结果"}</h2>
      <div className="space-y-2 text-sm">
        <div>
          {currentItem ? "当前售价：" : "推荐售价："}
          <span className="font-semibold">₽ {show.price_rub.toFixed(2)}</span>
          <span className="text-muted-foreground"> / ¥ {(show.price_rub / rubPerCny).toFixed(2)}</span>
        </div>
        <div>
          利润率：{(show.breakdown.margin * 100).toFixed(2)}% · 利润：₽ {(show.breakdown.profit_cny * rubPerCny).toFixed(2)} / ¥ {show.breakdown.profit_cny.toFixed(2)}
        </div>
        <div>
          货件分组：{show.group} · 国际物流费（{carrierName(String(show.carrier))} / {show.tier} / {deliveryZh(show.delivery)}）：
          ₽ {show.breakdown.intl_logistics_rub.toFixed(2)} / ¥ {(show.breakdown.intl_logistics_rub / rubPerCny).toFixed(2)}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span>时效：{m?.eta_days ?? "-"}天</span>
          {batteryBadge(m?.battery_allowed)}
        </div>
        {show.safe_range && (
          <div>
            安全区间：₽ {show.safe_range.from} ~ ₽ {show.safe_range.to}
          </div>
        )}
        {show.note && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            {show.note}
          </div>
        )}
        {typeof maxMargin === "number" && maxMargin > 0 && show.breakdown.margin > maxMargin && (
          <div className="text-xs text-amber-600">
            提示：该方案利润率 {(show.breakdown.margin * 100).toFixed(2)}% 超过上限 {(maxMargin * 100).toFixed(0)}%，已按未加盖帽排序返回。可调低上限或忽略此提示。
          </div>
        )}
        <div className="flex items-center justify-end -mb-1">
          <button type="button" className="text-xs text-blue-600 hover:underline" onClick={()=> setAllOpen(!allOpen)}>
            {allOpen ? "收起全部" : "展开全部"}
          </button>
        </div>
        <div className="mt-1 grid grid-cols-[3fr_7fr] gap-x-4 gap-y-1">
          <span>平台佣金：</span>
          <span className="flex items-center gap-1">
            <span>₽ {show.breakdown.commission_rub.toFixed(2)} / ¥ {(show.breakdown.commission_rub / rubPerCny).toFixed(2)}</span>
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
            <span>₽ {show.breakdown.acquiring_rub.toFixed(2)} / ¥ {(show.breakdown.acquiring_rub / rubPerCny).toFixed(2)}</span>
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
            <span>₽ {show.breakdown.intl_logistics_rub.toFixed(2)} / ¥ {(show.breakdown.intl_logistics_rub / rubPerCny).toFixed(2)}</span>
            {show.pricing ? (
              <button type="button" aria-label="查看国际物流费公式" onClick={() => toggle('intl')} className="text-slate-400 hover:text-slate-600">
                <Info className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </span>
          {openInfo['intl'] && show.pricing && (
            <>
              <span></span>
              <span className="text-xs text-muted-foreground whitespace-pre-wrap">
                {(() => {
                  const R = rubPerCny; const base = show.pricing!.base_cny; const pg = show.pricing!.per_gram_cny;
                  const wb = (pg > 0 && R > 0) ? Math.max(0, (show.breakdown.intl_logistics_rub / R - base) / pg) : NaN;
                  const wbTxt = isFinite(wb) ? wb.toFixed(0) : "?";
                  const r6 = isFinite(R) ? R.toFixed(6) : "-";
                  const iRub = show.breakdown.intl_logistics_rub.toFixed(2);
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
            <span>₽ {show.breakdown.last_mile_rub.toFixed(2)} / ¥ {(show.breakdown.last_mile_rub / rubPerCny).toFixed(2)}</span>
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
          <span>货币转换费：</span>
          <span className="flex items-center gap-1">
            <span>₽ {show.breakdown.fx_fee_rub.toFixed(2)} / ¥ {(show.breakdown.fx_fee_rub / rubPerCny).toFixed(2)}</span>
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
          <span>平台回款：</span>
          <span className="flex items-center gap-1">
            <span>₽ {platformPayoutRub.toFixed(2)} / ¥ {(platformPayoutRub / rubPerCny).toFixed(2)}</span>
            <button type="button" aria-label="查看平台回款公式" onClick={() => toggle('platform')} className="text-slate-400 hover:text-slate-600">
              <Info className="h-3.5 w-3.5" />
            </button>
          </span>
          {openInfo['platform'] && (
            <>
              <span></span>
              <span className="text-xs text-muted-foreground whitespace-pre-wrap">
                公式：售价 - 平台佣金 - 银行收单费 - 国际物流费 - 尾城配送费{"\n"}
                ₽ {platformPayoutRub.toFixed(2)} = ₽ {show.price_rub.toFixed(2)} - ₽ {show.breakdown.commission_rub.toFixed(2)} - ₽ {show.breakdown.acquiring_rub.toFixed(2)} - ₽ {show.breakdown.intl_logistics_rub.toFixed(2)} - ₽ {show.breakdown.last_mile_rub.toFixed(2)}
              </span>
            </>
          )}
          <span>最终回款：</span>
          <span>¥ {(show.breakdown.receipt_rub / rubPerCny).toFixed(2)} / ₽ {show.breakdown.receipt_rub.toFixed(2)}</span>
          {typeof costCny === 'number' ? (
            <>
              <span>商品成本：</span>
              <span>¥ {costCny.toFixed(2)} / ₽ {(costCny * rubPerCny).toFixed(2)}</span>
            </>
          ) : null}
          <span>利润(CNY)：</span>
          <span>¥ {show.breakdown.profit_cny.toFixed(2)} / ₽ {(show.breakdown.profit_cny * rubPerCny).toFixed(2)}</span>
          <span>利润率：</span>
          <span className="flex items-center gap-1">
            <span>{(show.breakdown.margin * 100).toFixed(2)}%</span>
            <button type="button" aria-label="查看利润率公式" onClick={() => toggle('margin')} className="text-slate-400 hover:text-slate-600">
              <Info className="h-3.5 w-3.5" />
            </button>
          </span>
          {openInfo['margin'] && (
            <>
              <span></span>
              <span className="text-xs text-muted-foreground">公式：利润(CNY) ÷ 成本(CNY) = {(show.breakdown.margin * 100).toFixed(2)}% = ¥ {show.breakdown.profit_cny.toFixed(2)} ÷ ¥ {(typeof costCny === 'number' ? costCny.toFixed(2) : '-')}
              </span>
            </>
          )}
          <span>销售利润率：</span>
          <span className="flex items-center gap-1">
            <span>{(saleMargin * 100).toFixed(2)}%</span>
            <button type="button" aria-label="查看销售利润率公式" onClick={() => toggle('sale_margin')} className="text-slate-400 hover:text-slate-600">
              <Info className="h-3.5 w-3.5" />
            </button>
          </span>
          {openInfo['sale_margin'] && (
            <>
              <span></span>
              <span className="text-xs text-muted-foreground">公式：利润(CNY) ÷ 售价(CNY) = {(saleMargin * 100).toFixed(2)}% = ¥ {show.breakdown.profit_cny.toFixed(2)} ÷ ¥ {priceCny.toFixed(2)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}