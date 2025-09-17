"use client";

import React from "react";
import type { OzonGroup } from "@/types/ozon";
import type { PriceChartSets } from "@/components/ozon/price-chart";

export default function ChartLegend({
  chart,
  title = "Ozon货件分组",
  groupNameMap,
  className = "",
  extras,
  showGroups = true,
}: {
  chart: PriceChartSets;
  title?: string;
  groupNameMap?: Partial<Record<OzonGroup, string>>;
  className?: string;
  extras?: Array<{ label: string; color: string; dash?: string }>;
  showGroups?: boolean;
}) {
  const items = React.useMemo(() => {
    const m = new Map<OzonGroup, string>();
    for (const s of chart.sets) {
      const g = s.points[0]?.group as OzonGroup | undefined;
      if (g && !m.has(g)) m.set(g, s.color);
    }
    return Array.from(m.entries());
  }, [chart.sets]);

  if (!showGroups && (!extras || extras.length === 0)) return null;
  if (showGroups && items.length === 0 && (!extras || extras.length === 0)) return null;

  return (
    <div className={`bg-white/80 backdrop-blur rounded border shadow px-2 py-1 text-[10px] leading-4 ${className}`}>
      {title && <div className="mb-1 font-medium text-[10px] text-slate-700">{title}</div>}
      {extras && extras.length > 0 && (
        <div className="mb-1">
          {extras.map((ex, idx) => (
            <div key={`ex-${idx}`} className="flex items-center gap-1 whitespace-nowrap">
              <span
                className="inline-block"
                style={{ width: 14, height: 0, borderTop: `2px ${ex.dash ? 'dashed' : 'solid'} ${ex.color}` }}
              />
              <span>{ex.label}</span>
            </div>
          ))}
          {showGroups && <div className="my-1 h-[1px] bg-slate-200" />}
        </div>
      )}
      {showGroups && items.map(([g, color]) => (
        <div key={g} className="flex items-center gap-1 whitespace-nowrap">
          <span className="inline-block w-2.5 h-2.5 rounded" style={{ backgroundColor: color }} />
          <span>{groupNameMap?.[g] ?? g}</span>
        </div>
      ))}
    </div>
  );
}
