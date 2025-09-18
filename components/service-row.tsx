"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { ServiceWithComputed } from "@/types/shipping";

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

export default function ServiceRow({
  service,
  onProfit,
  selected,
  priceRub,
  rubPerCny,
  commission,
  acquiring,
  fx,
  last_mile,
  costCny,
  fxIncludeIntl,
  weightG,
}: {
  service: ServiceWithComputed;
  onProfit?: (s: ServiceWithComputed) => void;
  selected?: boolean;
  priceRub: number;
  rubPerCny: number;
  commission: number;
  acquiring: number;
  fx: number;
  last_mile: { rate: number; min_rub: number; max_rub: number };
  costCny: number;
  fxIncludeIntl?: boolean;
  weightG: number;
}) {
  const [showIntl, setShowIntl] = useState(false);

  const pricingDesc = useMemo(() => formatPricing(service), [service]);

  const mini = useMemo(() => {
    const ok = service.available && typeof service.totalPriceCNY === 'number' && isFinite(priceRub) && priceRub > 0 && rubPerCny > 0;
    if (!ok) return null;
    const intlCny = service.totalPriceCNY!;
    const intlRub = intlCny * rubPerCny;
    const commission_rub = priceRub * commission;
    const acquiring_rub = priceRub * acquiring;
    const last_mile_rub = clamp(priceRub * last_mile.rate, last_mile.min_rub, last_mile.max_rub);
    const payout_base = priceRub - commission_rub - acquiring_rub - last_mile_rub - intlRub;
    const receipt_rub = fxIncludeIntl ? (payout_base * (1 - fx)) : ((priceRub - commission_rub - acquiring_rub - last_mile_rub) * (1 - fx) - intlRub);
    const profit_cny = receipt_rub / rubPerCny - (costCny || 0);
    const margin = (costCny > 0) ? (profit_cny / costCny) : 0;
    const profit_rub = profit_cny * rubPerCny;
    const batteryAllowed = !((service.prohibited || []).some((p) => p.includes("电池")));
    return { intlRub, intlCny, profit_rub, profit_cny, margin, batteryAllowed };
  }, [service.available, service.totalPriceCNY, priceRub, rubPerCny, commission, acquiring, last_mile.rate, last_mile.min_rub, last_mile.max_rub, fx, fxIncludeIntl, costCny]);

  const volRule = service.dimensional_weight_rule?.formula ? `；体积重 = ${service.dimensional_weight_rule.formula}` : "";
  const priceRubVal = useMemo(() => (typeof service.totalPriceCNY === 'number' ? service.totalPriceCNY * rubPerCny : null), [service.totalPriceCNY, rubPerCny]);

  function buildIntlFormula(): string {
    const p: any = service.pricing;
    const intlCny = mini?.intlCny ?? service.totalPriceCNY ?? 0;
    const intlRub = (intlCny || 0) * (rubPerCny || 0);
    if (!p) return "—";
    if (p.type === "base_plus_per_gram") {
      const base = p.base_cny;
      const per = p.per_gram_cny;
      const part = (weightG * per).toFixed(2);
      return `总价 = 基础费￥${base} + (重量g × ￥${per}/g) = ￥${base} + ${weightG}*${per} = ￥${intlCny?.toFixed?.(2) ?? intlCny} （₽ ${intlRub.toFixed(2)}）`;
    }
    if (p.type === "registration_plus_per_gram") {
      const reg = p.registration_fee_cny;
      const per = p.per_gram_cny;
      const part = (weightG * per).toFixed(2);
      return `总价 = 挂号费￥${reg} + (重量g × ￥${per}/g) = ￥${reg} + ${weightG}*${per} = ￥${intlCny?.toFixed?.(2) ?? intlCny} （₽ ${intlRub.toFixed(2)}）`;
    }
    if (p.type === "first_weight_plus_additional") {
      const fw = p.first_weight_g;
      const fwFee = p.first_weight_fee_cny;
      const step = p.additional_step_g;
      const stepFee = p.additional_step_fee_cny;
      if (weightG <= fw) {
        return `总价 = ￥${fwFee}（≤ ${fw}g） = ￥${intlCny?.toFixed?.(2) ?? intlCny} （₽ ${intlRub.toFixed(2)}）`;
      }
      const steps = Math.ceil((Math.max(0, weightG - fw)) / step);
      const add = (steps * stepFee).toFixed(2);
      return `总价 = ￥${fwFee} + ⌈(${weightG}-${fw})/${step}⌉ × ￥${stepFee} = ￥${fwFee} + ${steps}×${stepFee} = ￥${intlCny?.toFixed?.(2) ?? intlCny} （₽ ${intlRub.toFixed(2)}）`;
    }
    return `￥${intlCny?.toFixed?.(2) ?? intlCny} （₽ ${intlRub.toFixed(2)}）`;
  }

  return (
    <div className={`grid grid-cols-[6fr_4fr] gap-3 p-3 ${selected ? 'bg-slate-50' : ''}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-medium leading-tight">{service.name}</h3>
          <span className={`ml-2 font-medium ${service.available ? "text-green-600" : "text-red-600"}`}>{service.available ? "可寄" : "不可寄"}</span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground whitespace-normal break-words">
          {service.reason ? (
            <>
              <div>{service.reason}</div>
            </>
          ) : mini ? (
            <>
              <div className="flex items-center gap-1">
                <span>国际物流费：₽ {mini.intlRub.toFixed(2)} / ¥ {mini.intlCny.toFixed(2)}</span>
                <button type="button" aria-label="查看计费公式" onClick={() => setShowIntl(v=>!v)} className="text-slate-400 hover:text-slate-600">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>
              <div>利润：₽ {mini.profit_rub.toFixed(2)} / ¥ {mini.profit_cny.toFixed(2)} · 利润率 {(mini.margin*100).toFixed(2)}%</div>
              <div>时效：{(service as any).eta_days || "—"} · 电池：{mini.batteryAllowed ? "允许" : "禁止"}</div>
              {showIntl && (
                <div>计费：{buildIntlFormula()} {volRule && `· ${volRule.replace(/^；?/, "")}`}</div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-1">
                <span>{pricingDesc.summary}</span>
                <button type="button" aria-label="查看计费公式" onClick={() => setShowIntl(v=>!v)} className="text-slate-400 hover:text-slate-600">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>
              {showIntl && (
                <div>计费：{buildIntlFormula()} {volRule && `· ${volRule.replace(/^；?/, "")}`}</div>
              )}
            </>
          )}
        </div>
        <div className="mt-2">
          <span className="rounded bg-accent px-1.5 py-0.5 text-xs text-accent-foreground">{service.group}</span>
        </div>
      </div>

      <div className="md:justify-self-end text-right flex flex-col items-end justify-end h-full">
        <div className="text-base md:text-lg font-semibold whitespace-nowrap tracking-tight">
          <span>{priceRubVal != null ? `₽ ${priceRubVal.toFixed(2)}` : "—"}{service.totalPriceCNY != null ? ` / ¥ ${service.totalPriceCNY.toFixed(2)}` : ""}</span>
        </div>
        <div className="mt-2 self-end">
          {typeof onProfit === 'function' ? (
            <Button variant="secondary" size="sm" onClick={() => onProfit(service)} disabled={!service.available}>详请</Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function formatPricing(s: ServiceWithComputed): { summary: string; detail: string } {
  const p = s.pricing as any;
  if (p.type === "base_plus_per_gram") {
    return {
      summary: `基础费￥${p.base_cny} + 每克￥${p.per_gram_cny}`,
      detail: `总价 = 基础费￥${p.base_cny} + (重量g × ￥${p.per_gram_cny}/g)`,
    };
  }
  if (p.type === "registration_plus_per_gram") {
    return {
      summary: `挂号费￥${p.registration_fee_cny} + 每克￥${p.per_gram_cny}`,
      detail: `总价 = 挂号费￥${p.registration_fee_cny} + (重量g × ￥${p.per_gram_cny}/g)` + (p.effective_from ? `（自 ${p.effective_from} 起）` : ""),
    };
  }
  if (p.type === "first_weight_plus_additional") {
    return {
      summary: `首重${p.first_weight_g}g ￥${p.first_weight_fee_cny}，续重每${p.additional_step_g}g ￥${p.additional_step_fee_cny}`,
      detail: `若重量 ≤ ${p.first_weight_g}g，价格=￥${p.first_weight_fee_cny}；否则 价格=￥${p.first_weight_fee_cny} + ⌈(重量-${p.first_weight_g})/${p.additional_step_g}⌉ × ￥${p.additional_step_fee_cny}` + (p.effective_from ? `（自 ${p.effective_from} 起）` : ""),
    };
  }
  return { summary: "—", detail: "—" };
}
