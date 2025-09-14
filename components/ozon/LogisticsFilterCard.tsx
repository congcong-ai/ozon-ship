"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DeliveryMode, OzonGroup } from "@/types/ozon";

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
                  <SelectItem key={c} value={c}>{c}</SelectItem>
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
        <p className="text-xs text-muted-foreground mt-2">可行组：{feasibleGroups.join("、") || "无"}</p>
      </CardContent>
    </Card>
  );
}
