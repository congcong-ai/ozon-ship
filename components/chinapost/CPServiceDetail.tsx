"use client";

import type { ServiceWithComputed } from "@/types/shipping";

export default function CPServiceDetail({ service, weightG, rubPerCny }: {
  service: ServiceWithComputed | null;
  weightG?: number;
  rubPerCny: number;
}) {
  if (!service) return null;
  const svc = service;
  const pricingDesc = formatPricing(svc);
  const volRule = svc.dimensional_weight_rule?.formula ? `体积重 = ${svc.dimensional_weight_rule.formula}` : "";
  const intlCny = (typeof svc.totalPriceCNY === 'number' ? svc.totalPriceCNY : 0);
  const intlRub = intlCny * (rubPerCny || 0);

  function buildIntlFormula(): string {
    const p: any = svc.pricing;
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

  const rulesStr = (svc.dimensions_rules && svc.dimensions_rules.length) ? svc.dimensions_rules.join("；") : "—";
  const prohibitedStr = (svc.prohibited && svc.prohibited.length) ? svc.prohibited.join("、") : "—";

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h2 className="font-medium">物流详请</h2>

      <div className="grid grid-cols-[3fr_7fr] gap-x-4 gap-y-1 text-sm">
        <span>分组：</span>
        <span>{svc.group}</span>

        <span>运输方式：</span>
        <span>{svc.mode || "—"}</span>

        <span>重量范围：</span>
        <span>{`${svc.weight.min_g} - ${svc.weight.max_g} g`}</span>

        <span>进位粒度：</span>
        <span>{`${svc.weight.increment_g} g`}</span>

        <span>最大尺寸：</span>
        <span>{svc.dimensions_max || "—"}</span>

        <span>最小尺寸：</span>
        <span>{svc.dimensions_min || "—"}</span>

        <span>货值上限：</span>
        <span>{svc.value_limit ? `${svc.value_limit.amount} ${svc.value_limit.currency}` : "—"}</span>

        <span>尺寸规则：</span>
        <span className="text-muted-foreground">{rulesStr}</span>

        <span>禁寄：</span>
        <span className="text-muted-foreground">{prohibitedStr}</span>

        <span>计费规则：</span>
        <span className="text-muted-foreground">{pricingDesc.detail}{volRule ? ` · ${volRule}` : ""}</span>

        <span>计算：</span>
        <span className="text-muted-foreground whitespace-pre-wrap">{buildIntlFormula()}</span>

        {svc.example && (
          <>
            <span>示例：</span>
            <span className="text-muted-foreground">{svc.example}</span>
          </>
        )}

        {svc.compensation && (
          <>
            <span>赔付：</span>
            <span className="text-muted-foreground">{svc.compensation}</span>
          </>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
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
