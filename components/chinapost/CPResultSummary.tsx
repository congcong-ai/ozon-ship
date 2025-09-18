"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Info } from "lucide-react";
import type { ServiceWithComputed } from "@/types/shipping";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function CPResultSummary({
  service,
  priceRub,
  rubPerCny,
  commission,
  acquiring,
  fx,
  last_mile,
  costCny,
  fxIncludeIntl = true,
  onOpenSettings,
  weightG,
}: {
  service: ServiceWithComputed | null;
  priceRub: number;
  rubPerCny: number;
  commission: number;
  acquiring: number;
  fx: number;
  last_mile: { rate: number; min_rub: number; max_rub: number };
  costCny: number;
  fxIncludeIntl?: boolean;
  onOpenSettings?: () => void;
  weightG?: number;
}) {
  const intlCny = (service && service.available && typeof service.totalPriceCNY === 'number') ? service.totalPriceCNY : 0;
  const intlRub = intlCny * (rubPerCny > 0 ? rubPerCny : 0);

  const commission_rub = priceRub * commission;
  const acquiring_rub = priceRub * acquiring;
  const last_mile_rub = clamp(priceRub * last_mile.rate, last_mile.min_rub, last_mile.max_rub);

  const platform_payout_rub = useMemo(() => {
    if (!(rubPerCny > 0)) return 0;
    const base = priceRub - commission_rub - acquiring_rub - last_mile_rub - intlRub;
    return base;
  }, [priceRub, commission_rub, acquiring_rub, last_mile_rub, intlRub, rubPerCny]);

  const { receipt_rub, fx_fee_rub } = useMemo(() => {
    if (!(rubPerCny > 0)) return { receipt_rub: 0, fx_fee_rub: 0 };
    if (fxIncludeIntl) {
      const fx_fee = platform_payout_rub * fx;
      return { receipt_rub: platform_payout_rub - fx_fee, fx_fee_rub: fx_fee };
    } else {
      const baseNon = priceRub - commission_rub - acquiring_rub - last_mile_rub;
      const fx_fee = baseNon * fx;
      return { receipt_rub: baseNon - fx_fee - intlRub, fx_fee_rub: fx_fee };
    }
  }, [priceRub, commission_rub, acquiring_rub, last_mile_rub, intlRub, fx, fxIncludeIntl, rubPerCny, platform_payout_rub]);

  const profit_cny = useMemo(() => (rubPerCny > 0 ? receipt_rub / rubPerCny - (costCny || 0) : 0), [receipt_rub, rubPerCny, costCny]);
  const margin = useMemo(() => (costCny > 0 ? profit_cny / costCny : (profit_cny > 0 ? Infinity : -Infinity)), [profit_cny, costCny]);

  const salePriceCny = useMemo(() => (rubPerCny > 0 ? priceRub / rubPerCny : 0), [priceRub, rubPerCny]);
  const saleMargin = useMemo(() => (salePriceCny > 0 ? profit_cny / salePriceCny : 0), [salePriceCny, profit_cny]);

  const [openInfo, setOpenInfo] = useState<{ [k: string]: boolean }>({});
  const toggle = (k: string) => setOpenInfo((s) => ({ ...s, [k]: !s[k] }));
  const allKeys = ["commission","acquiring","intl","last_mile","fx","platform","margin","sale_margin"] as const;
  const allOpen = allKeys.every((k) => !!openInfo[k]);
  const setAllOpen = (v: boolean) => setOpenInfo(Object.fromEntries(allKeys.map(k => [k, v])) as any);

  function buildIntlFormula(): string {
    if (!service) return "—";
    const p: any = service.pricing;
    const g = Math.max(0, Number(weightG ?? 0));
    const cny = intlCny;
    const rub = intlRub;
    if (!p) return `￥${cny.toFixed(2)}（₽ ${rub.toFixed(2)}）`;
    if (p.type === "base_plus_per_gram") {
      return `总价 = 基础费￥${p.base_cny} + (重量g × ￥${p.per_gram_cny}/g) = ￥${p.base_cny} + ${g}*${p.per_gram_cny} = ￥${cny.toFixed(2)} （₽ ${rub.toFixed(2)}）`;
    }
    if (p.type === "registration_plus_per_gram") {
      return `总价 = 挂号费￥${p.registration_fee_cny} + (重量g × ￥${p.per_gram_cny}/g) = ￥${p.registration_fee_cny} + ${g}*${p.per_gram_cny} = ￥${cny.toFixed(2)} （₽ ${rub.toFixed(2)}）`;
    }
    if (p.type === "first_weight_plus_additional") {
      if (g <= p.first_weight_g) {
        return `总价 = ￥${p.first_weight_fee_cny}（≤ ${p.first_weight_g}g） = ￥${cny.toFixed(2)} （₽ ${rub.toFixed(2)}）`;
      }
      const steps = Math.ceil((Math.max(0, g - p.first_weight_g)) / p.additional_step_g);
      return `总价 = ￥${p.first_weight_fee_cny} + ⌈(${g}-${p.first_weight_g})/${p.additional_step_g}⌉ × ￥${p.additional_step_fee_cny} = ￥${p.first_weight_fee_cny} + ${steps}×${p.additional_step_fee_cny} = ￥${cny.toFixed(2)} （₽ ${rub.toFixed(2)}）`;
    }
    return `￥${cny.toFixed(2)}（₽ ${rub.toFixed(2)}）`;
  }

  if (!service || !service.available || typeof service.totalPriceCNY !== 'number') {
    return (
      <Card className="rounded-lg border p-4 space-y-2">
        <div className="text-sm text-muted-foreground">{service ? (service.reason || "当前渠道不可用") : "请选择一个可用渠道"}</div>
      </Card>
    );
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h2 className="font-medium">利润详请</h2>
      <div className="space-y-2 text-sm">
        <div>
          当前售价：<span className="font-semibold">₽ {priceRub.toFixed(2)}</span>
          <span className="text-muted-foreground"> / ¥ {(priceRub / (rubPerCny || 1)).toFixed(2)}</span>
        </div>
        <div>
          利润率：{(margin * 100).toFixed(2)}% · 利润：₽ {(profit_cny * rubPerCny).toFixed(2)} / ¥ {profit_cny.toFixed(2)}
        </div>
        <div>
          渠道：{service.name}（{service.group}） · 国际物流费（中国邮政）：
          ₽ {intlRub.toFixed(2)} / ¥ {intlCny.toFixed(2)}
        </div>
        <div className="flex items-center justify-end -mb-1">
          <button type="button" className="text-xs text-blue-600 hover:underline" onClick={()=> setAllOpen(!allOpen)}>
            {allOpen ? "收起全部" : "展开全部"}
          </button>
        </div>
        <div className="mt-1 grid grid-cols-[3fr_7fr] gap-x-4 gap-y-1">
          <span>平台佣金：</span>
          <span className="flex items-center gap-1">
            <span>₽ {commission_rub.toFixed(2)} / ¥ {(commission_rub / (rubPerCny || 1)).toFixed(2)}</span>
            <button type="button" aria-label="查看平台佣金说明" onClick={() => toggle('commission')} className="text-slate-400 hover:text-slate-600">
              <Info className="h-3.5 w-3.5" />
            </button>
          </span>
          {openInfo['commission'] && (
            <>
              <span></span>
              <span className="text-xs text-muted-foreground">费率：{(commission * 100).toFixed(2)}% {onOpenSettings ? (<button className="ml-2 text-blue-600 hover:underline" onClick={onOpenSettings}>设置</button>) : null}</span>
            </>
          )}

          <span>银行收单费：</span>
          <span className="flex items-center gap-1">
            <span>₽ {acquiring_rub.toFixed(2)} / ¥ {(acquiring_rub / (rubPerCny || 1)).toFixed(2)}</span>
            <button type="button" aria-label="查看银行收单费说明" onClick={() => toggle('acquiring')} className="text-slate-400 hover:text-slate-600">
              <Info className="h-3.5 w-3.5" />
            </button>
          </span>
          {openInfo['acquiring'] && (
            <>
              <span></span>
              <span className="text-xs text-muted-foreground">费率：{(acquiring * 100).toFixed(2)}% {onOpenSettings ? (<button className="ml-2 text-blue-600 hover:underline" onClick={onOpenSettings}>设置</button>) : null}</span>
            </>
          )}

          <span>国际物流费：</span>
          <span className="flex items-center gap-1">
            <span>₽ {intlRub.toFixed(2)} / ¥ {intlCny.toFixed(2)}</span>
            <button type="button" aria-label="查看国际物流费说明" onClick={() => toggle('intl')} className="text-slate-400 hover:text-slate-600">
              <Info className="h-3.5 w-3.5" />
            </button>
          </span>
          <span></span>
          <span className="text-xs text-muted-foreground whitespace-pre-wrap">计费：{buildIntlFormula()}</span>

          <span>尾城配送费：</span>
          <span className="flex items-center gap-1">
            <span>₽ {last_mile_rub.toFixed(2)} / ¥ {(last_mile_rub / (rubPerCny || 1)).toFixed(2)}</span>
            <button type="button" aria-label="查看尾城配送费说明" onClick={() => toggle('last_mile')} className="text-slate-400 hover:text-slate-600">
              <Info className="h-3.5 w-3.5" />
            </button>
          </span>
          {openInfo['last_mile'] && (
            <>
              <span></span>
              <span className="text-xs text-muted-foreground">费率：{(last_mile.rate * 100).toFixed(2)}%，Min ₽ {last_mile.min_rub}，Max ₽ {last_mile.max_rub} {onOpenSettings ? (<button className="ml-2 text-blue-600 hover:underline" onClick={onOpenSettings}>设置</button>) : null}</span>
            </>
          )}

          <span>货币转换费：</span>
          <span className="flex items-center gap-1">
            <span>₽ {fx_fee_rub.toFixed(2)} / ¥ {(fx_fee_rub / (rubPerCny || 1)).toFixed(2)}</span>
            <button type="button" aria-label="查看货币转换费说明" onClick={() => toggle('fx')} className="text-slate-400 hover:text-slate-600">
              <Info className="h-3.5 w-3.5" />
            </button>
          </span>
          {openInfo['fx'] && (
            <>
              <span></span>
              <span className="text-xs text-muted-foreground">费率：{(fx * 100).toFixed(2)}%（{fxIncludeIntl ? "含" : "不含"}国际物流费基数） {onOpenSettings ? (<button className="ml-2 text-blue-600 hover:underline" onClick={onOpenSettings}>设置</button>) : null}</span>
            </>
          )}

          <span>平台回款：</span>
          <span className="flex items-center gap-1">
            <span>₽ {platform_payout_rub.toFixed(2)} / ¥ {(platform_payout_rub / (rubPerCny || 1)).toFixed(2)}</span>
            <button type="button" aria-label="查看平台回款公式" onClick={() => toggle('platform')} className="text-slate-400 hover:text-slate-600">
              <Info className="h-3.5 w-3.5" />
            </button>
          </span>
          {openInfo['platform'] && (
            <>
              <span></span>
              <span className="text-xs text-muted-foreground whitespace-pre-wrap">
                公式：售价 - 平台佣金 - 银行收单费 - 国际物流费 - 尾城配送费
              </span>
            </>
          )}

          <span>最终回款：</span>
          <span>₽ {receipt_rub.toFixed(2)} / ¥ {(receipt_rub / (rubPerCny || 1)).toFixed(2)}</span>

          <span>商品成本：</span>
          <span>₽ {((costCny || 0) * (rubPerCny || 1)).toFixed(2)} / ¥ {Number(costCny || 0).toFixed(2)}</span>

          <span>利润：</span>
          <span>₽ {(profit_cny * (rubPerCny || 1)).toFixed(2)} / ¥ {profit_cny.toFixed(2)}</span>

          <span>利润率：</span>
          <span className="flex items-center gap-1">
            <span>{(margin * 100).toFixed(2)}%</span>
            <button type="button" aria-label="查看利润率公式" onClick={() => toggle('margin')} className="text-slate-400 hover:text-slate-600">
              <Info className="h-3.5 w-3.5" />
            </button>
          </span>
          {openInfo['margin'] && (
            <>
              <span></span>
              <span className="text-xs text-muted-foreground">公式：利润(CNY) ÷ 成本(CNY) = {(margin * 100).toFixed(2)}% = ¥ {profit_cny.toFixed(2)} ÷ ¥ {Number(costCny || 0).toFixed(2)}</span>
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
              <span className="text-xs text-muted-foreground">公式：利润(CNY) ÷ 售价(CNY) = {(saleMargin * 100).toFixed(2)}% = ¥ {profit_cny.toFixed(2)} ÷ ¥ {salePriceCny.toFixed(2)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
