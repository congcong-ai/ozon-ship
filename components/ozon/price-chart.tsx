"use client";

import React, { useMemo, useRef, useState } from "react";
import type { OzonGroup } from "@/types/ozon";

export type PriceChartPoint = {
  x: number;
  y: number;
  price: number;
  margin: number;
  group: OzonGroup;
};

export type PriceChartSets = {
  sets: { group: string; color: string; points: PriceChartPoint[] }[];
  globalMin: number;
  globalMax: number;
  xSegments?: { priceMin: number; priceMax: number; xMin: number; xMax: number; group: OzonGroup }[];
};

export default function PriceChart({
  chart,
  sliderPrice,
  minMargin,
  maxMargin,
  onDragToPrice,
  groupNameMap,
  legendPlacement = "bottom-right",
  legendTitle,
  hideLegend = false,
  hideYAxisLabels = false,
}: {
  chart: PriceChartSets;
  sliderPrice: number | null;
  minMargin: number; // 如 0.1 = 10%
  maxMargin?: number; // 0或undefined 表示不封顶
  onDragToPrice: (price: number) => void;
  groupNameMap?: Partial<Record<OzonGroup, string>>;
  legendPlacement?: "top-left" | "top-right" | "bottom-right";
  legendTitle?: string;
  hideLegend?: boolean;
  hideYAxisLabels?: boolean;
}) {
  const [hoverPoint, setHoverPoint] = useState<PriceChartPoint | null>(null);
  const dragRef = useRef<{ active: boolean }>({ active: false });

  const vbW = 600, vbH = 180;
  const yMin = typeof minMargin === "number" ? minMargin : 0.1;
  const yMax = typeof maxMargin === "number" && maxMargin > 0 ? maxMargin : yMin + 1;
  const eps = 1e-6;
  // 左右留白：给左侧Y轴文字留空间，避免与折线冲突
  const padLeft = 56;
  const padRight = 8;
  const innerW = vbW - padLeft - padRight;
  const scaleX = innerW / vbW;

  const allPoints = useMemo(() => chart.sets.flatMap((s) => s.points), [chart.sets]);
  const legend = useMemo(() => {
    const m = new Map<OzonGroup, string>();
    for (const s of chart.sets) {
      const g = s.points[0]?.group as OzonGroup | undefined;
      if (g && !m.has(g)) m.set(g, s.color);
    }
    return Array.from(m.entries());
  }, [chart.sets]);

  return (
    <div className="relative">
      <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      className="w-full aspect-[10/3]"
      onMouseMove={(e) => {
        const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
        const xCss = e.clientX - rect.left;
        const xSvg = (xCss / Math.max(1, rect.width)) * vbW;
        const x = (xSvg - padLeft) / Math.max(1e-6, scaleX);
        const yCss = e.clientY - rect.top;
        const y = (yCss / Math.max(1, rect.height)) * vbH;
        if (!allPoints.length) return;
        let bestI = 0,
          bestD = Number.POSITIVE_INFINITY;
        for (let i = 0; i < allPoints.length; i++) {
          const dx = allPoints[i].x - x;
          const dy = allPoints[i].y - y;
          const d = Math.hypot(dx, dy);
          if (d < bestD) {
            bestD = d;
            bestI = i;
          }
        }
        const pt = allPoints[bestI];
        setHoverPoint(pt);
        if (dragRef.current.active || bestD <= 8) {
          onDragToPrice(Math.round(pt.price * 100) / 100);
        }
      }}
      onMouseLeave={() => {
        setHoverPoint(null);
        dragRef.current.active = false;
      }}
      onMouseUp={() => {
        dragRef.current.active = false;
      }}
    >
      {/* 背景网格与轴 */}
      <rect x="0" y="0" width={vbW} height={vbH} fill="#fff" />
      {/* 利润率刻度：下限 / 中位 / 上限（网格从留白后开始） */}
      <g>
        <line x1={padLeft} y1={vbH - 20} x2={vbW - padRight} y2={vbH - 20} stroke="#e5e7eb" />
        <line x1={padLeft} y1={20} x2={vbW - padRight} y2={20} stroke="#e5e7eb" />
        <line x1={padLeft} y1={vbH / 2} x2={vbW - padRight} y2={vbH / 2} stroke="#f1f5f9" />
      </g>

      {/* 绘图区域（整体右移并横向缩放，避开左侧文字） */}
      <g transform={`translate(${padLeft},0) scale(${scaleX},1)`}>
        {/* 多段折线 */}
        {chart.sets.map((s) => (
          <path
            key={s.group}
            d={`M ${s.points.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ")}`}
            fill="none"
            stroke={s.color}
            strokeOpacity={1}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ cursor: "pointer" }}
            onMouseDown={(e) => {
              const svg = (e.currentTarget as SVGPathElement).ownerSVGElement as SVGSVGElement;
              if (!svg) return;
              const rect = svg.getBoundingClientRect();
              const xCss = e.clientX - rect.left;
              const xSvg = (xCss / Math.max(1, rect.width)) * vbW;
              const x = (xSvg - padLeft) / Math.max(1e-6, scaleX);
              let bestI = 0,
                bestD = Number.POSITIVE_INFINITY;
              for (let i = 0; i < s.points.length; i++) {
                const d = Math.abs(s.points[i].x - x);
                if (d < bestD) { bestD = d; bestI = i; }
              }
              const pt = s.points[bestI];
              dragRef.current.active = true;
              setHoverPoint(pt);
              onDragToPrice(Math.round(pt.price * 100) / 100);
            }}
            onMouseMove={(e) => {
              const svg = (e.currentTarget as SVGPathElement).ownerSVGElement as SVGSVGElement;
              if (!svg) return;
              const rect = svg.getBoundingClientRect();
              const xCss = e.clientX - rect.left;
              const yCss = e.clientY - rect.top;
              const xSvg = (xCss / Math.max(1, rect.width)) * vbW;
              const ySvg = (yCss / Math.max(1, rect.height)) * vbH;
              const x = (xSvg - padLeft) / Math.max(1e-6, scaleX);
              let bestI = 0,
                bestD = Number.POSITIVE_INFINITY;
              for (let i = 0; i < s.points.length; i++) {
                const dx = s.points[i].x - x;
                const dy = s.points[i].y - ySvg;
                const d = Math.hypot(dx, dy);
                if (d < bestD) { bestD = d; bestI = i; }
              }
              const pt = s.points[bestI];
              setHoverPoint(pt);
              if (dragRef.current.active || bestD <= 8) {
                onDragToPrice(Math.round(pt.price * 100) / 100);
              }
            }}
          />
        ))}

        {/* 当前价竖线（压缩坐标） */}
        {sliderPrice !== null && isFinite(sliderPrice) && (
          (() => {
            // 优先用压缩分段映射；若不存在则退回全局线性
            let x: number | null = null;
            if (chart.xSegments && chart.xSegments.length) {
              const seg = chart.xSegments.find(s => sliderPrice! >= s.priceMin - 1e-6 && sliderPrice! <= s.priceMax + 1e-6);
              if (seg) {
                const t = (sliderPrice! - seg.priceMin) / Math.max(1e-6, seg.priceMax - seg.priceMin);
                x = seg.xMin + t * Math.max(0, seg.xMax - seg.xMin);
              } else {
                // 超出并集：小于首段或大于末段，直接贴到两端
                const leftMost = chart.xSegments[0];
                const rightMost = chart.xSegments[chart.xSegments.length - 1];
                if (sliderPrice! < leftMost.priceMin) x = 0;
                else if (sliderPrice! > rightMost.priceMax) x = vbW;
              }
            }
            if (x === null) {
              const width = Math.max(1e-6, chart.globalMax - chart.globalMin);
              x = ((sliderPrice! - chart.globalMin) / width) * vbW;
            }
            const xClamped = Math.min(Math.max(x!, 0), vbW);
            return <line x1={xClamped} y1={0} x2={xClamped} y2={vbH} stroke="#f59e0b" strokeDasharray="4 3" />;
          })()
        )}

        {/* 悬浮点与提示 */}
        {hoverPoint && (
          <g>
            <circle cx={hoverPoint.x} cy={hoverPoint.y} r={3} fill="#ef4444" />
            <line x1={hoverPoint.x} y1={0} x2={hoverPoint.x} y2={vbH} stroke="#94a3b8" strokeDasharray="3 3" />
          </g>
        )}
      </g>
      {/* 将Y轴文字放在最后，确保位于最上层 */}
      {!hideYAxisLabels && (
        <g fill="#111827" fontSize="10" style={{ pointerEvents: "none" }}>
          <text x="4" y={20} dominantBaseline="middle">
            上限 {((typeof maxMargin === "number" && maxMargin > 0 ? maxMargin : yMin + 1)).toLocaleString(undefined, { style: "percent", minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </text>
          <text x="4" y={vbH / 2} dominantBaseline="middle">
            中位 {(((yMin) + (typeof maxMargin === "number" && maxMargin > 0 ? maxMargin : (yMin + 1))) / 2).toLocaleString(undefined, { style: "percent", minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </text>
          <text x="4" y={vbH - 20} dominantBaseline="middle">
            下限 {(yMin).toLocaleString(undefined, { style: "percent", minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </text>
        </g>
      )}
      </svg>
      {!hideLegend && legend.length > 0 && (
        <div className={`pointer-events-none absolute ${legendPlacement === 'top-right' ? 'right-2 top-2' : legendPlacement === 'bottom-right' ? 'right-2 bottom-2' : 'left-2 top-2'} bg-white/80 backdrop-blur rounded border shadow px-2 py-1 text-[10px] leading-4`}>
          {legendTitle && <div className="mb-1 font-medium text-[10px] text-slate-700">{legendTitle}</div>}
          {legend.map(([g, color]) => (
            <div key={g} className="flex items-center gap-1 whitespace-nowrap">
              <span className="inline-block w-2.5 h-2.5 rounded" style={{ backgroundColor: color }} />
              <span>{groupNameMap?.[g] ?? g}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
