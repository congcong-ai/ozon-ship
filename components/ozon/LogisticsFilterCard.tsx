"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { carrierName } from "@/lib/carrier_names";
import { getCarrierDetailsUrl } from "@/lib/ozon_data_meta";
import type { DeliveryMode, OzonGroup, OzonGroupRule } from "@/types/ozon";

export default function LogisticsFilterCard({
  carriers,
  tiers,
  carrier,
  setCarrier,
  tier,
  setTier,
  delivery,
  setDelivery,
  feasibleGroups,
  activeRule,
}: {
  carriers: string[];
  tiers: string[];
  carrier: string;
  setCarrier: (v: string) => void;
  tier: string;
  setTier: (v: string) => void;
  delivery: DeliveryMode | "";
  setDelivery: (v: DeliveryMode | "") => void;
  feasibleGroups: OzonGroup[];
  activeRule?: OzonGroupRule | null;
}) {
  const ALL = "__ALL__";
  return (
    <Card className="shadow-none h-full min-h-[150px]">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-base">物流选择（可选）</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1">
            <Label>物流商</Label>
            <Select value={carrier || ALL} onValueChange={(v) => { const real = v === ALL ? "" : v; setCarrier(real); setTier(""); }}>
              <SelectTrigger className="w-full"><SelectValue placeholder="全部" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>全部</SelectItem>
                {carriers.map((c) => (
                  <SelectItem key={c} value={c} label={carrierName(c)}>
                    <a
                      className="ml-auto inline-flex items-center rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-100"
                      href={getCarrierDetailsUrl(c)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onPointerDownCapture={(e) => { e.stopPropagation(); e.preventDefault(); }}
                      onPointerUpCapture={(e) => { e.stopPropagation(); e.preventDefault(); }}
                      onMouseDownCapture={(e) => { e.stopPropagation(); e.preventDefault(); }}
                      onMouseUpCapture={(e) => { e.stopPropagation(); e.preventDefault(); }}
                      onKeyDownCapture={(e) => { e.stopPropagation(); if (e.key === "Enter" || e.key === " ") { e.preventDefault(); window.open(getCarrierDetailsUrl(c), "_blank", "noopener,noreferrer"); } }}
                      onClickCapture={(e) => { e.stopPropagation(); e.preventDefault(); window.open(getCarrierDetailsUrl(c), "_blank", "noopener,noreferrer"); }}
                    >
                      联系
                    </a>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-1">
            <Label>档位</Label>
            <Select value={tier || ALL} onValueChange={(v) => setTier(v === ALL ? "" : v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="全部" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>全部</SelectItem>
                {tiers.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-1">
            <Label>配送</Label>
            <Select value={delivery || ALL} onValueChange={(v) => setDelivery((v === ALL ? "" : (v as DeliveryMode)))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="全部" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>全部</SelectItem>
                <SelectItem value="pickup">到点</SelectItem>
                <SelectItem value="door">上门</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          当前重量及价格适用以下Ozon货件分组：{feasibleGroups.join("、") || "无"}
        </p>
        {activeRule ? (
          <p className="text-[11px] text-muted-foreground mt-1">
            当前组限制：价格 ₽ {activeRule.priceRub.min} ~ ₽ {activeRule.priceRub.max}；重量 {activeRule.weightG.min} ~ {activeRule.weightG.max} g
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
