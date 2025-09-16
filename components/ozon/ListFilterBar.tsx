"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import type { DeliveryMode, OzonGroup } from "@/types/ozon";
import { carrierName } from "@/lib/carrier_names";
import { getCarrierDetailsUrl } from "@/lib/ozon_data_meta";

export default function ListFilterBar({
  query,
  setQuery,
  carriers,
  tiers,
  feasibleGroups,
  carrier,
  setCarrier,
  tier,
  setTier,
  delivery,
  setDelivery,
  group,
  setGroup,
}: {
  query: string;
  setQuery: (s: string) => void;
  carriers: string[];
  tiers: string[];
  feasibleGroups: OzonGroup[];
  carrier: string;
  setCarrier: (v: string) => void;
  tier: string;
  setTier: (v: string) => void;
  delivery: DeliveryMode | "";
  setDelivery: (v: DeliveryMode | "") => void;
  group: OzonGroup | "";
  setGroup: (v: OzonGroup | "") => void;
}) {
  const ALL = "__ALL__";
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="relative w-full">
        <Input placeholder="搜索承运商、档位、配送、分组" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9 h-10" />
        <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
        <div>
          <Select value={carrier || ALL} onValueChange={(v)=>{ const real = (v===ALL?"":v); setCarrier(real); setTier(""); }}>
            <SelectTrigger className="w-full"><SelectValue placeholder="全部承运商" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>全部承运商</SelectItem>
              {carriers.map((c)=> (
                <SelectItem key={c} value={c} label={carrierName(c)}>
                  <a
                    className="ml-auto inline-flex items-center rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-100"
                    href={getCarrierDetailsUrl(c)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onPointerDownCapture={(e)=> { e.stopPropagation(); e.preventDefault(); }}
                    onPointerUpCapture={(e)=> { e.stopPropagation(); e.preventDefault(); }}
                    onMouseDownCapture={(e)=> { e.stopPropagation(); e.preventDefault(); }}
                    onMouseUpCapture={(e)=> { e.stopPropagation(); e.preventDefault(); }}
                    onKeyDownCapture={(e)=> { e.stopPropagation(); if (e.key === "Enter" || e.key === " ") { e.preventDefault(); window.open(getCarrierDetailsUrl(c), "_blank", "noopener,noreferrer"); } }}
                    onClickCapture={(e)=> { e.stopPropagation(); e.preventDefault(); window.open(getCarrierDetailsUrl(c), "_blank", "noopener,noreferrer"); }}
                  >
                    联系
                  </a>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select value={tier || ALL} onValueChange={(v)=> setTier(v===ALL?"":v)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="全部档位" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>全部档位</SelectItem>
              {(tiers.length?tiers:["Express","Standard","Economy"]).map((t)=> (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select value={delivery || ALL} onValueChange={(v)=> setDelivery(v===ALL?"":(v as DeliveryMode))}>
            <SelectTrigger className="w-full"><SelectValue placeholder="配送方式" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>全部配送</SelectItem>
              <SelectItem value="pickup">取货点</SelectItem>
              <SelectItem value="door">上门配送</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select value={group || ALL} onValueChange={(v)=> setGroup(v===ALL?"":(v as OzonGroup))}>
            <SelectTrigger className="w-full"><SelectValue placeholder="货件分组" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>全部分组</SelectItem>
              {feasibleGroups.map((g)=> (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
