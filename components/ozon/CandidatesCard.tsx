"use client";

import { Button } from "@/components/ui/button";
import type { ResultItem } from "@/types/ozon";

export default function CandidatesCard({
  rows,
  totalCount,
  viewMode,
  setViewMode,
  sortKey,
  sortOrder,
  onToggleSort,
  best,
  onOpenDetails,
}: {
  rows: ResultItem[];
  totalCount: number;
  viewMode: "list" | "table";
  setViewMode: (m: "list" | "table") => void;
  sortKey: "margin" | "price" | "receipt";
  sortOrder: "asc" | "desc";
  onToggleSort: (k: "margin" | "price" | "receipt") => void;
  best: ResultItem | null;
  onOpenDetails: (item: ResultItem) => void;
}) {
  function isBestRow(r: ResultItem) {
    if (!best) return false;
    return (
      r.carrier === best.carrier &&
      r.tier === best.tier &&
      r.delivery === best.delivery &&
      r.price_rub === best.price_rub
    );
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">
          候选方案（Top {totalCount}{rows.length !== totalCount ? ` · 筛选后 ${rows.length}` : ""}）
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === "list" ? "secondary" : "outline"}
            className="h-8 px-2 text-xs"
            onClick={() => setViewMode("list")}
          >
            列表
          </Button>
          <Button
            variant={viewMode === "table" ? "secondary" : "outline"}
            className="h-8 px-2 text-xs"
            onClick={() => setViewMode("table")}
          >
            表格
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">没有满足当前利润率范围的方案，请调整约束或参数。</p>
      ) : viewMode === "list" ? (
        <ul className="divide-y rounded-md border">
          {rows.map((t, i) => (
            <li key={i} className={`flex items-start justify-between gap-4 p-3 ${isBestRow(t) ? "bg-amber-50/50" : ""}`}>
              <div>
                <div className="font-medium">
                  {t.carrier} {t.tier}
                  <span className="ml-2 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] uppercase">{t.delivery}</span>
                  <span className="ml-2 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px]">组 {t.group}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>回款 ₽ {t.breakdown.receipt_rub}</span>
                  <span>利润 ¥ {t.breakdown.profit_cny}</span>
                  <span>利润率 {(t.breakdown.margin * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">售价 (RUB)</div>
                <div className="text-lg font-semibold">₽ {t.price_rub}</div>
                <div className="mt-2">
                  <Button variant="outline" className="h-8 px-2" onClick={() => onOpenDetails(t)}>
                    详情
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full text-xs">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-1 pr-2">方案</th>
                <th className="py-1 pr-2">
                  <button onClick={() => onToggleSort("price")} className="underline-offset-2 hover:underline">
                    售价 ₽ {sortKey === "price" ? (sortOrder === "desc" ? "▼" : "▲") : ""}
                  </button>
                </th>
                <th className="py-1 pr-2">组</th>
                <th className="py-1 pr-2">平台佣金 ₽</th>
                <th className="py-1 pr-2">收单费 ₽</th>
                <th className="py-1 pr-2">国际物流费 ₽</th>
                <th className="py-1 pr-2">尾城费 ₽</th>
                <th className="py-1 pr-2">货币转换费 ₽</th>
                <th className="py-1 pr-2">
                  <button onClick={() => onToggleSort("receipt")} className="underline-offset-2 hover:underline">
                    最终回款 ₽ {sortKey === "receipt" ? (sortOrder === "desc" ? "▼" : "▲") : ""}
                  </button>
                </th>
                <th className="py-1 pr-2">利润 ¥</th>
                <th className="py-1 pr-2">
                  <button onClick={() => onToggleSort("margin")} className="underline-offset-2 hover:underline">
                    利润率 {sortKey === "margin" ? (sortOrder === "desc" ? "▼" : "▲") : ""}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t, i) => (
                <tr key={i} className={isBestRow(t) ? "bg-amber-50" : ""}>
                  <td className="py-1 pr-2 whitespace-nowrap">
                    {t.carrier}/{t.tier}/{t.delivery}
                  </td>
                  <td className="py-1 pr-2">{t.price_rub}</td>
                  <td className="py-1 pr-2">{t.group}</td>
                  <td className="py-1 pr-2">{t.breakdown.commission_rub}</td>
                  <td className="py-1 pr-2">{t.breakdown.acquiring_rub}</td>
                  <td className="py-1 pr-2">{t.breakdown.intl_logistics_rub}</td>
                  <td className="py-1 pr-2">{t.breakdown.last_mile_rub}</td>
                  <td className="py-1 pr-2">{t.breakdown.fx_fee_rub}</td>
                  <td className="py-1 pr-2">{t.breakdown.receipt_rub}</td>
                  <td className="py-1 pr-2">{t.breakdown.profit_cny}</td>
                  <td className="py-1 pr-2">{(t.breakdown.margin * 100).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
