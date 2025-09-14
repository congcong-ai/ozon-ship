"use client";

import React from "react";
import type { OzonGroup } from "@/types/ozon";
import type { PriceChartSets } from "@/components/ozon/price-chart";

export default function ChartLegend({
  chart,
  title = "Ozon货件分组",
  groupNameMap,
  className = "",
}: {
  chart: PriceChartSets;
  title?: string;
  groupNameMap?: Partial<Record<OzonGroup, string>>;
  className?: string;
}) {
  const items = React.useMemo(() => {
    const m = new Map<OzonGroup, string>();
    for (const s of chart.sets) {
      const g = s.points[0]?.group as OzonGroup | undefined;
      if (g && !m.has(g)) m.set(g, s.color);
    }
    return Array.from(m.entries());
  }, [chart.sets]);

  if (items.length === 0) return null;

  return (
    <div className={`bg-white/80 backdrop-blur rounded border shadow px-2 py-1 text-[10px] leading-4 ${className}`}>
      {title && <div className="mb-1 font-medium text-[10px] text-slate-700">{title}</div>}
      {items.map(([g, color]) => (
        <div key={g} className="flex items-center gap-1 whitespace-nowrap">
          <span className="inline-block w-2.5 h-2.5 rounded" style={{ backgroundColor: color }} />
          <span>{groupNameMap?.[g] ?? g}</span>
        </div>
      ))}
    </div>
  );
}
