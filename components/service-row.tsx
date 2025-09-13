"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { ServiceWithComputed } from "@/types/shipping";

export default function ServiceRow({ service }: { service: ServiceWithComputed }) {
  const [open, setOpen] = useState(false);

  const pricingDesc = useMemo(() => formatPricing(service), [service]);

  return (
    <div className="flex items-center gap-4 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-medium leading-tight">{service.name}</h3>
          <span className="rounded bg-accent px-1.5 py-0.5 text-xs text-accent-foreground">{service.group}</span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
          {service.reason || pricingDesc.summary}
        </div>
      </div>

      <div className="text-right">
        <div className="text-xs text-muted-foreground">价格(CNY)</div>
        <div className="text-lg font-semibold">{service.totalPriceCNY != null ? service.totalPriceCNY.toFixed(2) : "—"}</div>
        <div className={`text-xs ${service.available ? "text-green-600" : "text-red-600"}`}>{service.available ? "可寄" : "不可寄"}</div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>详情</Button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={`${service.name} · 详情`}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoItem label="分组" value={service.group} />
          <InfoItem label="运输方式" value={service.mode || "—"} />
          <InfoItem label="重量范围" value={`${service.weight.min_g} - ${service.weight.max_g} g`} />
          <InfoItem label="进位粒度" value={`${service.weight.increment_g} g`} />
          {service.dimensions_max && <InfoItem label="最大尺寸" value={service.dimensions_max} />}
          {service.dimensions_min && <InfoItem label="最小尺寸" value={service.dimensions_min} />}
          {service.value_limit && <InfoItem label="货值上限" value={`${service.value_limit.amount} ${service.value_limit.currency}`} />}
        </div>

        {service.dimensions_rules && service.dimensions_rules.length > 0 && (
          <div className="mt-3">
            <div className="mb-1 text-sm font-medium">尺寸规则</div>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {service.dimensions_rules.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {service.prohibited && service.prohibited.length > 0 && (
          <div className="mt-3">
            <div className="mb-1 text-sm font-medium">禁寄</div>
            <div className="flex flex-wrap gap-2">
              {service.prohibited.map((p, i) => (
                <span key={i} className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-600 ring-1 ring-rose-100">{p}</span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 rounded-lg border p-3">
          <div className="text-sm font-medium">计费规则</div>
          <div className="mt-1 text-sm text-muted-foreground">{pricingDesc.detail}</div>
          {service.example && <div className="mt-1 text-xs text-muted-foreground">示例：{service.example}</div>}
        </div>

        {service.compensation && (
          <div className="mt-3 text-xs text-muted-foreground">赔付：{service.compensation}</div>
        )}
      </Modal>
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
